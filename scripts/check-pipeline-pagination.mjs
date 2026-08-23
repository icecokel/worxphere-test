import assert from "node:assert/strict";

import { paginateApplicants } from "../src/lib/pipeline.ts";

function createApplicant(_value, index) {
  return {
    id: String(index + 1),
    name: `지원자 ${index + 1}`,
    role: "프론트엔드 개발자",
    appliedAt: "2026-08-23T00:00:00.000Z",
    stage: "서류검토",
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

checkPagination();
