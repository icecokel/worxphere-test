import assert from "node:assert/strict";

import {
  getKeyboardStageTarget,
  Stage,
} from "../src/lib/pipeline.ts";

function checkKeyboardStageTargets() {
  assert.equal(
    getKeyboardStageTarget(Stage.DOCUMENT_REVIEW, "ArrowLeft"),
    null,
  );
  assert.equal(
    getKeyboardStageTarget(Stage.DOCUMENT_REVIEW, "ArrowRight"),
    Stage.INTERVIEW,
  );
  assert.equal(
    getKeyboardStageTarget(Stage.INTERVIEW, "ArrowLeft"),
    Stage.DOCUMENT_REVIEW,
  );
  assert.equal(
    getKeyboardStageTarget(Stage.INTERVIEW, "ArrowRight"),
    Stage.COMPENSATION_NEGOTIATION,
  );
  assert.equal(
    getKeyboardStageTarget(Stage.COMPENSATION_NEGOTIATION, "ArrowLeft"),
    Stage.INTERVIEW,
  );
  assert.equal(
    getKeyboardStageTarget(Stage.COMPENSATION_NEGOTIATION, "ArrowRight"),
    Stage.HIRED,
  );
  assert.equal(getKeyboardStageTarget(Stage.HIRED, "ArrowLeft"), null);
  assert.equal(getKeyboardStageTarget(Stage.HIRED, "ArrowRight"), null);
  assert.equal(getKeyboardStageTarget(Stage.REJECTED, "ArrowLeft"), null);
  assert.equal(getKeyboardStageTarget(Stage.REJECTED, "ArrowRight"), null);
}

checkKeyboardStageTargets();
