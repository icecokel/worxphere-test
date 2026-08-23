export const STAGES = [
  "서류검토",
  "면접",
  "처우협의",
  "최종합격",
  "불합격",
] as const;

export type Stage = (typeof STAGES)[number];

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
}

export interface ApiErrorResponseSchema {
  error: string;
}

export type Applicant = UpdateApplicantStageResponseSchema;
