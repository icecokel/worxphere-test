import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/components/pipeline-board.tsx", import.meta.url),
  "utf8",
);

assert.match(source, /onLoadPage\(stage, nextPage, isTotalUnknown\)/);
assert.match(source, /page === 1 && !preserveApplicants/);
assert.match(source, /일부 지원자를 불러오지 못했습니다\./);
assert.match(source, /추가 지원자를 불러오지 못했습니다\./);
