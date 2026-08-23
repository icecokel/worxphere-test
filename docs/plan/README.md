# 채용 파이프라인 보드 구현 계획

## 기준 문서

구현 판단은 다음 순서로 따른다.

1. [요구사항](../requirements.md)
2. [와이어프레임과 화면 명세](../wireframe.md)
3. [설계 결정](../../DECISIONS.md)
4. 이 구현 계획

상위 문서와 충돌하는 계획은 실행하지 않고 상위 문서를 기준으로 계획을 수정한다.

## 범위

- 이번 계획은 Must 요구사항 완료를 목표로 한다.
- Should 요구사항은 모든 Must 검증 후에만 검토한다.
- 지원자 등록·수정·삭제, 공고 관리, 평가, 일정, 메시지, 인증, 실제 백엔드는 작업하지 않는다.
- 화면은 `/` 단일 경로와 데스크톱 우선 가로 스크롤 보드로 한정한다.

## Phase 구성

| Phase | 목표 | 주요 feature-key | 완료 기준 | 문서 |
| --- | --- | --- | --- | --- |
| 1 | 지원자 데이터와 mock API 구성 | `mock-api` | 조회·단계 저장·지연·실패·새로고침 유지 | [Phase 1](phase-1-mock-api.md) |
| 2 | 읽기 전용 파이프라인 보드 구성 | `pipeline-board` | 5개 컬럼, 카드, 로딩·오류·빈 상태 | [Phase 2](phase-2-pipeline-board.md) |
| 3 | 검색·필터와 상세 패널 구성 | `candidate-filter`, `candidate-detail` | 이름/직무 탐색과 우측 상세 확인 | [Phase 3](phase-3-search-and-detail.md) |
| 4 | 상세 패널 단계 변경과 낙관적 업데이트 구성 | `stage-move` | 명시적 확인, 저장, 롤백, 실패 알림 | [Phase 4](phase-4-stage-move.md) |
| 5 | 통합 검증과 제출 문서 정리 | `release-check` | Must 시나리오 검증과 문서 최신화 | [Phase 5](phase-5-verification.md) |

Phase는 순서대로 실행한다. 앞 Phase의 완료 기준을 통과하기 전에는 다음 Phase를 시작하지 않는다.

## Task 실행 규칙

1. Task 시작 전에 해당 Phase 파일과 기준 문서를 다시 확인한다.
2. Next.js 코드를 수정하기 전 `node_modules/next/dist/docs/`에서 관련 현재 버전 문서를 확인한다.
3. 공용 UI는 기존 컴포넌트 → shadcn/ui → 신규 도메인 컴포넌트 순서로 선택하고 `shadcn-default-design` 스킬로 기본 스타일을 유지한다.
4. 새 라이브러리는 추가하지 않는다. 현재 의존성과 브라우저 기본 기능으로 Must를 구현한다.
5. 각 feature-key마다 [PROMPTS.md](../../PROMPTS.md)에 실제 프롬프트, AI 출력 요지, 리뷰·검증을 기록한다.
6. 하나의 기능과 직접 관련된 코드·문서만 같은 커밋에 포함한다.
7. 각 Task의 검증을 마친 뒤 커밋하며 squash와 force-push를 사용하지 않는다.

## 예정 커밋 순서

1. `feat(mock-api): 지원자 조회와 단계 저장 API 추가`
2. `feat(pipeline-board): 채용 단계 보드와 화면 상태 추가`
3. `feat(candidate-filter): 지원자 이름 검색과 직무 필터 추가`
4. `feat(candidate-detail): 지원자 상세 패널 추가`
5. `feat(stage-move): 카드 단계 이동과 실패 롤백 추가`
6. `fix(stage-move): 단계 변경을 상세 패널 액션으로 전환`
7. `docs(release-check): 구현 검증과 제출 문서 정리`

커밋 직전 실제 변경 범위가 다르면 메시지를 실제 diff에 맞추되 feature-key는 유지한다.

## Must 추적표

| 요구사항 | 담당 Task |
| --- | --- |
| 단계별 컬럼과 지원자 카드 | `2.2`, `2.3` |
| 카드 필수 정보 | `2.3` |
| mock API 저장과 새로고침 유지 | `1.2`, `1.3`, `4.2` |
| 상세 패널의 명시적 단계 변경 | `4.1` |
| 낙관적 업데이트와 롤백 | `4.2`, `4.3` |
| 이름 검색과 직무 필터 | `3.1` |
| 200건 이상 탐색 성능 | `1.2`, `3.1`, `5.2` |
| 지원자 상세 패널 | `3.2` |
| 로딩·요청 실패·빈 상태 | `2.1`, `2.4`, `3.1` |

## 전체 완료 조건

- [ ] 모든 Must 항목이 위 추적표의 Task 결과로 확인된다.
- [ ] `pnpm lint`, `pnpm build`, `pnpm test:hooks`가 통과한다.
- [ ] 성공 저장, 새로고침 유지, 실패 롤백을 실제 브라우저에서 확인한다.
- [ ] `README.md`, `DECISIONS.md`, `PROMPTS.md`가 실제 구현과 검증 결과를 반영한다.
- [ ] 작업 트리에 의도하지 않은 변경이 남아 있지 않다.
- [ ] Should와 범위 밖 기능이 Must 커밋에 섞이지 않는다.
