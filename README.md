# 채용 파이프라인 보드

채용 담당자가 지원자의 채용 단계를 관리하는 과제 프로젝트입니다.

## 실행

```bash
pnpm install
pnpm dev
```

터미널에 표시된 로컬 주소로 접속합니다. 프로덕션 빌드는 다음 명령으로 확인할 수 있습니다.

```bash
pnpm build
pnpm start
```

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Mock Service Worker(MSW)

## Mock API

실제 백엔드 대신 브라우저 MSW를 사용하며 요청 핸들러는 `src/mocks/handlers.ts`에 정의합니다.

- `GET /api/applicants?stage={stage}&page={page}&name={name}&role={role}`: 영문 단계 코드와 이름·직무 조건을 적용한 뒤 100건씩 조회
- `PATCH /api/applicants/:id/stage`: 일반 변경은 `{ "stage": "INTERVIEW" }`, 직전 비종료 단계 실행 취소는 `{ "stage": "DOCUMENT_REVIEW", "undo": true }` 형식으로 저장
- 초기 데이터: 규칙으로 생성한 지원자 1,000건
- 네트워크 조건: 요청마다 `200~800ms` 지연, 유효한 요청은 약 `15%` 확률로 실패
- 저장 방식: 성공한 단계 변경만 브라우저 `localStorage`의 `worxphere.applicants.v4`에 저장해 새로고침 후 복원

단계 값은 `DOCUMENT_REVIEW`, `INTERVIEW`, `COMPENSATION_NEGOTIATION`, `HIRED`, `REJECTED`를 사용하며 한글 단계명은 화면에만 표시합니다.

최종합격 지원자의 불합격 변경은 `400`으로 거부하며, 실패한 변경은 브라우저 저장소에 반영하지 않습니다. 목록 조회는 쿼리 검증 뒤, 단계 저장은 지원자 존재·요청 본문·단계 전이 검증 뒤에만 약 15%의 임의 `500`을 판정합니다.

기능 요구사항은 [`docs/requirements.md`](docs/requirements.md)를 기준으로 합니다.

## 작업 규칙

`pnpm install` 시 Husky가 `.githooks`를 자동으로 활성화합니다. push 전에는 lint, 빠른 Node 테스트와 프로덕션 빌드를 실행합니다.

- 기능 커밋은 `type(feature-key): 요약` 형식을 사용합니다.
- 같은 `feature-key`의 기록을 `PROMPTS.md`에 포함해야 합니다.
- 비 fast-forward push는 차단됩니다.

```bash
pnpm lint
pnpm build
pnpm test:filter
pnpm test:keyboard
pnpm test:pagination
pnpm test:stage-code
pnpm test:stage-move
pnpm test:screens
pnpm test:pre-push
pnpm test:hooks
```

`pnpm test:screens`는 프로덕션 Chromium에서 데스크톱 이름 검색·직무 필터를 무작위로 100회 확인하고 `docs/screens-test-report.md`를 갱신합니다. 모바일, Firefox와 WebKit은 실행하지 않습니다.
