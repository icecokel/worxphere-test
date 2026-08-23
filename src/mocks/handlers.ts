import { delay, http, HttpResponse, type RequestHandler } from "msw";

import {
  filterApplicants,
  paginateApplicants,
  STAGES,
  type ApiErrorResponseSchema,
  type Applicant,
  type GetApplicantsResponseSchema,
  type Stage,
  type UpdateApplicantStageRequestSchema,
  type UpdateApplicantStageResponseSchema,
} from "@/lib/pipeline";

const STAGE_APPLICANT_COUNTS: Record<Stage, number> = {
  서류검토: 320,
  면접: 120,
  처우협의: 30,
  최종합격: 50,
  불합격: 480,
};
const INITIAL_APPLICANT_STAGES = STAGES.flatMap(
  function createApplicantStages(stage) {
    return Array<Stage>(STAGE_APPLICANT_COUNTS[stage]).fill(stage);
  },
);
const APPLICANT_COUNT = INITIAL_APPLICANT_STAGES.length;
const APPLICANTS_STORAGE_KEY = "worxphere.applicants.v2";
const FAILURE_RATE = 0.15;
const MIN_DELAY_MS = 200;
const MAX_DELAY_MS = 800;
const DAY_MS = 24 * 60 * 60 * 1_000;
const APPLIED_AT_BASE = Date.UTC(2026, 7, 23);
const APPLIED_AT_RANGE_DAYS = 30;

const SURNAMES = [
  "김",
  "이",
  "박",
  "최",
  "정",
  "강",
  "조",
  "윤",
  "장",
  "임",
  "한",
  "오",
  "서",
  "신",
  "권",
] as const;

const GIVEN_NAMES = [
  "민준",
  "서연",
  "지호",
  "하윤",
  "도현",
  "유진",
  "현우",
  "지민",
  "서준",
  "수아",
  "예준",
  "채원",
  "준우",
  "지우",
  "시우",
  "은서",
  "건우",
  "다은",
  "우진",
  "소율",
] as const;

const ROLES = [
  "프론트엔드 개발자",
  "백엔드 개발자",
  "프로덕트 디자이너",
  "프로덕트 매니저",
] as const;

const INITIAL_APPLICANTS = Array.from(
  { length: APPLICANT_COUNT },
  createApplicant,
);

let applicants: Applicant[] | undefined;

function createApplicant(_value: unknown, index: number): Applicant {
  const sequence = String(index + 1).padStart(4, "0");
  const surname = SURNAMES[index % SURNAMES.length];
  const givenName =
    GIVEN_NAMES[Math.floor(index / SURNAMES.length) % GIVEN_NAMES.length];

  return {
    id: `applicant-${sequence}`,
    name: `${surname}${givenName}`,
    role: ROLES[index % ROLES.length],
    appliedAt: new Date(
      APPLIED_AT_BASE - (index % APPLIED_AT_RANGE_DAYS) * DAY_MS,
    ).toISOString(),
    stage: INITIAL_APPLICANT_STAGES[index],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStage(value: unknown): value is Stage {
  return typeof value === "string" && STAGES.includes(value as Stage);
}

function isApplicant(value: unknown): value is Applicant {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.role === "string" &&
    typeof value.appliedAt === "string" &&
    isStage(value.stage)
  );
}

function isApplicantList(value: unknown): value is Applicant[] {
  return (
    Array.isArray(value) &&
    value.length >= APPLICANT_COUNT &&
    value.every(isApplicant)
  );
}

function readApplicants(): Applicant[] {
  try {
    const storedApplicants = localStorage.getItem(APPLICANTS_STORAGE_KEY);

    if (storedApplicants) {
      const parsedApplicants: unknown = JSON.parse(storedApplicants);

      if (isApplicantList(parsedApplicants)) {
        return parsedApplicants;
      }
    }
  } catch {
    // 브라우저 저장소를 사용할 수 없으면 초기 데이터로 복구한다.
  }

  return INITIAL_APPLICANTS.slice();
}

function getApplicants(): Applicant[] {
  applicants ??= readApplicants();
  return applicants;
}

function findApplicantIndex(id: string): number {
  const currentApplicants = getApplicants();

  for (let index = 0; index < currentApplicants.length; index += 1) {
    if (currentApplicants[index].id === id) {
      return index;
    }
  }

  return -1;
}

function isUpdateApplicantStageRequest(
  value: unknown,
): value is UpdateApplicantStageRequestSchema {
  return isRecord(value) && isStage(value.stage);
}

function getRandomDelay(): number {
  return (
    Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) +
    MIN_DELAY_MS
  );
}

function shouldFail(): boolean {
  return Math.random() < FAILURE_RATE;
}

function transitionApplicantStage(
  currentApplicants: Applicant[],
  applicantIndex: number,
  stage: Stage,
) {
  const applicant: UpdateApplicantStageResponseSchema = {
    ...currentApplicants[applicantIndex],
    stage,
  };
  const applicants = currentApplicants.slice();
  applicants[applicantIndex] = applicant;

  return { applicant, applicants };
}

function errorResponse(error: string, status: number) {
  return HttpResponse.json<ApiErrorResponseSchema>({ error }, { status });
}

async function getApplicantsResolver({ request }: { request: Request }) {
  await delay(getRandomDelay());

  if (shouldFail()) {
    return errorResponse("지원자를 불러오지 못했습니다.", 500);
  }

  const searchParams = new URL(request.url).searchParams;
  const requestedStage = searchParams.get("stage");
  const requestedName = searchParams.get("name") ?? "";
  const requestedRoles = searchParams.getAll("role");
  const page = Number(searchParams.get("page") ?? "1");

  if (
    (requestedStage !== null && !isStage(requestedStage)) ||
    !Number.isInteger(page) ||
    page < 1
  ) {
    return errorResponse("페이지 요청이 올바르지 않습니다.", 400);
  }

  const filteredApplicants = filterApplicants(
    getApplicants(),
    requestedName,
    requestedRoles,
  );
  const stageApplicants = requestedStage
    ? filteredApplicants.filter(function matchesRequestedStage(applicant) {
        return applicant.stage === requestedStage;
      })
    : filteredApplicants;
  const response = paginateApplicants(stageApplicants, page);

  return HttpResponse.json<GetApplicantsResponseSchema>(response);
}

async function updateApplicantStageResolver({
  params,
  request,
}: {
  params: { id: string };
  request: Request;
}) {
  await delay(getRandomDelay());

  const applicantIndex = findApplicantIndex(params.id);

  if (applicantIndex === -1) {
    return errorResponse("지원자를 찾을 수 없습니다.", 404);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("요청 본문이 올바르지 않습니다.", 400);
  }

  if (!isUpdateApplicantStageRequest(body)) {
    return errorResponse("허용되지 않은 채용 단계입니다.", 400);
  }

  if (shouldFail()) {
    return errorResponse("단계 변경에 실패했습니다.", 500);
  }

  const transition = transitionApplicantStage(
    getApplicants(),
    applicantIndex,
    body.stage,
  );

  try {
    localStorage.setItem(
      APPLICANTS_STORAGE_KEY,
      JSON.stringify(transition.applicants),
    );
  } catch {
    return errorResponse("단계 변경을 저장하지 못했습니다.", 500);
  }

  applicants = transition.applicants;

  return HttpResponse.json<UpdateApplicantStageResponseSchema>(
    transition.applicant,
  );
}

export const handlers: RequestHandler[] = [
  http.get<
    never,
    never,
    GetApplicantsResponseSchema | ApiErrorResponseSchema
  >(
    "/api/applicants",
    getApplicantsResolver,
  ),
  http.patch<
    { id: string },
    UpdateApplicantStageRequestSchema,
    UpdateApplicantStageResponseSchema | ApiErrorResponseSchema
  >("/api/applicants/:id/stage", updateApplicantStageResolver),
];
