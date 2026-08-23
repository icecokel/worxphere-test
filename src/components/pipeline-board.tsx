"use client";

import {
  type UIEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  STAGES,
  type Applicant,
  type GetApplicantsResponseSchema,
  type Stage,
} from "@/lib/pipeline";

const LOADING_CARD_KEYS = ["first", "second", "third"];
const LOAD_MORE_THRESHOLD_PX = 160;

const STAGE_DOT_CLASS_NAMES: Record<Stage, string> = {
  서류검토: "bg-chart-1",
  면접: "bg-chart-2",
  처우협의: "bg-chart-3",
  최종합격: "bg-chart-4",
  불합격: "bg-chart-5",
};

interface StageColumnState {
  applicants: Applicant[];
  total: number;
  nextPage: number;
  hasMore: boolean;
  isLoading: boolean;
  hasError: boolean;
}

type PipelineBoardState = Record<Stage, StageColumnState>;

function createInitialColumnState(): StageColumnState {
  return {
    applicants: [],
    total: 0,
    nextPage: 1,
    hasMore: true,
    isLoading: true,
    hasError: false,
  };
}

function createInitialStageEntry(stage: Stage): [Stage, StageColumnState] {
  return [stage, createInitialColumnState()];
}

function createInitialBoardState(): PipelineBoardState {
  return Object.fromEntries(
    STAGES.map(createInitialStageEntry),
  ) as PipelineBoardState;
}

async function fetchApplicants(
  stage: Stage,
  page: number,
  signal: AbortSignal,
): Promise<GetApplicantsResponseSchema> {
  const searchParams = new URLSearchParams({
    stage,
    page: String(page),
  });
  const response = await fetch(`/api/applicants?${searchParams}`, { signal });

  if (!response.ok) {
    throw new Error("지원자 조회 실패");
  }

  return (await response.json()) as GetApplicantsResponseSchema;
}

function formatAppliedAt(appliedAt: string): string {
  return appliedAt.slice(0, 10).replaceAll("-", ".");
}

function ApplicantCard({ applicant }: { applicant: Applicant }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{applicant.name}</CardTitle>
        <CardDescription>{applicant.role}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-muted-foreground">
        <p>지원일 {formatAppliedAt(applicant.appliedAt)}</p>
        <p>현재 단계 {applicant.stage}</p>
      </CardContent>
    </Card>
  );
}

function LoadingCard() {
  return (
    <Card aria-hidden="true" size="sm">
      <CardHeader>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
      </CardContent>
    </Card>
  );
}

function LoadingColumn({ stage }: { stage: Stage }) {
  function renderLoadingCard(cardKey: string) {
    return <LoadingCard key={cardKey} />;
  }

  return (
    <section
      aria-hidden="true"
      className="flex h-full w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted/50 p-3"
    >
      <header className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{stage}</span>
        <Skeleton className="size-5 rounded-full" />
      </header>
      <div className="space-y-3 overflow-hidden">
        {LOADING_CARD_KEYS.map(renderLoadingCard)}
      </div>
    </section>
  );
}

function PipelineColumn({
  stage,
  columnState,
  isBoardEmpty,
  onLoadPage,
}: {
  stage: Stage;
  columnState: StageColumnState;
  isBoardEmpty: boolean;
  onLoadPage: (stage: Stage, page: number) => void;
}) {
  const { applicants, total, nextPage, hasMore, isLoading, hasError } =
    columnState;

  function renderApplicantCard(applicant: Applicant) {
    return <ApplicantCard key={applicant.id} applicant={applicant} />;
  }

  function loadNextPage() {
    onLoadPage(stage, nextPage);
  }

  function handleColumnScroll(event: UIEvent<HTMLDivElement>) {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
    const isNearBottom =
      scrollHeight - scrollTop - clientHeight <= LOAD_MORE_THRESHOLD_PX;

    if (isNearBottom && hasMore && !isLoading && !hasError) {
      loadNextPage();
    }
  }

  if (isLoading && applicants.length === 0) {
    return <LoadingColumn stage={stage} />;
  }

  return (
    <section
      aria-labelledby={`stage-${stage}`}
      className="flex h-full w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted/50 p-3"
    >
      <header className="flex shrink-0 items-center justify-between gap-3">
        <h2
          id={`stage-${stage}`}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${STAGE_DOT_CLASS_NAMES[stage]}`}
          />
          {stage}
        </h2>
        <span className="text-sm tabular-nums text-muted-foreground">
          {total}
        </span>
      </header>

      <div
        aria-label={`${stage} 지원자 목록`}
        className="min-h-0 flex-1 overflow-y-auto pr-1"
        onScroll={handleColumnScroll}
      >
        {applicants.length > 0 ? (
          <div className="space-y-3">
            {applicants.map(renderApplicantCard)}
            {isLoading ? <LoadingCard /> : null}
          </div>
        ) : null}

        {hasError ? (
          <div className="space-y-3 rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              지원자를 불러오지 못했습니다.
            </p>
            <Button size="sm" variant="outline" onClick={loadNextPage}>
              다시 시도
            </Button>
          </div>
        ) : null}

        {applicants.length === 0 && !hasError ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            {isBoardEmpty ? "등록된 지원자가 없습니다." : "지원자 없음"}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PipelineColumns({
  boardState,
  onLoadPage,
}: {
  boardState: PipelineBoardState;
  onLoadPage: (stage: Stage, page: number) => void;
}) {
  const isBoardEmpty = STAGES.every(function isStageEmpty(stage) {
    const columnState = boardState[stage];
    return (
      !columnState.isLoading &&
      !columnState.hasError &&
      columnState.total === 0
    );
  });

  function renderPipelineColumn(stage: Stage) {
    return (
      <PipelineColumn
        key={stage}
        stage={stage}
        columnState={boardState[stage]}
        isBoardEmpty={isBoardEmpty}
        onLoadPage={onLoadPage}
      />
    );
  }

  return (
    <div className="flex h-full w-max gap-3">
      {STAGES.map(renderPipelineColumn)}
    </div>
  );
}

export function PipelineBoard() {
  const [boardState, setBoardState] =
    useState<PipelineBoardState>(createInitialBoardState);
  const requestControllersRef = useRef(new Map<Stage, AbortController>());

  const loadStagePage = useCallback(function loadStagePage(
    stage: Stage,
    page: number,
  ) {
    if (requestControllersRef.current.has(stage)) {
      return;
    }

    const controller = new AbortController();
    requestControllersRef.current.set(stage, controller);

    setBoardState(function markStageLoading(currentState) {
      return {
        ...currentState,
        [stage]: {
          ...currentState[stage],
          isLoading: true,
          hasError: false,
        },
      };
    });

    fetchApplicants(stage, page, controller.signal)
      .then(function showStageApplicants(response) {
        if (controller.signal.aborted) {
          return;
        }

        setBoardState(function appendStageApplicants(currentState) {
          const currentColumn = currentState[stage];
          const applicants =
            page === 1
              ? response.applicants
              : [...currentColumn.applicants, ...response.applicants];

          return {
            ...currentState,
            [stage]: {
              applicants,
              total: response.total,
              nextPage: response.page + 1,
              hasMore: response.hasMore,
              isLoading: false,
              hasError: false,
            },
          };
        });
      })
      .catch(function showStageError() {
        if (!controller.signal.aborted) {
          setBoardState(function markStageError(currentState) {
            return {
              ...currentState,
              [stage]: {
                ...currentState[stage],
                isLoading: false,
                hasError: true,
              },
            };
          });
        }
      })
      .finally(function clearStageRequest() {
        if (requestControllersRef.current.get(stage) === controller) {
          requestControllersRef.current.delete(stage);
        }
      });
  }, []);

  useEffect(
    function loadInitialStagePages() {
      const requestControllers = requestControllersRef.current;

      STAGES.forEach(function loadFirstStagePage(stage) {
        loadStagePage(stage, 1);
      });

      return function abortStageRequests() {
        requestControllers.forEach(function abortStageRequest(controller) {
          controller.abort();
        });
        requestControllers.clear();
      };
    },
    [loadStagePage],
  );

  return (
    <main className="flex h-svh min-w-0 flex-col gap-4 p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">채용 파이프라인 보드</h1>
      </header>
      <div
        className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
        aria-label="지원자 보드"
      >
        <PipelineColumns boardState={boardState} onLoadPage={loadStagePage} />
      </div>
    </main>
  );
}
