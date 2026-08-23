"use client";

import {
  type ChangeEvent,
  type KeyboardEvent,
  type UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getKeyboardStageTarget,
  matchesApplicantFilters,
  orderRoles,
  Stage,
  STAGE_LABELS,
  STAGES,
  type Applicant,
  type GetApplicantsResponseSchema,
} from "@/lib/pipeline";
import {
  findApplicantLocation,
  moveApplicantToStage,
  restoreApplicantStage,
} from "@/lib/pipeline-board-state";

const LOADING_CARD_KEYS = ["first", "second", "third"];
const LOAD_MORE_THRESHOLD_PX = 160;
const STAGE_CHANGE_ERROR_DURATION_MS = 5_000;
const STAGE_CHANGE_ERROR_MESSAGE =
  "단계 변경에 실패했습니다. 다시 시도해 주세요.";

const STAGE_DOT_CLASS_NAMES: Record<Stage, string> = {
  [Stage.DOCUMENT_REVIEW]: "bg-chart-1",
  [Stage.INTERVIEW]: "bg-chart-2",
  [Stage.COMPENSATION_NEGOTIATION]: "bg-chart-3",
  [Stage.HIRED]: "bg-chart-4",
  [Stage.REJECTED]: "bg-chart-5",
};

const NEXT_PROGRESS_STAGES: Record<Stage, Stage | null> = {
  [Stage.DOCUMENT_REVIEW]: Stage.INTERVIEW,
  [Stage.INTERVIEW]: Stage.COMPENSATION_NEGOTIATION,
  [Stage.COMPENSATION_NEGOTIATION]: Stage.HIRED,
  [Stage.HIRED]: null,
  [Stage.REJECTED]: null,
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

interface RecentStageChange {
  applicantId: string;
  applicantName: string;
  previousIndex: number;
  previousStage: Stage;
  currentStage: Stage;
}

interface PendingStageChange {
  applicantId: string;
  targetStage: Stage;
}

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

function canChangeApplicantStage(
  currentStage: Stage,
  targetStage: Stage,
): boolean {
  const nextStage = NEXT_PROGRESS_STAGES[currentStage];

  return (
    (targetStage === Stage.REJECTED && nextStage !== null) ||
    nextStage === targetStage
  );
}

function focusApplicantCard(applicantId: string) {
  window.requestAnimationFrame(function focusMovedApplicantCard() {
    document.getElementById(`applicant-card-${applicantId}`)?.focus();
  });
}

function focusDetailAction() {
  window.requestAnimationFrame(function focusAvailableDetailAction() {
    document
      .querySelector<HTMLElement>(
        '[data-slot="sheet-content"] button:not(:disabled)',
      )
      ?.focus();
  });
}

async function fetchApplicants(
  stage: Stage,
  page: number,
  nameQuery: string,
  selectedRoles: readonly string[] | null,
  signal: AbortSignal,
): Promise<GetApplicantsResponseSchema> {
  const searchParams = new URLSearchParams({
    stage,
    page: String(page),
  });
  const trimmedNameQuery = nameQuery.trim();

  if (trimmedNameQuery !== "") {
    searchParams.set("name", trimmedNameQuery);
  }

  function appendSelectedRole(role: string) {
    searchParams.append("role", role);
  }

  selectedRoles?.forEach(appendSelectedRole);

  const response = await fetch(`/api/applicants?${searchParams}`, {
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("지원자 조회 실패");
  }

  return (await response.json()) as GetApplicantsResponseSchema;
}

async function updateApplicantStage(
  applicantId: string,
  stage: Stage,
): Promise<Applicant> {
  const response = await fetch(`/api/applicants/${applicantId}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });

  if (!response.ok) {
    throw new Error("지원자 단계 변경 실패");
  }

  return (await response.json()) as Applicant;
}

function formatAppliedAt(appliedAt: string): string {
  return appliedAt.slice(0, 10).replaceAll("-", ".");
}

function ApplicantCard({
  applicant,
  onSelect,
  onFocusMove,
}: {
  applicant: Applicant;
  onSelect: (applicantId: string) => void;
  onFocusMove: (applicantId: string, targetStage: Stage) => void;
}) {
  function handleSelect() {
    onSelect(applicant.id);
  }

  function handleFocusMoveKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    const targetStage = getKeyboardStageTarget(applicant.stage, event.key);

    if (targetStage === null) {
      return;
    }

    event.preventDefault();
    onFocusMove(applicant.id, targetStage);
  }

  return (
    <button
      id={`applicant-card-${applicant.id}`}
      type="button"
      aria-label={`${applicant.name} 지원자 상세 보기`}
      aria-keyshortcuts="ArrowLeft ArrowRight"
      className="block w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={handleSelect}
      onKeyDown={handleFocusMoveKeyDown}
    >
      <Card size="sm">
        <CardHeader>
          <CardTitle>{applicant.name}</CardTitle>
          <CardDescription>{applicant.role}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-muted-foreground">
          <p>지원일 {formatAppliedAt(applicant.appliedAt)}</p>
          <p>현재 단계 {STAGE_LABELS[applicant.stage]}</p>
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
  const stageLabel = STAGE_LABELS[stage];

  function renderLoadingCard(cardKey: string) {
    return <LoadingCard key={cardKey} />;
  }

  return (
    <section
      aria-hidden="true"
      className="flex h-full w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted/50 p-3"
    >
      <header className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{stageLabel}</span>
        <Skeleton className="size-5 rounded-full" />
      </header>
      <div className="space-y-3 overflow-hidden">
        {LOADING_CARD_KEYS.map(renderLoadingCard)}
      </div>
    </section>
  );
}

function RoleCheckbox({
  role,
  checked,
  disabled,
  onCheckedChange,
}: {
  role: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (role: string, checked: boolean) => void;
}) {
  const id = `role-filter-${encodeURIComponent(role)}`;

  function handleCheckedChange(nextChecked: boolean) {
    onCheckedChange(role, nextChecked);
  }

  return (
    <label
      className="flex items-center gap-2 text-sm font-normal"
      htmlFor={id}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={handleCheckedChange}
      />
      {role}
    </label>
  );
}

function PipelineColumn({
  stage,
  columnState,
  isBoardEmpty,
  hasActiveFilters,
  onApplicantSelect,
  onApplicantFocusMove,
  onLoadPage,
}: {
  stage: Stage;
  columnState: StageColumnState;
  isBoardEmpty: boolean;
  hasActiveFilters: boolean;
  onApplicantSelect: (applicantId: string) => void;
  onApplicantFocusMove: (applicantId: string, targetStage: Stage) => void;
  onLoadPage: (
    stage: Stage,
    page: number,
    preserveApplicants?: boolean,
  ) => void;
}) {
  const { applicants, total, nextPage, hasMore, isLoading, hasError } =
    columnState;
  const stageLabel = STAGE_LABELS[stage];
  const hasApplicants = applicants.length > 0;
  const isTotalUnknown = hasApplicants && nextPage === 1;
  const errorMessage = hasApplicants
    ? nextPage === 1
      ? "일부 지원자를 불러오지 못했습니다."
      : "추가 지원자를 불러오지 못했습니다."
    : "지원자를 불러오지 못했습니다.";

  function renderApplicantCard(applicant: Applicant) {
    return (
      <ApplicantCard
        key={applicant.id}
        applicant={applicant}
        onSelect={onApplicantSelect}
        onFocusMove={onApplicantFocusMove}
      />
    );
  }

  function loadNextPage() {
    onLoadPage(stage, nextPage, isTotalUnknown);
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
      className="flex h-full w-72 shrink-0 flex-col gap-3 rounded-xl border border-transparent bg-muted/50 p-3"
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
          {stageLabel}
        </h2>
        <span
          aria-label={isTotalUnknown ? `${total}명 이상` : undefined}
          className="text-sm tabular-nums text-muted-foreground"
        >
          {isTotalUnknown ? `${total}+` : total}
        </span>
      </header>

      <div
        aria-label={`${stageLabel} 지원자 목록`}
        className="min-h-0 flex-1 overflow-y-auto pr-1"
        onScroll={handleColumnScroll}
      >
        {hasApplicants ? (
          <div className="space-y-3">
            {applicants.map(renderApplicantCard)}
            {isLoading ? <LoadingCard /> : null}
          </div>
        ) : null}

        {hasError ? (
          <div
            className={
              hasApplicants
                ? "mt-3 flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2"
                : "space-y-3 rounded-lg border border-dashed p-4 text-center"
            }
          >
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button size="sm" variant="outline" onClick={loadNextPage}>
              다시 시도
            </Button>
          </div>
        ) : null}

        {!hasApplicants && !hasError ? (
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
  onApplicantFocusMove,
  onLoadPage,
}: {
  boardState: PipelineBoardState;
  hasActiveFilters: boolean;
  onApplicantSelect: (applicantId: string) => void;
  onApplicantFocusMove: (applicantId: string, targetStage: Stage) => void;
  onLoadPage: (
    stage: Stage,
    page: number,
    preserveApplicants?: boolean,
  ) => void;
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
        onApplicantFocusMove={onApplicantFocusMove}
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
  const [selectedRoles, setSelectedRoles] = useState<string[] | null>(null);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(
    null,
  );
  const [pendingStageChange, setPendingStageChange] =
    useState<PendingStageChange | null>(null);
  const [pendingUndoChange, setPendingUndoChange] =
    useState<RecentStageChange | null>(null);
  const [recentStageChange, setRecentStageChange] =
    useState<RecentStageChange | null>(null);
  const [savingApplicantIds, setSavingApplicantIds] = useState<Set<string>>(
    function createEmptySavingApplicantIds() {
      return new Set();
    },
  );
  const [hasStageChangeError, setHasStageChangeError] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [areFiltersReady, setAreFiltersReady] = useState(false);
  const requestControllersRef = useRef(new Map<Stage, AbortController>());
  const savingApplicantIdsRef = useRef(new Set<string>());

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

  const pendingApplicant =
    pendingStageChange === null
      ? undefined
      : findApplicantLocation(boardState, pendingStageChange.applicantId)
          ?.applicant;
  const pendingStage = pendingStageChange?.targetStage ?? null;

  const hasActiveFilters = nameQuery.trim() !== "" || selectedRoles !== null;

  const areFiltersDisabled = !areFiltersReady;
  const isSelectedApplicantSaving =
    selectedApplicant !== undefined &&
    savingApplicantIds.has(selectedApplicant.id);
  const nextProgressStage =
    selectedApplicant === undefined
      ? null
      : NEXT_PROGRESS_STAGES[selectedApplicant.stage];
  const canRejectApplicant =
    selectedApplicant !== undefined && nextProgressStage !== null;
  const isStageChangeConfirmationOpen =
    pendingStageChange !== null || pendingUndoChange !== null;
  const isRejectionPending = pendingStage === Stage.REJECTED;
  const isUndoApplicantSaving =
    recentStageChange !== null &&
    savingApplicantIds.has(recentStageChange.applicantId);

  function closeDetailWhenApplicantIsHidden(
    nextNameQuery: string,
    nextSelectedRoles: readonly string[] | null,
  ) {
    if (selectedApplicant === undefined) {
      return;
    }

    const isVisible = matchesApplicantFilters(
      selectedApplicant,
      nextNameQuery,
      nextSelectedRoles ?? [],
    );

    if (!isVisible) {
      setSelectedApplicantId(null);
    }
  }

  function handleNameQueryChange(event: ChangeEvent<HTMLInputElement>) {
    const nextNameQuery = event.currentTarget.value;
    setNameQuery(nextNameQuery);
    closeDetailWhenApplicantIsHidden(nextNameQuery, selectedRoles);
  }

  function handleRoleCheckedChange(role: string, checked: boolean) {
    const currentSelectedRoles = selectedRoles ?? availableRoles;
    const nextSelectedRoles = checked
      ? [...currentSelectedRoles, role]
      : currentSelectedRoles.filter(function excludeUncheckedRole(selectedRole) {
          return selectedRole !== role;
        });
    const normalizedSelectedRoles =
      nextSelectedRoles.length === 0 ||
      nextSelectedRoles.length === availableRoles.length
        ? null
        : nextSelectedRoles;

    setSelectedRoles(normalizedSelectedRoles);
    closeDetailWhenApplicantIsHidden(nameQuery, normalizedSelectedRoles);
  }

  function handleApplicantSelect(applicantId: string) {
    const location = findApplicantLocation(boardState, applicantId);

    if (location === undefined) {
      return;
    }

    setSelectedApplicantId(applicantId);
  }

  async function saveApplicantStageChange(
    applicantId: string,
    targetStage: Stage,
    undoChange?: RecentStageChange,
  ) {
    const location = findApplicantLocation(boardState, applicantId);

    if (
      location === undefined ||
      (undoChange === undefined
        ? !canChangeApplicantStage(location.stage, targetStage)
        : location.stage !== undoChange.currentStage ||
          targetStage !== undoChange.previousStage) ||
      savingApplicantIdsRef.current.has(applicantId)
    ) {
      return;
    }

    savingApplicantIdsRef.current.add(applicantId);
    setSavingApplicantIds(function markApplicantSaving(currentIds) {
      return new Set(currentIds).add(applicantId);
    });
    setBoardState(function showOptimisticStage(currentState) {
      return undoChange === undefined
        ? moveApplicantToStage(currentState, applicantId, targetStage)
        : restoreApplicantStage(
            currentState,
            applicantId,
            targetStage,
            undoChange.previousIndex,
          );
    });

    try {
      await updateApplicantStage(applicantId, targetStage);

      if (undoChange !== undefined) {
        setRecentStageChange(function clearUndoneStageChange(currentChange) {
          return currentChange === undoChange ? null : currentChange;
        });
      } else if (
        targetStage === Stage.HIRED ||
        targetStage === Stage.REJECTED
      ) {
        setRecentStageChange(null);
      } else {
        setRecentStageChange({
          applicantId,
          applicantName: location.applicant.name,
          previousIndex: location.index,
          previousStage: location.stage,
          currentStage: targetStage,
        });
      }
    } catch {
      setBoardState(function rollbackApplicantStage(currentState) {
        return restoreApplicantStage(
          currentState,
          applicantId,
          location.stage,
          location.index,
        );
      });

      setHasStageChangeError(true);
    } finally {
      savingApplicantIdsRef.current.delete(applicantId);
      setSavingApplicantIds(function clearApplicantSaving(currentIds) {
        const nextIds = new Set(currentIds);
        nextIds.delete(applicantId);
        return nextIds;
      });
    }
  }

  function requestApplicantStageChange(
    applicantId: string,
    targetStage: Stage,
  ) {
    const location = findApplicantLocation(boardState, applicantId);

    if (
      location === undefined ||
      !canChangeApplicantStage(location.stage, targetStage) ||
      savingApplicantIdsRef.current.has(applicantId)
    ) {
      return;
    }

    setPendingUndoChange(null);
    setPendingStageChange({ applicantId, targetStage });
  }

  function requestSelectedApplicantStageChange(targetStage: Stage) {
    if (selectedApplicant !== undefined) {
      requestApplicantStageChange(selectedApplicant.id, targetStage);
    }
  }

  function handleApplicantFocusMove(
    applicantId: string,
    targetStage: Stage,
  ) {
    const location = findApplicantLocation(boardState, applicantId);

    if (location === undefined) {
      return;
    }

    const targetApplicants = boardState[targetStage].applicants;
    const targetApplicant =
      targetApplicants[Math.min(location.index, targetApplicants.length - 1)];

    if (targetApplicant !== undefined) {
      focusApplicantCard(targetApplicant.id);
    }
  }

  function handleRecentStageChangeUndo() {
    if (
      recentStageChange === null ||
      savingApplicantIdsRef.current.has(recentStageChange.applicantId)
    ) {
      return;
    }

    setPendingStageChange(null);
    setPendingUndoChange(recentStageChange);
  }

  function handleNextProgressStageChange() {
    if (nextProgressStage !== null) {
      requestSelectedApplicantStageChange(nextProgressStage);
    }
  }

  function handleApplicantRejection() {
    requestSelectedApplicantStageChange(Stage.REJECTED);
  }

  function handleStageChangeConfirmationOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setPendingStageChange(null);
      setPendingUndoChange(null);
    }
  }

  function handleStageChangeConfirmation() {
    const undoChange = pendingUndoChange;

    if (undoChange !== null) {
      setPendingUndoChange(null);

      if (undoChange === recentStageChange) {
        void saveApplicantStageChange(
          undoChange.applicantId,
          undoChange.previousStage,
          undoChange,
        );
      }

      return;
    }

    const stageChange = pendingStageChange;

    if (
      stageChange === null ||
      pendingApplicant === undefined ||
      !canChangeApplicantStage(pendingApplicant.stage, stageChange.targetStage)
    ) {
      setPendingStageChange(null);
      return;
    }

    setPendingStageChange(null);
    void saveApplicantStageChange(pendingApplicant.id, stageChange.targetStage);
    focusDetailAction();
  }

  function handleStageChangeErrorClose() {
    setHasStageChangeError(false);
  }

  function handleRecentStageChangeClose() {
    setRecentStageChange(null);
  }

  function handleDetailOpenChange(isOpen: boolean) {
    if (!isOpen) {
      if (selectedApplicantId !== null) {
        focusApplicantCard(selectedApplicantId);
      }

      setSelectedApplicantId(null);
    }
  }

  function renderStageChangeStatus(isInDetail: boolean) {
    if (!hasStageChangeError && recentStageChange === null) {
      return null;
    }

    return (
      <Card
        role={hasStageChangeError ? "alert" : "status"}
        size="sm"
        className={
          isInDetail
            ? "fixed right-6 bottom-6 z-[60] w-96 max-w-[calc(100vw-3rem)] lg:absolute lg:right-[444px]"
            : "fixed right-6 bottom-6 z-50 max-w-sm"
        }
      >
        <CardContent className="flex items-center gap-3">
          {hasStageChangeError ? (
            <>
              <p>{STAGE_CHANGE_ERROR_MESSAGE}</p>
              <Button
                className="ml-auto"
                size="sm"
                variant="outline"
                onClick={handleStageChangeErrorClose}
              >
                닫기
              </Button>
            </>
          ) : recentStageChange !== null ? (
            <>
              <p>
                {recentStageChange.applicantName} 지원자의 단계를{" "}
                {STAGE_LABELS[recentStageChange.currentStage]} 단계로
                변경했습니다.
              </p>
              <Button
                className="ml-auto"
                size="sm"
                variant="outline"
                disabled={isUndoApplicantSaving}
                onClick={handleRecentStageChangeUndo}
              >
                실행 취소
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRecentStageChangeClose}
              >
                닫기
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  function renderRoleCheckbox(role: string) {
    return (
      <RoleCheckbox
        key={role}
        role={role}
        checked={selectedRoles === null || selectedRoles.includes(role)}
        disabled={areFiltersDisabled}
        onCheckedChange={handleRoleCheckedChange}
      />
    );
  }

  const loadStagePage = useCallback(function loadStagePage(
    stage: Stage,
    page: number,
    preserveApplicants = false,
  ) {
    if (requestControllersRef.current.has(stage)) {
      return;
    }

    const controller = new AbortController();
    requestControllersRef.current.set(stage, controller);

    setBoardState(function markStageLoading(currentState) {
      return {
        ...currentState,
        [stage]:
          page === 1 && !preserveApplicants
            ? createInitialColumnState()
            : {
                ...currentState[stage],
                isLoading: true,
                hasError: false,
              },
      };
    });

    fetchApplicants(stage, page, nameQuery, selectedRoles, controller.signal)
      .then(function showStageApplicants(response) {
        if (controller.signal.aborted) {
          return;
        }

        setAvailableRoles(function mergeAvailableRoles(currentRoles) {
          const nextRoles = new Set(currentRoles);

          response.applicants.forEach(function addApplicantRole(applicant) {
            nextRoles.add(applicant.role);
          });

          return orderRoles(nextRoles);
        });

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

          if (requestControllersRef.current.size === 0) {
            setAreFiltersReady(true);
          }
        }
      });
  }, [nameQuery, selectedRoles]);

  useEffect(
    function loadInitialApplicants() {
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

  useEffect(
    function dismissStageChangeError() {
      if (!hasStageChangeError) {
        return;
      }

      const timeoutId = window.setTimeout(
        handleStageChangeErrorClose,
        STAGE_CHANGE_ERROR_DURATION_MS,
      );

      return function clearStageChangeErrorTimeout() {
        window.clearTimeout(timeoutId);
      };
    },
    [hasStageChangeError],
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
            disabled={areFiltersDisabled}
            placeholder="지원자 이름 검색"
            value={nameQuery}
            onChange={handleNameQueryChange}
          />
        </label>
        <fieldset className="grid gap-1.5">
          <legend className="text-sm font-medium">
            직무
            <span className="ml-1 font-normal text-muted-foreground">
              {selectedRoles === null
                ? "전체"
                : `${selectedRoles.length}개 선택`}
            </span>
          </legend>
          <div className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
            {availableRoles.map(renderRoleCheckbox)}
          </div>
        </fieldset>
      </div>
      <div
        className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
        aria-label="지원자 보드"
      >
        <PipelineColumns
          boardState={boardState}
          hasActiveFilters={hasActiveFilters}
          onApplicantSelect={handleApplicantSelect}
          onApplicantFocusMove={handleApplicantFocusMove}
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
                  <dd>{STAGE_LABELS[selectedApplicant.stage]}</dd>
                </div>
              </dl>
              <section
                aria-labelledby="next-progress-stage-heading"
                className="grid gap-3"
              >
                <h3
                  id="next-progress-stage-heading"
                  className="text-sm font-medium"
                >
                  다음 채용 단계
                </h3>
                {nextProgressStage === null ? (
                  <p className="text-sm text-muted-foreground">
                    다음 채용 단계가 없습니다.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      다음 채용 단계는 {STAGE_LABELS[nextProgressStage]}입니다.
                      단계 변경에 따라 지원자에게 알림이 발송될 수 있습니다.
                    </p>
                    <Button
                      disabled={isSelectedApplicantSaving}
                      onClick={handleNextProgressStageChange}
                    >
                      {isSelectedApplicantSaving
                        ? "변경 중…"
                        : `${STAGE_LABELS[nextProgressStage]} 단계로 변경`}
                    </Button>
                  </>
                )}
              </section>
              {selectedApplicant.stage !== Stage.HIRED ? (
                <section
                  aria-labelledby="rejection-stage-heading"
                  className="grid gap-3 border-t pt-6"
                >
                  <h3
                    id="rejection-stage-heading"
                    className="text-sm font-medium"
                  >
                    불합격 처리
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {canRejectApplicant
                      ? "정규 진행 중에는 불합격 처리할 수 있습니다. 처리 전에 내용을 확인해 주세요."
                      : "이미 불합격 처리된 지원자입니다."}
                  </p>
                  <Button
                    variant="destructive"
                    disabled={!canRejectApplicant || isSelectedApplicantSaving}
                    onClick={handleApplicantRejection}
                  >
                    {isSelectedApplicantSaving ? "변경 중…" : "불합격 처리"}
                  </Button>
                </section>
              ) : null}
            </div>
          ) : null}
          {renderStageChangeStatus(true)}
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={isStageChangeConfirmationOpen}
        onOpenChange={handleStageChangeConfirmationOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingUndoChange !== null
                ? "단계 변경 실행 취소 확인"
                : isRejectionPending
                ? "불합격 처리 확인"
                : "채용 단계 변경 확인"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingUndoChange !== null
                ? `${pendingUndoChange.applicantName} 지원자의 단계를 ${STAGE_LABELS[pendingUndoChange.currentStage]}에서 ${STAGE_LABELS[pendingUndoChange.previousStage]} 단계로 되돌립니다.`
                : pendingApplicant !== undefined && pendingStage !== null
                ? isRejectionPending
                  ? `${pendingApplicant.name} 지원자를 불합격 처리합니다. 현재 단계는 ${STAGE_LABELS[pendingApplicant.stage]}입니다.`
                  : `${pendingApplicant.name} 지원자의 단계를 ${STAGE_LABELS[pendingApplicant.stage]}에서 ${STAGE_LABELS[pendingStage]} 단계로 변경합니다.`
                : "단계 변경 내용을 확인해 주세요."}
              <br />
              단계 변경에 따라 지원자에게 알림이 발송될 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant={isRejectionPending ? "destructive" : "default"}
              onClick={handleStageChangeConfirmation}
            >
              {pendingUndoChange !== null
                ? "실행 취소"
                : isRejectionPending
                ? "불합격 처리"
                : `${pendingStage === null ? "" : STAGE_LABELS[pendingStage]} 단계로 변경`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {selectedApplicant === undefined
        ? renderStageChangeStatus(false)
        : null}
    </main>
  );
}
