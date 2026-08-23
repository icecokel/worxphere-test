import assert from "node:assert/strict";
import test from "node:test";

import { Stage, STAGES } from "../src/lib/pipeline.ts";
import {
  mergeApplicantPage,
  moveApplicantToStage,
  restoreApplicantStage,
} from "../src/lib/pipeline-board-state.ts";

const APPLIED_AT = "2026-08-23T00:00:00.000Z";

function createApplicant(id, stage) {
  return {
    id,
    name: `지원자 ${id}`,
    role: "프론트엔드 개발자",
    appliedAt: APPLIED_AT,
    stage,
  };
}

function createColumn(applicants) {
  return {
    applicants,
    total: applicants.length,
    nextPage: 2,
    hasMore: false,
    isLoading: false,
    hasError: false,
  };
}

function createBoardState() {
  const applicants = {
    first: createApplicant("first", Stage.DOCUMENT_REVIEW),
    second: createApplicant("second", Stage.DOCUMENT_REVIEW),
    target: createApplicant("target", Stage.INTERVIEW),
  };

  return {
    board: Object.fromEntries(
      STAGES.map(function createStageColumn(stage) {
        if (stage === Stage.DOCUMENT_REVIEW) {
          return [stage, createColumn([applicants.first, applicants.second])];
        }

        if (stage === Stage.INTERVIEW) {
          return [stage, createColumn([applicants.target])];
        }

        return [stage, createColumn([])];
      }),
    ),
    applicants,
  };
}

test("SM-01 moves the card, stage, and counts together", function checkMove() {
  const { board, applicants } = createBoardState();
  const moved = moveApplicantToStage(
    board,
    applicants.second.id,
    Stage.INTERVIEW,
  );

  assert.deepEqual(
    moved[Stage.DOCUMENT_REVIEW].applicants.map(function getId(applicant) {
      return applicant.id;
    }),
    [applicants.first.id],
  );
  assert.deepEqual(
    moved[Stage.INTERVIEW].applicants.map(function getId(applicant) {
      return applicant.id;
    }),
    [applicants.target.id, applicants.second.id],
  );
  assert.equal(moved[Stage.DOCUMENT_REVIEW].total, 1);
  assert.equal(moved[Stage.INTERVIEW].total, 2);
  assert.equal(
    moved[Stage.INTERVIEW].applicants[1].stage,
    Stage.INTERVIEW,
  );
  assert.equal(board[Stage.DOCUMENT_REVIEW].applicants.length, 2);
});

test("SM-02 restores the original stage, count, and array position", function checkRestore() {
  const { board, applicants } = createBoardState();
  const moved = moveApplicantToStage(
    board,
    applicants.second.id,
    Stage.INTERVIEW,
  );
  const restored = restoreApplicantStage(
    moved,
    applicants.second.id,
    Stage.DOCUMENT_REVIEW,
    1,
  );

  assert.deepEqual(restored, board);
});

test("SM-03 ignores a missing applicant", function checkMissingApplicant() {
  const { board } = createBoardState();

  assert.strictEqual(
    moveApplicantToStage(board, "missing", Stage.INTERVIEW),
    board,
  );
  assert.strictEqual(
    restoreApplicantStage(board, "missing", Stage.DOCUMENT_REVIEW, 0),
    board,
  );
});

test("SM-04 ignores a request for the current stage", function checkSameStage() {
  const { board, applicants } = createBoardState();

  assert.strictEqual(
    moveApplicantToStage(
      board,
      applicants.first.id,
      Stage.DOCUMENT_REVIEW,
    ),
    board,
  );
  assert.strictEqual(
    restoreApplicantStage(
      board,
      applicants.first.id,
      Stage.DOCUMENT_REVIEW,
      0,
    ),
    board,
  );
});

test("SM-05 keeps moved pagination unique and complete", function checkMovedPagination() {
  const sourceApplicant = createApplicant(
    "source",
    Stage.DOCUMENT_REVIEW,
  );
  const shiftedSourceApplicant = createApplicant(
    "shifted-source",
    Stage.DOCUMENT_REVIEW,
  );
  const movedApplicant = createApplicant("moved", Stage.INTERVIEW);
  const targetApplicant = createApplicant("target", Stage.INTERVIEW);
  const nextTargetApplicant = createApplicant(
    "next-target",
    Stage.INTERVIEW,
  );
  const loadedSourceApplicants = mergeApplicantPage(
    [sourceApplicant],
    [sourceApplicant, shiftedSourceApplicant],
    1,
  );
  const loadedTargetApplicants = mergeApplicantPage(
    [targetApplicant, movedApplicant],
    [targetApplicant, nextTargetApplicant],
    2,
  );

  assert.deepEqual(
    loadedSourceApplicants.map(function getSourceId(applicant) {
      return applicant.id;
    }),
    [sourceApplicant.id, shiftedSourceApplicant.id],
  );
  assert.deepEqual(
    loadedTargetApplicants.map(function getTargetId(applicant) {
      return applicant.id;
    }),
    [targetApplicant.id, movedApplicant.id, nextTargetApplicant.id],
  );
});
