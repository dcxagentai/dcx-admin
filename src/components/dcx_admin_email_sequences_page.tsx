/**
 * CONTEXT:
 * First admin email-sequences surface for the DCX internal frontend.
 * It exists to let internal users create reusable campaign/onboarding sequence shells, edit the
 * sequence metadata, and manage ordered steps against existing email content rows.
 */
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createColumnHelper,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { DcxAdminDataTable } from "@/components/ui/dcx_admin_data_table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createDcxAdminEmailSequenceDraft } from "../lib/create_dcx_admin_email_sequence_draft"
import {
  readDcxAdminEmailSequenceDetail,
  type DcxAdminEmailSequenceDetail,
} from "../lib/read_dcx_admin_email_sequence_detail"
import {
  readDcxAdminEmailSequencesCatalog,
  type DcxAdminEmailSequenceCatalogRow,
} from "../lib/read_dcx_admin_email_sequences_catalog"
import {
  saveDcxAdminEmailSequenceAndSteps,
  type DcxAdminEmailSequenceSaveDraftStep,
} from "../lib/save_dcx_admin_email_sequence_and_steps"
import { readDcxAdminLiveEmailsCatalog } from "../lib/read_dcx_admin_live_emails_catalog"

type Props = {
  apiBaseUrl: string
  routeSequenceKey: string | null
  onOpenSequence: (params: { sequenceKey: string }) => void
  onReturnToCatalog: () => void
}

type SequenceDraft = {
  sequence_name: string
  sequence_type: "campaign" | "onboarding"
  audience_type: "newsletters" | "all_email"
  trigger_type: "user_signup" | "manual_launch" | "scheduled_launch"
  scheduled_launch_date: string
  scheduled_launch_time: string
  is_live: boolean
  steps: DcxAdminEmailSequenceSaveDraftStep[]
}

const sequenceCatalogColumnHelper = createColumnHelper<DcxAdminEmailSequenceCatalogRow>()

function formatTimestampLabel(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(timestampMs),
  )
}

function buildTimeInputValue(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return ""
  }

  const candidateDate = new Date(timestampMs)
  const pad = (value: number) => value.toString().padStart(2, "0")
  return `${pad(candidateDate.getHours())}:${pad(candidateDate.getMinutes())}`
}

function buildDateInputValue(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return ""
  }

  const candidateDate = new Date(timestampMs)
  const pad = (value: number) => value.toString().padStart(2, "0")
  return `${candidateDate.getFullYear()}-${pad(candidateDate.getMonth() + 1)}-${pad(candidateDate.getDate())}`
}

function readTimestampFromDateAndTime(dateValue: string, timeValue: string): number | null {
  if (dateValue.trim() === "" || timeValue.trim() === "") {
    return null
  }

  const candidateDate = new Date(`${dateValue}T${timeValue}:00`)
  if (Number.isNaN(candidateDate.getTime())) {
    return null
  }

  return candidateDate.getTime()
}

function buildSequenceDraftFromDetail(detail: DcxAdminEmailSequenceDetail): SequenceDraft {
  return {
    sequence_name: detail.sequence_name,
    sequence_type: detail.sequence_type,
    audience_type: detail.audience_type,
    trigger_type: detail.trigger_type,
    scheduled_launch_date: buildDateInputValue(detail.scheduled_launch_at_ts_ms),
    scheduled_launch_time: buildTimeInputValue(detail.scheduled_launch_at_ts_ms),
    is_live: detail.is_live,
    steps: detail.steps.map((step) => ({
      step_key: step.step_key,
      step_name: step.step_name,
      source_email_id: step.source_email_id,
      delay_minutes_from_trigger: step.delay_minutes_from_trigger,
      is_active: step.is_active,
    })),
  }
}

function buildSourceEmailOptionLabel(emailRow: {
  email_id: number
  email_type: string
  email_key: string
  email_subject: string
  language: { language_code: string }
}): string {
  return `${emailRow.email_subject} · ${emailRow.email_type} · ${emailRow.language.language_code} · ${emailRow.email_key}`
}

function readSequenceCatalogStateLabel(sequence: DcxAdminEmailSequenceCatalogRow): string {
  return sequence.is_live ? "Live" : "Draft"
}

export function DcxAdminEmailSequencesPage(props: Props) {
  const queryClient = useQueryClient()
  const [newSequenceName, setNewSequenceName] = useState("")
  const [catalogFilterQuery, setCatalogFilterQuery] = useState("")
  const [catalogSorting, setCatalogSorting] = useState<SortingState>([
    { id: "updated_at_ts_ms", desc: true },
  ])
  const [sequenceDraft, setSequenceDraft] = useState<SequenceDraft | null>(null)
  const [statusText, setStatusText] = useState(
    "Create one sequence, add ordered steps, and save the sequence shell before later dispatch plumbing lands.",
  )

  const catalogQuery = useQuery({
    queryKey: ["dcx_admin_email_sequences_catalog"],
    queryFn: async () => readDcxAdminEmailSequencesCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })
  const detailQuery = useQuery({
    queryKey: ["dcx_admin_email_sequence_detail", props.routeSequenceKey],
    queryFn: async () =>
      readDcxAdminEmailSequenceDetail({
        apiBaseUrl: props.apiBaseUrl,
        sequenceKey: props.routeSequenceKey ?? "",
      }),
    enabled: props.routeSequenceKey !== null,
  })
  const emailsCatalogQuery = useQuery({
    queryKey: ["dcx_admin_live_emails_catalog", "sequence_step_options"],
    queryFn: async () => readDcxAdminLiveEmailsCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })
  const createSequenceMutation = useMutation({
    mutationFn: async () =>
      createDcxAdminEmailSequenceDraft({
        apiBaseUrl: props.apiBaseUrl,
        sequenceName: newSequenceName,
      }),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ["dcx_admin_email_sequences_catalog"] })
      props.onOpenSequence({ sequenceKey: payload.data.sequence_key })
    },
  })
  const saveSequenceMutation = useMutation({
    mutationFn: async (draft: SequenceDraft) =>
      saveDcxAdminEmailSequenceAndSteps({
        apiBaseUrl: props.apiBaseUrl,
        sequenceKey: props.routeSequenceKey ?? "",
        sequenceName: draft.sequence_name,
        sequenceType: draft.sequence_type,
        audienceType: draft.audience_type,
        triggerType: draft.trigger_type,
        scheduledLaunchAtTsMs:
          draft.trigger_type === "scheduled_launch"
            ? readTimestampFromDateAndTime(draft.scheduled_launch_date, draft.scheduled_launch_time)
            : null,
        isLive: draft.is_live,
        steps: draft.steps,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_email_sequences_catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_email_sequence_detail", props.routeSequenceKey] }),
      ])
    },
  })

  useEffect(() => {
    if (detailQuery.data?.data) {
      setSequenceDraft(buildSequenceDraftFromDetail(detailQuery.data.data))
      setStatusText("Sequence ready to edit. Save when the metadata and steps look right.")
    }
  }, [detailQuery.data?.data])

  const sequences = catalogQuery.data?.data.sequences ?? []
  const detail = detailQuery.data?.data ?? null
  const filteredSequences = useMemo(() => {
    const normalizedFilter = catalogFilterQuery.trim().toLowerCase()
    if (normalizedFilter === "") {
      return sequences
    }

    return sequences.filter((sequence) => {
      return (
        sequence.sequence_name.toLowerCase().includes(normalizedFilter) ||
        sequence.sequence_key.toLowerCase().includes(normalizedFilter) ||
        sequence.sequence_type.toLowerCase().includes(normalizedFilter) ||
        sequence.trigger_type.toLowerCase().includes(normalizedFilter)
      )
    })
  }, [catalogFilterQuery, sequences])
  const sourceEmailOptions = useMemo(
    () =>
      (emailsCatalogQuery.data?.data.emails ?? []).filter(
        (emailRow) => emailRow.is_live && emailRow.is_original && emailRow.email_type === "sequence",
      ),
    [emailsCatalogQuery.data?.data.emails],
  )
  const sequenceCatalogColumns = useMemo<ColumnDef<DcxAdminEmailSequenceCatalogRow, any>[]>(
    () => [
      sequenceCatalogColumnHelper.accessor("sequence_name", {
        id: "sequence_name",
        header: "Sequence",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-950">{row.original.sequence_name}</p>
            <p className="font-mono text-xs text-slate-500">{row.original.sequence_key}</p>
          </div>
        ),
      }),
      sequenceCatalogColumnHelper.accessor("sequence_type", {
        id: "sequence_type",
        header: "Type",
      }),
      sequenceCatalogColumnHelper.accessor("trigger_type", {
        id: "trigger_type",
        header: "Trigger",
      }),
      sequenceCatalogColumnHelper.accessor("active_step_count", {
        id: "active_step_count",
        header: "Active steps",
      }),
      sequenceCatalogColumnHelper.accessor("is_live", {
        id: "is_live",
        header: "State",
        cell: ({ row }) => readSequenceCatalogStateLabel(row.original),
      }),
      sequenceCatalogColumnHelper.accessor("updated_at_ts_ms", {
        id: "updated_at_ts_ms",
        header: "Updated",
        cell: ({ row }) => formatTimestampLabel(row.original.updated_at_ts_ms),
      }),
    ],
    [],
  )

  const isCatalogRoute = props.routeSequenceKey === null

  function handleAddStep() {
    if (sourceEmailOptions.length === 0) {
      setStatusText("Create at least one live original sequence email before adding a sequence step.")
      return
    }

    const firstEmail = sourceEmailOptions[0]
    setSequenceDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft
      }

      return {
        ...currentDraft,
        steps: [
          ...currentDraft.steps,
          {
            step_key: "",
            step_name: `Step ${currentDraft.steps.length + 1}`,
            source_email_id: firstEmail.email_id,
            delay_minutes_from_trigger: currentDraft.steps.length === 0 ? 0 : 1440,
            is_active: true,
          },
        ],
      }
    })
  }

  function handleSaveSequence() {
    if (!sequenceDraft) {
      return
    }

    if (sequenceDraft.trigger_type === "scheduled_launch") {
      const scheduledLaunchAtTsMs = readTimestampFromDateAndTime(
        sequenceDraft.scheduled_launch_date,
        sequenceDraft.scheduled_launch_time,
      )
      if (scheduledLaunchAtTsMs === null) {
        setStatusText("Choose one valid date and time before saving a scheduled-launch sequence.")
        return
      }
    }

    void saveSequenceMutation.mutateAsync(sequenceDraft).then(() => {
      setStatusText("Sequence saved. This shell is now ready for later dispatch and schedule wiring.")
    }).catch((error: Error & { suggested_action?: string }) => {
      setStatusText(error.suggested_action ?? error.message)
    })
  }

  const catalogContent = (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="space-y-3 border-b border-black/6 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Content / Emails</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Reusable email sequences</h2>
          <p className="text-sm leading-6 text-slate-600">
            Build campaign or onboarding sequence shells now, then reuse the same send engine and schedule model we have already proven for newsletters.
          </p>
        </div>

        <div className="space-y-3 pt-5">
          <Input
            value={newSequenceName}
            onChange={(event) => setNewSequenceName(event.target.value)}
            placeholder="Weekly campaign"
            className="h-11 bg-slate-50"
          />
          <Button
            type="button"
            onClick={() => void createSequenceMutation.mutateAsync().catch((error: Error & { suggested_action?: string }) => {
              setStatusText(error.suggested_action ?? error.message)
            })}
            disabled={createSequenceMutation.isPending || newSequenceName.trim() === ""}
          >
            {createSequenceMutation.isPending ? "Creating..." : "Create sequence"}
          </Button>
        </div>
      </article>

      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/6 pb-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Catalog</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">Existing sequences</h3>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {catalogQuery.data?.data.total_sequence_count ?? 0} sequences
          </div>
        </div>

        <div className="space-y-3 pt-5">
          <Input
            value={catalogFilterQuery}
            onChange={(event) => setCatalogFilterQuery(event.target.value)}
            placeholder="Filter sequences..."
            className="h-11 bg-slate-50"
          />
          {catalogQuery.isLoading ? <p className="text-sm text-slate-500">Loading sequences...</p> : null}
          {catalogQuery.isError ? (
            <p className="text-sm text-red-600">
              {(catalogQuery.error as Error & { suggested_action?: string }).suggested_action ??
                (catalogQuery.error as Error).message}
            </p>
          ) : null}

          {!catalogQuery.isLoading && !catalogQuery.isError ? (
            <DcxAdminDataTable
              columns={sequenceCatalogColumns}
              data={filteredSequences}
              emptyLabel="No sequences exist yet."
              sorting={catalogSorting}
              onSortingChange={setCatalogSorting}
              onRowClick={(sequence) => props.onOpenSequence({ sequenceKey: sequence.sequence_key })}
            />
          ) : null}
        </div>
      </article>
    </section>
  )

  const detailContent = (
    <section className="space-y-6">
      <Button type="button" variant="outline" className="w-fit" onClick={props.onReturnToCatalog}>
        Back to sequences
      </Button>

      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/6 pb-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sequence editor</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {detail?.sequence_name ?? "Loading sequence"}
            </h2>
          </div>
          <Button
            type="button"
            onClick={handleSaveSequence}
            disabled={!sequenceDraft || saveSequenceMutation.isPending}
            variant="outline"
          >
            {saveSequenceMutation.isPending ? "Saving..." : "Save sequence"}
          </Button>
        </div>

        <p className="pt-4 text-sm leading-6 text-slate-600">{statusText}</p>

        {detailQuery.isLoading ? <p className="pt-4 text-sm text-slate-500">Loading sequence detail...</p> : null}
        {detailQuery.isError ? (
          <p className="pt-4 text-sm text-red-600">
            {(detailQuery.error as Error & { suggested_action?: string }).suggested_action ??
              (detailQuery.error as Error).message}
          </p>
        ) : null}

        {sequenceDraft ? (
          <div className="space-y-6 pt-6">
            <div className="grid gap-4 xl:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sequence name</span>
                <Input
                  value={sequenceDraft.sequence_name}
                  onChange={(event) =>
                    setSequenceDraft((currentDraft) =>
                      currentDraft ? { ...currentDraft, sequence_name: event.target.value } : currentDraft,
                    )
                  }
                  className="h-11 bg-slate-50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sequence key</span>
                <Input value={detail?.sequence_key ?? ""} disabled className="h-11 bg-slate-100 font-mono text-xs" />
              </label>
            </div>

            <div className="grid gap-4 xl:grid-cols-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Type</span>
                <Select
                  value={sequenceDraft.sequence_type}
                  onValueChange={(value) =>
                    setSequenceDraft((currentDraft) =>
                      currentDraft ? { ...currentDraft, sequence_type: value as SequenceDraft["sequence_type"] } : currentDraft,
                    )
                  }
                >
                  <SelectTrigger className="h-11 w-full bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campaign">Campaign</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Audience</span>
                <Select
                  value={sequenceDraft.audience_type}
                  onValueChange={(value) =>
                    setSequenceDraft((currentDraft) =>
                      currentDraft ? { ...currentDraft, audience_type: value as SequenceDraft["audience_type"] } : currentDraft,
                    )
                  }
                >
                  <SelectTrigger className="h-11 w-full bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_email">All promotional email</SelectItem>
                    <SelectItem value="newsletters">Newsletters audience</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Trigger</span>
                <Select
                  value={sequenceDraft.trigger_type}
                  onValueChange={(value) =>
                    setSequenceDraft((currentDraft) =>
                      currentDraft
                        ? {
                            ...currentDraft,
                            trigger_type: value as SequenceDraft["trigger_type"],
                            scheduled_launch_date:
                              value === "scheduled_launch" ? currentDraft.scheduled_launch_date : "",
                            scheduled_launch_time:
                              value === "scheduled_launch" ? currentDraft.scheduled_launch_time : "",
                          }
                        : currentDraft,
                    )
                  }
                >
                  <SelectTrigger className="h-11 w-full bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual_launch">Manual launch</SelectItem>
                    <SelectItem value="user_signup">User signup</SelectItem>
                    <SelectItem value="scheduled_launch">Scheduled launch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">State</span>
                <Select
                  value={sequenceDraft.is_live ? "live" : "draft"}
                  onValueChange={(value) =>
                    setSequenceDraft((currentDraft) =>
                      currentDraft ? { ...currentDraft, is_live: value === "live" } : currentDraft,
                    )
                  }
                >
                  <SelectTrigger className="h-11 w-full bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {sequenceDraft.trigger_type === "scheduled_launch" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Launch date</span>
                  <Input
                    type="date"
                    value={sequenceDraft.scheduled_launch_date}
                    onChange={(event) =>
                      setSequenceDraft((currentDraft) =>
                        currentDraft ? { ...currentDraft, scheduled_launch_date: event.target.value } : currentDraft,
                      )
                    }
                    className="h-11 bg-slate-50"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Launch time</span>
                  <Input
                    type="time"
                    step={60}
                    value={sequenceDraft.scheduled_launch_time}
                    onChange={(event) =>
                      setSequenceDraft((currentDraft) =>
                        currentDraft ? { ...currentDraft, scheduled_launch_time: event.target.value } : currentDraft,
                      )
                    }
                    className="h-11 bg-slate-50"
                  />
                </label>
              </div>
            ) : null}

            <section className="space-y-4 border border-black/6 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sequence steps</p>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">Ordered send plan</h3>
                </div>
                <Button type="button" variant="outline" onClick={handleAddStep}>
                  Add step
                </Button>
              </div>

              <div className="space-y-3">
                {sequenceDraft.steps.map((step, index) => (
                  <div key={`${detail?.sequence_key ?? "sequence"}-step-${index}`} className="border border-black/6 bg-white px-4 py-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-950">Step {index + 1}</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setSequenceDraft((currentDraft) =>
                            currentDraft
                              ? {
                                  ...currentDraft,
                                  steps: currentDraft.steps.filter((_, candidateIndex) => candidateIndex !== index),
                                }
                              : currentDraft,
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Step name</span>
                        <Input
                          value={step.step_name}
                          onChange={(event) =>
                            setSequenceDraft((currentDraft) =>
                              currentDraft
                                ? {
                                    ...currentDraft,
                                    steps: currentDraft.steps.map((candidateStep, candidateIndex) =>
                                      candidateIndex === index
                                        ? { ...candidateStep, step_name: event.target.value }
                                        : candidateStep,
                                    ),
                                  }
                                : currentDraft,
                            )
                          }
                          className="h-11 bg-slate-50"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Source email</span>
                        <Select
                          value={String(step.source_email_id)}
                          onValueChange={(value) =>
                            setSequenceDraft((currentDraft) =>
                              currentDraft
                                ? {
                                    ...currentDraft,
                                    steps: currentDraft.steps.map((candidateStep, candidateIndex) =>
                                      candidateIndex === index
                                        ? { ...candidateStep, source_email_id: Number(value) }
                                        : candidateStep,
                                    ),
                                  }
                                : currentDraft,
                            )
                          }
                        >
                          <SelectTrigger className="h-11 w-full bg-slate-50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sourceEmailOptions.map((emailRow) => (
                              <SelectItem key={emailRow.email_id} value={String(emailRow.email_id)}>
                                {buildSourceEmailOptionLabel(emailRow)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-3">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Delay minutes</span>
                        <Input
                          type="number"
                          min={0}
                          value={step.delay_minutes_from_trigger}
                          onChange={(event) =>
                            setSequenceDraft((currentDraft) =>
                              currentDraft
                                ? {
                                    ...currentDraft,
                                    steps: currentDraft.steps.map((candidateStep, candidateIndex) =>
                                      candidateIndex === index
                                        ? {
                                            ...candidateStep,
                                            delay_minutes_from_trigger: Number(event.target.value || "0"),
                                          }
                                        : candidateStep,
                                    ),
                                  }
                                : currentDraft,
                            )
                          }
                          className="h-11 bg-slate-50"
                        />
                      </label>

                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Step state</span>
                        <Select
                          value={step.is_active ? "active" : "inactive"}
                          onValueChange={(value) =>
                            setSequenceDraft((currentDraft) =>
                              currentDraft
                                ? {
                                    ...currentDraft,
                                    steps: currentDraft.steps.map((candidateStep, candidateIndex) =>
                                      candidateIndex === index
                                        ? { ...candidateStep, is_active: value === "active" }
                                        : candidateStep,
                                    ),
                                  }
                                : currentDraft,
                            )
                          }
                        >
                          <SelectTrigger className="h-11 w-full bg-slate-50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resolved source</span>
                        <Textarea
                          value={
                            sourceEmailOptions.find((emailRow) => emailRow.email_id === step.source_email_id)
                              ? buildSourceEmailOptionLabel(
                                  sourceEmailOptions.find((emailRow) => emailRow.email_id === step.source_email_id)!,
                                )
                              : "Missing source email"
                          }
                          disabled
                          className="min-h-[2.75rem] resize-none bg-slate-100 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {sequenceDraft.steps.length === 0 ? (
                  <p className="text-sm text-slate-500">No steps yet. Add the first step to turn this into a real sequence plan.</p>
                ) : null}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-4">
              <div className="border border-black/6 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Created</p>
                <p className="mt-2">{formatTimestampLabel(detail?.created_at_ts_ms ?? null)}</p>
              </div>
              <div className="border border-black/6 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Updated</p>
                <p className="mt-2">{formatTimestampLabel(detail?.updated_at_ts_ms ?? null)}</p>
              </div>
              <div className="border border-black/6 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Steps</p>
                <p className="mt-2">{sequenceDraft.steps.length}</p>
              </div>
              <div className="border border-black/6 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Launch</p>
                <p className="mt-2">
                  {sequenceDraft.trigger_type === "scheduled_launch"
                    ? formatTimestampLabel(
                        readTimestampFromDateAndTime(
                          sequenceDraft.scheduled_launch_date,
                          sequenceDraft.scheduled_launch_time,
                        ),
                      )
                    : sequenceDraft.trigger_type}
                </p>
              </div>
            </section>
          </div>
        ) : null}
      </article>
    </section>
  )

  return isCatalogRoute ? catalogContent : detailContent
}
