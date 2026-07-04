/**
 * CONTEXT:
 * First internal DCX tracker surface.
 * It keeps the model deliberately small: nested work items plus activity updates.
 */
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  MessageSquarePlusIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createDcxAdminTrackerUpdate } from "@/lib/create_dcx_admin_tracker_update"
import {
  readDcxAdminTrackerCatalog,
  type DcxAdminTrackerLevel,
  type DcxAdminTrackerPillar,
  type DcxAdminTrackerStatus,
  type DcxAdminTrackerUpdate,
  type DcxAdminTrackerUpdateKind,
  type DcxAdminTrackerWorkItem,
} from "@/lib/read_dcx_admin_tracker_catalog"
import { saveDcxAdminTrackerWorkItem } from "@/lib/save_dcx_admin_tracker_work_item"

type Props = {
  apiBaseUrl: string
  routeView: DcxAdminTrackerView
}

export type DcxAdminTrackerView = "all" | DcxAdminTrackerLevel | "updates"

type DcxAdminTrackerDraft = {
  workItemId: number | null
  title: string
  description: string
  currentState: string
  level: DcxAdminTrackerLevel
  pillars: DcxAdminTrackerPillar[]
  status: DcxAdminTrackerStatus
  parentWorkItemId: number | null
}

type DcxAdminTrackerFilterValue = "all"

const trackerLevelOptions: Array<{ value: DcxAdminTrackerLevel; label: string }> = [
  { value: "long_term", label: "Long-term" },
  { value: "strategy", label: "Strategy" },
  { value: "operation", label: "Operation" },
  { value: "battle", label: "Challenge" },
  { value: "task", label: "Task" },
]

const trackerPillarOptions: Array<{ value: DcxAdminTrackerPillar; label: string }> = [
  { value: "legibility", label: "Legibility" },
  { value: "investors", label: "Investors" },
  { value: "building", label: "Building" },
  { value: "customers", label: "Customers" },
  { value: "other", label: "Other" },
]

const trackerStatusOptions: Array<{ value: DcxAdminTrackerStatus; label: string }> = [
  { value: "not_started", label: "Not started" },
  { value: "active", label: "In progress" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" },
]

const trackerUpdateKindOptions: Array<{ value: DcxAdminTrackerUpdateKind; label: string }> = [
  { value: "note", label: "Note" },
  { value: "progress", label: "Progress" },
  { value: "blocker", label: "Blocker" },
  { value: "decision", label: "Decision" },
  { value: "question", label: "Question" },
  { value: "action", label: "Action" },
]

function readTrackerLevelLabel(level: DcxAdminTrackerLevel): string {
  return trackerLevelOptions.find((option) => option.value === level)?.label ?? level
}

function readTrackerPillarLabel(pillar: DcxAdminTrackerPillar): string {
  return trackerPillarOptions.find((option) => option.value === pillar)?.label ?? pillar
}

function readTrackerPillarsForWorkItem(workItem: DcxAdminTrackerWorkItem): DcxAdminTrackerPillar[] {
  return workItem.pillars?.length > 0 ? workItem.pillars : [workItem.pillar]
}

function readTrackerPillarLabels(pillars: DcxAdminTrackerPillar[]): string {
  return pillars.map((pillar) => readTrackerPillarLabel(pillar)).join(", ")
}

function readTrackerStatusLabel(status: DcxAdminTrackerStatus): string {
  return trackerStatusOptions.find((option) => option.value === status)?.label ?? status
}

function readTrackerUpdateKindLabel(updateKind: DcxAdminTrackerUpdateKind): string {
  return trackerUpdateKindOptions.find((option) => option.value === updateKind)?.label ?? updateKind
}

function readNextChildLevel(parentLevel: DcxAdminTrackerLevel | null): DcxAdminTrackerLevel {
  if (parentLevel === "long_term") {
    return "strategy"
  }
  if (parentLevel === "strategy") {
    return "operation"
  }
  if (parentLevel === "operation") {
    return "battle"
  }
  return "task"
}

function readTrackerLevelFilterFromView(view: DcxAdminTrackerView): DcxAdminTrackerLevel | DcxAdminTrackerFilterValue {
  if (view === "updates" || view === "all") {
    return "all"
  }
  return view
}

function readTrackerViewTitle(view: DcxAdminTrackerView): string {
  if (view === "long_term") {
    return "Long-term"
  }
  if (view === "strategy") {
    return "Strategies"
  }
  if (view === "operation") {
    return "Operations"
  }
  if (view === "battle") {
    return "Challenges"
  }
  if (view === "task") {
    return "Tasks"
  }
  if (view === "updates") {
    return "Updates"
  }
  return "Work map and activity"
}

function buildBlankTrackerDraft(parent: DcxAdminTrackerWorkItem | null = null): DcxAdminTrackerDraft {
  return {
    workItemId: null,
    title: "",
    description: "",
    currentState: "",
    level: readNextChildLevel(parent?.level ?? null),
    pillars: parent ? readTrackerPillarsForWorkItem(parent) : ["building"],
    status: "not_started",
    parentWorkItemId: parent?.work_item_id ?? null,
  }
}

function buildTrackerDraftFromWorkItem(workItem: DcxAdminTrackerWorkItem): DcxAdminTrackerDraft {
  return {
    workItemId: workItem.work_item_id,
    title: workItem.title,
    description: workItem.description,
    currentState: workItem.current_state,
    level: workItem.level,
    pillars: readTrackerPillarsForWorkItem(workItem),
    status: workItem.status,
    parentWorkItemId: workItem.parent_work_item_id,
  }
}

function formatTrackerTimestampLabel(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return "Not recorded"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestampMs))
}

function buildChildrenByParent(workItems: DcxAdminTrackerWorkItem[]) {
  const childrenByParent = new Map<number | null, DcxAdminTrackerWorkItem[]>()
  for (const item of workItems) {
    const parentId = item.parent_work_item_id ?? null
    const currentChildren = childrenByParent.get(parentId) ?? []
    currentChildren.push(item)
    childrenByParent.set(parentId, currentChildren)
  }

  return childrenByParent
}

function readWorkItemMatchesTrackerFilters(params: {
  workItem: DcxAdminTrackerWorkItem
  searchValue: string
  levelFilter: DcxAdminTrackerLevel | DcxAdminTrackerFilterValue
  pillarFilter: DcxAdminTrackerPillar | DcxAdminTrackerFilterValue
  statusFilter: DcxAdminTrackerStatus | DcxAdminTrackerFilterValue
}): boolean {
  const normalizedSearchValue = params.searchValue.trim().toLowerCase()
  const matchesSearch =
    normalizedSearchValue === "" ||
    params.workItem.title.toLowerCase().includes(normalizedSearchValue) ||
    params.workItem.description.toLowerCase().includes(normalizedSearchValue)
  const matchesLevel =
    params.levelFilter === "all" || params.workItem.level === params.levelFilter
  const matchesPillar =
    params.pillarFilter === "all" || readTrackerPillarsForWorkItem(params.workItem).includes(params.pillarFilter)
  const matchesStatus =
    params.statusFilter === "all" || params.workItem.status === params.statusFilter

  return matchesSearch && matchesLevel && matchesPillar && matchesStatus
}

function buildVisibleWorkItemIds(params: {
  workItems: DcxAdminTrackerWorkItem[]
  searchValue: string
  levelFilter: DcxAdminTrackerLevel | DcxAdminTrackerFilterValue
  pillarFilter: DcxAdminTrackerPillar | DcxAdminTrackerFilterValue
  statusFilter: DcxAdminTrackerStatus | DcxAdminTrackerFilterValue
}): Set<number> {
  const workItemById = new Map(params.workItems.map((workItem) => [workItem.work_item_id, workItem]))
  const visibleIds = new Set<number>()

  for (const workItem of params.workItems) {
    if (
      !readWorkItemMatchesTrackerFilters({
        workItem,
        searchValue: params.searchValue,
        levelFilter: params.levelFilter,
        pillarFilter: params.pillarFilter,
        statusFilter: params.statusFilter,
      })
    ) {
      continue
    }

    visibleIds.add(workItem.work_item_id)
    let parentId = workItem.parent_work_item_id
    while (parentId !== null) {
      const parentWorkItem = workItemById.get(parentId)
      if (!parentWorkItem) {
        break
      }
      visibleIds.add(parentWorkItem.work_item_id)
      parentId = parentWorkItem.parent_work_item_id
    }
  }

  return visibleIds
}

function buildAncestorTrail(params: {
  workItem: DcxAdminTrackerWorkItem | null
  workItems: DcxAdminTrackerWorkItem[]
}): DcxAdminTrackerWorkItem[] {
  if (!params.workItem) {
    return []
  }

  const workItemById = new Map(params.workItems.map((workItem) => [workItem.work_item_id, workItem]))
  const ancestors: DcxAdminTrackerWorkItem[] = []
  let parentId = params.workItem.parent_work_item_id
  while (parentId !== null) {
    const parentWorkItem = workItemById.get(parentId)
    if (!parentWorkItem) {
      break
    }
    ancestors.unshift(parentWorkItem)
    parentId = parentWorkItem.parent_work_item_id
  }

  return [...ancestors, params.workItem]
}

function readDescendantIds(
  childrenByParent: Map<number | null, DcxAdminTrackerWorkItem[]>,
  workItemId: number,
): Set<number> {
  const descendantIds = new Set<number>()
  const children = childrenByParent.get(workItemId) ?? []
  for (const child of children) {
    descendantIds.add(child.work_item_id)
    for (const nestedId of readDescendantIds(childrenByParent, child.work_item_id)) {
      descendantIds.add(nestedId)
    }
  }
  return descendantIds
}

function buildParentOptionRows(params: {
  childrenByParent: Map<number | null, DcxAdminTrackerWorkItem[]>
  excludedWorkItemIds: Set<number>
}): Array<{ workItem: DcxAdminTrackerWorkItem; depth: number }> {
  const rows: Array<{ workItem: DcxAdminTrackerWorkItem; depth: number }> = []

  function visit(parentWorkItemId: number | null, depth: number): void {
    const children = params.childrenByParent.get(parentWorkItemId) ?? []
    for (const child of children) {
      if (!params.excludedWorkItemIds.has(child.work_item_id)) {
        rows.push({ workItem: child, depth })
      }
      visit(child.work_item_id, depth + 1)
    }
  }

  visit(null, 0)
  return rows
}

function DcxAdminTrackerStatusBadge(props: { status: DcxAdminTrackerStatus }) {
  const statusClassName =
    props.status === "done"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : props.status === "waiting"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : props.status === "active"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-slate-50 text-slate-600"

  return (
    <span className={cn("inline-flex items-center border px-2 py-0.5 text-xs font-medium", statusClassName)}>
      {readTrackerStatusLabel(props.status)}
    </span>
  )
}

function DcxAdminTrackerTreeItem(props: {
  workItem: DcxAdminTrackerWorkItem
  depth: number
  childrenByParent: Map<number | null, DcxAdminTrackerWorkItem[]>
  collapsedWorkItemIds: Set<number>
  forceExpanded: boolean
  selectedWorkItemId: number | null
  onSelectWorkItem: (workItem: DcxAdminTrackerWorkItem) => void
  onCreateChild: (workItem: DcxAdminTrackerWorkItem) => void
  onToggleCollapsed: (workItemId: number) => void
}) {
  const children = props.childrenByParent.get(props.workItem.work_item_id) ?? []
  const isSelected = props.selectedWorkItemId === props.workItem.work_item_id
  const isCollapsed = props.collapsedWorkItemIds.has(props.workItem.work_item_id) && !props.forceExpanded
  const hasChildren = children.length > 0

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex w-full items-stretch border text-left transition hover:border-slate-300 hover:bg-slate-50",
          isSelected ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white",
        )}
        style={{ marginLeft: `${Math.min(props.depth, 4) * 0.75}rem` }}
      >
        <button
          type="button"
          className={cn(
            "flex w-9 shrink-0 items-start justify-center border-r border-slate-100 pt-4 text-slate-400",
            hasChildren ? "hover:bg-slate-100 hover:text-slate-700" : "cursor-default",
          )}
          disabled={!hasChildren}
          onClick={(event) => {
            event.stopPropagation()
            props.onToggleCollapsed(props.workItem.work_item_id)
          }}
          aria-label={isCollapsed ? "Expand item" : "Collapse item"}
        >
          {hasChildren ? (
            isCollapsed ? <ChevronRightIcon className="size-4" /> : <ChevronDownIcon className="size-4" />
          ) : null}
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 px-4 py-3 text-left"
          onClick={() => props.onSelectWorkItem(props.workItem)}
        >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {readTrackerLevelLabel(props.workItem.level)}
              </span>
              <span className="text-xs text-slate-400">
                {readTrackerPillarLabels(readTrackerPillarsForWorkItem(props.workItem))}
              </span>
            </div>
            <p className="break-words text-sm font-semibold text-slate-950">{props.workItem.title}</p>
            {props.workItem.description ? (
              <p className="line-clamp-2 text-xs leading-5 text-slate-600">{props.workItem.description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DcxAdminTrackerStatusBadge status={props.workItem.status} />
            <span className="text-xs text-slate-400">{props.workItem.update_count}</span>
          </div>
        </div>
        </button>
      </div>
      {isSelected ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-md"
            onClick={() => props.onCreateChild(props.workItem)}
          >
            <PlusIcon className="size-3.5" />
            Child
          </Button>
        </div>
      ) : null}
      {children.length > 0 && !isCollapsed ? (
        <div className="space-y-2">
          {children.map((child) => (
            <DcxAdminTrackerTreeItem
              key={child.work_item_id}
              workItem={child}
              depth={props.depth + 1}
              childrenByParent={props.childrenByParent}
              collapsedWorkItemIds={props.collapsedWorkItemIds}
              forceExpanded={props.forceExpanded}
              selectedWorkItemId={props.selectedWorkItemId}
              onSelectWorkItem={props.onSelectWorkItem}
              onCreateChild={props.onCreateChild}
              onToggleCollapsed={props.onToggleCollapsed}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DcxAdminTrackerUpdateRow(props: { update: DcxAdminTrackerUpdate; showWorkItemTitle?: boolean }) {
  return (
    <div className="border-b border-slate-100 px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
          {readTrackerUpdateKindLabel(props.update.update_kind)}
        </span>
        {props.showWorkItemTitle ? (
          <span className="text-xs font-medium text-slate-500">{props.update.work_item_title}</span>
        ) : null}
        <span className="text-xs text-slate-400">
          {props.update.author_email ?? "Unknown"} - {formatTrackerTimestampLabel(props.update.created_at_ts_ms)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{props.update.update_body}</p>
    </div>
  )
}

function DcxAdminTrackerBreadcrumb(props: { workItems: DcxAdminTrackerWorkItem[] }) {
  if (props.workItems.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
      {props.workItems.map((workItem, workItemIndex) => (
        <span key={workItem.work_item_id} className="inline-flex min-w-0 items-center gap-1.5">
          {workItemIndex > 0 ? <ChevronRightIcon className="size-3 text-slate-300" /> : null}
          <span className="max-w-[10rem] truncate" title={workItem.title}>
            {workItem.title}
          </span>
        </span>
      ))}
    </div>
  )
}

export function DcxAdminTrackerPage(props: Props) {
  const queryClient = useQueryClient()
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<number | null>(null)
  const [draft, setDraft] = useState<DcxAdminTrackerDraft>(() => buildBlankTrackerDraft())
  const [isCreating, setIsCreating] = useState(false)
  const [selectedPanelMode, setSelectedPanelMode] = useState<"read" | "edit">("read")
  const [searchValue, setSearchValue] = useState("")
  const [levelFilter, setLevelFilter] = useState<DcxAdminTrackerLevel | DcxAdminTrackerFilterValue>(
    () => readTrackerLevelFilterFromView(props.routeView),
  )
  const [pillarFilter, setPillarFilter] = useState<DcxAdminTrackerPillar | DcxAdminTrackerFilterValue>("all")
  const [statusFilter, setStatusFilter] = useState<DcxAdminTrackerStatus | DcxAdminTrackerFilterValue>("all")
  const [collapsedWorkItemIds, setCollapsedWorkItemIds] = useState<Set<number>>(() => new Set())
  const [updateKind, setUpdateKind] = useState<DcxAdminTrackerUpdateKind>("note")
  const [updateBody, setUpdateBody] = useState("")

  const trackerQuery = useQuery({
    queryKey: ["dcx_admin_tracker_catalog"],
    queryFn: async () => readDcxAdminTrackerCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })

  const saveWorkItemMutation = useMutation({
    mutationFn: async () =>
      saveDcxAdminTrackerWorkItem({
        apiBaseUrl: props.apiBaseUrl,
        workItemId: draft.workItemId,
        title: draft.title,
        description: draft.description,
        currentState: draft.currentState,
        level: draft.level,
        pillars: draft.pillars,
        status: draft.status,
        parentWorkItemId: draft.parentWorkItemId,
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dcx_admin_tracker_catalog"] })
      setSelectedWorkItemId(result.data.work_item_id)
      setIsCreating(false)
      setSelectedPanelMode("read")
    },
  })

  const createUpdateMutation = useMutation({
    mutationFn: async () => {
      if (selectedWorkItemId === null) {
        throw new Error("Choose a tracker item before adding an update.")
      }
      return createDcxAdminTrackerUpdate({
        apiBaseUrl: props.apiBaseUrl,
        workItemId: selectedWorkItemId,
        updateKind,
        updateBody,
      })
    },
    onSuccess: async () => {
      setUpdateBody("")
      setUpdateKind("note")
      await queryClient.invalidateQueries({ queryKey: ["dcx_admin_tracker_catalog"] })
    },
  })

  const workItems = trackerQuery.data?.data.work_items ?? []
  const updates = trackerQuery.data?.data.updates ?? []
  const childrenByParent = useMemo(() => buildChildrenByParent(workItems), [workItems])
  const visibleWorkItemIds = useMemo(
    () =>
      buildVisibleWorkItemIds({
        workItems,
        searchValue,
        levelFilter,
        pillarFilter,
        statusFilter,
      }),
    [workItems, searchValue, levelFilter, pillarFilter, statusFilter],
  )
  const visibleWorkItems = useMemo(
    () => workItems.filter((workItem) => visibleWorkItemIds.has(workItem.work_item_id)),
    [workItems, visibleWorkItemIds],
  )
  const visibleChildrenByParent = useMemo(() => buildChildrenByParent(visibleWorkItems), [visibleWorkItems])
  const selectedWorkItem = useMemo(
    () => workItems.find((workItem) => workItem.work_item_id === selectedWorkItemId) ?? null,
    [selectedWorkItemId, workItems],
  )
  const selectedBreadcrumb = useMemo(
    () => buildAncestorTrail({ workItem: selectedWorkItem, workItems }),
    [selectedWorkItem, workItems],
  )
  const selectedUpdates = updates.filter((update) => update.work_item_id === selectedWorkItemId)
  const rootWorkItems = visibleChildrenByParent.get(null) ?? []
  const descendantIds = useMemo(
    () => (draft.workItemId === null ? new Set<number>() : readDescendantIds(childrenByParent, draft.workItemId)),
    [childrenByParent, draft.workItemId],
  )
  const excludedParentIds = useMemo(() => {
    const nextExcludedParentIds = new Set(descendantIds)
    if (draft.workItemId !== null) {
      nextExcludedParentIds.add(draft.workItemId)
    }
    return nextExcludedParentIds
  }, [descendantIds, draft.workItemId])
  const parentOptionRows = useMemo(
    () => buildParentOptionRows({ childrenByParent, excludedWorkItemIds: excludedParentIds }),
    [childrenByParent, excludedParentIds],
  )
  const hasActiveFilters =
    searchValue.trim() !== "" ||
    levelFilter !== "all" ||
    pillarFilter !== "all" ||
    statusFilter !== "all"
  const blockedItems = workItems.filter((workItem) => workItem.status === "waiting")
  const activeItems = workItems.filter((workItem) => workItem.status === "active")
  const operationItems = workItems.filter((workItem) => workItem.level === "operation")
  const trackerViewTitle = readTrackerViewTitle(props.routeView)

  useEffect(() => {
    if (!selectedWorkItem || isCreating) {
      return
    }
    setDraft(buildTrackerDraftFromWorkItem(selectedWorkItem))
  }, [selectedWorkItem, isCreating])

  useEffect(() => {
    setLevelFilter(readTrackerLevelFilterFromView(props.routeView))
    if (props.routeView === "updates") {
      setSelectedWorkItemId(null)
      setIsCreating(false)
      setSelectedPanelMode("read")
    }
  }, [props.routeView])

  function startNewWorkItem(parent: DcxAdminTrackerWorkItem | null = null): void {
    setIsCreating(true)
    setSelectedWorkItemId(parent?.work_item_id ?? null)
    setSelectedPanelMode("edit")
    setDraft(buildBlankTrackerDraft(parent))
    setUpdateBody("")
  }

  function toggleCollapsedWorkItem(workItemId: number): void {
    setCollapsedWorkItemIds((currentCollapsedIds) => {
      const nextCollapsedIds = new Set(currentCollapsedIds)
      if (nextCollapsedIds.has(workItemId)) {
        nextCollapsedIds.delete(workItemId)
      } else {
        nextCollapsedIds.add(workItemId)
      }
      return nextCollapsedIds
    })
  }

  function collapseAllWorkItems(): void {
    const parentIds = new Set<number>()
    for (const workItem of workItems) {
      if ((childrenByParent.get(workItem.work_item_id) ?? []).length > 0) {
        parentIds.add(workItem.work_item_id)
      }
    }
    setCollapsedWorkItemIds(parentIds)
  }

  function clearTrackerFilters(): void {
    setSearchValue("")
    setLevelFilter("all")
    setPillarFilter("all")
    setStatusFilter("all")
  }

  function cancelWorkItemEditor(): void {
    setIsCreating(false)
    setSelectedPanelMode("read")
    setDraft(selectedWorkItem ? buildTrackerDraftFromWorkItem(selectedWorkItem) : buildBlankTrackerDraft())
  }

  function toggleDraftPillar(pillar: DcxAdminTrackerPillar): void {
    setDraft((currentDraft) => {
      const hasPillar = currentDraft.pillars.includes(pillar)
      if (hasPillar && currentDraft.pillars.length === 1) {
        return currentDraft
      }
      return {
        ...currentDraft,
        pillars: hasPillar
          ? currentDraft.pillars.filter((currentPillar) => currentPillar !== pillar)
          : [...currentDraft.pillars, pillar],
      }
    })
  }

  return (
    <section className="flex flex-col gap-6">
      <section className="border border-black/6 bg-white px-6 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tracker</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{trackerViewTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Nested long-term direction, strategies, operations, challenges, and tasks with one activity log attached to each item.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-md"
              onClick={() => trackerQuery.refetch()}
              disabled={trackerQuery.isFetching}
            >
              <RefreshCwIcon className="size-4" />
              Refresh
            </Button>
            <Button type="button" className="rounded-md" onClick={() => startNewWorkItem()}>
              <PlusIcon className="size-4" />
              New item
            </Button>
          </div>
        </div>
      </section>

      {trackerQuery.isLoading ? (
        <section className="border border-black/6 bg-white px-6 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm text-slate-500">Loading tracker...</p>
        </section>
      ) : null}

      {trackerQuery.isError ? (
        <section className="border border-black/6 bg-white px-6 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-medium text-red-700">{(trackerQuery.error as Error).message}</p>
          <p className="mt-2 text-sm text-slate-500">
            {(trackerQuery.error as Error & { suggested_action?: string }).suggested_action ??
              "Retry after confirming the backend is reachable."}
          </p>
        </section>
      ) : null}

      {!trackerQuery.isLoading && !trackerQuery.isError ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <section className="grid gap-3 sm:grid-cols-3">
              <TrackerStat label="Operations" value={String(operationItems.length)} />
              <TrackerStat label="In progress" value={String(activeItems.length)} />
              <TrackerStat label="Waiting" value={String(blockedItems.length)} />
            </section>

            <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
              <div className="space-y-4 border-b border-black/6 px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">Work items</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-md"
                      onClick={() => setCollapsedWorkItemIds(new Set())}
                    >
                      Expand
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-md"
                      onClick={collapseAllWorkItems}
                    >
                      Collapse
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem_10rem]">
                  <Input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search work..."
                    className="h-10 rounded-md"
                  />
                  <TrackerFilterSelect
                    value={levelFilter}
                    options={[
                      { value: "all", label: "All levels" },
                      ...trackerLevelOptions,
                    ]}
                    onValueChange={(value) => setLevelFilter(value as DcxAdminTrackerLevel | DcxAdminTrackerFilterValue)}
                  />
                  <TrackerFilterSelect
                    value={pillarFilter}
                    options={[
                      { value: "all", label: "All pillars" },
                      ...trackerPillarOptions,
                    ]}
                    onValueChange={(value) => setPillarFilter(value as DcxAdminTrackerPillar | DcxAdminTrackerFilterValue)}
                  />
                  <TrackerFilterSelect
                    value={statusFilter}
                    options={[
                      { value: "all", label: "All statuses" },
                      ...trackerStatusOptions,
                    ]}
                    onValueChange={(value) => setStatusFilter(value as DcxAdminTrackerStatus | DcxAdminTrackerFilterValue)}
                  />
                </div>
                {hasActiveFilters ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                      Showing {visibleWorkItems.length} of {workItems.length}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-md"
                      onClick={clearTrackerFilters}
                    >
                      <XIcon className="size-3.5" />
                      Clear
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="space-y-3 p-4">
                {rootWorkItems.length > 0 ? (
                  rootWorkItems.map((workItem) => (
                    <DcxAdminTrackerTreeItem
                      key={workItem.work_item_id}
                      workItem={workItem}
                      depth={0}
                      childrenByParent={visibleChildrenByParent}
                      collapsedWorkItemIds={collapsedWorkItemIds}
                      forceExpanded={hasActiveFilters}
                      selectedWorkItemId={selectedWorkItemId}
                      onSelectWorkItem={(nextWorkItem) => {
                        setSelectedWorkItemId(nextWorkItem.work_item_id)
                        setIsCreating(false)
                        setSelectedPanelMode("read")
                        setUpdateBody("")
                      }}
                      onCreateChild={(parentWorkItem) => startNewWorkItem(parentWorkItem)}
                      onToggleCollapsed={toggleCollapsedWorkItem}
                    />
                  ))
                ) : (
                  <div className="px-2 py-8 text-sm text-slate-500">
                    {hasActiveFilters
                      ? "No tracker items match the current filters."
                      : "No tracker items exist yet. Create the first long-term, strategy, operation, challenge, or task item."}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            {isCreating || (selectedWorkItem && selectedPanelMode === "edit") ? (
              <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                <div className="flex flex-col gap-3 border-b border-black/6 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                    {isCreating ? "New work item" : "Edit work item"}
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-md"
                    onClick={cancelWorkItemEditor}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="space-y-4 px-6 py-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="dcx-admin-tracker-title">
                      Title
                    </label>
                    <Input
                      id="dcx-admin-tracker-title"
                      value={draft.title}
                      onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, title: event.target.value }))}
                      placeholder="Meta WhatsApp Business Verification"
                      className="rounded-md"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <TrackerSelect
                      label="Level"
                      value={draft.level}
                      options={trackerLevelOptions}
                      onValueChange={(value) =>
                        setDraft((currentDraft) => ({ ...currentDraft, level: value as DcxAdminTrackerLevel }))
                      }
                    />
                    <TrackerPillarMultiSelect
                      selectedPillars={draft.pillars}
                      onTogglePillar={toggleDraftPillar}
                    />
                    <TrackerSelect
                      label="Status"
                      value={draft.status}
                      options={trackerStatusOptions}
                      onValueChange={(value) =>
                        setDraft((currentDraft) => ({ ...currentDraft, status: value as DcxAdminTrackerStatus }))
                      }
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Parent</label>
                      <Select
                        value={draft.parentWorkItemId === null ? "none" : String(draft.parentWorkItemId)}
                        onValueChange={(value) =>
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            parentWorkItemId: value === "none" ? null : Number(value),
                          }))
                        }
                      >
                        <SelectTrigger className="h-10 w-full rounded-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No parent</SelectItem>
                          {parentOptionRows.map(({ workItem, depth }) => (
                            <SelectItem key={workItem.work_item_id} value={String(workItem.work_item_id)}>
                              {"-- ".repeat(depth)}
                              {readTrackerLevelLabel(workItem.level)} - {workItem.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700" htmlFor="dcx-admin-tracker-description">
                      Description
                    </label>
                    <Textarea
                      id="dcx-admin-tracker-description"
                      value={draft.description}
                      onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
                      placeholder="What this exists to achieve."
                      className="min-h-24 rounded-md"
                    />
                  </div>

                  {saveWorkItemMutation.isError ? (
                    <p className="text-sm text-red-700">
                      {(saveWorkItemMutation.error as Error & { suggested_action?: string }).suggested_action ??
                        (saveWorkItemMutation.error as Error).message}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap justify-end gap-2">
                    {selectedWorkItem && !isCreating ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-md"
                        onClick={() => startNewWorkItem(selectedWorkItem)}
                      >
                        <PlusIcon className="size-4" />
                        New child
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      className="rounded-md"
                      disabled={saveWorkItemMutation.isPending || draft.title.trim() === "" || draft.pillars.length === 0}
                      onClick={() => saveWorkItemMutation.mutate()}
                    >
                      <SaveIcon className="size-4" />
                      {saveWorkItemMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </section>
            ) : selectedWorkItem ? (
              <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                <div className="space-y-4 border-b border-black/6 px-6 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {readTrackerLevelLabel(selectedWorkItem.level)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {readTrackerPillarLabels(readTrackerPillarsForWorkItem(selectedWorkItem))}
                        </span>
                        <DcxAdminTrackerStatusBadge status={selectedWorkItem.status} />
                      </div>
                      <h3 className="break-words text-xl font-semibold tracking-tight text-slate-950">
                        {selectedWorkItem.title}
                      </h3>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-md"
                        onClick={() => {
                          setSelectedPanelMode("edit")
                          setDraft(buildTrackerDraftFromWorkItem(selectedWorkItem))
                        }}
                      >
                        <EditIcon className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-md"
                        onClick={() => startNewWorkItem(selectedWorkItem)}
                      >
                        <PlusIcon className="size-3.5" />
                        New child
                      </Button>
                    </div>
                  </div>
                  <DcxAdminTrackerBreadcrumb workItems={selectedBreadcrumb} />
                </div>
                <div className="space-y-5 px-6 py-5">
                  <section className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Description</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                        {selectedWorkItem.description || "No description recorded."}
                      </p>
                    </div>
                  </section>

                  <section className="border border-slate-200">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h4 className="text-base font-semibold tracking-tight text-slate-950">Activity updates</h4>
                    </div>
                    <div className="space-y-4 p-4">
                      <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                        <TrackerSelect
                          label="Type"
                          value={updateKind}
                          options={trackerUpdateKindOptions}
                          onValueChange={(value) => setUpdateKind(value as DcxAdminTrackerUpdateKind)}
                        />
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700" htmlFor="dcx-admin-tracker-update">
                            Update
                          </label>
                          <Textarea
                            id="dcx-admin-tracker-update"
                            value={updateBody}
                            onChange={(event) => setUpdateBody(event.target.value)}
                            placeholder="What changed, what is blocked, what was decided, or what happens next."
                            className="min-h-20 rounded-md"
                          />
                        </div>
                      </div>

                      {createUpdateMutation.isError ? (
                        <p className="text-sm text-red-700">
                          {(createUpdateMutation.error as Error & { suggested_action?: string }).suggested_action ??
                            (createUpdateMutation.error as Error).message}
                        </p>
                      ) : null}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          className="rounded-md"
                          disabled={createUpdateMutation.isPending || updateBody.trim() === ""}
                          onClick={() => createUpdateMutation.mutate()}
                        >
                          <MessageSquarePlusIcon className="size-4" />
                          {createUpdateMutation.isPending ? "Adding..." : "Add update"}
                        </Button>
                      </div>
                    </div>
                    <div className="border-t border-slate-200">
                      {selectedUpdates.length > 0 ? (
                        selectedUpdates.map((update) => (
                          <DcxAdminTrackerUpdateRow key={update.update_id} update={update} />
                        ))
                      ) : (
                        <p className="px-4 py-6 text-sm text-slate-500">No updates recorded for this item yet.</p>
                      )}
                    </div>
                  </section>
                </div>
              </section>
            ) : (
              <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                <div className="border-b border-black/6 px-6 py-5">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">Recent activity</h3>
                </div>
                <div className="border-slate-200">
                  {updates.length > 0 ? (
                    updates.slice(0, 8).map((update) => (
                      <DcxAdminTrackerUpdateRow key={update.update_id} update={update} showWorkItemTitle />
                    ))
                  ) : (
                    <p className="px-6 py-6 text-sm text-slate-500">No tracker activity has been recorded yet.</p>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function TrackerStat(props: { label: string; value: string }) {
  return (
    <div className="border border-black/6 bg-white px-5 py-4 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{props.label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-950">{props.value}</p>
    </div>
  )
}

function TrackerSelect<TValue extends string>(props: {
  label: string
  value: TValue
  options: Array<{ value: TValue; label: string }>
  onValueChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{props.label}</label>
      <Select value={props.value} onValueChange={props.onValueChange}>
        <SelectTrigger className="h-10 w-full rounded-md">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function TrackerPillarMultiSelect(props: {
  selectedPillars: DcxAdminTrackerPillar[]
  onTogglePillar: (pillar: DcxAdminTrackerPillar) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">Pillars</label>
      <div className="flex min-h-10 flex-wrap gap-2">
        {trackerPillarOptions.map((option) => {
          const isSelected = props.selectedPillars.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              className={cn(
                "h-9 border px-3 text-sm font-medium transition",
                isSelected
                  ? "rounded-md border-slate-950 bg-slate-950 text-white"
                  : "rounded-md border-slate-200 bg-white text-slate-700 hover:border-slate-400",
              )}
              onClick={() => props.onTogglePillar(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TrackerFilterSelect<TValue extends string>(props: {
  value: TValue
  options: Array<{ value: TValue; label: string }>
  onValueChange: (value: string) => void
}) {
  return (
    <Select value={props.value} onValueChange={props.onValueChange}>
      <SelectTrigger className="h-10 w-full rounded-md">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {props.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
