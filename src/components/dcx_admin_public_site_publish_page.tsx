/**
 * CONTEXT:
 * First publish/deploy screen for the DCX admin frontend.
 * It exists so internal users can see whether public-copy edits are waiting for publish and can
 * manually trigger a new Cloudflare Pages rebuild now that dcx_public reads live DB content at build time.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  readDcxAdminPublicSitePublishStatus,
  type DcxAdminPublicSitePendingChangePreviewRow,
} from "../lib/read_dcx_admin_public_site_publish_status"
import { markDcxAdminPublicSiteLocalRebuildComplete } from "../lib/mark_dcx_admin_public_site_local_rebuild_complete"
import { triggerDcxAdminPublicSitePublishRun } from "../lib/trigger_dcx_admin_public_site_publish_run"

type Props = {
  apiBaseUrl: string
  debugAdminUserId: number | null
}

type PublishHealthTone = "green" | "orange" | "red"

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

function PendingChangeRow(props: { row: DcxAdminPublicSitePendingChangePreviewRow }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 py-3 last:border-b-0">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-slate-950">
          {props.row.string_group} / {props.row.string_key}
        </p>
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
          {props.row.language_name_native} ({props.row.language_code})
        </p>
      </div>
      <p className="text-sm text-slate-600">{formatTimestampLabel(props.row.updated_at_ts_ms)}</p>
    </li>
  )
}

export function DcxAdminPublicSitePublishPage(props: Props) {
  const queryClient = useQueryClient()
  const publishStatusQuery = useQuery({
    queryKey: ["dcx_admin_public_site_publish_status", props.debugAdminUserId],
    queryFn: async () =>
      readDcxAdminPublicSitePublishStatus({
        apiBaseUrl: props.apiBaseUrl,
        debugAdminUserId: props.debugAdminUserId,
      }),
  })
  const publishMutation = useMutation({
    mutationFn: async () =>
      triggerDcxAdminPublicSitePublishRun({
        apiBaseUrl: props.apiBaseUrl,
        debugAdminUserId: props.debugAdminUserId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["dcx_admin_public_site_publish_status", props.debugAdminUserId],
      })
    },
  })
  const markLocalCompleteMutation = useMutation({
    mutationFn: async () =>
      markDcxAdminPublicSiteLocalRebuildComplete({
        apiBaseUrl: props.apiBaseUrl,
        debugAdminUserId: props.debugAdminUserId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["dcx_admin_public_site_publish_status", props.debugAdminUserId],
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

  return (
    <section className="flex flex-col gap-6">
      <section className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-black/6 pb-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Deploy
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Publish public site
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Public UX-string edits now save straight into the live database. This screen shows
              whether Cloudflare Pages still needs a rebuild and lets you trigger that rebuild
              manually.
            </p>
          </div>
          <div
            className={[
              "rounded-full border px-3 py-1 text-xs font-medium",
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
                "Use ?admin_user_id=<existing_user_id> locally until admin auth is connected."}
            </p>
          </div>
        ) : null}

        {publishStatus ? (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[1.5rem] border border-black/6 bg-slate-50 px-5 py-5">
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
                  changes are waiting.
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
                  label="Managed groups"
                  value={publishStatus.public_managed_groups.join(", ")}
                />
              </dl>
            </article>

            <article className="rounded-[1.5rem] border border-black/6 bg-[#111111] px-5 py-5 text-white">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                  Action
                </p>
                <h3 className="text-xl font-semibold tracking-tight">
                  Trigger publish action
                </h3>
                <p className="text-sm leading-6 text-white/70">
                  {isLocalManualMode
                    ? "The public frontend now fetches the live public UX-string bundle from dcx_api during static generation. In local development, publish records that you still need to run npm run dev or npm run build in dcx_public, then mark the local rebuild complete."
                    : "The public frontend now fetches the live public UX-string bundle from dcx_api during static generation. In hosted environments, publish asks Cloudflare Pages to rebuild against the current database state."}
                </p>
                <button
                  type="button"
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending || markLocalCompleteMutation.isPending}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {publishMutation.isPending ? "Triggering publish..." : "Publish public site"}
                </button>

                {showLocalCompleteButton ? (
                  <button
                    type="button"
                    onClick={() => markLocalCompleteMutation.mutate()}
                    disabled={publishMutation.isPending || markLocalCompleteMutation.isPending}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-transparent px-5 text-sm font-medium text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
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
        <section className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Pending changes
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                Current live rows waiting for publish
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                This is the current live public-copy state that has changed since the last accepted
                publish trigger.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {publishStatus.pending_change_count} pending
            </div>
          </div>

          {publishStatus.pending_changes_preview.length === 0 ? (
            <p className="text-sm text-slate-500">
              No current public-content rows are waiting for the next rebuild.
            </p>
          ) : (
            <ul>
              {publishStatus.pending_changes_preview.map((row) => (
                <PendingChangeRow
                  key={`${row.ux_string_id}-${row.language_code}-${row.updated_at_ts_ms}`}
                  row={row}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </section>
  )
}
