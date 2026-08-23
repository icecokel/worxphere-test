"use client";

import {
  type ChangeEvent,
  type UIEvent,
  useCallback,
  useEffect,
  useMemo,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  filterApplicants,
  matchesApplicantFilters,
  STAGES,
  type Applicant,
  type GetApplicantsResponseSchema,
  type Stage,
} from "@/lib/pipeline";

const LOADING_CARD_KEYS = ["first", "second", "third"];
const LOAD_MORE_THRESHOLD_PX = 160;
const ALL_ROLES_VALUE = "all";

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

function ApplicantCard({
  applicant,
  onSelect,
}: {
  applicant: Applicant;
  onSelect: (applicantId: string) => void;
}) {
  function handleSelect() {
    onSelect(applicant.id);
  }

  return (
    <button
      type="button"
      aria-label={`${applicant.name} 지원자 상세 보기`}
      className="block w-full rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={handleSelect}
    >
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
    </button>
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
  hasActiveFilters,
  onApplicantSelect,
  onLoadPage,
}: {
  stage: Stage;
  columnState: StageColumnState;
  isBoardEmpty: boolean;
  hasActiveFilters: boolean;
  onApplicantSelect: (applicantId: string) => void;
  onLoadPage: (stage: Stage, page: number) => void;
}) {
  const { applicants, total, nextPage, hasMore, isLoading, hasError } =
    columnState;

  function renderApplicantCard(applicant: Applicant) {
    return (
      <ApplicantCard
        key={applicant.id}
        applicant={applicant}
        onSelect={onApplicantSelect}
      />
    );
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

  if (!hasActiveFilters && isLoading && applicants.length === 0) {
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
            {hasActiveFilters
              ? "조건에 맞는 지원자가 없습니다."
              : isBoardEmpty
                ? "등록된 지원자가 없습니다."
                : "지원자 없음"}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PipelineColumns({
  boardState,
  hasActiveFilters,
  onApplicantSelect,
  onLoadPage,
}: {
  boardState: PipelineBoardState;
  hasActiveFilters: boolean;
  onApplicantSelect: (applicantId: string) => void;
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
        hasActiveFilters={hasActiveFilters}
        onApplicantSelect={onApplicantSelect}
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
  const [nameQuery, setNameQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState(ALL_ROLES_VALUE);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(
    null,
  );
  const requestControllersRef = useRef(new Map<Stage, AbortController>());

  const loadedApplicants = useMemo(
    function combineLoadedApplicants() {
      return STAGES.flatMap(function getStageApplicants(stage) {
        return boardState[stage].applicants;
      });
    },
    [boardState],
  );

  const selectedApplicant = useMemo(
    function findSelectedApplicant() {
      if (selectedApplicantId === null) {
        return undefined;
      }

      return loadedApplicants.find(function hasSelectedApplicantId(applicant) {
        return applicant.id === selectedApplicantId;
      });
    },
    [loadedApplicants, selectedApplicantId],
  );

  const availableRoles = useMemo(
    function calculateAvailableRoles() {
      return Array.from(
        new Set(
          loadedApplicants.map(function getApplicantRole(applicant) {
            return applicant.role;
          }),
        ),
      );
    },
    [loadedApplicants],
  );

  const hasActiveFilters =
    nameQuery.trim() !== "" || selectedRole !== ALL_ROLES_VALUE;

  const visibleBoardState = useMemo(
    function calculateVisibleBoardState() {
      if (!hasActiveFilters) {
        return boardState;
      }

      const role =
        selectedRole === ALL_ROLES_VALUE ? undefined : selectedRole;

      return Object.fromEntries(
        STAGES.map(function createVisibleStageEntry(stage) {
          const columnState = boardState[stage];
          const applicants = filterApplicants(
            columnState.applicants,
            nameQuery,
            role,
          );

          return [
            stage,
            { ...columnState, applicants, total: applicants.length },
          ];
        }),
      ) as PipelineBoardState;
    },
    [boardState, hasActiveFilters, nameQuery, selectedRole],
  );

  const isInitialLoading = STAGES.some(function isStageInitiallyLoading(stage) {
    const columnState = boardState[stage];
    return columnState.isLoading && columnState.applicants.length === 0;
  });

  function closeDetailWhenApplicantIsHidden(
    nextNameQuery: string,
    nextSelectedRole: string,
  ) {
    if (selectedApplicant === undefined) {
      return;
    }

    const role =
      nextSelectedRole === ALL_ROLES_VALUE ? undefined : nextSelectedRole;
    const isVisible = matchesApplicantFilters(
      selectedApplicant,
      nextNameQuery,
      role,
    );

    if (!isVisible) {
      setSelectedApplicantId(null);
    }
  }

  function handleNameQueryChange(event: ChangeEvent<HTMLInputElement>) {
    const nextNameQuery = event.currentTarget.value;
    setNameQuery(nextNameQuery);
    closeDetailWhenApplicantIsHidden(nextNameQuery, selectedRole);
  }

  function handleRoleChange(role: string | null) {
    const nextSelectedRole = role ?? ALL_ROLES_VALUE;
    setSelectedRole(nextSelectedRole);
    closeDetailWhenApplicantIsHidden(nameQuery, nextSelectedRole);
  }

  function handleApplicantSelect(applicantId: string) {
    setSelectedApplicantId(applicantId);
  }

  function handleDetailOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setSelectedApplicantId(null);
    }
  }

  function renderRoleOption(role: string) {
    return (
      <SelectItem key={role} value={role}>
        {role}
      </SelectItem>
    );
  }

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
        aria-label="지원자 검색과 필터"
        className="flex shrink-0 flex-wrap gap-4"
      >
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="name-search">
          이름 검색
          <Input
            id="name-search"
            type="search"
            className="w-64"
            disabled={isInitialLoading}
            placeholder="지원자 이름 검색"
            value={nameQuery}
            onChange={handleNameQueryChange}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="role-filter">
          직무
          <Select
            value={selectedRole}
            disabled={isInitialLoading}
            onValueChange={handleRoleChange}
          >
            <SelectTrigger id="role-filter" className="w-56">
              <SelectValue>
                {selectedRole === ALL_ROLES_VALUE ? "전체" : selectedRole}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value={ALL_ROLES_VALUE}>전체</SelectItem>
              {availableRoles.map(renderRoleOption)}
            </SelectContent>
          </Select>
        </label>
      </div>
      <div
        className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
        aria-label="지원자 보드"
      >
        <PipelineColumns
          boardState={visibleBoardState}
          hasActiveFilters={hasActiveFilters}
          onApplicantSelect={handleApplicantSelect}
          onLoadPage={loadStagePage}
        />
      </div>
      <Sheet
        open={selectedApplicant !== undefined}
        onOpenChange={handleDetailOpenChange}
      >
        <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle>지원자 상세</SheetTitle>
            <SheetDescription className="sr-only">
              선택한 지원자의 필수 정보
            </SheetDescription>
          </SheetHeader>
          {selectedApplicant ? (
            <div className="grid gap-6 px-4 pb-4">
              <div className="space-y-1">
                <p className="text-lg font-semibold">
                  {selectedApplicant.name}
                </p>
                <p className="text-muted-foreground">
                  {selectedApplicant.role}
                </p>
              </div>
              <dl className="grid gap-4">
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">지원일</dt>
                  <dd>{formatAppliedAt(selectedApplicant.appliedAt)}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-sm text-muted-foreground">현재 단계</dt>
                  <dd>{selectedApplicant.stage}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}
