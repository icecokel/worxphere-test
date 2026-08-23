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

## [workflow-guardrails] 기능 단위 커밋 자동화

### 프롬프트 1

> - 하나의 기능을 하나의 커밋으로 기록한다.
> - 커밋을 squash하거나 force-push로 정리하지 않는다.
> - `PROMPTS.md`에 기능별 프롬프트와 AI 출력에 대한 실제 리뷰·검증 내용을 남긴다.
>
> 이 부분을 스킬과 훅으로 만들어 자동으로 세팅되도록하자.

### AI 출력 요지

- 기능 키를 커밋과 `PROMPTS.md`에서 일치시키는 프로젝트 스킬을 추가했다.
- 기능 커밋의 메시지와 프롬프트 로그 구조를 검사하는 `commit-msg` 훅을 추가했다.
- 비 fast-forward push를 막는 `pre-push` 훅과 자동 설치 스크립트를 추가했다.

### 리뷰 / 검증

- 하나의 커밋이 의미적으로 하나의 기능인지는 훅으로 정확히 판별할 수 없어 스킬의 판단 규칙으로 남겼다.
- squash만 선별해 차단하는 것은 신뢰할 수 없어 전체 rebase를 막지 않고 스킬 규칙으로 유지했다.
- force-push 결과인 비 fast-forward 갱신은 `pre-push`에서 차단하도록 했다.
- `pnpm test:hooks`로 올바른 로그가 있는 커밋과 fast-forward push는 통과하고, 범위·로그가 없는 기능 커밋과 비 fast-forward push는 실패하는지 검증했다.
- 스킬 validator와 `pnpm lint`를 통과했으며, 설치된 훅 파일의 실행 권한과 `core.hooksPath` 설정을 확인했다.

### 프롬프트 2

> agents.md에 추가해서 일관되도록 하고

### AI 출력 요지

- 기능 단위 커밋, `feature-key`, `PROMPTS.md`, squash·force-push 규칙을 `AGENTS.md`에 추가했다.
- 스킬과 훅이 담당하는 범위를 `AGENTS.md`에서도 동일하게 명시했다.

### 리뷰 / 검증

- Next.js가 관리하는 자동 생성 블록은 수정하지 않고 프로젝트 규칙을 블록 밖에 추가했다.
- `atomic-feature-commits` 스킬, Git 훅, `AGENTS.md`의 규칙이 서로 모순되지 않는지 대조했다.

## [screen-spec] 파이프라인 화면 설계

### 프롬프트

> 요구사항 문서를 보고 작업 전 와이어프레임을 Mermaid로 작성한다.
>
> 나인하이어 ATS를 레퍼런스로 사용하고, 작업자가 바로 이해할 수 있도록 화면 명세를 자세히 작성한다.

### AI 출력 요지

- 단계별 컬럼, 지원자 카드, 검색·필터, 상세 패널과 화면 상태를 Mermaid 와이어프레임으로 정리했다.
- 레이아웃, 표시 정보, 상호작용, 낙관적 업데이트, mock API 계약과 완료 확인 기준을 문서화했다.

### 리뷰 / 검증

- `docs/requirements.md`의 Must와 화면 명세를 대조했다.
- 나인하이어 화면의 카드형 정보 구조만 채택하고 범위 밖인 공고 관리, 평가, 메시지, 일정 기능은 제외했다.
- 요구사항에 없는 뒤로 가기, 공고 상태, 상대 시간 정보를 와이어프레임에서 제거했다.
- 저장소 검색 결과 기존 공용 UI는 `Button`만 확인되어, 나머지는 필요한 shadcn/ui 구성요소만 추가하도록 명시했다.
