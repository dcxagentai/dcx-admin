/**
 * CONTEXT:
 * First publish/deploy screen for the DCX admin frontend.
 * It exists so internal users can see whether public-copy and published-page edits are waiting for publish and can
 * manually trigger a new Cloudflare Pages rebuild now that dcx_public reads live DB content at build time.
 */
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createColumnHelper,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"

import {
  readDcxAdminPublicSitePublishStatus,
  type DcxAdminPublicSitePendingChangePreviewRow,
} from "../lib/read_dcx_admin_public_site_publish_status"
import { markDcxAdminPublicSiteLocalRebuildComplete } from "../lib/mark_dcx_admin_public_site_local_rebuild_complete"
import { triggerDcxAdminPublicSitePublishRun } from "../lib/trigger_dcx_admin_public_site_publish_run"
import { Button } from "@/components/ui/button"
import { DcxAdminDataTable } from "@/components/ui/dcx_admin_data_table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ArrowUpDownIcon, ChevronDownIcon } from "lucide-react"

type Props = {
  apiBaseUrl: string
}

type PublishHealthTone = "green" | "orange" | "red"

const pendingChangeColumnHelper = createColumnHelper<DcxAdminPublicSitePendingChangePreviewRow>()

function formatTimestampLabel(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestampMs))
}

function readPublishHealthTone(params: {
  pendingChangeCount: number
  lastPublishStatus: string
}): PublishHealthTone {
  if (params.lastPublishStatus === "failed") {
    return "red"
  }

  if (params.pendingChangeCount === 0) {
    return "green"
  }

  if (params.pendingChangeCount < 10) {
    return "orange"
  }

  return "red"
}

function readPublishHealthClasses(tone: PublishHealthTone): string {
  if (tone === "green") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (tone === "orange") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-red-200 bg-red-50 text-red-700"
}

function readPublishHealthTitle(params: {
  pendingChangeCount: number
  lastPublishStatus: string
}): string {
  if (params.lastPublishStatus === "local_manual_rebuild_required") {
    return "Local rebuild still needed"
  }

  if (params.lastPublishStatus === "failed") {
    return "Publish attention needed"
  }

  if (params.pendingChangeCount === 0) {
    return "Public site in sync"
  }

  if (params.pendingChangeCount < 10) {
    return "A few public edits are waiting"
  }

  return "Public site is stale"
}

function MetadataRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 py-3 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </dt>
      <dd className="max-w-[24rem] text-right text-sm text-slate-900">{props.value}</dd>
    </div>
  )
}

function formatPendingContentKindLabel(contentKind: string): string {
  return contentKind.replaceAll("_", " ")
}

function readPendingChangeSearchLabel(row: DcxAdminPublicSitePendingChangePreviewRow): string {
  return [
    row.primary_label,
    row.secondary_label ?? "",
    row.public_path ?? "",
    row.language_name_native,
    row.language_code,
    formatPendingContentKindLabel(row.content_kind),
  ]
    .join(" ")
    .toLowerCase()
}

function DcxAdminSortableHeader(props: {
  column: {
    getIsSorted: () => false | "asc" | "desc"
    toggleSorting: (desc?: boolean) => void
  }
  title: string
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 text-left"
      onClick={() => props.column.toggleSorting(props.column.getIsSorted() === "asc")}
    >
      <span>{props.title}</span>
      <ArrowUpDownIcon className="h-3.5 w-3.5 text-slate-400" />
    </button>
  )
}

export function DcxAdminPublicSitePublishPage(props: Props) {
  const queryClient = useQueryClient()
  const [pendingChangesFilterValue, setPendingChangesFilterValue] = useState("")
  const [pendingChangesSorting, setPendingChangesSorting] = useState<SortingState>([
    { id: "updated_at_ts_ms", desc: true },
  ])
  const [pendingChangesColumnVisibility, setPendingChangesColumnVisibility] = useState<VisibilityState>({})
  const publishStatusQuery = useQuery({
    queryKey: ["dcx_admin_public_site_publish_status"],
    queryFn: async () =>
      readDcxAdminPublicSitePublishStatus({
        apiBaseUrl: props.apiBaseUrl,
      }),
  })
  const publishMutation = useMutation({
    mutationFn: async () =>
      triggerDcxAdminPublicSitePublishRun({
        apiBaseUrl: props.apiBaseUrl,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["dcx_admin_public_site_publish_status"],
      })
    },
  })
  const markLocalCompleteMutation = useMutation({
    mutationFn: async () =>
      markDcxAdminPublicSiteLocalRebuildComplete({
        apiBaseUrl: props.apiBaseUrl,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["dcx_admin_public_site_publish_status"],
      })
    },
  })

  const publishStatus = publishStatusQuery.data?.data
  const isLocalManualMode = publishStatus?.publish_execution_mode === "local_manual_rebuild"
  const showLocalCompleteButton =
    isLocalManualMode && publishStatus?.last_publish_status === "local_manual_rebuild_required"
  const publishHealthTone = publishStatus
    ? readPublishHealthTone({
        pendingChangeCount: publishStatus.pending_change_count,
        lastPublishStatus: publishStatus.last_publish_status,
      })
    : "orange"
  const pendingChangeColumns = useMemo(
    () => [
      pendingChangeColumnHelper.accessor("primary_label", {
        id: "primary_label",
        header: ({ column }) => (
          <DcxAdminSortableHeader column={column} title="Item" />
        ),
        cell: ({ row }) => (
          <span
            title={row.original.secondary_label ?? row.original.primary_label}
            className="block truncate font-medium text-slate-950"
          >
            {row.original.primary_label}
          </span>
        ),
        sortingFn: "text",
      }),
      pendingChangeColumnHelper.accessor("content_kind", {
        id: "content_kind",
        header: ({ column }) => (
          <DcxAdminSortableHeader column={column} title="Kind" />
        ),
        cell: ({ row }) => (
          <span className="block truncate text-sm capitalize text-slate-700">
            {formatPendingContentKindLabel(row.original.content_kind)}
          </span>
        ),
      }),
      pendingChangeColumnHelper.accessor("language_name_native", {
        id: "language_name_native",
        header: ({ column }) => (
          <DcxAdminSortableHeader column={column} title="Language" />
        ),
        cell: ({ row }) => (
          <span className="block truncate text-sm text-slate-700">
            {row.original.language_name_native} ({row.original.language_code})
          </span>
        ),
      }),
      pendingChangeColumnHelper.accessor("public_path", {
        id: "public_path",
        header: "Public path",
        cell: ({ row }) =>
          row.original.public_path ? (
            <span title={row.original.public_path} className="block truncate text-sm text-slate-600">
              {row.original.public_path}
            </span>
          ) : (
            <span className="text-sm text-slate-400">-</span>
          ),
      }),
      pendingChangeColumnHelper.accessor("updated_at_ts_ms", {
        id: "updated_at_ts_ms",
        header: ({ column }) => (
          <DcxAdminSortableHeader column={column} title="Updated" />
        ),
        cell: ({ row }) => (
          <span className="block truncate text-sm text-slate-700">
            {formatTimestampLabel(row.original.updated_at_ts_ms)}
          </span>
        ),
        sortingFn: "basic",
      }),
    ],
    [],
  )
  const filteredPendingChanges = useMemo(() => {
    if (!publishStatus) {
      return []
    }

    const normalizedFilterValue = pendingChangesFilterValue.trim().toLowerCase()
    if (normalizedFilterValue === "") {
      return publishStatus.pending_changes_preview
    }

    return publishStatus.pending_changes_preview.filter((row) =>
      readPendingChangeSearchLabel(row).includes(normalizedFilterValue),
    )
  }, [pendingChangesFilterValue, publishStatus])

  function readPendingChangeColumnWidthClassName(columnId: string): string {
    if (columnId === "primary_label") {
      return "w-[24%]"
    }

    if (columnId === "content_kind") {
      return "w-[18%]"
    }

    if (columnId === "language_name_native") {
      return "w-[14%]"
    }

    if (columnId === "public_path") {
      return "w-[28%]"
    }

    if (columnId === "updated_at_ts_ms") {
      return "w-[18%] whitespace-nowrap"
    }

    return ""
  }

  return (
    <section className="flex flex-col gap-6">
      <section className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-black/6 pb-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Deploy
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Publish public site
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Public UX-string edits and published content pages now save straight into the live
              database. This screen shows whether Cloudflare Pages still needs a rebuild and lets
              you trigger that rebuild manually.
            </p>
          </div>
          <div
            className={[
              "border px-3 py-1 text-xs font-medium",
              readPublishHealthClasses(publishHealthTone),
            ].join(" ")}
          >
            {publishStatus
              ? `${publishStatus.pending_change_count} pending public changes`
              : "Checking publish status"}
          </div>
        </div>

        {publishStatusQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading public-site publish status...</p>
        ) : null}

        {publishStatusQuery.isError ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
              Publish status blocked
            </p>
            <p className="text-sm leading-6 text-slate-600">
              {(publishStatusQuery.error as Error & { suggested_action?: string }).message}
            </p>
            <p className="text-sm text-slate-500">
              {(publishStatusQuery.error as Error & { suggested_action?: string }).suggested_action ??
                "Sign in with a valid admin or dev session, then retry."}
            </p>
          </div>
        ) : null}

        {publishStatus ? (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="border border-black/6 bg-slate-50 px-5 py-5">
              <div className="mb-4 space-y-2 border-b border-black/6 pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Health
                </p>
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  {readPublishHealthTitle({
                    pendingChangeCount: publishStatus.pending_change_count,
                    lastPublishStatus: publishStatus.last_publish_status,
                  })}
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Green means no newer public DB edits are waiting. Orange means a few live public
                  rows have changed since the last accepted publish trigger or your local site still
                  needs a manual rebuild. Red means the publish loop either failed or too many
                  public changes are waiting.
                </p>
              </div>

              <dl>
                <MetadataRow
                  label="Last accepted publish"
                  value={formatTimestampLabel(publishStatus.last_successful_publish_at_ts_ms)}
                />
                <MetadataRow
                  label="Last attempted publish"
                  value={formatTimestampLabel(publishStatus.last_attempted_publish_at_ts_ms)}
                />
                <MetadataRow label="Status" value={publishStatus.last_publish_status} />
                <MetadataRow
                  label="Message"
                  value={publishStatus.last_publish_message ?? "Not set"}
                />
                <MetadataRow
                  label="Managed content"
                  value={publishStatus.public_managed_content_kinds.join(", ")}
                />
              </dl>
            </article>

            <article className="border border-black/6 bg-[#111111] px-5 py-5 text-white">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                  Action
                </p>
                <h3 className="text-xl font-semibold tracking-tight">
                  Trigger publish action
                </h3>
                <p className="text-sm leading-6 text-white/70">
                  {isLocalManualMode
                    ? "The public frontend now fetches the live public content bundle from dcx_api during static generation. In local development, publish records that you still need to run npm run dev or npm run build in dcx_public, then mark the local rebuild complete."
                    : "The public frontend now fetches the live public content bundle from dcx_api during static generation. In hosted environments, publish asks Cloudflare Pages to rebuild against the current database state."}
                </p>
                <button
                  type="button"
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending || markLocalCompleteMutation.isPending}
                  className="inline-flex h-11 items-center justify-center bg-white px-5 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {publishMutation.isPending ? "Triggering publish..." : "Publish public site"}
                </button>

                {showLocalCompleteButton ? (
                  <button
                    type="button"
                    onClick={() => markLocalCompleteMutation.mutate()}
                    disabled={publishMutation.isPending || markLocalCompleteMutation.isPending}
                    className="inline-flex h-11 items-center justify-center border border-white/20 bg-transparent px-5 text-sm font-medium text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {markLocalCompleteMutation.isPending
                      ? "Recording local rebuild..."
                      : "Mark local rebuild complete"}
                  </button>
                ) : null}

                {publishMutation.isSuccess ? (
                  <p className="text-sm text-emerald-300">
                    Publish action recorded. Refreshing status now.
                  </p>
                ) : null}

                {markLocalCompleteMutation.isSuccess ? (
                  <p className="text-sm text-emerald-300">
                    Local rebuild completion recorded. Refreshing status now.
                  </p>
                ) : null}

                {publishMutation.isError ? (
                  <p className="text-sm text-red-300">
                    {(
                      publishMutation.error as Error & {
                        suggested_action?: string
                      }
                    ).suggested_action ??
                      (publishMutation.error as Error).message}
                  </p>
                ) : null}

                {markLocalCompleteMutation.isError ? (
                  <p className="text-sm text-red-300">
                    {(
                      markLocalCompleteMutation.error as Error & {
                        suggested_action?: string
                      }
                    ).suggested_action ??
                      (markLocalCompleteMutation.error as Error).message}
                  </p>
                ) : null}
              </div>
            </article>
          </div>
        ) : null}
      </section>

      {publishStatus ? (
        <section className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Pending changes
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                Current live rows waiting for publish
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                This is the current live public-copy and content state that has changed since the
                last accepted publish trigger.
              </p>
            </div>
            <div className="border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {publishStatus.pending_change_count} pending
            </div>
          </div>

          {publishStatus.pending_changes_preview.length > 0 ? (
            <div className="mb-5 flex flex-col gap-3 border-b border-black/6 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <Input
                value={pendingChangesFilterValue}
                onChange={(event) => setPendingChangesFilterValue(event.target.value)}
                placeholder="Filter pending changes..."
                className="h-10 w-full max-w-sm rounded-none border-black/8 bg-white px-3 text-sm"
              />
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="rounded-none">
                      Columns
                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-none">
                    {pendingChangeColumns
                      .filter((column) => column.id !== undefined)
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={pendingChangesColumnVisibility[column.id!] !== false}
                          onCheckedChange={(value) =>
                            setPendingChangesColumnVisibility((currentState) => ({
                              ...currentState,
                              [column.id!]: !!value,
                            }))
                          }
                        >
                          {column.id === "primary_label"
                            ? "Item"
                            : column.id === "content_kind"
                              ? "Kind"
                              : column.id === "language_name_native"
                                ? "Language"
                                : column.id === "public_path"
                                  ? "Public path"
                                  : "Updated"}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : null}

          {publishStatus.pending_changes_preview.length === 0 ? (
            <p className="text-sm text-slate-500">
              No current public-content rows are waiting for the next rebuild.
            </p>
          ) : (
            <DcxAdminDataTable
              columns={pendingChangeColumns}
              data={filteredPendingChanges}
              emptyLabel="No pending changes match the current filter."
              sorting={pendingChangesSorting}
              onSortingChange={setPendingChangesSorting}
              columnVisibility={pendingChangesColumnVisibility}
              onColumnVisibilityChange={setPendingChangesColumnVisibility}
              readColumnWidthClassName={readPendingChangeColumnWidthClassName}
              pageSize={50}
            />
          )}
        </section>
      ) : null}
    </section>
  )
}
