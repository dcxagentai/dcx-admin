/**
 * CONTEXT:
 * First admin newsletters surface for the DCX internal frontend.
 * It exists to let internal users create and edit newsletter content drafts using the same
 * immutable multilingual email model as the existing transactional templates.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  readDcxAdminNewslettersCatalog,
  type DcxAdminNewsletterCatalogRow,
} from "../lib/read_dcx_admin_newsletters_catalog"
import { readDcxAdminNewsletterDetail } from "../lib/read_dcx_admin_newsletter_detail"
import { createDcxAdminNewsletterDraft } from "../lib/create_dcx_admin_newsletter_draft"
import { saveDcxAdminLiveEmailRow } from "../lib/save_dcx_admin_live_email_row"
import { renderDcxBasicMarkdownToHtml } from "../lib/render_dcx_basic_markdown_to_html"

type Props = {
  apiBaseUrl: string
  routeEmailKey: string | null
  routeLanguageCode: string | null
  onOpenNewsletter: (params: { emailKey: string; languageCode: string }) => void
}

type EditorVisualState = "idle" | "editing" | "saving" | "saved" | "error"

function formatTimestampLabel(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return "Not set"
  }
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(timestampMs),
  )
}

function readVisualBorderClass(state: EditorVisualState): string {
  if (state === "editing" || state === "saving") return "border-amber-300"
  if (state === "saved") return "border-emerald-300"
  if (state === "error") return "border-red-300"
  return "border-sky-300"
}

function readVisualTextClass(state: EditorVisualState): string {
  if (state === "editing" || state === "saving") return "text-amber-600"
  if (state === "saved") return "text-emerald-600"
  if (state === "error") return "text-red-600"
  return "text-sky-700"
}

function buildDetailSnapshot(detail: DcxAdminNewsletterCatalogRow): string {
  return JSON.stringify({
    email_subject: detail.email_subject,
    email_body: detail.email_body,
  })
}

function buildDraftSnapshot(draft: { email_subject: string; email_body: string }): string {
  return JSON.stringify(draft)
}

function MetadataRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 py-3 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </dt>
      <dd className="max-w-[22rem] text-right text-sm text-slate-900">{props.value}</dd>
    </div>
  )
}

function NewsletterRow(props: {
  row: DcxAdminNewsletterCatalogRow
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "flex w-full flex-col gap-1 rounded-[1.25rem] border px-4 py-4 text-left transition",
        props.isSelected
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-black/6 bg-white text-slate-950 hover:border-slate-300",
      ].join(" ")}
    >
      <p className="text-base font-semibold tracking-tight">{props.row.email_subject}</p>
      <p className={props.isSelected ? "text-sm text-white/70" : "text-sm text-slate-600"}>
        {props.row.email_key}
      </p>
      <p className={props.isSelected ? "text-xs text-white/60" : "text-xs text-slate-500"}>
        Updated {formatTimestampLabel(props.row.updated_at_ts_ms)}
      </p>
    </button>
  )
}

export function DcxAdminNewslettersPage(props: Props) {
  const queryClient = useQueryClient()
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const catalogQuery = useQuery({
    queryKey: ["dcx_admin_newsletters_catalog"],
    queryFn: async () => readDcxAdminNewslettersCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })
  const detailQuery = useQuery({
    queryKey: ["dcx_admin_newsletter_detail", props.routeLanguageCode, props.routeEmailKey],
    queryFn: async () =>
      readDcxAdminNewsletterDetail({
        apiBaseUrl: props.apiBaseUrl,
        emailKey: props.routeEmailKey ?? "",
        languageCode: props.routeLanguageCode ?? "en",
      }),
    enabled: Boolean(props.routeEmailKey && props.routeLanguageCode),
  })
  const createDraftMutation = useMutation({
    mutationFn: async (params: { emailSubject: string; languageCode: string }) =>
      createDcxAdminNewsletterDraft({
        apiBaseUrl: props.apiBaseUrl,
        emailSubject: params.emailSubject,
        languageCode: params.languageCode,
      }),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ["dcx_admin_newsletters_catalog"] })
      props.onOpenNewsletter({
        emailKey: payload.data.email_key,
        languageCode: payload.data.language_code,
      })
    },
  })
  const saveMutation = useMutation({
    mutationFn: async (params: { emailId: number; emailSubject: string; emailBody: string }) =>
      saveDcxAdminLiveEmailRow({
        apiBaseUrl: props.apiBaseUrl,
        emailId: params.emailId,
        emailSubject: params.emailSubject,
        emailBody: params.emailBody,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_newsletters_catalog"] }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_admin_newsletter_detail", props.routeLanguageCode, props.routeEmailKey],
        }),
      ])
    },
  })

  const newsletters = catalogQuery.data?.data.newsletters ?? []
  const detail = detailQuery.data?.data ?? null
  const [newNewsletterSubject, setNewNewsletterSubject] = useState("")
  const [editorDraft, setEditorDraft] = useState<{ email_subject: string; email_body: string } | null>(null)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("")
  const [visualState, setVisualState] = useState<EditorVisualState>("idle")
  const [statusText, setStatusText] = useState(
    "Blue means editable. Changes autosave after a short pause.",
  )

  useEffect(() => {
    if (!detail) {
      setEditorDraft(null)
      setLastSavedSnapshot("")
      setVisualState("idle")
      setStatusText("Blue means editable. Changes autosave after a short pause.")
      return
    }

    const nextDraft = {
      email_subject: detail.email_subject,
      email_body: detail.email_body,
    }
    setEditorDraft(nextDraft)
    setLastSavedSnapshot(buildDetailSnapshot(detail))
    setVisualState("idle")
    setStatusText("Blue means editable. Changes autosave after a short pause.")
  }, [detail?.email_id, detail?.updated_at_ts_ms])

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)
      if (resetStateTimeoutRef.current) clearTimeout(resetStateTimeoutRef.current)
    }
  }, [])

  const draftSnapshot = editorDraft ? buildDraftSnapshot(editorDraft) : ""
  const isDirty = detail !== null && editorDraft !== null && draftSnapshot !== lastSavedSnapshot
  const isAnyWritePending = createDraftMutation.isPending || saveMutation.isPending
  const selectedNewsletterIds = useMemo(
    () => new Set(props.routeEmailKey ? [props.routeEmailKey] : []),
    [props.routeEmailKey],
  )

  useEffect(() => {
    if (!detail || !editorDraft || !isDirty || isAnyWritePending) {
      return
    }

    setVisualState("editing")
    setStatusText("Editing. Autosave will run after a short pause.")

    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)
    autosaveTimeoutRef.current = setTimeout(async () => {
      setVisualState("saving")
      setStatusText("Saving newsletter draft...")
      try {
        await saveMutation.mutateAsync({
          emailId: detail.email_id,
          emailSubject: editorDraft.email_subject,
          emailBody: editorDraft.email_body,
        })
        setVisualState("saved")
        setStatusText("Newsletter draft saved.")
        if (resetStateTimeoutRef.current) clearTimeout(resetStateTimeoutRef.current)
        resetStateTimeoutRef.current = setTimeout(() => {
          setVisualState("idle")
          setStatusText("Blue means editable. Changes autosave after a short pause.")
        }, 1400)
      } catch (error) {
        setVisualState("error")
        setStatusText(
          (error as Error & { suggested_action?: string }).suggested_action ??
            "Autosave failed. Keep the tab open and retry after the backend is healthy.",
        )
      }
    }, 10000)
  }, [detail, editorDraft, isDirty, isAnyWritePending, saveMutation])

  return (
    <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="space-y-6">
        <article className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-5 space-y-2 border-b border-black/6 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Content</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Newsletters</h2>
            <p className="text-sm leading-6 text-slate-600">
              Compose newsletter content drafts in English first, with the same translation-ready immutable model already used by transactional email templates.
            </p>
          </div>

          <div className="space-y-3 rounded-[1.25rem] border border-black/6 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              New newsletter
            </p>
            <input
              value={newNewsletterSubject}
              onChange={(event) => setNewNewsletterSubject(event.target.value)}
              placeholder="Newsletter subject"
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none"
            />
            <button
              type="button"
              onClick={() =>
                createDraftMutation.mutate({
                  emailSubject: newNewsletterSubject,
                  languageCode: "en",
                })
              }
              disabled={createDraftMutation.isPending || newNewsletterSubject.trim() === ""}
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createDraftMutation.isPending ? "Creating newsletter..." : "New newsletter"}
            </button>
            {createDraftMutation.isError ? (
              <p className="text-sm text-red-600">
                {(createDraftMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (createDraftMutation.error as Error).message}
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Catalog</p>
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">Existing newsletters</h3>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {catalogQuery.data?.data.total_live_row_count ?? 0} live rows
            </div>
          </div>

          {catalogQuery.isLoading ? <p className="text-sm text-slate-500">Loading newsletters...</p> : null}
          {catalogQuery.isError ? (
            <p className="text-sm text-red-600">
              {(catalogQuery.error as Error & { suggested_action?: string }).suggested_action ??
                (catalogQuery.error as Error).message}
            </p>
          ) : null}

          <div className="space-y-3">
            {newsletters.map((newsletter) => (
              <NewsletterRow
                key={newsletter.email_id}
                row={newsletter}
                isSelected={selectedNewsletterIds.has(newsletter.email_key)}
                onClick={() =>
                  props.onOpenNewsletter({
                    emailKey: newsletter.email_key,
                    languageCode: newsletter.language.language_code,
                  })
                }
              />
            ))}
            {newsletters.length === 0 && !catalogQuery.isLoading ? (
              <p className="text-sm text-slate-500">No newsletters exist yet.</p>
            ) : null}
          </div>
        </article>
      </section>

      <article className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Editor</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">
              {detail ? `${detail.language.language_name_native} newsletter` : "Select a newsletter"}
            </h3>
          </div>
          {detail ? (
            <p className={["text-xs font-medium", readVisualTextClass(visualState)].join(" ")}>
              {statusText}
            </p>
          ) : null}
        </div>

        {!props.routeEmailKey ? (
          <p className="text-sm text-slate-500">Choose a newsletter from the list or create a new one.</p>
        ) : null}
        {detailQuery.isLoading ? <p className="text-sm text-slate-500">Loading newsletter detail...</p> : null}
        {detailQuery.isError ? (
          <p className="text-sm text-red-600">
            {(detailQuery.error as Error & { suggested_action?: string }).suggested_action ??
              (detailQuery.error as Error).message}
          </p>
        ) : null}

        {detail && editorDraft ? (
          <div className="space-y-6">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Subject</span>
              <input
                value={editorDraft.email_subject}
                onChange={(event) => setEditorDraft({ ...editorDraft, email_subject: event.target.value })}
                className={["h-12 w-full rounded-2xl border bg-slate-50 px-4 text-base outline-none", readVisualBorderClass(visualState)].join(" ")}
              />
            </label>

            <div className="grid gap-4 xl:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Body markdown</span>
                <textarea
                  value={editorDraft.email_body}
                  onChange={(event) => setEditorDraft({ ...editorDraft, email_body: event.target.value })}
                  rows={18}
                  className={["min-h-[28rem] w-full resize-y rounded-[1.1rem] border bg-slate-50 px-4 py-4 font-mono text-sm leading-7 outline-none", readVisualBorderClass(visualState)].join(" ")}
                />
              </label>
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</span>
                <div
                  className="prose prose-slate min-h-[28rem] max-w-none rounded-[1.1rem] border border-black/6 bg-slate-50 px-5 py-5"
                  dangerouslySetInnerHTML={{
                    __html: renderDcxBasicMarkdownToHtml(editorDraft.email_body),
                  }}
                />
              </div>
            </div>

            <dl>
              <MetadataRow label="Email key" value={detail.email_key} />
              <MetadataRow
                label="Language"
                value={`${detail.language.language_name_native} (${detail.language.language_code})`}
              />
              <MetadataRow label="Updated at" value={formatTimestampLabel(detail.updated_at_ts_ms)} />
            </dl>
          </div>
        ) : null}
      </article>
    </section>
  )
}
