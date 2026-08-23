export const Stage = {
  DOCUMENT_REVIEW: "DOCUMENT_REVIEW",
  INTERVIEW: "INTERVIEW",
  COMPENSATION_NEGOTIATION: "COMPENSATION_NEGOTIATION",
  HIRED: "HIRED",
  REJECTED: "REJECTED",
} as const;

export type Stage = (typeof Stage)[keyof typeof Stage];

export const STAGES: readonly Stage[] = Object.values(Stage);

export const STAGE_LABELS: Record<Stage, string> = {
  [Stage.DOCUMENT_REVIEW]: "서류검토",
  [Stage.INTERVIEW]: "면접",
  [Stage.COMPENSATION_NEGOTIATION]: "처우협의",
  [Stage.HIRED]: "최종합격",
  [Stage.REJECTED]: "불합격",
};

export const APPLICANTS_PAGE_SIZE = 100;

export interface ApplicantSchema {
  id: string;
  name: string;
  role: string;
  appliedAt: string;
}

export interface UpdateApplicantStageRequestSchema {
  stage: Stage;
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
