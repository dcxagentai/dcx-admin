/**
 * CONTEXT:
 * First internal DCX tracker surface.
 * It keeps the model deliberately small: nested work items plus activity updates.
 */
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  MessageSquarePlusIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
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
}

type DcxAdminTrackerDraft = {
  workItemId: number | null
  title: string
  description: string
  currentState: string
  level: DcxAdminTrackerLevel
  pillar: DcxAdminTrackerPillar
  status: DcxAdminTrackerStatus
  parentWorkItemId: number | null
}

const trackerLevelOptions: Array<{ value: DcxAdminTrackerLevel; label: string }> = [
  { value: "long_term", label: "Long-term" },
  { value: "strategy", label: "Strategy" },
  { value: "operation", label: "Operation" },
  { value: "battle", label: "Battle" },
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
  { value: "active", label: "Active" },
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

function buildBlankTrackerDraft(parent: DcxAdminTrackerWorkItem | null = null): DcxAdminTrackerDraft {
  return {
    workItemId: null,
    title: "",
    description: "",
    currentState: "",
    level: readNextChildLevel(parent?.level ?? null),
    pillar: parent?.pillar ?? "building",
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
    pillar: workItem.pillar,
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
  selectedWorkItemId: number | null
  onSelectWorkItem: (workItem: DcxAdminTrackerWorkItem) => void
  onCreateChild: (workItem: DcxAdminTrackerWorkItem) => void
}) {
  const children = props.childrenByParent.get(props.workItem.work_item_id) ?? []
  const isSelected = props.selectedWorkItemId === props.workItem.work_item_id

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={cn(
          "w-full border px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50",
          isSelected ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white",
        )}
        style={{ marginLeft: `${Math.min(props.depth, 4) * 0.75}rem` }}
        onClick={() => props.onSelectWorkItem(props.workItem)}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {readTrackerLevelLabel(props.workItem.level)}
              </span>
              <span className="text-xs text-slate-400">{readTrackerPillarLabel(props.workItem.pillar)}</span>
            </div>
            <p className="break-words text-sm font-semibold text-slate-950">{props.workItem.title}</p>
            {props.workItem.current_state ? (
              <p className="line-clamp-2 text-xs leading-5 text-slate-600">{props.workItem.current_state}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DcxAdminTrackerStatusBadge status={props.workItem.status} />
            <span className="text-xs text-slate-400">{props.workItem.update_count}</span>
          </div>
        </div>
      </button>
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
      {children.length > 0 ? (
        <div className="space-y-2">
          {children.map((child) => (
            <DcxAdminTrackerTreeItem
              key={child.work_item_id}
              workItem={child}
              depth={props.depth + 1}
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

export function DcxAdminTrackerPage(props: Props) {
  const queryClient = useQueryClient()
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<number | null>(null)
  const [draft, setDraft] = useState<DcxAdminTrackerDraft>(() => buildBlankTrackerDraft())
  const [isCreating, setIsCreating] = useState(false)
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
        pillar: draft.pillar,
        status: draft.status,
        parentWorkItemId: draft.parentWorkItemId,
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dcx_admin_tracker_catalog"] })
      setSelectedWorkItemId(result.data.work_item_id)
      setIsCreating(false)
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
  const selectedWorkItem = useMemo(
    () => workItems.find((workItem) => workItem.work_item_id === selectedWorkItemId) ?? null,
    [selectedWorkItemId, workItems],
  )
  const selectedUpdates = updates.filter((update) => update.work_item_id === selectedWorkItemId)
  const rootWorkItems = childrenByParent.get(null) ?? []
  const descendantIds = selectedWorkItemId === null ? new Set<number>() : readDescendantIds(childrenByParent, selectedWorkItemId)
  const allowedParentOptions = workItems.filter(
    (workItem) => workItem.work_item_id !== draft.workItemId && !descendantIds.has(workItem.work_item_id),
  )
  const blockedItems = workItems.filter((workItem) => workItem.status === "waiting")
  const activeItems = workItems.filter((workItem) => workItem.status === "active")
  const operationItems = workItems.filter((workItem) => workItem.level === "operation")

  useEffect(() => {
    if (!selectedWorkItem || isCreating) {
      return
    }
    setDraft(buildTrackerDraftFromWorkItem(selectedWorkItem))
  }, [selectedWorkItem, isCreating])

  function startNewWorkItem(parent: DcxAdminTrackerWorkItem | null = null): void {
    setIsCreating(true)
    setSelectedWorkItemId(null)
    setDraft(buildBlankTrackerDraft(parent))
    setUpdateBody("")
  }

  return (
    <section className="flex flex-col gap-6">
      <section className="border border-black/6 bg-white px-6 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tracker</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Work map and activity</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Nested long-term direction, strategy, operations, battles, and tasks with one activity log attached to each item.
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
              <TrackerStat label="Active" value={String(activeItems.length)} />
              <TrackerStat label="Waiting" value={String(blockedItems.length)} />
            </section>

            <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
              <div className="border-b border-black/6 px-6 py-5">
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">Work items</h3>
              </div>
              <div className="space-y-3 p-4">
                {rootWorkItems.length > 0 ? (
                  rootWorkItems.map((workItem) => (
                    <DcxAdminTrackerTreeItem
                      key={workItem.work_item_id}
                      workItem={workItem}
                      depth={0}
                      childrenByParent={childrenByParent}
                      selectedWorkItemId={selectedWorkItemId}
                      onSelectWorkItem={(nextWorkItem) => {
                        setSelectedWorkItemId(nextWorkItem.work_item_id)
                        setIsCreating(false)
                        setUpdateBody("")
                      }}
                      onCreateChild={(parentWorkItem) => startNewWorkItem(parentWorkItem)}
                    />
                  ))
                ) : (
                  <div className="px-2 py-8 text-sm text-slate-500">
                    No tracker items exist yet. Create the first long-term, strategy, operation, battle, or task item.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
              <div className="border-b border-black/6 px-6 py-5">
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                  {isCreating ? "New work item" : selectedWorkItem ? "Selected work item" : "Work item"}
                </h3>
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
                  <TrackerSelect
                    label="Pillar"
                    value={draft.pillar}
                    options={trackerPillarOptions}
                    onValueChange={(value) =>
                      setDraft((currentDraft) => ({ ...currentDraft, pillar: value as DcxAdminTrackerPillar }))
                    }
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
                        {allowedParentOptions.map((workItem) => (
                          <SelectItem key={workItem.work_item_id} value={String(workItem.work_item_id)}>
                            {workItem.title}
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="dcx-admin-tracker-current-state">
                    Current state
                  </label>
                  <Textarea
                    id="dcx-admin-tracker-current-state"
                    value={draft.currentState}
                    onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, currentState: event.target.value }))}
                    placeholder="Where this stands now."
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
                  {selectedWorkItem ? (
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
                    disabled={saveWorkItemMutation.isPending || draft.title.trim() === ""}
                    onClick={() => saveWorkItemMutation.mutate()}
                  >
                    <SaveIcon className="size-4" />
                    {saveWorkItemMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </section>

            {selectedWorkItem ? (
              <section className="border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
                <div className="border-b border-black/6 px-6 py-5">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">Activity updates</h3>
                </div>
                <div className="space-y-4 px-6 py-5">
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
                        className="min-h-24 rounded-md"
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

                  <div className="border border-slate-200">
                    {selectedUpdates.length > 0 ? (
                      selectedUpdates.map((update) => (
                        <DcxAdminTrackerUpdateRow key={update.update_id} update={update} />
                      ))
                    ) : (
                      <p className="px-4 py-6 text-sm text-slate-500">No updates recorded for this item yet.</p>
                    )}
                  </div>
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
