import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { paginateApplicants, Stage } from "../src/lib/pipeline.ts";

function createApplicant(_value, index) {
  return {
    id: String(index + 1),
    name: `지원자 ${index + 1}`,
    role: "프론트엔드 개발자",
    appliedAt: "2026-08-23T00:00:00.000Z",
    stage: Stage.DOCUMENT_REVIEW,
  };
}

function checkPagination() {
  const applicants = Array.from({ length: 201 }, createApplicant);
  const firstPage = paginateApplicants(applicants, 1);
  const secondPage = paginateApplicants(applicants, 2);
  const lastPage = paginateApplicants(applicants, 3);

  assert.equal(firstPage.applicants.length, 100);
  assert.equal(firstPage.total, 201);
  assert.equal(firstPage.hasMore, true);
  assert.equal(secondPage.applicants[0].id, "101");
  assert.equal(lastPage.applicants.length, 1);
  assert.equal(lastPage.hasMore, false);
}

function checkInvalidRequestPriority() {
  const source = readFileSync(
    new URL("../src/mocks/handlers.ts", import.meta.url),
    "utf8",
  );
  const resolver = source.slice(
    source.indexOf("async function getApplicantsResolver"),
    source.indexOf("async function updateApplicantStageResolver"),
  );
  const invalidRequestIndex = resolver.indexOf(
    'return errorResponse("페이지 요청이 올바르지 않습니다.", 400);',
  );
  const randomFailureIndex = resolver.indexOf("if (shouldFail())");

  assert.ok(invalidRequestIndex >= 0);
  assert.ok(randomFailureIndex > invalidRequestIndex);
}

checkPagination();
checkInvalidRequestPriority();
