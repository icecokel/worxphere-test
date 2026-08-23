import assert from "node:assert/strict";

import { filterApplicants } from "../src/lib/pipeline.ts";

const applicants = [
  {
    id: "1",
    name: "홍길동",
    role: "프론트엔드 개발자",
    appliedAt: "2026-08-23T00:00:00.000Z",
    stage: "서류검토",
  },
  {
    id: "2",
    name: "Alex Kim",
    role: "백엔드 개발자",
    appliedAt: "2026-08-22T00:00:00.000Z",
    stage: "면접",
  },
];

function checkCandidateFilter() {
  assert.deepEqual(filterApplicants(applicants, " 길 "), [applicants[0]]);
  assert.deepEqual(filterApplicants(applicants, "ALEX"), [applicants[1]]);
  assert.deepEqual(filterApplicants(applicants, "", "백엔드 개발자"), [
    applicants[1],
  ]);
  assert.deepEqual(
    filterApplicants(applicants, "kim", "프론트엔드 개발자"),
    [],
  );
  assert.deepEqual(filterApplicants(applicants, "  "), applicants);
}

checkCandidateFilter();
