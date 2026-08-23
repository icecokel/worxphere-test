import { STAGES, type Applicant, type Stage } from "./pipeline.ts";

export interface StageColumnState {
  applicants: Applicant[];
  total: number;
  nextPage: number;
  hasMore: boolean;
  isLoading: boolean;
  hasError: boolean;
}

export type PipelineBoardState = Record<Stage, StageColumnState>;

interface ApplicantLocation {
  applicant: Applicant;
  index: number;
  stage: Stage;
}

export function findApplicantLocation(
  boardState: PipelineBoardState,
  applicantId: string,
): ApplicantLocation | undefined {
  for (const stage of STAGES) {
    const index = boardState[stage].applicants.findIndex(
      function hasApplicantId(applicant) {
        return applicant.id === applicantId;
      },
    );

    if (index !== -1) {
      return {
        applicant: boardState[stage].applicants[index],
        index,
        stage,
      };
    }
  }
}

export function moveApplicantToStage(
  boardState: PipelineBoardState,
  applicantId: string,
  targetStage: Stage,
): PipelineBoardState {
  const location = findApplicantLocation(boardState, applicantId);

  if (location === undefined || location.stage === targetStage) {
    return boardState;
  }

  const sourceApplicants = boardState[location.stage].applicants.slice();
  sourceApplicants.splice(location.index, 1);

  return {
    ...boardState,
    [location.stage]: {
      ...boardState[location.stage],
      applicants: sourceApplicants,
      total: boardState[location.stage].total - 1,
    },
    [targetStage]: {
      ...boardState[targetStage],
      applicants: [
        ...boardState[targetStage].applicants,
        { ...location.applicant, stage: targetStage },
      ],
      total: boardState[targetStage].total + 1,
    },
  };
}

export function restoreApplicantStage(
  boardState: PipelineBoardState,
  applicantId: string,
  sourceStage: Stage,
  sourceIndex: number,
): PipelineBoardState {
  const location = findApplicantLocation(boardState, applicantId);

  if (location === undefined || location.stage === sourceStage) {
    return boardState;
  }

  const currentApplicants = boardState[location.stage].applicants.slice();
  currentApplicants.splice(location.index, 1);

  const sourceApplicants = boardState[sourceStage].applicants.slice();
  sourceApplicants.splice(sourceIndex, 0, {
    ...location.applicant,
    stage: sourceStage,
  });

  return {
    ...boardState,
    [location.stage]: {
      ...boardState[location.stage],
      applicants: currentApplicants,
      total: boardState[location.stage].total - 1,
    },
    [sourceStage]: {
      ...boardState[sourceStage],
      applicants: sourceApplicants,
      total: boardState[sourceStage].total + 1,
    },
  };
}
