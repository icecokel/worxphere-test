import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus, platform, release, totalmem } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACT_DIR = resolve(ROOT_DIR, "output/playwright/screens-test");
const REPORT_PATH = resolve(ROOT_DIR, "docs/screens-test-report.md");
const HOST = "127.0.0.1";
const PORT = "35555";
const BASE_URL = `http://${HOST}:${PORT}`;
const SESSION = `screens-test-${process.pid}`;
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
    ...options,
  });

  if (result.status !== 0) {
    const commandLabel = args.includes("run-code")
      ? `${command} playwright-cli run-code`
      : `${command} ${args.join(" ")}`;
    throw new Error(
      `${commandLabel} 실패\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }

  return result.stdout;
}

function runPlaywrightCli(args) {
  return runCommand(
    NPX,
    [
      "--yes",
      "--package",
      "@playwright/cli",
      "playwright-cli",
      "--session",
      SESSION,
      ...args,
    ],
    { cwd: ARTIFACT_DIR },
  );
}

function parsePlaywrightResult(output) {
  const marker = "### Result\n";
  const start = output.lastIndexOf(marker);

  if (start === -1) {
    throw new Error(`Playwright CLI 결과를 찾지 못했습니다.\n${output}`);
  }

  const resultText = output
    .slice(start + marker.length)
    .split("\n### Ran Playwright code")[0]
    .trim();

  return JSON.parse(resultText);
}

function wait(delayMs) {
  return new Promise(function resolveAfterDelay(resolvePromise) {
    setTimeout(resolvePromise, delayMs);
  });
}

async function waitForServer(server) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error("프로덕션 서버가 준비되기 전에 종료됐습니다.");
    }

    try {
      const response = await fetch(BASE_URL);

      if (response.ok) {
        return;
      }
    } catch {
      // 서버가 준비될 때까지 재시도한다.
    }

    await wait(100);
  }

  throw new Error("프로덕션 서버 준비 시간을 초과했습니다.");
}

function stopServer(server) {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
  }
}

async function runBrowserScenarios(page) {
  const RUN_COUNT = 100;
  const MAX_RESPONSE_RETRIES = 20;
  const VIEWPORTS = [
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];
  const NAMES = ["김민준", "이서연", "박지호", "최하윤"];
  const ROLES = [
    "프론트엔드 개발자",
    "백엔드 개발자",
    "프로덕트 디자이너",
    "프로덕트 매니저",
  ];
  const seed = Date.now() >>> 0;
  let randomState = seed;

  function random() {
    randomState += 0x6d2b79f5;
    let value = randomState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  function randomItem(items) {
    return items[Math.floor(random() * items.length)];
  }

  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const targetIndex = Math.floor(random() * (index + 1));
      [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
    }

    return items;
  }

  function createPlans() {
    const plans = [];

    for (const viewport of VIEWPORTS) {
      for (const scenario of ["name", "role"]) {
        for (let index = 0; index < RUN_COUNT / 4; index += 1) {
          plans.push({
            viewport,
            scenario,
            value:
              scenario === "name" ? randomItem(NAMES) : randomItem(ROLES),
          });
        }
      }
    }

    return shuffle(plans);
  }

  async function waitForLoadingToFinish() {
    await page.waitForFunction(
      function hasNoLoadingColumns() {
        return document.querySelectorAll('section[aria-hidden="true"]').length === 0;
      },
      undefined,
      { timeout: 3_000 },
    );
  }

  async function recoverFailedColumns() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await page.waitForFunction(
        function areFiltersEnabled() {
          const search = document.querySelector("#name-search");
          return search instanceof HTMLInputElement && !search.disabled;
        },
        undefined,
        { timeout: 3_000 },
      );
      await waitForLoadingToFinish();
      const retryButtonCount = await page
        .getByRole("button", { name: "다시 시도" })
        .count();

      if (retryButtonCount === 0) {
        return;
      }

      await page.reload();
    }

    throw new Error("목록 조회 실패 상태를 복구하지 못했습니다.");
  }

  async function resetFilters() {
    await page.reload();
    await recoverFailedColumns();
  }

  async function startMeasurement() {
    return page.evaluate(function prepareMeasurement() {
      performance.clearResourceTimings();
      const longTasks = [];
      const observer = new PerformanceObserver(function collectLongTasks(list) {
        for (const entry of list.getEntries()) {
          longTasks.push({
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      });
      observer.observe({ type: "longtask", buffered: false });
      const measurement = {
        actionStart: performance.now(),
        longTasks,
        observer,
      };
      window.__screensTestMeasurement = measurement;
      return measurement.actionStart;
    });
  }

  async function waitForFiveResponses(responses) {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      if (responses.length >= 5) {
        return;
      }

      await page.waitForTimeout(10);
    }

    throw new Error(`목록 응답이 5건보다 적습니다: ${responses.length}`);
  }

  async function finishMeasurement() {
    await waitForLoadingToFinish();

    return page.evaluate(async function readMeasurement() {
      await new Promise(function waitForStableFrame(resolvePromise) {
        requestAnimationFrame(function waitFirstFrame() {
          requestAnimationFrame(function waitSecondFrame() {
            resolvePromise();
          });
        });
      });

      const stableAt = performance.now();
      const measurement = window.__screensTestMeasurement;
      const pendingLongTasks = measurement.observer.takeRecords();

      for (const entry of pendingLongTasks) {
        measurement.longTasks.push({
          duration: entry.duration,
          startTime: entry.startTime,
        });
      }

      measurement.observer.disconnect();

      const resources = performance
        .getEntriesByType("resource")
        .filter(function keepApplicantRequest(entry) {
          return (
            entry.name.includes("/api/applicants?") &&
            entry.startTime >= measurement.actionStart
          );
        });
      const firstRequestStart = Math.min(
        ...resources.map(function getStartTime(entry) {
          return entry.startTime;
        }),
      );
      const lastResponseEnd = Math.max(
        ...resources.map(function getResponseEnd(entry) {
          return entry.responseEnd;
        }),
      );
      const maxApiTime = Math.max(
        ...resources.map(function getApiTime(entry) {
          return entry.responseEnd - entry.startTime;
        }),
      );
      const relevantLongTasks = measurement.longTasks.filter(
        function keepRelevantLongTask(entry) {
          return (
            entry.startTime >= measurement.actionStart &&
            entry.startTime < stableAt &&
            entry.duration >= 50
          );
        },
      );

      return {
        clientApplyMs: stableAt - lastResponseEnd,
        maxApiMs: maxApiTime,
        maxLongTaskMs: relevantLongTasks.length
          ? Math.max(
              ...relevantLongTasks.map(function getDuration(entry) {
                return entry.duration;
              }),
            )
          : 0,
        requestCount: resources.length,
        requestStartMs: firstRequestStart - measurement.actionStart,
        totalMs: stableAt - measurement.actionStart,
      };
    });
  }

  async function readUiState(plan, responses) {
    const cardTexts = await page
      .locator('button[aria-label$="지원자 상세 보기"]')
      .allTextContents();
    const headerCounts = await page
      .locator('section[aria-labelledby^="stage-"] > header > span')
      .allTextContents();
    let apiTotal = 0;

    for (const response of responses) {
      const responseBody = await response.json();
      apiTotal += responseBody.total;
    }

    const uiTotal = headerCounts.reduce(function sumCount(total, count) {
      return total + Number.parseInt(count, 10);
    }, 0);
    const searchValue = await page
      .getByRole("searchbox", { name: "이름 검색" })
      .inputValue();
    const roleChecked =
      plan.scenario === "role"
        ? await page
            .getByRole("checkbox", { name: plan.value, exact: true })
            .isChecked()
        : true;
    const cardsMatch = cardTexts.every(function matchesCondition(cardText) {
      return plan.scenario === "name"
        ? cardText.includes(plan.value)
        : !cardText.includes(plan.value);
    });

    return {
      cardCount: cardTexts.length,
      cardsMatch,
      conditionMaintained:
        plan.scenario === "name" ? searchValue === plan.value : !roleChecked,
      countsMatch: uiTotal === apiTotal,
    };
  }

  async function runPlan(plan) {
    await page.setViewportSize(plan.viewport);
    await page.evaluate(function waitForResize() {
      return new Promise(function waitForResizeFrame(resolvePromise) {
        requestAnimationFrame(function finishResize() {
          resolvePromise();
        });
      });
    });

    const responses = [];

    function captureApplicantResponse(response) {
      const request = response.request();

      if (
        request.method() === "GET" &&
        response.url().includes("/api/applicants?")
      ) {
        responses.push(response);
      }
    }

    page.on("response", captureApplicantResponse);
    await startMeasurement();

    if (plan.scenario === "name") {
      await page
        .getByRole("searchbox", { name: "이름 검색" })
        .fill(plan.value);
    } else {
      await page
        .getByRole("checkbox", { name: plan.value, exact: true })
        .click();
    }

    await waitForFiveResponses(responses);
    page.off("response", captureApplicantResponse);
    const allResponsesSucceeded = responses
      .slice(0, 5)
      .every(function isSuccessful(response) {
        return response.status() === 200;
      });
    const metrics = await finishMeasurement();

    if (!allResponsesSucceeded) {
      await resetFilters();
      return { excluded: true };
    }

    const ui = await readUiState(plan, responses.slice(0, 5));
    const passed =
      metrics.requestCount === 5 &&
      metrics.requestStartMs <= 100 &&
      metrics.clientApplyMs <= 100 &&
      metrics.maxLongTaskMs === 0 &&
      ui.cardCount > 0 &&
      ui.cardsMatch &&
      ui.conditionMaintained &&
      ui.countsMatch;

    await resetFilters();

    return {
      excluded: false,
      passed,
      ...metrics,
      ...ui,
    };
  }

  await page.evaluate(function clearStoredApplicants() {
    localStorage.removeItem("worxphere.applicants.v4");
  });
  await page.reload();
  await recoverFailedColumns();

  const plans = createPlans();
  const samples = [];
  const excluded = {};

  for (const plan of plans) {
    const key = `${plan.viewport.width}x${plan.viewport.height}-${plan.scenario}`;
    let completed = false;

    for (let retry = 0; retry < MAX_RESPONSE_RETRIES; retry += 1) {
      const result = await runPlan(plan);

      if (result.excluded) {
        excluded[key] = (excluded[key] ?? 0) + 1;
        continue;
      }

      samples.push({
        ...plan,
        ...result,
      });
      completed = true;
      break;
    }

    if (!completed) {
      throw new Error("성공 응답 표본 재시도 횟수를 초과했습니다.");
    }
  }

  return {
    browserVersion: page.context().browser().version(),
    excluded,
    passed: samples.length === RUN_COUNT && samples.every(function passed(sample) {
      return sample.passed;
    }),
    samples,
    seed,
  };
}

function round(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "-";
}

function getAggregate(result, width, scenario) {
  const samples = result.samples.filter(function matchesGroup(sample) {
    return sample.viewport.width === width && sample.scenario === scenario;
  });
  const key = `${width}x${width === 1024 ? 768 : 900}-${scenario}`;

  return {
    excluded: result.excluded[key] ?? 0,
    failed: samples.filter(function failed(sample) {
      return !sample.passed;
    }).length,
    maxApply: Math.max(
      ...samples.map(function getApply(sample) {
        return sample.clientApplyMs;
      }),
    ),
    maxLongTask: Math.max(
      ...samples.map(function getLongTask(sample) {
        return sample.maxLongTaskMs;
      }),
    ),
    maxRequestStart: Math.max(
      ...samples.map(function getRequestStart(sample) {
        return sample.requestStartMs;
      }),
    ),
    samples,
  };
}

function renderReport(result, commit) {
  const generatedAt = new Date().toISOString();
  const aggregates = [
    getAggregate(result, 1024, "name"),
    getAggregate(result, 1024, "role"),
    getAggregate(result, 1440, "name"),
    getAggregate(result, 1440, "role"),
  ];
  const labels = [
    ["1024×768", "이름 검색"],
    ["1024×768", "직무 필터"],
    ["1440×900", "이름 검색"],
    ["1440×900", "직무 필터"],
  ];
  const summaryRows = aggregates.map(function renderAggregate(group, index) {
    const [viewport, scenario] = labels[index];
    return `| ${viewport} | ${scenario} | ${group.samples.length} | ${group.excluded} | ${round(group.maxRequestStart)} | ${round(group.maxApply)} | ${round(group.maxLongTask)} | ${group.failed === 0 ? "통과" : "실패"} |`;
  });
  const detailRows = result.samples.map(function renderSample(sample, index) {
    return `| ${index + 1} | ${sample.viewport.width}×${sample.viewport.height} | ${sample.scenario === "name" ? "이름" : "직무"} | ${sample.value} | ${round(sample.requestStartMs)} | ${round(sample.maxApiMs)} | ${round(sample.clientApplyMs)} | ${round(sample.totalMs)} | ${round(sample.maxLongTaskMs)} | ${sample.passed ? "통과" : "실패"} |`;
  });
  const excludedCount = Object.values(result.excluded).reduce(
    function sumExcluded(total, count) {
      return total + count;
    },
    0,
  );

  return `# Screens 성능 테스트 리포트

## 실행 환경

| 항목 | 값 |
| --- | --- |
| 커밋 | \`${commit}\` |
| 실행 시각 | \`${generatedAt}\` |
| 실행 명령 | \`pnpm test:screens\` |
| 브라우저 | Chromium \`${result.browserVersion}\` |
| 운영체제 | \`${platform()} ${release()}\` |
| CPU·메모리 | \`${cpus().length}\` · \`${Math.round(totalmem() / 1024 ** 3)}GB\` |
| 실행 모드 | production |
| 모바일 | 미실행 |
| 무작위 시드 | \`${result.seed}\` |

## 판정

- 성공 응답 표본: **${result.samples.length}/100**
- 의도된 임의 \`500\` 제외 표본: **${excludedCount}**
- 요청 시작과 화면 반영 \`100ms\` 이내, \`50ms\` 이상 Long Task 없음: **${result.passed ? "통과" : "실패"}**
- Firefox·WebKit·모바일 및 화면별 브라우저 매트릭스는 실행하지 않았다.

## 요약

| 화면 | 시나리오 | 성공 표본 | 제외 500 | 최대 요청 시작(ms) | 최대 화면 반영(ms) | 최대 Long Task(ms) | 결과 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
${summaryRows.join("\n")}

## 100회 상세 결과

| # | 화면 | 조건 | 값 | 요청 시작(ms) | 최대 API(ms) | 화면 반영(ms) | 전체(ms) | Long Task(ms) | 결과 |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
${detailRows.join("\n")}
`;
}

async function main() {
  runCommand(NPX, ["--version"]);
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const server = spawn(
    "pnpm",
    ["exec", "next", "start", "-H", HOST, "-p", PORT],
    { cwd: ROOT_DIR, stdio: "ignore" },
  );

  try {
    await waitForServer(server);
    runPlaywrightCli(["open", BASE_URL]);
    runPlaywrightCli(["snapshot"]);
    const output = runPlaywrightCli([
      "run-code",
      runBrowserScenarios.toString(),
    ]);
    const result = parsePlaywrightResult(output);
    const commit = runCommand("git", ["rev-parse", "HEAD"]).trim();
    writeFileSync(REPORT_PATH, renderReport(result, commit));
    process.stdout.write(
      `Screens 테스트 ${result.passed ? "통과" : "실패"}: ${REPORT_PATH}\n`,
    );

    if (!result.passed) {
      process.exitCode = 1;
    }
  } finally {
    try {
      runPlaywrightCli(["close"]);
    } catch {
      // 테스트 결과와 무관하게 정리를 계속한다.
    }

    stopServer(server);
  }
}

await main();
