# 채용 파이프라인 보드

채용 담당자가 지원자의 채용 단계를 관리하는 과제 프로젝트입니다.

## 실행

```bash
pnpm install
pnpm dev
```

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Mock Service Worker(MSW)

실제 백엔드 대신 브라우저 MSW를 사용합니다. 요청 핸들러는 `src/mocks/handlers.ts`에 정의합니다.

기능 요구사항은 [`docs/requirements.md`](docs/requirements.md)를 기준으로 합니다.
