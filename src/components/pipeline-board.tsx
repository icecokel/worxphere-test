"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

const STAGE_DOT_CLASS_NAMES: Record<Stage, string> = {
  서류검토: "bg-chart-1",
  면접: "bg-chart-2",
  처우협의: "bg-chart-3",
  최종합격: "bg-chart-4",
  불합격: "bg-chart-5",
};

type PipelineBoardState =
  | { status: "loading" }
  | { status: "success"; applicants: Applicant[] }
  | { status: "error" };

async function fetchApplicants(signal: AbortSignal): Promise<Applicant[]> {
  const response = await fetch("/api/applicants", { signal });

  if (!response.ok) {
    throw new Error("지원자 조회 실패");
  }

  const data = (await response.json()) as GetApplicantsResponseSchema;
  return data.applicants;
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

function PipelineColumn({
  stage,
  applicants,
  isBoardEmpty,
}: {
  stage: Stage;
  applicants: Applicant[];
  isBoardEmpty: boolean;
}) {
  function renderApplicantCard(applicant: Applicant) {
    return <ApplicantCard key={applicant.id} applicant={applicant} />;
  }

  return (
    <section
      aria-labelledby={`stage-${stage}`}
      className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted/50 p-3"
    >
      <header className="flex items-center justify-between gap-3">
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
          {applicants.length}
        </span>
      </header>

      {applicants.length > 0 ? (
        <div className="space-y-3">{applicants.map(renderApplicantCard)}</div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          {isBoardEmpty ? "등록된 지원자가 없습니다." : "지원자 없음"}
        </p>
      )}
    </section>
  );
}

function PipelineColumns({ applicants }: { applicants: Applicant[] }) {
  function renderPipelineColumn(stage: Stage) {
    function matchesStage(applicant: Applicant) {
      return applicant.stage === stage;
    }

    const stageApplicants = applicants.filter(matchesStage);

    return (
      <PipelineColumn
        key={stage}
        stage={stage}
        applicants={stageApplicants}
        isBoardEmpty={applicants.length === 0}
      />
    );
  }

  return (
    <div className="flex min-h-full w-max gap-3">
      {STAGES.map(renderPipelineColumn)}
    </div>
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
      className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted/50 p-3"
    >
      <header className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{stage}</span>
        <Skeleton className="size-5 rounded-full" />
      </header>
      <div className="space-y-3">
        {LOADING_CARD_KEYS.map(renderLoadingCard)}
      </div>
    </section>
  );
}

function PipelineLoading() {
  function renderLoadingColumn(stage: Stage) {
    return <LoadingColumn key={stage} stage={stage} />;
  }

  return (
    <div aria-busy="true" aria-label="지원자를 불러오는 중">
      <div className="flex min-h-full w-max gap-3">
        {STAGES.map(renderLoadingColumn)}
      </div>
    </div>
  );
}

function PipelineError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex min-h-full items-center justify-center"
      role="alert"
    >
      <div className="space-y-3 text-center">
        <p className="text-sm text-muted-foreground">
          지원자를 불러오지 못했습니다.
        </p>
        <Button onClick={onRetry}>다시 시도</Button>
      </div>
    </div>
  );
}

export function PipelineBoard() {
  const [boardState, setBoardState] = useState<PipelineBoardState>({
    status: "loading",
  });
  const requestControllerRef = useRef<AbortController>(null);

  const loadApplicants = useCallback(function loadApplicants() {
    requestControllerRef.current?.abort();

    const controller = new AbortController();
    requestControllerRef.current = controller;

    fetchApplicants(controller.signal)
      .then(function showApplicants(applicants) {
        if (!controller.signal.aborted) {
          setBoardState({ status: "success", applicants });
        }
      })
      .catch(function showApplicantError() {
        if (!controller.signal.aborted) {
          setBoardState({ status: "error" });
        }
      });
  }, []);

  const retryApplicants = useCallback(
    function retryApplicants() {
      setBoardState({ status: "loading" });
      void loadApplicants();
    },
    [loadApplicants],
  );

  useEffect(
    function loadApplicantsOnMount() {
      void loadApplicants();

      return function abortApplicantRequest() {
        requestControllerRef.current?.abort();
      };
    },
    [loadApplicants],
  );

  let boardContent;

  if (boardState.status === "loading") {
    boardContent = <PipelineLoading />;
  } else if (boardState.status === "error") {
    boardContent = <PipelineError onRetry={retryApplicants} />;
  } else {
    boardContent = <PipelineColumns applicants={boardState.applicants} />;
  }

  return (
    <main className="flex h-svh min-w-0 flex-col gap-4 p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">채용 파이프라인 보드</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-auto" aria-label="지원자 보드">
        {boardContent}
      </div>
    </main>
  );
}
