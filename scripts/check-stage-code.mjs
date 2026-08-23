import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  canChangeApplicantStage,
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

function checkApiValidationPriority() {
  const source = readFileSync(
    new URL("../src/mocks/handlers.ts", import.meta.url),
    "utf8",
  );
  const resolver = source.slice(
    source.indexOf("async function updateApplicantStageResolver"),
    source.indexOf("export const handlers"),
  );
  const validationIndex = resolver.indexOf("canChangeApplicantStage(");
  const invalidTransitionIndex = resolver.indexOf(
    'return errorResponse("허용되지 않은 단계 변경입니다.", 400);',
  );
  const randomFailureIndex = resolver.indexOf("if (shouldFail())");
  const persistenceIndex = resolver.indexOf("localStorage.setItem(");

  assert.ok(validationIndex >= 0);
  assert.ok(invalidTransitionIndex > validationIndex);
  assert.ok(randomFailureIndex > invalidTransitionIndex);
  assert.ok(persistenceIndex > invalidTransitionIndex);
}

checkStageCode();
checkStageTransitions();
checkApiValidationPriority();
