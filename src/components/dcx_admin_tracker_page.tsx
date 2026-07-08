/**
 * CONTEXT:
 * Internal DCX tracker surface.
 * It keeps the model small: nested work items plus activity updates.
 */
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  MessageSquarePlusIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SaveIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox"
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
import { archiveDcxAdminTrackerWorkItem } from "@/lib/archive_dcx_admin_tracker_work_item"
import { createDcxAdminTrackerUpdate } from "@/lib/create_dcx_admin_tracker_update"
import {
  readDcxAdminTrackerCatalog,
  type DcxAdminTrackerAssignableUser,
  type DcxAdminTrackerLevel,
  type DcxAdminTrackerPillar,
  type DcxAdminTrackerStatus,
  type DcxAdminTrackerUpdate,
  type DcxAdminTrackerUpdateKind,
  type DcxAdminTrackerWorkItem,
} from "@/lib/read_dcx_admin_tracker_catalog"
import { saveDcxAdminTrackerUpdate } from "@/lib/save_dcx_admin_tracker_update"
import { saveDcxAdminTrackerWorkItem } from "@/lib/save_dcx_admin_tracker_work_item"

export type DcxAdminTrackerView = "all" | DcxAdminTrackerLevel | "updates" | "team" | "archived"

type Props = {
  apiBaseUrl: string
  routeView: DcxAdminTrackerView
}

type DcxAdminTrackerDraft = {
  workItemId: number | null
  title: string
  description: string
  currentState: string
  level: DcxAdminTrackerLevel
  pillars: DcxAdminTrackerPillar[]
  status: DcxAdminTrackerStatus
  parentWorkItemId: number | null
  assignedToUserId: number | null
  originUpdateId: number | null
}

type DcxAdminTrackerUpdateDraft = {
  updateId: number
  workItemId: number
  updateKind: DcxAdminTrackerUpdateKind
  updateBody: string
}

type DcxAdminTrackerFilterValue = "all"

type TrackerBadgePalette = {
  backgroundColor: string
  borderColor: string
  color: string
}

type DcxAdminTrackerLevelOption = { value: DcxAdminTrackerLevel; label: string }
type DcxAdminTrackerUpdateKindOption = { value: DcxAdminTrackerUpdateKind; label: string }
type DcxAdminTrackerTeamWorkItemRow = {
  workItem: DcxAdminTrackerWorkItem
  depth: number
  parentTrail: DcxAdminTrackerWorkItem[]
}

const trackerLevelOptions: DcxAdminTrackerLevelOption[] = [
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
  { value: "not_started", label: "Future" },
  { value: "active", label: "In progress" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" },
]

const trackerUpdateKindOptions: DcxAdminTrackerUpdateKindOption[] = [
  { value: "progress", label: "Progress" },
  { value: "blocker", label: "Problem" },
  { value: "question", label: "Question" },
  { value: "decision", label: "Decision" },
  { value: "meeting", label: "Meeting" },
  { value: "concept", label: "Concepts" },
  { value: "note", label: "Other" },
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
  if (updateKind === "action") {
    return "Other"
  }
  return trackerUpdateKindOptions.find((option) => option.value === updateKind)?.label ?? updateKind
}

function readTrackerStatusPalette(status: DcxAdminTrackerStatus): TrackerBadgePalette {
  if (status === "done") {
    return { backgroundColor: "#059669", borderColor: "#047857", color: "#ffffff" }
  }
  if (status === "waiting") {
    return { backgroundColor: "#f59e0b", borderColor: "#d97706", color: "#ffffff" }
  }
  if (status === "active") {
    return { backgroundColor: "#0284c7", borderColor: "#0369a1", color: "#ffffff" }
  }
  return { backgroundColor: "#c30047", borderColor: "#9f1239", color: "#ffffff" }
}

function readTrackerUpdateKindPalette(updateKind: DcxAdminTrackerUpdateKind): TrackerBadgePalette {
  if (updateKind === "progress") {
    return { backgroundColor: "#dcfce7", borderColor: "#86efac", color: "#166534" }
  }
  if (updateKind === "blocker") {
    return { backgroundColor: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b" }
  }
  if (updateKind === "decision") {
    return { backgroundColor: "#dbeafe", borderColor: "#93c5fd", color: "#1d4ed8" }
  }
  if (updateKind === "meeting") {
    return { backgroundColor: "#cffafe", borderColor: "#67e8f9", color: "#155e75" }
  }
  if (updateKind === "concept") {
    return { backgroundColor: "#ede9fe", borderColor: "#c4b5fd", color: "#5b21b6" }
  }
  if (updateKind === "question") {
    return { backgroundColor: "#fef3c7", borderColor: "#fcd34d", color: "#92400e" }
  }
  return { backgroundColor: "#f1f5f9", borderColor: "#cbd5e1", color: "#334155" }
}

function readTrackerLevelPalette(level: DcxAdminTrackerLevel): TrackerBadgePalette {
  if (level === "long_term") {
    return { backgroundColor: "#111827", borderColor: "#111827", color: "#ffffff" }
  }
  if (level === "strategy") {
    return { backgroundColor: "#374151", borderColor: "#1f2937", color: "#ffffff" }
  }
  if (level === "operation") {
    return { backgroundColor: "#6b7280", borderColor: "#4b5563", color: "#ffffff" }
  }
  if (level === "battle") {
    return { backgroundColor: "#d1d5db", borderColor: "#9ca3af", color: "#111827" }
  }
  return { backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#334155" }
}

function readEditableUpdateKind(updateKind: DcxAdminTrackerUpdateKind): DcxAdminTrackerUpdateKind {
  return updateKind === "action" ? "note" : updateKind
}

function readTrackerLevelOption(level: DcxAdminTrackerLevel): DcxAdminTrackerLevelOption {
  return trackerLevelOptions.find((option) => option.value === level) ?? { value: "task", label: "Task" }
}

function readTrackerUpdateKindOption(updateKind: DcxAdminTrackerUpdateKind): DcxAdminTrackerUpdateKindOption {
  return (
    trackerUpdateKindOptions.find((option) => option.value === readEditableUpdateKind(updateKind)) ??
    { value: "note", label: "Other" }
  )
}

function readPluralizedCount(count: number, singularLabel: string, pluralLabel = `${singularLabel}s`): string {
  return `${count} ${count === 1 ? singularLabel : pluralLabel}`
}

function readPersonDisplayName(displayNameOrEmail: string | null, fallbackEmail: string | null = null): string {
  const preferredName = displayNameOrEmail?.trim() ?? ""
  const fallbackName = fallbackEmail?.trim() ?? ""
  const rawName = preferredName !== "" ? preferredName : fallbackName
  if (rawName === "") {
    return "Unknown"
  }

  const nameWithoutEmailDomain = rawName.includes("@") ? (rawName.split("@")[0] ?? rawName) : rawName
  const firstToken = nameWithoutEmailDomain.split(/[._+\-\s]+/).filter(Boolean)[0] ?? nameWithoutEmailDomain
  if (firstToken.trim() === "") {
    return rawName
  }
  return `${firstToken.charAt(0).toUpperCase()}${firstToken.slice(1).toLowerCase()}`
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
  if (view === "team") {
    return "Team"
  }
  if (view === "archived") {
    return "Archived"
  }
  return "Work map"
}

function readTrackerLevelPluralLabel(level: DcxAdminTrackerLevel): string {
  if (level === "long_term") {
    return "Long-term"
  }
  if (level === "strategy") {
    return "Strategies"
  }
  if (level === "operation") {
    return "Operations"
  }
  if (level === "battle") {
    return "Challenges"
  }
  return "Tasks"
}

function readWorkItemIsArchived(workItem: DcxAdminTrackerWorkItem): boolean {
  return workItem.is_archived === true
}

function buildBlankTrackerDraft(
  parent: DcxAdminTrackerWorkItem | null = null,
  originUpdateId: number | null = null,
): DcxAdminTrackerDraft {
  return {
    workItemId: null,
    title: "",
    description: "",
    currentState: "",
    level: readNextChildLevel(parent?.level ?? null),
    pillars: parent ? readTrackerPillarsForWorkItem(parent) : ["building"],
    status: "not_started",
    parentWorkItemId: parent?.work_item_id ?? null,
    assignedToUserId: parent?.assigned_to_user_id ?? null,
    originUpdateId,
  }
}

function readDraftTitleFromComposerText(composerText: string): string {
  const normalizedText = composerText.trim().replace(/\s+/g, " ")
  if (normalizedText.length <= 96) {
    return normalizedText
  }
  return `${normalizedText.slice(0, 93).trim()}...`
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
    assignedToUserId: workItem.assigned_to_user_id,
    originUpdateId: workItem.origin_update_id,
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

function readTrackerUpdateOriginLabel(update: DcxAdminTrackerUpdate): string {
  const normalizedBody = update.update_body.trim().replace(/\s+/g, " ")
  const bodySnippet =
    normalizedBody.length > 64
      ? `${normalizedBody.slice(0, 61).trim()}...`
      : normalizedBody || "--/--"

  return [
    readTrackerUpdateKindLabel(update.update_kind),
    readPersonDisplayName(update.author_display_name, update.author_email),
    formatTrackerTimestampLabel(update.created_at_ts_ms),
    update.work_item_title,
    bodySnippet,
  ].join(" - ")
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
  pillarFilter: DcxAdminTrackerPillar | DcxAdminTrackerFilterValue
  statusFilter: DcxAdminTrackerStatus | DcxAdminTrackerFilterValue
}): boolean {
  const normalizedSearchValue = params.searchValue.trim().toLowerCase()
  const matchesSearch =
    normalizedSearchValue === "" ||
    params.workItem.title.toLowerCase().includes(normalizedSearchValue) ||
    params.workItem.description.toLowerCase().includes(normalizedSearchValue)
  const matchesPillar =
    params.pillarFilter === "all" || readTrackerPillarsForWorkItem(params.workItem).includes(params.pillarFilter)
  const matchesStatus =
    params.statusFilter === "all" || params.workItem.status === params.statusFilter

  return matchesSearch && matchesPillar && matchesStatus
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

function collectDescendantWorkItems(
  childrenByParent: Map<number | null, DcxAdminTrackerWorkItem[]>,
  workItemId: number,
): DcxAdminTrackerWorkItem[] {
  const descendants: DcxAdminTrackerWorkItem[] = []
  const children = childrenByParent.get(workItemId) ?? []
  for (const child of children) {
    descendants.push(child)
    descendants.push(...collectDescendantWorkItems(childrenByParent, child.work_item_id))
  }
  return descendants
}

function readDescendantIds(
  childrenByParent: Map<number | null, DcxAdminTrackerWorkItem[]>,
  workItemId: number,
): Set<number> {
  return new Set(collectDescendantWorkItems(childrenByParent, workItemId).map((workItem) => workItem.work_item_id))
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

function buildWorkItemTreeOrder(childrenByParent: Map<number | null, DcxAdminTrackerWorkItem[]>): Map<number, number> {
  const orderById = new Map<number, number>()
  const visitedIds = new Set<number>()
  let nextOrder = 0

  function visit(parentWorkItemId: number | null): void {
    const children = childrenByParent.get(parentWorkItemId) ?? []
    for (const child of children) {
      if (visitedIds.has(child.work_item_id)) {
        continue
      }
      visitedIds.add(child.work_item_id)
      orderById.set(child.work_item_id, nextOrder)
      nextOrder += 1
      visit(child.work_item_id)
    }
  }

  visit(null)
  for (const children of childrenByParent.values()) {
    for (const child of children) {
      visit(child.parent_work_item_id ?? null)
    }
  }

  return orderById
}

function buildTeamWorkItemRows(params: {
  assignedWorkItems: DcxAdminTrackerWorkItem[]
  allWorkItems: DcxAdminTrackerWorkItem[]
  childrenByParent: Map<number | null, DcxAdminTrackerWorkItem[]>
  treeOrderById: Map<number, number>
}): DcxAdminTrackerTeamWorkItemRow[] {
  const assignedWorkItemIds = new Set(params.assignedWorkItems.map((workItem) => workItem.work_item_id))

  return [...params.assignedWorkItems]
    .sort((left, right) => {
      const leftOrder = params.treeOrderById.get(left.work_item_id) ?? Number.MAX_SAFE_INTEGER
      const rightOrder = params.treeOrderById.get(right.work_item_id) ?? Number.MAX_SAFE_INTEGER
      return leftOrder - rightOrder || left.work_item_id - right.work_item_id
    })
    .map((workItem) => {
      const breadcrumb = buildAncestorTrail({ workItem, workItems: params.allWorkItems })
      const parentTrail = breadcrumb.slice(0, -1)
      return {
        workItem,
        depth: parentTrail.filter((parentWorkItem) => assignedWorkItemIds.has(parentWorkItem.work_item_id)).length,
        parentTrail,
      }
    })
}

function buildHomeMapVisibleIds(params: {
  workItems: DcxAdminTrackerWorkItem[]
  childrenByParent: Map<number | null, DcxAdminTrackerWorkItem[]>
  searchValue: string
  pillarFilter: DcxAdminTrackerPillar | DcxAdminTrackerFilterValue
  statusFilter: DcxAdminTrackerStatus | DcxAdminTrackerFilterValue
}): Set<number> {
  const workItemById = new Map(params.workItems.map((workItem) => [workItem.work_item_id, workItem]))
  const hasFilters =
    params.searchValue.trim() !== "" ||
    params.pillarFilter !== "all" ||
    params.statusFilter !== "all"
  const visibleIds = new Set<number>()

  if (!hasFilters) {
    for (const workItem of params.workItems) {
      visibleIds.add(workItem.work_item_id)
    }
    return visibleIds
  }

  for (const workItem of params.workItems) {
    if (
      !readWorkItemMatchesTrackerFilters({
        workItem,
        searchValue: params.searchValue,
        pillarFilter: params.pillarFilter,
        statusFilter: params.statusFilter,
      })
    ) {
      continue
    }

    visibleIds.add(workItem.work_item_id)
    for (const descendant of collectDescendantWorkItems(params.childrenByParent, workItem.work_item_id)) {
      visibleIds.add(descendant.work_item_id)
    }

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

function DcxAdminTrackerStatusBadge(props: { status: DcxAdminTrackerStatus }) {
  return (
    <span
      className="inline-flex items-center border px-2 py-0.5 text-xs font-medium"
      style={readTrackerStatusPalette(props.status)}
    >
      {readTrackerStatusLabel(props.status)}
    </span>
  )
}

function DcxAdminTrackerLevelBadge(props: { level: DcxAdminTrackerLevel }) {
  return (
    <span
      className="inline-flex items-center border px-2 py-0.5 text-xs font-semibold uppercase"
      style={readTrackerLevelPalette(props.level)}
    >
      {readTrackerLevelLabel(props.level)}
    </span>
  )
}

function DcxAdminTrackerUpdateKindBadge(props: { updateKind: DcxAdminTrackerUpdateKind }) {
  return (
    <span
      className="inline-flex items-center border px-2 py-0.5 text-xs font-medium"
      style={readTrackerUpdateKindPalette(props.updateKind)}
    >
      {readTrackerUpdateKindLabel(props.updateKind)}
    </span>
  )
}

function DcxAdminTrackerUpdateKindSelect(props: {
  value: DcxAdminTrackerUpdateKind
  onValueChange: (value: DcxAdminTrackerUpdateKind) => void
  ariaLabel: string
}) {
  const selectedOption = readTrackerUpdateKindOption(props.value)

  return (
    <Combobox
      items={trackerUpdateKindOptions}
      value={selectedOption}
      itemToStringLabel={(option) => (option as DcxAdminTrackerUpdateKindOption).label}
      itemToStringValue={(option) => (option as DcxAdminTrackerUpdateKindOption).value}
      filter={() => true}
      isItemEqualToValue={(left, right) =>
        (left as DcxAdminTrackerUpdateKindOption).value === (right as DcxAdminTrackerUpdateKindOption).value
      }
      onValueChange={(option) => {
        if (!option) {
          return
        }
        props.onValueChange((option as DcxAdminTrackerUpdateKindOption).value)
      }}
      autoHighlight
    >
      <ComboboxTrigger aria-label={props.ariaLabel}>
        <ComboboxValue>
          {(option) => (
            <DcxAdminTrackerUpdateKindBadge
              updateKind={((option as DcxAdminTrackerUpdateKindOption | null)?.value ?? selectedOption.value)}
            />
          )}
        </ComboboxValue>
        <ChevronDownIcon className="size-4 shrink-0 text-slate-400" />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxEmpty>No update types found.</ComboboxEmpty>
        <ComboboxList className="p-0.5">
          {(option) => (
            <ComboboxItem
              key={(option as DcxAdminTrackerUpdateKindOption).value}
              value={option}
              className="gap-2 px-2 py-1.5"
            >
              <DcxAdminTrackerUpdateKindBadge updateKind={(option as DcxAdminTrackerUpdateKindOption).value} />
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

function DcxAdminTrackerLevelCombobox(props: {
  value: DcxAdminTrackerLevel
  onValueChange: (value: DcxAdminTrackerLevel) => void
  ariaLabel: string
}) {
  const selectedOption = readTrackerLevelOption(props.value)

  return (
    <Combobox
      items={trackerLevelOptions}
      value={selectedOption}
      itemToStringLabel={(option) => (option as DcxAdminTrackerLevelOption).label}
      itemToStringValue={(option) => (option as DcxAdminTrackerLevelOption).value}
      filter={() => true}
      isItemEqualToValue={(left, right) =>
        (left as DcxAdminTrackerLevelOption).value === (right as DcxAdminTrackerLevelOption).value
      }
      onValueChange={(option) => {
        if (!option) {
          return
        }
        props.onValueChange((option as DcxAdminTrackerLevelOption).value)
      }}
      autoHighlight
    >
      <ComboboxTrigger aria-label={props.ariaLabel}>
        <ComboboxValue>
          {(option) => (
            <DcxAdminTrackerLevelBadge level={((option as DcxAdminTrackerLevelOption | null)?.value ?? selectedOption.value)} />
          )}
        </ComboboxValue>
        <ChevronDownIcon className="size-4 shrink-0 text-slate-400" />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxEmpty>No levels found.</ComboboxEmpty>
        <ComboboxList className="p-0.5">
          {(option) => (
            <ComboboxItem
              key={(option as DcxAdminTrackerLevelOption).value}
              value={option}
              className="gap-2 px-2 py-1.5"
            >
              <DcxAdminTrackerLevelBadge level={(option as DcxAdminTrackerLevelOption).value} />
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

function DcxAdminTrackerUpdateRow(props: {
  update: DcxAdminTrackerUpdate
  originWorkItemRows?: DcxAdminTrackerTeamWorkItemRow[]
  showWorkItemTitle?: boolean
  isSelected?: boolean
  onOpenWorkItem?: (workItemId: number) => void
  onOpenOriginWorkItem?: (workItem: DcxAdminTrackerWorkItem) => void
  onEditUpdate: (update: DcxAdminTrackerUpdate) => void
}) {
  const wasEdited =
    props.update.updated_at_ts_ms !== null &&
    props.update.updated_at_ts_ms !== props.update.created_at_ts_ms

  return (
    <div
      className={cn(
        "border-b border-slate-100 px-4 py-3 last:border-b-0",
        props.isSelected ? "border border-slate-300 bg-slate-50" : "",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <DcxAdminTrackerUpdateKindBadge updateKind={props.update.update_kind} />
          <span className="text-xs font-medium text-slate-500">
            {readPersonDisplayName(props.update.author_display_name, props.update.author_email)}
          </span>
          <span className="text-xs text-slate-400">{formatTrackerTimestampLabel(props.update.created_at_ts_ms)}</span>
          {props.showWorkItemTitle && props.onOpenWorkItem ? (
            <button
              type="button"
              className="min-w-0 truncate text-xs font-medium text-slate-500 transition hover:text-slate-950"
              onClick={() => props.onOpenWorkItem?.(props.update.work_item_id)}
            >
              {props.update.work_item_title}
            </button>
          ) : props.showWorkItemTitle ? (
            <span className="text-xs font-medium text-slate-500">{props.update.work_item_title}</span>
          ) : null}
          {wasEdited ? (
            <span className="text-xs text-slate-400">
              Edited by {readPersonDisplayName(props.update.updated_by_display_name, props.update.updated_by_email)}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-md px-2"
          onClick={() => props.onEditUpdate(props.update)}
        >
          <EditIcon className="size-3.5" />
          Edit
        </Button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{props.update.update_body}</p>
      {props.originWorkItemRows && props.originWorkItemRows.length > 0 ? (
        <div className="mt-2 ml-4 space-y-1 border-l border-slate-200 pl-3">
          {props.originWorkItemRows.map((originWorkItemRow) => (
            <button
              key={originWorkItemRow.workItem.work_item_id}
              type="button"
              className="flex w-full min-w-0 items-center justify-between gap-3 border border-slate-200 bg-white px-2.5 py-1.5 text-left transition hover:border-slate-300 hover:bg-slate-50"
              onClick={() => props.onOpenOriginWorkItem?.(originWorkItemRow.workItem)}
            >
              <span className="flex min-w-0 items-center gap-2">
                {originWorkItemRow.depth > 0 ? (
                  <span
                    aria-hidden="true"
                    className="shrink-0"
                    style={{ width: `${Math.min(originWorkItemRow.depth, 4) * 1.1}rem` }}
                  />
                ) : null}
                <span className="text-xs text-slate-300">&gt;</span>
                <DcxAdminTrackerLevelBadge level={originWorkItemRow.workItem.level} />
                <span className="min-w-0 truncate text-xs font-medium text-slate-800">
                  {originWorkItemRow.workItem.title}
                </span>
                {originWorkItemRow.workItem.assigned_to_email ? (
                  <span className="shrink-0 text-xs font-medium text-slate-500">
                    @{readPersonDisplayName(
                      originWorkItemRow.workItem.assigned_to_display_name,
                      originWorkItemRow.workItem.assigned_to_email,
                    )}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0">
                <DcxAdminTrackerStatusBadge status={originWorkItemRow.workItem.status} />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DcxAdminTrackerWorkCard(props: {
  workItem: DcxAdminTrackerWorkItem
  isSelected: boolean
  compact?: boolean
  onSelectWorkItem: (workItem: DcxAdminTrackerWorkItem) => void
  onCreateChild: (workItem: DcxAdminTrackerWorkItem) => void
}) {
  return (
    <div
      className={cn(
        "flex items-stretch border transition hover:border-slate-300 hover:bg-slate-50",
        props.isSelected ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white",
      )}
    >
      <button
        type="button"
        className={cn("min-w-0 flex-1 text-left", props.compact ? "px-3 py-2.5" : "px-4 py-3")}
        onClick={() => props.onSelectWorkItem(props.workItem)}
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <DcxAdminTrackerLevelBadge level={props.workItem.level} />
            <span className="min-w-0 break-words text-sm font-semibold text-slate-950">{props.workItem.title}</span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <span className="text-xs text-slate-400">
              {readTrackerPillarLabels(readTrackerPillarsForWorkItem(props.workItem))}
            </span>
            {props.workItem.is_archived ? (
              <span className="inline-flex items-center border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                Archived
              </span>
            ) : null}
            {props.workItem.assigned_to_email ? (
              <span className="text-xs font-medium text-slate-500">
                {readPersonDisplayName(props.workItem.assigned_to_display_name, props.workItem.assigned_to_email)}
              </span>
            ) : null}
            <span className="text-xs text-slate-400">{props.workItem.update_count}</span>
            <DcxAdminTrackerStatusBadge status={props.workItem.status} />
          </span>
        </div>
        {!props.compact && props.workItem.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{props.workItem.description}</p>
        ) : null}
      </button>
      {!props.workItem.is_archived ? (
        <button
          type="button"
          className="flex w-10 shrink-0 items-start justify-center border-l border-slate-100 pt-3 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          onClick={() => props.onCreateChild(props.workItem)}
          aria-label={`Create child for ${props.workItem.title}`}
        >
          <PlusIcon className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

function DcxAdminTrackerMapBranch(props: {
  workItem: DcxAdminTrackerWorkItem
  visibleIds: Set<number>
  childrenByParent: Map<number | null, DcxAdminTrackerWorkItem[]>
  selectedWorkItemId: number | null
  onSelectWorkItem: (workItem: DcxAdminTrackerWorkItem) => void
  onCreateChild: (workItem: DcxAdminTrackerWorkItem) => void
  renderInlinePanel: (workItem: DcxAdminTrackerWorkItem) => ReactNode
}) {
  const children = (props.childrenByParent.get(props.workItem.work_item_id) ?? []).filter(
    (child) => props.visibleIds.has(child.work_item_id),
  )

  return (
    <div className="space-y-2">
      <DcxAdminTrackerWorkCard
        workItem={props.workItem}
        compact
        isSelected={props.selectedWorkItemId === props.workItem.work_item_id}
        onSelectWorkItem={props.onSelectWorkItem}
        onCreateChild={props.onCreateChild}
      />
      {props.renderInlinePanel(props.workItem)}
      {children.length > 0 ? (
        <div className="ml-4 space-y-2 border-l border-slate-200 pl-4">
          {children.map((child) => (
            <DcxAdminTrackerMapBranch
              key={child.work_item_id}
              workItem={child}
              visibleIds={props.visibleIds}
              childrenByParent={props.childrenByParent}
              selectedWorkItemId={props.selectedWorkItemId}
              onSelectWorkItem={props.onSelectWorkItem}
              onCreateChild={props.onCreateChild}
              renderInlinePanel={props.renderInlinePanel}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DcxAdminTrackerRelationList(props: {
  title: string
  workItems: DcxAdminTrackerWorkItem[]
  emptyText: string
  onSelectWorkItem: (workItem: DcxAdminTrackerWorkItem) => void
}) {
  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{props.title}</p>
      {props.workItems.length > 0 ? (
        <div className="space-y-1">
          {props.workItems.map((workItem) => (
            <button
              key={workItem.work_item_id}
              type="button"
              className="flex w-full items-center justify-between gap-3 border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              onClick={() => props.onSelectWorkItem(workItem)}
            >
              <span className="min-w-0 truncate">{workItem.title}</span>
              <ChevronRightIcon className="size-3.5 shrink-0 text-slate-300" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{props.emptyText}</p>
      )}
    </section>
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
                "h-9 rounded-md border px-3 text-sm font-medium transition",
                isSelected
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400",
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

function TrackerAssigneeSelect(props: {
  assignableUsers: DcxAdminTrackerAssignableUser[]
  assignedToUserId: number | null
  onValueChange: (assignedToUserId: number | null) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">Assigned to</label>
      <Select
        value={props.assignedToUserId === null ? "none" : String(props.assignedToUserId)}
        onValueChange={(value) => props.onValueChange(value === "none" ? null : Number(value))}
      >
        <SelectTrigger className="h-10 w-full rounded-md">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unassigned</SelectItem>
        {props.assignableUsers.map((user) => (
            <SelectItem key={user.user_id} value={String(user.user_id)}>
              {readPersonDisplayName(user.display_name, user.primary_email)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function DcxAdminTrackerPage(props: Props) {
  const queryClient = useQueryClient()
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<number | null>(null)
  const [updateWorkItemId, setUpdateWorkItemId] = useState<number | null>(null)
  const [draft, setDraft] = useState<DcxAdminTrackerDraft>(() => buildBlankTrackerDraft())
  const [isCreating, setIsCreating] = useState(false)
  const [selectedPanelMode, setSelectedPanelMode] = useState<"read" | "edit">("read")
  const [searchValue, setSearchValue] = useState("")
  const [pillarFilter, setPillarFilter] = useState<DcxAdminTrackerPillar | DcxAdminTrackerFilterValue>("all")
  const [statusFilter, setStatusFilter] = useState<DcxAdminTrackerStatus | DcxAdminTrackerFilterValue>("all")
  const [updateKind, setUpdateKind] = useState<DcxAdminTrackerUpdateKind>("note")
  const [updateBody, setUpdateBody] = useState("")
  const [editingUpdateDraft, setEditingUpdateDraft] = useState<DcxAdminTrackerUpdateDraft | null>(null)

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
        assignedToUserId: draft.assignedToUserId,
        originUpdateId: draft.originUpdateId,
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dcx_admin_tracker_catalog"] })
      setSelectedWorkItemId(result.data.work_item_id)
      setUpdateWorkItemId(result.data.work_item_id)
      setIsCreating(false)
      setSelectedPanelMode("read")
    },
  })

  const createUpdateMutation = useMutation({
    mutationFn: async () => {
      if (updateWorkItemId === null) {
        throw new Error("Choose a level before adding an update.")
      }
      return createDcxAdminTrackerUpdate({
        apiBaseUrl: props.apiBaseUrl,
        workItemId: updateWorkItemId,
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

  const saveUpdateMutation = useMutation({
    mutationFn: async () => {
      if (editingUpdateDraft === null) {
        throw new Error("Choose an update before saving.")
      }
      return saveDcxAdminTrackerUpdate({
        apiBaseUrl: props.apiBaseUrl,
        updateId: editingUpdateDraft.updateId,
        workItemId: editingUpdateDraft.workItemId,
        updateKind: editingUpdateDraft.updateKind,
        updateBody: editingUpdateDraft.updateBody,
      })
    },
    onSuccess: async (result) => {
      setEditingUpdateDraft(null)
      setSelectedWorkItemId(result.data.work_item_id)
      setUpdateWorkItemId(result.data.work_item_id)
      await queryClient.invalidateQueries({ queryKey: ["dcx_admin_tracker_catalog"] })
    },
  })

  const archiveWorkItemMutation = useMutation({
    mutationFn: async (params: { workItemId: number; isArchived: boolean }) =>
      archiveDcxAdminTrackerWorkItem({
        apiBaseUrl: props.apiBaseUrl,
        workItemId: params.workItemId,
        isArchived: params.isArchived,
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dcx_admin_tracker_catalog"] })
      if (result.data.is_archived || props.routeView === "archived") {
        setSelectedWorkItemId(null)
        setSelectedPanelMode("read")
        setIsCreating(false)
      }
    },
  })

  const workItems = trackerQuery.data?.data.work_items ?? []
  const updates = trackerQuery.data?.data.updates ?? []
  const assignableUsers = trackerQuery.data?.data.assignable_users ?? []
  const activeWorkItems = useMemo(() => workItems.filter((workItem) => !readWorkItemIsArchived(workItem)), [workItems])
  const archivedWorkItems = useMemo(() => workItems.filter(readWorkItemIsArchived), [workItems])
  const viewWorkItems = props.routeView === "archived" ? archivedWorkItems : activeWorkItems
  const activeWorkItemIds = useMemo(
    () => new Set(activeWorkItems.map((workItem) => workItem.work_item_id)),
    [activeWorkItems],
  )
  const visibleUpdates = useMemo(
    () => updates.filter((update) => activeWorkItemIds.has(update.work_item_id)),
    [updates, activeWorkItemIds],
  )
  const childrenByParent = useMemo(() => buildChildrenByParent(viewWorkItems), [viewWorkItems])
  const activeChildrenByParent = useMemo(() => buildChildrenByParent(activeWorkItems), [activeWorkItems])
  const activeTreeOrderById = useMemo(() => buildWorkItemTreeOrder(activeChildrenByParent), [activeChildrenByParent])
  const originWorkItemRowsByUpdateId = useMemo(() => {
    const originWorkItemsByUpdateId = new Map<number, DcxAdminTrackerWorkItem[]>()
    for (const workItem of activeWorkItems) {
      if (workItem.origin_update_id === null) {
        continue
      }
      const existingRows = originWorkItemsByUpdateId.get(workItem.origin_update_id) ?? []
      existingRows.push(workItem)
      originWorkItemsByUpdateId.set(workItem.origin_update_id, existingRows)
    }

    const nextOriginWorkItemRowsByUpdateId = new Map<number, DcxAdminTrackerTeamWorkItemRow[]>()
    for (const [updateId, originWorkItems] of originWorkItemsByUpdateId.entries()) {
      nextOriginWorkItemRowsByUpdateId.set(
        updateId,
        buildTeamWorkItemRows({
          assignedWorkItems: originWorkItems,
          allWorkItems: activeWorkItems,
          childrenByParent: activeChildrenByParent,
          treeOrderById: activeTreeOrderById,
        }),
      )
    }
    return nextOriginWorkItemRowsByUpdateId
  }, [activeWorkItems, activeChildrenByParent, activeTreeOrderById])
  const parentOptionRows = useMemo(
    () => buildParentOptionRows({ childrenByParent: activeChildrenByParent, excludedWorkItemIds: new Set() }),
    [activeChildrenByParent],
  )
  const selectedWorkItem = useMemo(
    () => workItems.find((workItem) => workItem.work_item_id === selectedWorkItemId) ?? null,
    [selectedWorkItemId, workItems],
  )
  const selectedBreadcrumb = useMemo(
    () => buildAncestorTrail({ workItem: selectedWorkItem, workItems }),
    [selectedWorkItem, workItems],
  )
  const selectedAncestors = selectedBreadcrumb.slice(0, -1)
  const selectedDescendants = useMemo(
    () => (selectedWorkItem ? collectDescendantWorkItems(childrenByParent, selectedWorkItem.work_item_id) : []),
    [childrenByParent, selectedWorkItem],
  )
  const selectedUpdates = updates.filter((update) => update.work_item_id === selectedWorkItemId)
  const selectedOriginUpdate = selectedWorkItem?.origin_update_id
    ? updates.find((update) => update.update_id === selectedWorkItem.origin_update_id) ?? null
    : null
  const workItemsFromEditingUpdate = editingUpdateDraft
    ? workItems.filter((workItem) => workItem.origin_update_id === editingUpdateDraft.updateId)
    : []
  const excludedParentIds = useMemo(() => {
    const nextExcludedParentIds = draft.workItemId === null
      ? new Set<number>()
      : readDescendantIds(childrenByParent, draft.workItemId)
    if (draft.workItemId !== null) {
      nextExcludedParentIds.add(draft.workItemId)
    }
    return nextExcludedParentIds
  }, [childrenByParent, draft.workItemId])
  const editableParentOptionRows = useMemo(
    () => buildParentOptionRows({ childrenByParent: activeChildrenByParent, excludedWorkItemIds: excludedParentIds }),
    [activeChildrenByParent, excludedParentIds],
  )
  const hasActiveFilters =
    searchValue.trim() !== "" ||
    pillarFilter !== "all" ||
    statusFilter !== "all"
  const filteredLevelWorkItems = useMemo(
    () => {
      if (props.routeView === "archived") {
        return archivedWorkItems.filter((workItem) =>
          readWorkItemMatchesTrackerFilters({ workItem, searchValue, pillarFilter, statusFilter }),
        )
      }
      return activeWorkItems.filter(
        (workItem) =>
          props.routeView !== "all" &&
          props.routeView !== "updates" &&
          props.routeView !== "team" &&
          props.routeView !== "archived" &&
          workItem.level === props.routeView &&
          readWorkItemMatchesTrackerFilters({ workItem, searchValue, pillarFilter, statusFilter }),
      )
    },
    [activeWorkItems, archivedWorkItems, props.routeView, searchValue, pillarFilter, statusFilter],
  )
  const homeVisibleIds = useMemo(
    () =>
      buildHomeMapVisibleIds({
        workItems: activeWorkItems,
        childrenByParent,
        searchValue,
        pillarFilter,
        statusFilter,
      }),
    [activeWorkItems, childrenByParent, searchValue, pillarFilter, statusFilter],
  )
  const homeRootItems = useMemo(
    () =>
      activeWorkItems.filter(
        (workItem) =>
          homeVisibleIds.has(workItem.work_item_id) &&
          (workItem.parent_work_item_id === null || !homeVisibleIds.has(workItem.parent_work_item_id)),
      ),
    [activeWorkItems, homeVisibleIds],
  )
  const trackerPersonGroups = useMemo(
    () =>
      assignableUsers.map((user) => {
        const assignedWorkItems = activeWorkItems.filter((workItem) => workItem.assigned_to_user_id === user.user_id)
        const assignedLevelWorkItems = assignedWorkItems.filter((workItem) => workItem.level !== "task")
        const assignedTaskWorkItems = assignedWorkItems.filter((workItem) => workItem.level === "task")
        return {
          user,
          levelWorkItems: assignedLevelWorkItems,
          taskWorkItems: assignedTaskWorkItems,
          levelRows: buildTeamWorkItemRows({
            assignedWorkItems: assignedLevelWorkItems,
            allWorkItems: activeWorkItems,
            childrenByParent: activeChildrenByParent,
            treeOrderById: activeTreeOrderById,
          }),
          taskRows: buildTeamWorkItemRows({
            assignedWorkItems: assignedTaskWorkItems,
            allWorkItems: activeWorkItems,
            childrenByParent: activeChildrenByParent,
            treeOrderById: activeTreeOrderById,
          }),
          updates: visibleUpdates.filter((update) => update.author_user_id === user.user_id),
        }
      }),
    [assignableUsers, activeWorkItems, activeChildrenByParent, activeTreeOrderById, visibleUpdates],
  )
  const shouldRenderTrackerSidePanel: boolean = false
  const hasTrackerSidePanel = editingUpdateDraft !== null || isCreating || selectedWorkItem !== null
  const trackerViewTitle = readTrackerViewTitle(props.routeView)
  const visibleWorkItemCount =
    props.routeView === "all"
      ? homeVisibleIds.size
      : props.routeView === "updates"
        ? visibleUpdates.length
        : props.routeView === "team"
          ? trackerPersonGroups.length
          : filteredLevelWorkItems.length
  const totalViewItemCount =
    props.routeView === "all"
      ? activeWorkItems.length
      : props.routeView === "updates"
        ? visibleUpdates.length
        : props.routeView === "team"
          ? trackerPersonGroups.length
          : props.routeView === "archived"
            ? archivedWorkItems.length
            : activeWorkItems.filter((workItem) => workItem.level === props.routeView).length

  useEffect(() => {
    if (!selectedWorkItem || isCreating) {
      return
    }
    setDraft(buildTrackerDraftFromWorkItem(selectedWorkItem))
  }, [selectedWorkItem, isCreating])

  useEffect(() => {
    setSelectedWorkItemId(null)
    setIsCreating(false)
    setSelectedPanelMode("read")
    setEditingUpdateDraft(null)
  }, [props.routeView])

  function selectWorkItem(workItem: DcxAdminTrackerWorkItem): void {
    setSelectedWorkItemId(workItem.work_item_id)
    setUpdateWorkItemId(workItem.work_item_id)
    setIsCreating(false)
    setSelectedPanelMode("read")
    setEditingUpdateDraft(null)
  }

  function toggleWorkItem(workItem: DcxAdminTrackerWorkItem): void {
    const isSameOpenWorkItem =
      selectedWorkItemId === workItem.work_item_id &&
      (selectedPanelMode === "read" || selectedPanelMode === "edit")

    if (isSameOpenWorkItem) {
      hideSelectedWorkItemPanel()
      return
    }

    selectWorkItem(workItem)
  }

  function openWorkItemById(workItemId: number): void {
    const workItem = workItems.find((candidate) => candidate.work_item_id === workItemId)
    if (workItem) {
      selectWorkItem(workItem)
    }
  }

  function startEditingUpdate(update: DcxAdminTrackerUpdate): void {
    saveUpdateMutation.reset()
    setEditingUpdateDraft({
      updateId: update.update_id,
      workItemId: update.work_item_id,
      updateKind: readEditableUpdateKind(update.update_kind),
      updateBody: update.update_body,
    })
  }

  function startNewWorkItem(parent: DcxAdminTrackerWorkItem | null = null): void {
    setIsCreating(true)
    setSelectedWorkItemId(parent?.work_item_id ?? null)
    setUpdateWorkItemId(parent?.work_item_id ?? updateWorkItemId)
    setSelectedPanelMode("edit")
    setDraft(buildBlankTrackerDraft(parent))
  }

  function startNewWorkItemFromGlobalComposer(): void {
    const parent = activeWorkItems.find((workItem) => workItem.work_item_id === updateWorkItemId) ?? null
    const composerText = updateBody.trim()
    const nextDraft = buildBlankTrackerDraft(parent)
    setEditingUpdateDraft(null)
    setIsCreating(true)
    setSelectedWorkItemId(parent?.work_item_id ?? null)
    setUpdateWorkItemId(parent?.work_item_id ?? updateWorkItemId)
    setSelectedPanelMode("edit")
    setDraft({
      ...nextDraft,
      title: composerText ? readDraftTitleFromComposerText(composerText) : nextDraft.title,
      description: composerText,
    })
  }

  function startNewWorkItemFromEditingUpdate(): void {
    if (!editingUpdateDraft) {
      return
    }

    const parent = workItems.find((workItem) => workItem.work_item_id === editingUpdateDraft.workItemId) ?? null
    setIsCreating(true)
    setSelectedWorkItemId(parent?.work_item_id ?? null)
    setUpdateWorkItemId(parent?.work_item_id ?? updateWorkItemId)
    setSelectedPanelMode("edit")
    setDraft(buildBlankTrackerDraft(parent, editingUpdateDraft.updateId))
  }

  function archiveSelectedWorkItem(isArchived: boolean): void {
    if (!selectedWorkItem) {
      return
    }
    archiveWorkItemMutation.mutate({
      workItemId: selectedWorkItem.work_item_id,
      isArchived,
    })
  }

  function clearTrackerFilters(): void {
    setSearchValue("")
    setPillarFilter("all")
    setStatusFilter("all")
  }

  function cancelWorkItemEditor(): void {
    setIsCreating(false)
    setSelectedPanelMode("read")
    setDraft(selectedWorkItem ? buildTrackerDraftFromWorkItem(selectedWorkItem) : buildBlankTrackerDraft())
  }

  function hideSelectedWorkItemPanel(): void {
    setSelectedWorkItemId(null)
    setSelectedPanelMode("read")
    setIsCreating(false)
    setEditingUpdateDraft(null)
    setDraft(buildBlankTrackerDraft())
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

  function renderWorkItemEditorPanel(options: { inline?: boolean } = {}) {
    return (
      <section
        className={cn(
          "border border-black/6 bg-white",
          options.inline ? "shadow-none" : "shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]",
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-3 border-b border-black/6 sm:flex-row sm:items-center sm:justify-between",
            options.inline ? "px-4 py-3" : "px-6 py-5",
          )}
        >
          <h3 className="text-lg font-semibold tracking-tight text-slate-950">
            {isCreating ? "New level" : "Edit level"}
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
        <div className={cn(options.inline ? "space-y-3 px-4 py-3" : "space-y-4 px-6 py-5")}>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Level</label>
              <DcxAdminTrackerLevelCombobox
                value={draft.level}
                ariaLabel="Level"
                onValueChange={(level) => setDraft((currentDraft) => ({ ...currentDraft, level }))}
              />
            </div>
            <TrackerPillarMultiSelect selectedPillars={draft.pillars} onTogglePillar={toggleDraftPillar} />
            <TrackerSelect
              label="Status"
              value={draft.status}
              options={trackerStatusOptions}
              onValueChange={(value) =>
                setDraft((currentDraft) => ({ ...currentDraft, status: value as DcxAdminTrackerStatus }))
              }
            />
            <TrackerAssigneeSelect
              assignableUsers={assignableUsers}
              assignedToUserId={draft.assignedToUserId}
              onValueChange={(assignedToUserId) => setDraft((currentDraft) => ({ ...currentDraft, assignedToUserId }))}
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
                  {editableParentOptionRows.map(({ workItem, depth }) => (
                    <SelectItem key={workItem.work_item_id} value={String(workItem.work_item_id)}>
                      {"-- ".repeat(depth)}
                      {readTrackerLevelLabel(workItem.level)} - {workItem.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Origin</label>
              <Select
                value={draft.originUpdateId === null ? "none" : String(draft.originUpdateId)}
                onValueChange={(value) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    originUpdateId: value === "none" ? null : Number(value),
                  }))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-md" aria-label="Origin update">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No origin</SelectItem>
                  {updates.map((update) => (
                    <SelectItem key={update.update_id} value={String(update.update_id)}>
                      {readTrackerUpdateOriginLabel(update)}
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
    )
  }

  function renderSelectedWorkItemDetailPanel(options: { inline?: boolean; contextPersonUserId?: number } = {}) {
    if (!selectedWorkItem) {
      return null
    }

    const workItem = selectedWorkItem
    const taskContextLine =
      workItem.level === "task" && selectedAncestors.length > 0
        ? selectedAncestors
            .map((parentWorkItem) => {
              const parentOwnerName =
                options.contextPersonUserId !== undefined &&
                parentWorkItem.assigned_to_user_id !== null &&
                parentWorkItem.assigned_to_user_id !== options.contextPersonUserId
                  ? ` @${readPersonDisplayName(parentWorkItem.assigned_to_display_name, parentWorkItem.assigned_to_email)}`
                  : ""
              return `${parentWorkItem.title}${parentOwnerName}`
            })
            .join(" > ")
        : ""
    const actionButtons = (
      <div className="flex shrink-0 flex-wrap gap-2">
        {workItem.is_archived ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-md"
            disabled={archiveWorkItemMutation.isPending}
            onClick={() => archiveSelectedWorkItem(false)}
          >
            <RotateCcwIcon className="size-3.5" />
            Restore
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-md"
            disabled={archiveWorkItemMutation.isPending}
            onClick={() => archiveSelectedWorkItem(true)}
          >
            <ArchiveIcon className="size-3.5" />
            Archive
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-md"
          onClick={() => {
            setSelectedPanelMode("edit")
            setDraft(buildTrackerDraftFromWorkItem(workItem))
          }}
        >
          <EditIcon className="size-3.5" />
          Edit
        </Button>
        {!workItem.is_archived ? (
          <Button type="button" size="sm" className="rounded-md" onClick={() => startNewWorkItem(workItem)}>
            <PlusIcon className="size-3.5" />
            New child
          </Button>
        ) : null}
      </div>
    )

    return (
      <section
        className={cn(
          "border border-black/6",
          options.inline
            ? "border-l-2 border-l-slate-300 bg-slate-50/70 shadow-none"
            : "bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]",
        )}
      >
        {options.inline ? (
          <div className="flex justify-end border-b border-slate-200/70 px-4 py-2">{actionButtons}</div>
        ) : (
          <div className="space-y-4 border-b border-black/6 px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <DcxAdminTrackerLevelBadge level={workItem.level} />
                  <h3 className="min-w-0 break-words text-xl font-semibold tracking-tight text-slate-950">
                    {workItem.title}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {readTrackerPillarLabels(readTrackerPillarsForWorkItem(workItem))}
                  </span>
                  <DcxAdminTrackerStatusBadge status={workItem.status} />
                  {workItem.is_archived ? (
                    <span className="inline-flex items-center border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Archived
                    </span>
                  ) : null}
                  {workItem.assigned_to_email ? (
                    <span className="text-xs font-medium text-slate-500">
                      {readPersonDisplayName(workItem.assigned_to_display_name, workItem.assigned_to_email)}
                    </span>
                  ) : null}
                </div>
              </div>
              {actionButtons}
            </div>
          </div>
        )}
        <div className={cn(options.inline ? "space-y-4 px-4 py-3" : "space-y-6 px-6 py-5")}>
          {options.inline && taskContextLine ? (
            <p className="truncate text-xs text-slate-400">{taskContextLine}</p>
          ) : null}
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Description</p>
            <p className={cn("whitespace-pre-wrap text-sm leading-6 text-slate-800", options.inline ? "mt-1" : "mt-2")}>
              {workItem.description || "--/--"}
            </p>
          </section>

          {archiveWorkItemMutation.isError ? (
            <p className="text-sm text-red-700">
              {(archiveWorkItemMutation.error as Error & { suggested_action?: string }).suggested_action ??
                (archiveWorkItemMutation.error as Error).message}
            </p>
          ) : null}

          {!options.inline && workItem.origin_update_id ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Origin update</p>
              {selectedOriginUpdate ? (
                <button
                  type="button"
                  className="mt-2 w-full border border-slate-200 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
                  onClick={() => startEditingUpdate(selectedOriginUpdate)}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <DcxAdminTrackerUpdateKindBadge updateKind={selectedOriginUpdate.update_kind} />
                    <span className="text-xs text-slate-400">
                      {readPersonDisplayName(selectedOriginUpdate.author_display_name, selectedOriginUpdate.author_email)}{" "}
                      {formatTrackerTimestampLabel(selectedOriginUpdate.created_at_ts_ms)}
                    </span>
                  </span>
                  <span className="mt-1 block line-clamp-2 text-sm leading-5 text-slate-800">
                    {selectedOriginUpdate.update_body}
                  </span>
                </button>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Origin update not loaded in this catalog window.</p>
              )}
            </section>
          ) : null}

          {!options.inline ? (
            <>
              <DcxAdminTrackerRelationList
                title="Belongs to"
                workItems={selectedAncestors}
                emptyText="This item has no parent context."
                onSelectWorkItem={selectWorkItem}
              />

              {trackerLevelOptions.map((levelOption) => {
                const matchingDescendants = selectedDescendants.filter(
                  (descendant) => descendant.level === levelOption.value,
                )
                if (matchingDescendants.length === 0) {
                  return null
                }
                return (
                  <DcxAdminTrackerRelationList
                    key={levelOption.value}
                    title={`Contains ${readTrackerLevelPluralLabel(levelOption.value)}`}
                    workItems={matchingDescendants}
                    emptyText=""
                    onSelectWorkItem={selectWorkItem}
                  />
                )
              })}
            </>
          ) : null}

          <section className="border border-slate-200">
            <div className="border-b border-slate-200 px-3 py-2">
              <h4 className="text-base font-semibold tracking-tight text-slate-950">Updates</h4>
            </div>
            <div>
              {selectedUpdates.length > 0 ? (
                selectedUpdates.map((update) => renderUpdateRowWithInlinePanel(update))
              ) : (
                <p className="px-3 py-4 text-sm text-slate-500">--/--</p>
              )}
            </div>
          </section>
        </div>
      </section>
    )
  }

  function renderWorkItemInlinePanel(workItem: DcxAdminTrackerWorkItem, options: { indentRem?: number } = {}) {
    if (selectedWorkItemId !== workItem.work_item_id) {
      return null
    }

    return (
      <div
        className="min-w-0"
        style={options.indentRem === undefined ? undefined : { marginLeft: `${options.indentRem}rem` }}
      >
        {isCreating || selectedPanelMode === "edit"
          ? renderWorkItemEditorPanel({ inline: true })
          : renderSelectedWorkItemDetailPanel({ inline: true })}
      </div>
    )
  }

  function renderUpdateEditorPanel(options: { inline?: boolean } = {}) {
    if (editingUpdateDraft === null) {
      return null
    }

    const isCreatingLevelFromThisUpdate = isCreating && draft.originUpdateId === editingUpdateDraft.updateId

    return (
      <section
        className={cn(
          "border border-black/6",
          options.inline
            ? "border-l-2 border-l-slate-300 bg-slate-50/70 shadow-none"
            : "bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]",
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-3 border-b border-black/6 sm:flex-row sm:items-center sm:justify-between",
            options.inline ? "px-4 py-3" : "px-5 py-4",
          )}
        >
          <h3 className="text-base font-semibold tracking-tight text-slate-950">Edit update</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-md"
            onClick={() => {
              saveUpdateMutation.reset()
              setEditingUpdateDraft(null)
            }}
          >
            Cancel
          </Button>
        </div>
        <div className={cn("space-y-3", options.inline ? "px-4 py-3" : "px-5 py-4")}>
          <Textarea
            value={editingUpdateDraft.updateBody}
            onChange={(event) =>
              setEditingUpdateDraft((currentDraft) =>
                currentDraft ? { ...currentDraft, updateBody: event.target.value } : currentDraft,
              )
            }
            placeholder="Update: what changed, what is blocked, what was decided, or what happens next."
            className="min-h-24 rounded-md"
            aria-label="Edited activity update"
          />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <DcxAdminTrackerUpdateKindSelect
              value={editingUpdateDraft.updateKind}
              onValueChange={(updateKind) =>
                setEditingUpdateDraft((currentDraft) =>
                  currentDraft ? { ...currentDraft, updateKind } : currentDraft,
                )
              }
              ariaLabel="Edited update type"
            />
            <Select
              value={String(editingUpdateDraft.workItemId)}
              onValueChange={(value) =>
                setEditingUpdateDraft((currentDraft) =>
                  currentDraft ? { ...currentDraft, workItemId: Number(value) } : currentDraft,
                )
              }
            >
              <SelectTrigger className="h-10 w-full rounded-md" aria-label="Edited update level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {parentOptionRows.map(({ workItem, depth }) => (
                  <SelectItem key={workItem.work_item_id} value={String(workItem.work_item_id)}>
                    {"-- ".repeat(depth)}
                    {readTrackerLevelLabel(workItem.level)} - {workItem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              className="rounded-md whitespace-nowrap"
              disabled={saveUpdateMutation.isPending || editingUpdateDraft.updateBody.trim() === ""}
              onClick={() => saveUpdateMutation.mutate()}
            >
              <SaveIcon className="size-4" />
              {saveUpdateMutation.isPending ? "Saving..." : "Save update"}
            </Button>
          </div>
          {saveUpdateMutation.isError ? (
            <p className="text-sm text-red-700">
              {(saveUpdateMutation.error as Error & { suggested_action?: string }).suggested_action ??
                (saveUpdateMutation.error as Error).message}
            </p>
          ) : null}
          <section className="border-t border-slate-100 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-950">Levels from this update</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-md"
                onClick={startNewWorkItemFromEditingUpdate}
              >
                <PlusIcon className="size-3.5" />
                Create level
              </Button>
            </div>
            {workItemsFromEditingUpdate.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                {workItemsFromEditingUpdate.map((workItem) => (
                  <div key={workItem.work_item_id} className="space-y-2">
                    <button
                      type="button"
                      className={cn(
                        "flex w-full min-w-0 items-center justify-between gap-3 border px-3 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50",
                        selectedWorkItemId === workItem.work_item_id
                          ? "border-slate-400 bg-slate-50"
                          : "border-slate-200 bg-white",
                      )}
                      onClick={() => toggleWorkItem(workItem)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <DcxAdminTrackerLevelBadge level={workItem.level} />
                        <span className="min-w-0 truncate text-sm font-medium text-slate-900">{workItem.title}</span>
                      </span>
                      <DcxAdminTrackerStatusBadge status={workItem.status} />
                    </button>
                    {renderWorkItemInlinePanel(workItem)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No levels have been created from this update yet.</p>
            )}
            {isCreatingLevelFromThisUpdate ? <div className="mt-3">{renderWorkItemEditorPanel({ inline: true })}</div> : null}
          </section>
        </div>
      </section>
    )
  }

  function renderUpdateRowWithInlinePanel(
    update: DcxAdminTrackerUpdate,
    options: { showWorkItemTitle?: boolean; onOpenWorkItem?: (workItemId: number) => void } = {},
  ) {
    const isEditingThisUpdate = editingUpdateDraft?.updateId === update.update_id
    const originWorkItemRows = originWorkItemRowsByUpdateId.get(update.update_id) ?? []
    const selectedOriginWorkItemRow = originWorkItemRows.find(
      (workItemRow) => workItemRow.workItem.work_item_id === selectedWorkItemId,
    )

    return (
      <div key={update.update_id} className="space-y-2">
        <DcxAdminTrackerUpdateRow
          update={update}
          originWorkItemRows={originWorkItemRows}
          showWorkItemTitle={options.showWorkItemTitle}
          isSelected={isEditingThisUpdate}
          onOpenWorkItem={options.onOpenWorkItem}
          onOpenOriginWorkItem={toggleWorkItem}
          onEditUpdate={(nextUpdate) => {
            if (editingUpdateDraft?.updateId === nextUpdate.update_id) {
              saveUpdateMutation.reset()
              setEditingUpdateDraft(null)
              return
            }
            startEditingUpdate(nextUpdate)
          }}
        />
        {isEditingThisUpdate ? renderUpdateEditorPanel({ inline: true }) : null}
        {selectedOriginWorkItemRow && !isEditingThisUpdate
          ? renderWorkItemInlinePanel(selectedOriginWorkItemRow.workItem, { indentRem: 1.5 })
          : null}
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-6">
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
        <>
          <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
            <div className="space-y-3 px-6 py-5">
              <Textarea
                id="dcx-admin-tracker-global-update"
                value={updateBody}
                onChange={(event) => setUpdateBody(event.target.value)}
                placeholder="Update: what changed, what is blocked, what was decided, or what happens next."
                className="min-h-24 rounded-md"
                aria-label="Activity update"
              />
              <div className="grid gap-3 md:grid-cols-[11rem_minmax(16rem,1fr)_auto_auto] md:items-center">
                <DcxAdminTrackerUpdateKindSelect
                  value={updateKind}
                  onValueChange={setUpdateKind}
                  ariaLabel="Update type"
                />
                <Select
                  value={updateWorkItemId === null ? "none" : String(updateWorkItemId)}
                  onValueChange={(value) => setUpdateWorkItemId(value === "none" ? null : Number(value))}
                >
                  <SelectTrigger className="h-10 w-full rounded-md" aria-label="Update level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose level</SelectItem>
                    {parentOptionRows.map(({ workItem, depth }) => (
                      <SelectItem key={workItem.work_item_id} value={String(workItem.work_item_id)}>
                        {"-- ".repeat(depth)}
                        {readTrackerLevelLabel(workItem.level)} - {workItem.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  className="rounded-md"
                  disabled={createUpdateMutation.isPending || updateWorkItemId === null || updateBody.trim() === ""}
                  onClick={() => createUpdateMutation.mutate()}
                >
                  <MessageSquarePlusIcon className="size-4" />
                  {createUpdateMutation.isPending ? "Adding..." : "Add update"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md whitespace-nowrap"
                  onClick={startNewWorkItemFromGlobalComposer}
                >
                  <PlusIcon className="size-4" />
                  Create level
                </Button>
              </div>
            </div>
            {createUpdateMutation.isError ? (
              <p className="px-6 pb-5 text-sm text-red-700">
                {(createUpdateMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (createUpdateMutation.error as Error).message}
              </p>
            ) : null}
          </section>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex min-w-0 flex-col gap-6">
              {props.routeView !== "updates" && props.routeView !== "team" ? (
                <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                  <div className="space-y-4 border-b border-black/6 px-6 py-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                        {props.routeView === "all" ? "Project Map" : trackerViewTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="mr-2 text-sm text-slate-500">
                          Showing {visibleWorkItemCount} of {totalViewItemCount}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-md"
                          onClick={() => trackerQuery.refetch()}
                          disabled={trackerQuery.isFetching}
                        >
                          <RefreshCwIcon className="size-3.5" />
                          Refresh
                        </Button>
                        {props.routeView !== "archived" ? (
                          <Button type="button" size="sm" className="rounded-md" onClick={() => startNewWorkItem()}>
                            <PlusIcon className="size-3.5" />
                            New level
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem]">
                      <Input
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search work..."
                        className="h-10 rounded-md"
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
                      <div className="flex justify-end">
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
                    {isCreating && selectedWorkItemId === null ? renderWorkItemEditorPanel({ inline: true }) : null}
                    {props.routeView === "all" ? (
                      homeRootItems.length > 0 ? (
                        homeRootItems.map((workItem) => (
                          <DcxAdminTrackerMapBranch
                            key={workItem.work_item_id}
                            workItem={workItem}
                            visibleIds={homeVisibleIds}
                            childrenByParent={childrenByParent}
                            selectedWorkItemId={selectedWorkItemId}
                            onSelectWorkItem={toggleWorkItem}
                            onCreateChild={startNewWorkItem}
                            renderInlinePanel={(nextWorkItem) => renderWorkItemInlinePanel(nextWorkItem)}
                          />
                        ))
                      ) : (
                        <p className="px-2 py-8 text-sm text-slate-500">No tracker hierarchy matches the current filters.</p>
                      )
                    ) : filteredLevelWorkItems.length > 0 ? (
                      filteredLevelWorkItems.map((workItem) => (
                        <div key={workItem.work_item_id} className="space-y-2">
                          <DcxAdminTrackerWorkCard
                            workItem={workItem}
                            isSelected={selectedWorkItemId === workItem.work_item_id}
                            onSelectWorkItem={toggleWorkItem}
                            onCreateChild={startNewWorkItem}
                          />
                          {renderWorkItemInlinePanel(workItem)}
                        </div>
                      ))
                    ) : (
                      <p className="px-2 py-8 text-sm text-slate-500">No levels match this view.</p>
                    )}
                  </div>
                </section>
              ) : props.routeView === "team" ? (
                <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                  <div className="flex flex-col gap-3 border-b border-black/6 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">Team</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="mr-2 text-sm text-slate-500">Showing {trackerPersonGroups.length} people</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-md"
                        onClick={() => trackerQuery.refetch()}
                        disabled={trackerQuery.isFetching}
                      >
                        <RefreshCwIcon className="size-3.5" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4 p-4">
                    {trackerPersonGroups.map((personGroup) => (
                      <section key={personGroup.user.user_id} className="border border-slate-200 bg-white">
                        <div className="border-b border-slate-100 px-4 py-3">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <h4 className="text-base font-semibold tracking-tight text-slate-950">
                              {readPersonDisplayName(personGroup.user.display_name, personGroup.user.primary_email)}
                            </h4>
                            <p className="text-xs text-slate-400">
                              {readPluralizedCount(personGroup.levelWorkItems.length, "level")},{" "}
                              {readPluralizedCount(personGroup.taskWorkItems.length, "task")},{" "}
                              {readPluralizedCount(personGroup.updates.length, "update")}
                            </p>
                            <p className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
                              <span className="inline-flex items-center border border-amber-200 bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-900">
                                Last active:
                              </span>
                              <span>{formatTrackerTimestampLabel(personGroup.user.last_active_at_ts_ms)}</span>
                            </p>
                          </div>
                        </div>
                        <div className="space-y-5 p-4">
                          <section>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Levels</p>
                            {personGroup.levelWorkItems.length > 0 ? (
                              <div className="space-y-1.5">
                                {personGroup.levelRows.map((workItemRow) => {
                                  const isInlineSelectedWorkItem =
                                    selectedWorkItemId === workItemRow.workItem.work_item_id

                                  return (
                                    <div key={workItemRow.workItem.work_item_id} className="space-y-2">
                                      <button
                                        type="button"
                                        className={cn(
                                          "flex w-full items-center justify-between gap-3 border px-3 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50",
                                          isInlineSelectedWorkItem ? "border-slate-400 bg-slate-50" : "border-slate-200",
                                        )}
                                        aria-expanded={isInlineSelectedWorkItem}
                                        onClick={() => toggleWorkItem(workItemRow.workItem)}
                                      >
                                        <span
                                          className="flex min-w-0 flex-1 items-start gap-2"
                                          style={{ paddingLeft: `${Math.min(workItemRow.depth, 4) * 1.25}rem` }}
                                        >
                                          {workItemRow.depth > 0 ? (
                                            <span className="mt-1 text-xs font-semibold text-slate-300">&gt;</span>
                                          ) : null}
                                          <span className="min-w-0">
                                            <span className="flex min-w-0 items-center gap-2">
                                              <DcxAdminTrackerLevelBadge level={workItemRow.workItem.level} />
                                              <span className="min-w-0 truncate text-sm font-medium text-slate-900">
                                                {workItemRow.workItem.title}
                                              </span>
                                            </span>
                                          </span>
                                        </span>
                                        <span className="shrink-0">
                                          <DcxAdminTrackerStatusBadge status={workItemRow.workItem.status} />
                                        </span>
                                      </button>
                                      {isInlineSelectedWorkItem ? (
                                        <div
                                          className="min-w-0"
                                          style={{ marginLeft: `${Math.min(workItemRow.depth, 4) * 1.25 + 1.5}rem` }}
                                        >
                                          {isCreating || selectedPanelMode === "edit"
                                            ? renderWorkItemEditorPanel({ inline: true })
                                            : renderSelectedWorkItemDetailPanel({ inline: true })}
                                        </div>
                                      ) : null}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">No assigned levels.</p>
                            )}
                          </section>
                          <section>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tasks</p>
                            {personGroup.taskWorkItems.length > 0 ? (
                              <div className="space-y-1.5">
                                {personGroup.taskRows.map((workItemRow) => {
                                  const isInlineSelectedWorkItem =
                                    selectedWorkItemId === workItemRow.workItem.work_item_id

                                  return (
                                    <div key={workItemRow.workItem.work_item_id} className="space-y-2">
                                      <button
                                        type="button"
                                        className={cn(
                                          "flex w-full items-center justify-between gap-3 border px-3 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50",
                                          isInlineSelectedWorkItem ? "border-slate-400 bg-slate-50" : "border-slate-200",
                                        )}
                                        aria-expanded={isInlineSelectedWorkItem}
                                        onClick={() => toggleWorkItem(workItemRow.workItem)}
                                      >
                                        <span className="min-w-0">
                                          <span className="flex min-w-0 items-center gap-2">
                                            <DcxAdminTrackerLevelBadge level={workItemRow.workItem.level} />
                                            <span className="min-w-0 truncate text-sm font-medium text-slate-900">
                                              {workItemRow.workItem.title}
                                            </span>
                                          </span>
                                        </span>
                                        <span className="shrink-0">
                                          <DcxAdminTrackerStatusBadge status={workItemRow.workItem.status} />
                                        </span>
                                      </button>
                                      {isInlineSelectedWorkItem ? (
                                        <div className="min-w-0 pl-6">
                                          {isCreating || selectedPanelMode === "edit"
                                            ? renderWorkItemEditorPanel({ inline: true })
                                            : renderSelectedWorkItemDetailPanel({
                                                inline: true,
                                                contextPersonUserId: personGroup.user.user_id,
                                              })}
                                        </div>
                                      ) : null}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">No assigned tasks.</p>
                            )}
                          </section>
                          <section>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Updates</p>
                            {personGroup.updates.length > 0 ? (
                              <div className="space-y-2">
                                {personGroup.updates.slice(0, 6).map((update) =>
                                  renderUpdateRowWithInlinePanel(update, { showWorkItemTitle: true, onOpenWorkItem: openWorkItemById }),
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">No updates recorded.</p>
                            )}
                          </section>
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                  <div className="flex flex-col gap-3 border-b border-black/6 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">Recent updates</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-md"
                        onClick={() => trackerQuery.refetch()}
                        disabled={trackerQuery.isFetching}
                      >
                        <RefreshCwIcon className="size-3.5" />
                        Refresh
                      </Button>
                      <Button type="button" size="sm" className="rounded-md" onClick={() => startNewWorkItem()}>
                        <PlusIcon className="size-3.5" />
                        New level
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {isCreating && selectedWorkItemId === null ? (
                      <div className="px-4 pt-4">{renderWorkItemEditorPanel({ inline: true })}</div>
                    ) : null}
                    {visibleUpdates.length > 0 ? (
                      visibleUpdates.map((update) =>
                        renderUpdateRowWithInlinePanel(update, { showWorkItemTitle: true, onOpenWorkItem: openWorkItemById }),
                      )
                    ) : (
                      <p className="px-6 py-6 text-sm text-slate-500">No tracker activity has been recorded yet.</p>
                    )}
                  </div>
                </section>
              )}
            </div>

            {shouldRenderTrackerSidePanel && hasTrackerSidePanel ? (
            <div className="flex min-w-0 flex-col gap-6">
              {editingUpdateDraft ? (
                <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                  <div className="flex flex-col gap-3 border-b border-black/6 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">Edit update</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-md"
                      onClick={() => {
                        saveUpdateMutation.reset()
                        setEditingUpdateDraft(null)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="space-y-3 px-6 py-5">
                    <Textarea
                      value={editingUpdateDraft.updateBody}
                      onChange={(event) =>
                        setEditingUpdateDraft((currentDraft) =>
                          currentDraft ? { ...currentDraft, updateBody: event.target.value } : currentDraft,
                        )
                      }
                      placeholder="Update: what changed, what is blocked, what was decided, or what happens next."
                      className="min-h-24 rounded-md"
                      aria-label="Edited activity update"
                    />
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
                      <DcxAdminTrackerUpdateKindSelect
                        value={editingUpdateDraft.updateKind}
                        onValueChange={(updateKind) =>
                          setEditingUpdateDraft((currentDraft) =>
                            currentDraft ? { ...currentDraft, updateKind } : currentDraft,
                          )
                        }
                        ariaLabel="Edited update type"
                      />
                      <Select
                        value={String(editingUpdateDraft.workItemId)}
                        onValueChange={(value) =>
                          setEditingUpdateDraft((currentDraft) =>
                            currentDraft ? { ...currentDraft, workItemId: Number(value) } : currentDraft,
                          )
                        }
                      >
                        <SelectTrigger className="h-10 w-full rounded-md" aria-label="Edited update level">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {parentOptionRows.map(({ workItem, depth }) => (
                            <SelectItem key={workItem.work_item_id} value={String(workItem.work_item_id)}>
                              {"-- ".repeat(depth)}
                              {readTrackerLevelLabel(workItem.level)} - {workItem.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        className="rounded-md whitespace-nowrap"
                        disabled={saveUpdateMutation.isPending || editingUpdateDraft.updateBody.trim() === ""}
                        onClick={() => saveUpdateMutation.mutate()}
                      >
                        <SaveIcon className="size-4" />
                        {saveUpdateMutation.isPending ? "Saving..." : "Save update"}
                      </Button>
                    </div>
                    {saveUpdateMutation.isError ? (
                      <p className="text-sm text-red-700">
                        {(saveUpdateMutation.error as Error & { suggested_action?: string }).suggested_action ??
                          (saveUpdateMutation.error as Error).message}
                      </p>
                    ) : null}
                    <section className="border-t border-slate-100 pt-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-950">Levels from this update</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-md"
                          onClick={startNewWorkItemFromEditingUpdate}
                        >
                          <PlusIcon className="size-3.5" />
                          Create level
                        </Button>
                      </div>
                      {workItemsFromEditingUpdate.length > 0 ? (
                        <div className="mt-3 space-y-1.5">
                          {workItemsFromEditingUpdate.map((workItem) => (
                            <button
                              key={workItem.work_item_id}
                              type="button"
                              className="flex w-full min-w-0 items-center justify-between gap-3 border border-slate-200 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
                              onClick={() => selectWorkItem(workItem)}
                            >
                              <span className="min-w-0">
                                <DcxAdminTrackerLevelBadge level={workItem.level} />
                                <span className="block truncate text-sm font-medium text-slate-900">{workItem.title}</span>
                              </span>
                              <DcxAdminTrackerStatusBadge status={workItem.status} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No levels have been created from this update yet.</p>
                      )}
                    </section>
                  </div>
                </section>
              ) : null}

              {isCreating || (selectedWorkItem && selectedPanelMode === "edit") ? (
                <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                  <div className="flex flex-col gap-3 border-b border-black/6 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                      {isCreating ? "New level" : "Edit level"}
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
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Level</label>
                        <DcxAdminTrackerLevelCombobox
                          value={draft.level}
                          ariaLabel="Level"
                          onValueChange={(level) =>
                            setDraft((currentDraft) => ({ ...currentDraft, level }))
                          }
                        />
                      </div>
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
                      <TrackerAssigneeSelect
                        assignableUsers={assignableUsers}
                        assignedToUserId={draft.assignedToUserId}
                        onValueChange={(assignedToUserId) =>
                          setDraft((currentDraft) => ({ ...currentDraft, assignedToUserId }))
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
                            {editableParentOptionRows.map(({ workItem, depth }) => (
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
                          <DcxAdminTrackerLevelBadge level={selectedWorkItem.level} />
                          <span className="text-xs text-slate-400">
                            {readTrackerPillarLabels(readTrackerPillarsForWorkItem(selectedWorkItem))}
                          </span>
                          <DcxAdminTrackerStatusBadge status={selectedWorkItem.status} />
                          {selectedWorkItem.is_archived ? (
                            <span className="inline-flex items-center border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              Archived
                            </span>
                          ) : null}
                          {selectedWorkItem.assigned_to_email ? (
                            <span className="text-xs font-medium text-slate-500">
                              {readPersonDisplayName(
                                selectedWorkItem.assigned_to_display_name,
                                selectedWorkItem.assigned_to_email,
                              )}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="break-words text-xl font-semibold tracking-tight text-slate-950">
                          {selectedWorkItem.title}
                        </h3>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {selectedWorkItem.is_archived ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-md"
                            disabled={archiveWorkItemMutation.isPending}
                            onClick={() => archiveSelectedWorkItem(false)}
                          >
                            <RotateCcwIcon className="size-3.5" />
                            Restore
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-md"
                            disabled={archiveWorkItemMutation.isPending}
                            onClick={() => archiveSelectedWorkItem(true)}
                          >
                            <ArchiveIcon className="size-3.5" />
                            Archive
                          </Button>
                        )}
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
                        {!selectedWorkItem.is_archived ? (
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-md"
                            onClick={() => startNewWorkItem(selectedWorkItem)}
                          >
                            <PlusIcon className="size-3.5" />
                            New child
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6 px-6 py-5">
                    <section>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Description</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                        {selectedWorkItem.description || "--/--"}
                      </p>
                    </section>

                    {archiveWorkItemMutation.isError ? (
                      <p className="text-sm text-red-700">
                        {(archiveWorkItemMutation.error as Error & { suggested_action?: string }).suggested_action ??
                          (archiveWorkItemMutation.error as Error).message}
                      </p>
                    ) : null}

                    {selectedWorkItem.origin_update_id ? (
                      <section>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Origin update</p>
                        {selectedOriginUpdate ? (
                          <button
                            type="button"
                            className="mt-2 w-full border border-slate-200 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
                            onClick={() => startEditingUpdate(selectedOriginUpdate)}
                          >
                            <span className="flex flex-wrap items-center gap-2">
                              <DcxAdminTrackerUpdateKindBadge updateKind={selectedOriginUpdate.update_kind} />
                              <span className="text-xs text-slate-400">
                                {readPersonDisplayName(
                                  selectedOriginUpdate.author_display_name,
                                  selectedOriginUpdate.author_email,
                                )}{" "}
                                {formatTrackerTimestampLabel(selectedOriginUpdate.created_at_ts_ms)}
                              </span>
                            </span>
                            <span className="mt-1 block line-clamp-2 text-sm leading-5 text-slate-800">
                              {selectedOriginUpdate.update_body}
                            </span>
                          </button>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">Origin update not loaded in this catalog window.</p>
                        )}
                      </section>
                    ) : null}

                    <DcxAdminTrackerRelationList
                      title="Belongs to"
                      workItems={selectedAncestors}
                      emptyText="This item has no parent context."
                      onSelectWorkItem={selectWorkItem}
                    />

                    {trackerLevelOptions.map((levelOption) => {
                      const matchingDescendants = selectedDescendants.filter(
                        (descendant) => descendant.level === levelOption.value,
                      )
                      if (matchingDescendants.length === 0) {
                        return null
                      }
                      return (
                        <DcxAdminTrackerRelationList
                          key={levelOption.value}
                          title={`Contains ${readTrackerLevelPluralLabel(levelOption.value)}`}
                          workItems={matchingDescendants}
                          emptyText=""
                          onSelectWorkItem={selectWorkItem}
                        />
                      )
                    })}

                    <section className="border border-slate-200">
                      <div className="border-b border-slate-200 px-4 py-3">
                        <h4 className="text-base font-semibold tracking-tight text-slate-950">Updates</h4>
                      </div>
                      <div>
                        {selectedUpdates.length > 0 ? (
                          selectedUpdates.map((update) => (
                            <DcxAdminTrackerUpdateRow
                              key={update.update_id}
                              update={update}
                              originWorkItemRows={originWorkItemRowsByUpdateId.get(update.update_id) ?? []}
                              onEditUpdate={startEditingUpdate}
                              onOpenOriginWorkItem={toggleWorkItem}
                            />
                          ))
                        ) : (
                          <p className="px-4 py-6 text-sm text-slate-500">--/--</p>
                        )}
                      </div>
                    </section>
                  </div>
                </section>
              ) : null}
            </div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
