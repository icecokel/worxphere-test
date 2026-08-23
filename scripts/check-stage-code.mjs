import assert from "node:assert/strict";

import { Stage, STAGE_LABELS, STAGES } from "../src/lib/pipeline.ts";

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

checkStageCode();
