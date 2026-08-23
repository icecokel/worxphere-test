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

- `GET /api/applicants?stage={stage}&page={page}&name={name}&role={role}`: 이름·직무·단계를 적용한 뒤 100건씩 조회
- `PATCH /api/applicants/:id/stage`: `{ "stage": "면접" }` 형식으로 단계 저장
- 초기 데이터: 규칙으로 생성한 지원자 1,000건
- 네트워크 조건: 요청마다 `200~800ms` 지연, 유효한 요청은 약 `15%` 확률로 실패
- 저장 방식: 성공한 단계 변경만 브라우저 `localStorage`의 `worxphere.applicants.v2`에 저장해 새로고침 후 복원

최종합격 지원자의 불합격 변경은 `400`으로 거부하며, 실패한 변경은 브라우저 저장소에 반영하지 않습니다.

기능 요구사항은 [`docs/requirements.md`](docs/requirements.md)를 기준으로 합니다.

## 작업 규칙

`pnpm install` 시 `.githooks`가 자동으로 활성화됩니다.

- 기능 커밋은 `type(feature-key): 요약` 형식을 사용합니다.
- 같은 `feature-key`의 기록을 `PROMPTS.md`에 포함해야 합니다.
- 비 fast-forward push는 차단됩니다.

```bash
pnpm lint
pnpm build
pnpm test:filter
pnpm test:pagination
pnpm test:hooks
```
