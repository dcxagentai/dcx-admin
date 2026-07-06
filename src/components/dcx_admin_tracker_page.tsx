/**
 * CONTEXT:
 * Internal DCX tracker surface.
 * It keeps the model small: nested work items plus activity updates.
 */
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArchiveIcon,
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

export type DcxAdminTrackerView = "all" | DcxAdminTrackerLevel | "updates" | "who" | "archived"

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

function readTrackerUpdateKindClassName(updateKind: DcxAdminTrackerUpdateKind): string {
  if (updateKind === "progress") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }
  if (updateKind === "blocker") {
    return "border-red-200 bg-red-50 text-red-700"
  }
  if (updateKind === "decision") {
    return "border-violet-200 bg-violet-50 text-violet-700"
  }
  if (updateKind === "question") {
    return "border-amber-200 bg-amber-50 text-amber-800"
  }
  if (updateKind === "action") {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }
  return "border-slate-200 bg-slate-50 text-slate-600"
}

function readPersonDisplayName(email: string | null): string {
  if (!email) {
    return "Unknown"
  }

  const localPart = email.split("@")[0] ?? email
  const firstToken = localPart.split(/[._+\-\s]+/).filter(Boolean)[0] ?? localPart
  if (firstToken.trim() === "") {
    return email
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
  if (view === "who") {
    return "Who"
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
      if (workItem.level !== "task") {
        visibleIds.add(workItem.work_item_id)
      }
    }
    return visibleIds
  }

  for (const workItem of params.workItems) {
    if (
      workItem.level === "task" ||
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
      if (descendant.level !== "task") {
        visibleIds.add(descendant.work_item_id)
      }
    }

    let parentId = workItem.parent_work_item_id
    while (parentId !== null) {
      const parentWorkItem = workItemById.get(parentId)
      if (!parentWorkItem) {
        break
      }
      if (parentWorkItem.level !== "task") {
        visibleIds.add(parentWorkItem.work_item_id)
      }
      parentId = parentWorkItem.parent_work_item_id
    }
  }

  return visibleIds
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

function DcxAdminTrackerUpdateKindBadge(props: { updateKind: DcxAdminTrackerUpdateKind }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-xs font-medium",
        readTrackerUpdateKindClassName(props.updateKind),
      )}
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
  return (
    <Select value={props.value} onValueChange={(value) => props.onValueChange(value as DcxAdminTrackerUpdateKind)}>
      <SelectTrigger
        className={cn("h-10 w-full rounded-md", readTrackerUpdateKindClassName(props.value))}
        aria-label={props.ariaLabel}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {trackerUpdateKindOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={cn("my-1 border", readTrackerUpdateKindClassName(option.value))}
            textValue={option.label}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DcxAdminTrackerUpdateRow(props: {
  update: DcxAdminTrackerUpdate
  showWorkItemTitle?: boolean
  onOpenWorkItem?: (workItemId: number) => void
  onEditUpdate: (update: DcxAdminTrackerUpdate) => void
}) {
  const wasEdited =
    props.update.updated_at_ts_ms !== null &&
    props.update.updated_at_ts_ms !== props.update.created_at_ts_ms

  return (
    <div className="border-b border-slate-100 px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <DcxAdminTrackerUpdateKindBadge updateKind={props.update.update_kind} />
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
          <span className="text-xs text-slate-400">
            {readPersonDisplayName(props.update.author_email)} - {formatTrackerTimestampLabel(props.update.created_at_ts_ms)}
          </span>
          {wasEdited ? (
            <span className="text-xs text-slate-400">
              Edited by {readPersonDisplayName(props.update.updated_by_email)}
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {readTrackerLevelLabel(props.workItem.level)}
          </span>
          <span className="text-xs text-slate-400">
            {readTrackerPillarLabels(readTrackerPillarsForWorkItem(props.workItem))}
          </span>
          <DcxAdminTrackerStatusBadge status={props.workItem.status} />
          {props.workItem.is_archived ? (
            <span className="inline-flex items-center border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              Archived
            </span>
          ) : null}
          {props.workItem.assigned_to_email ? (
            <span className="text-xs font-medium text-slate-500">
              {readPersonDisplayName(props.workItem.assigned_to_email)}
            </span>
          ) : null}
          <span className="text-xs text-slate-400">{props.workItem.update_count}</span>
        </div>
        <p className="mt-1 break-words text-sm font-semibold text-slate-950">{props.workItem.title}</p>
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
}) {
  const children = (props.childrenByParent.get(props.workItem.work_item_id) ?? []).filter(
    (child) => child.level !== "task" && props.visibleIds.has(child.work_item_id),
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
              {readPersonDisplayName(user.primary_email)}
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
        throw new Error("Choose a tracker item before adding an update.")
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
          props.routeView !== "who" &&
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
      assignableUsers.map((user) => ({
        user,
        workItems: activeWorkItems.filter((workItem) => workItem.assigned_to_user_id === user.user_id),
        updates: visibleUpdates.filter((update) => update.author_user_id === user.user_id),
      })),
    [assignableUsers, activeWorkItems, visibleUpdates],
  )
  const trackerViewTitle = readTrackerViewTitle(props.routeView)
  const visibleWorkItemCount =
    props.routeView === "all"
      ? homeVisibleIds.size
      : props.routeView === "updates"
        ? visibleUpdates.length
        : props.routeView === "who"
          ? trackerPersonGroups.length
          : filteredLevelWorkItems.length
  const totalViewItemCount =
    props.routeView === "all"
      ? activeWorkItems.filter((workItem) => workItem.level !== "task").length
      : props.routeView === "updates"
        ? visibleUpdates.length
        : props.routeView === "who"
          ? trackerPersonGroups.length
          : props.routeView === "archived"
            ? archivedWorkItems.length
            : activeWorkItems.filter((workItem) => workItem.level === props.routeView).length
  const hasTrackerSidePanel = editingUpdateDraft !== null || isCreating || selectedWorkItem !== null

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
      updateKind: update.update_kind,
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
              <div className="grid gap-3 md:grid-cols-[11rem_minmax(16rem,1fr)_auto] md:items-center">
                <DcxAdminTrackerUpdateKindSelect
                  value={updateKind}
                  onValueChange={setUpdateKind}
                  ariaLabel="Update type"
                />
                <Select
                  value={updateWorkItemId === null ? "none" : String(updateWorkItemId)}
                  onValueChange={(value) => setUpdateWorkItemId(value === "none" ? null : Number(value))}
                >
                  <SelectTrigger className="h-10 w-full rounded-md" aria-label="Update item">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose item</SelectItem>
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
              </div>
            </div>
            {createUpdateMutation.isError ? (
              <p className="px-6 pb-5 text-sm text-red-700">
                {(createUpdateMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (createUpdateMutation.error as Error).message}
              </p>
            ) : null}
          </section>

          <div
            className={cn(
              "grid gap-6",
              hasTrackerSidePanel ? "xl:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]" : "grid-cols-1",
            )}
          >
            <div className="flex min-w-0 flex-col gap-6">
              {props.routeView !== "updates" && props.routeView !== "who" ? (
                <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                  <div className="space-y-4 border-b border-black/6 px-6 py-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                        {props.routeView === "all" ? "Hierarchy" : trackerViewTitle}
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
                            New item
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
                    {props.routeView === "all" ? (
                      homeRootItems.length > 0 ? (
                        homeRootItems.map((workItem) => (
                          <DcxAdminTrackerMapBranch
                            key={workItem.work_item_id}
                            workItem={workItem}
                            visibleIds={homeVisibleIds}
                            childrenByParent={childrenByParent}
                            selectedWorkItemId={selectedWorkItemId}
                            onSelectWorkItem={selectWorkItem}
                            onCreateChild={startNewWorkItem}
                          />
                        ))
                      ) : (
                        <p className="px-2 py-8 text-sm text-slate-500">No tracker hierarchy matches the current filters.</p>
                      )
                    ) : filteredLevelWorkItems.length > 0 ? (
                      filteredLevelWorkItems.map((workItem) => (
                        <DcxAdminTrackerWorkCard
                          key={workItem.work_item_id}
                          workItem={workItem}
                          isSelected={selectedWorkItemId === workItem.work_item_id}
                          onSelectWorkItem={selectWorkItem}
                          onCreateChild={startNewWorkItem}
                        />
                      ))
                    ) : (
                      <p className="px-2 py-8 text-sm text-slate-500">No tracker items match this view.</p>
                    )}
                  </div>
                </section>
              ) : props.routeView === "who" ? (
                <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                  <div className="flex flex-col gap-3 border-b border-black/6 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">Who</h3>
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
                          <h4 className="text-base font-semibold tracking-tight text-slate-950">
                            {readPersonDisplayName(personGroup.user.primary_email)}
                          </h4>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {personGroup.workItems.length} items, {personGroup.updates.length} updates
                          </p>
                        </div>
                        <div className="grid gap-0 lg:grid-cols-2">
                          <div className="border-b border-slate-100 p-4 lg:border-b-0 lg:border-r">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Items</p>
                            {personGroup.workItems.length > 0 ? (
                              <div className="space-y-1.5">
                                {personGroup.workItems.map((workItem) => (
                                  <button
                                    key={workItem.work_item_id}
                                    type="button"
                                    className="flex w-full items-center justify-between gap-3 border border-slate-200 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
                                    onClick={() => selectWorkItem(workItem)}
                                  >
                                    <span className="min-w-0">
                                      <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        {readTrackerLevelLabel(workItem.level)}
                                      </span>
                                      <span className="block truncate text-sm font-medium text-slate-900">{workItem.title}</span>
                                    </span>
                                    <DcxAdminTrackerStatusBadge status={workItem.status} />
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">No assigned items.</p>
                            )}
                          </div>
                          <div className="p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Updates</p>
                            {personGroup.updates.length > 0 ? (
                              <div className="space-y-2">
                                {personGroup.updates.slice(0, 6).map((update) => (
                                  <button
                                    key={update.update_id}
                                    type="button"
                                    className="w-full border border-slate-200 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
                                    onClick={() => startEditingUpdate(update)}
                                  >
                                    <span className="flex flex-wrap items-center gap-2">
                                      <DcxAdminTrackerUpdateKindBadge updateKind={update.update_kind} />
                                      <span className="text-xs font-medium text-slate-500">{update.work_item_title}</span>
                                    </span>
                                    <span className="mt-1 block line-clamp-2 text-sm text-slate-800">{update.update_body}</span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">No updates recorded.</p>
                            )}
                          </div>
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
                        New item
                      </Button>
                    </div>
                  </div>
                  <div>
                    {visibleUpdates.length > 0 ? (
                      visibleUpdates.map((update) => (
                        <DcxAdminTrackerUpdateRow
                          key={update.update_id}
                          update={update}
                          showWorkItemTitle
                          onOpenWorkItem={openWorkItemById}
                          onEditUpdate={startEditingUpdate}
                        />
                      ))
                    ) : (
                      <p className="px-6 py-6 text-sm text-slate-500">No tracker activity has been recorded yet.</p>
                    )}
                  </div>
                </section>
              )}
            </div>

            {hasTrackerSidePanel ? (
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
                        <SelectTrigger className="h-10 w-full rounded-md" aria-label="Edited update item">
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
                        <p className="text-sm font-semibold text-slate-950">Items from this update</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-md"
                          onClick={startNewWorkItemFromEditingUpdate}
                        >
                          <PlusIcon className="size-3.5" />
                          Create item
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
                                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  {readTrackerLevelLabel(workItem.level)}
                                </span>
                                <span className="block truncate text-sm font-medium text-slate-900">{workItem.title}</span>
                              </span>
                              <DcxAdminTrackerStatusBadge status={workItem.status} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No tracker items have been created from this update yet.</p>
                      )}
                    </section>
                  </div>
                </section>
              ) : null}

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
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {readTrackerLevelLabel(selectedWorkItem.level)}
                          </span>
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
                              {readPersonDisplayName(selectedWorkItem.assigned_to_email)}
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
                        {selectedWorkItem.description || "No description recorded."}
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
                                {readPersonDisplayName(selectedOriginUpdate.author_email)} -{" "}
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
                        <h4 className="text-base font-semibold tracking-tight text-slate-950">Activity updates</h4>
                      </div>
                      <div>
                        {selectedUpdates.length > 0 ? (
                          selectedUpdates.map((update) => (
                            <DcxAdminTrackerUpdateRow
                              key={update.update_id}
                              update={update}
                              onEditUpdate={startEditingUpdate}
                            />
                          ))
                        ) : (
                          <p className="px-4 py-6 text-sm text-slate-500">No updates recorded for this item yet.</p>
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
