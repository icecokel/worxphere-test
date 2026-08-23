export const Stage = {
  DOCUMENT_REVIEW: "DOCUMENT_REVIEW",
  INTERVIEW: "INTERVIEW",
  COMPENSATION_NEGOTIATION: "COMPENSATION_NEGOTIATION",
  HIRED: "HIRED",
  REJECTED: "REJECTED",
} as const;

export type Stage = (typeof Stage)[keyof typeof Stage];

export const STAGES: readonly Stage[] = Object.values(Stage);

export type StageArrowKey = "ArrowLeft" | "ArrowRight";

export const NEXT_PROGRESS_STAGES: Record<Stage, Stage | null> = {
  [Stage.DOCUMENT_REVIEW]: Stage.INTERVIEW,
  [Stage.INTERVIEW]: Stage.COMPENSATION_NEGOTIATION,
  [Stage.COMPENSATION_NEGOTIATION]: Stage.HIRED,
  [Stage.HIRED]: null,
  [Stage.REJECTED]: null,
};

const KEYBOARD_STAGE_TARGETS: Record<
  Stage,
  Record<StageArrowKey, Stage | null>
> = {
  [Stage.DOCUMENT_REVIEW]: {
    ArrowLeft: null,
    ArrowRight: Stage.INTERVIEW,
  },
  [Stage.INTERVIEW]: {
    ArrowLeft: Stage.DOCUMENT_REVIEW,
    ArrowRight: Stage.COMPENSATION_NEGOTIATION,
  },
  [Stage.COMPENSATION_NEGOTIATION]: {
    ArrowLeft: Stage.INTERVIEW,
    ArrowRight: Stage.HIRED,
  },
  [Stage.HIRED]: {
    ArrowLeft: Stage.COMPENSATION_NEGOTIATION,
    ArrowRight: Stage.REJECTED,
  },
  [Stage.REJECTED]: { ArrowLeft: Stage.HIRED, ArrowRight: null },
};

export const STAGE_LABELS: Record<Stage, string> = {
  [Stage.DOCUMENT_REVIEW]: "서류검토",
  [Stage.INTERVIEW]: "면접",
  [Stage.COMPENSATION_NEGOTIATION]: "처우협의",
  [Stage.HIRED]: "최종합격",
  [Stage.REJECTED]: "불합격",
};

export const ROLES = [
  "프론트엔드 개발자",
  "백엔드 개발자",
  "프로덕트 디자이너",
  "프로덕트 매니저",
] as const;

export const APPLICANTS_PAGE_SIZE = 100;

export interface ApplicantSchema {
  id: string;
  name: string;
  role: string;
  appliedAt: string;
}

export interface UpdateApplicantStageRequestSchema {
  stage: Stage;
  undo?: true;
}

export interface UpdateApplicantStageResponseSchema extends ApplicantSchema {
  stage: UpdateApplicantStageRequestSchema["stage"];
}

export interface GetApplicantsResponseSchema {
  applicants: UpdateApplicantStageResponseSchema[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface ApiErrorResponseSchema {
  error: string;
}

export type Applicant = UpdateApplicantStageResponseSchema;

export function getKeyboardStageTarget(
  stage: Stage,
  key: StageArrowKey,
): Stage | null {
  return KEYBOARD_STAGE_TARGETS[stage][key];
}

export function canChangeApplicantStage(
  currentStage: Stage,
  targetStage: Stage,
): boolean {
  const nextStage = NEXT_PROGRESS_STAGES[currentStage];

  return (
    (targetStage === Stage.REJECTED && nextStage !== null) ||
    nextStage === targetStage
  );
}

export function canUndoApplicantStage(
  currentStage: Stage,
  targetStage: Stage,
): boolean {
  return (
    currentStage !== Stage.HIRED &&
    currentStage !== Stage.REJECTED &&
    NEXT_PROGRESS_STAGES[targetStage] === currentStage
  );
}

export function orderRoles(roles: Iterable<string>): string[] {
  const availableRoles = new Set(roles);
  const orderedRoles: string[] = ROLES.filter(function keepAvailableRole(role) {
    return availableRoles.has(role);
  });

  availableRoles.forEach(function appendUnknownRole(role) {
    if (!orderedRoles.includes(role)) {
      orderedRoles.push(role);
    }
  });

  return orderedRoles;
}

export function matchesApplicantFilters(
  applicant: Applicant,
  nameQuery: string,
  roles: readonly string[] = [],
): boolean {
  const normalizedNameQuery = nameQuery.trim().toLocaleLowerCase();
  const matchesName = applicant.name
    .toLocaleLowerCase()
    .includes(normalizedNameQuery);
  const matchesRole = roles.length === 0 || roles.includes(applicant.role);

  return matchesName && matchesRole;
}

export function filterApplicants(
  applicants: Applicant[],
  nameQuery: string,
  roles: readonly string[] = [],
): Applicant[] {
  return applicants.filter(function matchesFilters(applicant) {
    return matchesApplicantFilters(applicant, nameQuery, roles);
  });
}

export function paginateApplicants(
  applicants: Applicant[],
  page: number,
): GetApplicantsResponseSchema {
  const start = (page - 1) * APPLICANTS_PAGE_SIZE;
  const end = start + APPLICANTS_PAGE_SIZE;

  return {
    applicants: applicants.slice(start, end),
    total: applicants.length,
    page,
    hasMore: end < applicants.length,
  };
}
