# AI 협업 기록

## [project-setup] 프로젝트 기반 설정

### 프롬프트 1

> 프로젝트 세팅한다.
>
> 1. nextjs, ts, tailwind
> 2. shadcn
> 3. msw

### AI 출력 요지

- Next.js App Router와 TypeScript, Tailwind CSS 프로젝트를 생성했다.
- shadcn/ui를 초기화하고 기본 Button 컴포넌트를 추가했다.
- MSW worker와 브라우저 초기화 파일을 구성했다.

### 리뷰 / 검증

- Next.js 기본 예제 화면과 프로젝트에 불필요한 안내 링크를 제거했다.
- 실제 백엔드가 없는 과제이므로 MSW 시작이 끝난 뒤 애플리케이션을 표시하도록 구성했다.
- MSW 자동 생성 worker는 ESLint 검사에서 제외하고 애플리케이션 코드는 `pnpm lint`로 검증했다.
- `pnpm build`로 타입 검사와 프로덕션 빌드가 통과하는지 확인했다.
