# Phase 2. 읽기 전용 파이프라인 보드

[전체 계획](README.md) · 기준: [화면 명세](../wireframe.md#2-화면-구조)

## 목표

mock API에서 지원자를 불러와 5개 고정 컬럼과 지원자 카드로 표시한다. 검색·상세·단계 이동 전에도 로딩, 조회 실패, 전체 빈 상태와 컬럼 빈 상태를 확인할 수 있어야 한다.

## 선행조건

- Phase 1의 GET API와 지원자 계약이 완료됐다.
- `pnpm build`가 통과한다.

## Task 2.1. 목록 조회와 화면 상태 구성

- feature-key: `pipeline-board`
- 예상 파일: `src/app/page.tsx`, `src/components/pipeline-board.tsx`

작업:

- [ ] `/`에서 클라이언트 보드 컴포넌트를 렌더링한다.
- [ ] 최초 마운트 시 `GET /api/applicants`를 호출한다.
- [ ] `loading`, `success`, `error` 상태를 최소 상태값으로 관리한다.
- [ ] 로딩 중에는 5개 컬럼 형태의 스켈레톤을 표시한다.
- [ ] 조회 실패 시 `지원자를 불러오지 못했습니다.`와 기존 `Button` 기반 `다시 시도`를 표시한다.
- [ ] 재시도는 같은 GET 요청을 다시 실행한다.
- [ ] 언마운트 후 완료된 요청이 화면 상태를 갱신하지 않게 한다.

공용 UI 선택:

- 기존 `Button`은 그대로 재사용한다.
- 스켈레톤은 기존 구현이 없으므로 필요한 shadcn/ui 구성요소만 추가한다.

## Task 2.2. 보드와 컬럼 레이아웃 구성

- feature-key: `pipeline-board`
- 예상 파일: `src/components/pipeline-board.tsx`, 필요 시 `src/app/globals.css`

작업:

- [ ] 헤더에 `채용 파이프라인 보드`를 표시한다.
- [ ] 컬럼 순서를 공용 `STAGES` 상수로 고정한다.
- [ ] 모든 컬럼을 `288px` 동일 너비, `12px` 간격으로 표시한다.
- [ ] 화면 너비가 부족하면 보드만 가로 스크롤되게 한다.
- [ ] 컬럼 헤더에 단계명과 현재 카드 수를 표시한다.
- [ ] shadcn/ui `base-nova`, `neutral` 기본 스타일과 기존 semantic token을 유지한다.
- [ ] 단계 색상은 점·배지에만 최소로 사용하고 텍스트 단계명을 유지한다.
- [ ] 나인하이어의 브랜드 색상이나 장식을 복제하지 않는다.

## Task 2.3. 지원자 카드 구성

- feature-key: `pipeline-board`
- 예상 파일: `src/components/pipeline-board.tsx`

작업:

- [ ] 지원자를 현재 `stage` 컬럼에만 배치한다.
- [ ] 카드 정보 순서를 이름 → 직무 → 지원일 → 현재 단계로 맞춘다.
- [ ] 지원일을 `YYYY.MM.DD`로 표시한다.
- [ ] 카드는 shadcn/ui Card의 기본 배경, 테두리, 그림자, radius를 사용한다.
- [ ] 아직 클릭, 드래그, 저장 동작은 연결하지 않는다.

## Task 2.4. 빈 상태 구분

- feature-key: `pipeline-board`

작업:

- [ ] 전체 데이터가 없으면 컬럼 헤더를 유지하고 `등록된 지원자가 없습니다.`를 표시한다.
- [ ] 다른 컬럼에 카드가 있고 특정 컬럼만 비면 해당 컬럼에 `지원자 없음`을 표시한다.
- [ ] 모든 빈 상태에서도 컬럼 인원수는 `0`으로 표시한다.

## Phase 검증

- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] 초기 로딩 스켈레톤 확인
- [ ] GET 성공 시 5개 컬럼, 카드 위치, 카드 필수 정보 확인
- [ ] GET 실패 후 재시도 확인
- [ ] 전체 빈 상태와 일부 컬럼 빈 상태 확인
- [ ] 좁은 화면에서 보드 가로 스크롤 확인
- [ ] `PROMPTS.md`의 `[pipeline-board]`에 실제 검증 결과 기록

## 커밋

```text
feat(pipeline-board): 채용 단계 보드와 화면 상태 추가
```

이 Phase에는 검색·직무 필터, 상세 패널, 단계 이동을 포함하지 않는다.
