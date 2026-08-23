import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  canChangeApplicantStage,
  canUndoApplicantStage,
  Stage,
  STAGE_LABELS,
  STAGES,
} from "../src/lib/pipeline.ts";

function isEnglishStageCode(stage) {
  return /^[A-Z_]+$/.test(stage);
}

function checkStageCode() {
  assert.deepEqual(STAGES, Object.values(Stage));
  assert.ok(STAGES.every(isEnglishStageCode));
  assert.equal(STAGE_LABELS[Stage.INTERVIEW], "면접");
  assert.equal(
    JSON.stringify({ stage: Stage.INTERVIEW }),
    '{"stage":"INTERVIEW"}',
  );
}

function checkStageTransitions() {
  const allowedTransitions = new Set([
    `${Stage.DOCUMENT_REVIEW}:${Stage.INTERVIEW}`,
    `${Stage.DOCUMENT_REVIEW}:${Stage.REJECTED}`,
    `${Stage.INTERVIEW}:${Stage.COMPENSATION_NEGOTIATION}`,
    `${Stage.INTERVIEW}:${Stage.REJECTED}`,
    `${Stage.COMPENSATION_NEGOTIATION}:${Stage.HIRED}`,
    `${Stage.COMPENSATION_NEGOTIATION}:${Stage.REJECTED}`,
  ]);

  for (const currentStage of STAGES) {
    for (const targetStage of STAGES) {
      assert.equal(
        canChangeApplicantStage(currentStage, targetStage),
        allowedTransitions.has(`${currentStage}:${targetStage}`),
      );
    }
  }
}

function checkUndoStageTransitions() {
  assert.equal(
    canChangeApplicantStage(Stage.INTERVIEW, Stage.DOCUMENT_REVIEW),
    false,
    "ordinary backward PATCH must remain rejected with 400",
  );
  assert.equal(
    canUndoApplicantStage(Stage.INTERVIEW, Stage.DOCUMENT_REVIEW),
    true,
    "explicit undo must allow the immediate non-terminal reverse",
  );
  assert.equal(
    canUndoApplicantStage(
      Stage.COMPENSATION_NEGOTIATION,
      Stage.INTERVIEW,
    ),
    true,
    "explicit undo must allow the latest compensation transition",
  );
  assert.equal(
    canUndoApplicantStage(Stage.HIRED, Stage.COMPENSATION_NEGOTIATION),
    false,
    "terminal transitions must not be undoable",
  );
  assert.equal(
    canUndoApplicantStage(Stage.REJECTED, Stage.INTERVIEW),
    false,
    "rejected transitions must not be undoable",
  );
}

function checkApiValidationPriority() {
  const source = readFileSync(
    new URL("../src/mocks/handlers.ts", import.meta.url),
    "utf8",
  );
  const resolver = source.slice(
    source.indexOf("async function updateApplicantStageResolver"),
    source.indexOf("export const handlers"),
  );
  const explicitUndoIndex = resolver.indexOf("body.undo === true");
  const undoValidationIndex = resolver.indexOf("canUndoApplicantStage(");
  const normalValidationIndex = resolver.indexOf("canChangeApplicantStage(");
  const invalidTransitionIndex = resolver.indexOf(
    'return errorResponse("허용되지 않은 단계 변경입니다.", 400);',
  );
  const randomFailureIndex = resolver.indexOf("if (shouldFail())");
  const persistenceIndex = resolver.indexOf("localStorage.setItem(");

  assert.ok(explicitUndoIndex >= 0);
  assert.ok(undoValidationIndex > explicitUndoIndex);
  assert.ok(normalValidationIndex > explicitUndoIndex);
  assert.ok(invalidTransitionIndex > normalValidationIndex);
  assert.ok(randomFailureIndex > invalidTransitionIndex);
  assert.ok(persistenceIndex > invalidTransitionIndex);
}

checkStageCode();
checkStageTransitions();
checkUndoStageTransitions();
checkApiValidationPriority();
