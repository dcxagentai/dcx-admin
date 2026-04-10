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
import {
  readDcxAdminNewsletterDetail,
  type DcxAdminNewsletterDetail,
} from "../lib/read_dcx_admin_newsletter_detail"
import { createDcxAdminNewsletterDraft } from "../lib/create_dcx_admin_newsletter_draft"
import { createDcxAdminNewsletterTranslation } from "../lib/create_dcx_admin_newsletter_translation"
import { saveDcxAdminLiveEmailRow } from "../lib/save_dcx_admin_live_email_row"
import {
  readDcxAdminNewsletterSendsCatalog,
  type DcxAdminNewsletterSendCatalogRow,
} from "../lib/read_dcx_admin_newsletter_sends_catalog"
import { prepareDcxAdminNewsletterSend } from "../lib/prepare_dcx_admin_newsletter_send"
import { cancelDcxAdminNewsletterSend } from "../lib/cancel_dcx_admin_newsletter_send"
import {
  DCX_ADMIN_EDITABLE_FIELD_SAVED_VISIBLE_MS,
  readDcxAdminEditableFieldBorderClass,
  readDcxAdminEditableFieldCompactStatusLabel,
  readDcxAdminEditableFieldStatusTextClass,
  type DcxAdminEditableFieldVisualState,
} from "../lib/dcx_admin_editable_field_visuals"
import { renderDcxBasicMarkdownToHtml } from "../lib/render_dcx_basic_markdown_to_html"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  apiBaseUrl: string
  routeEmailKey: string | null
  routeLanguageCode: string | null
  onOpenNewsletter: (params: { emailKey: string; languageCode: string }) => void
}

function formatTimestampLabel(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return "Not set"
  }
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(timestampMs),
  )
}

function buildDateTimeLocalInputValue(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return ""
  }
  const candidateDate = new Date(timestampMs)
  const pad = (value: number) => value.toString().padStart(2, "0")
  return `${candidateDate.getFullYear()}-${pad(candidateDate.getMonth() + 1)}-${pad(candidateDate.getDate())}T${pad(candidateDate.getHours())}:${pad(candidateDate.getMinutes())}`
}

function readTimestampFromDateTimeLocalInput(value: string): number | null {
  if (value.trim() === "") {
    return null
  }
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }
  return parsedDate.getTime()
}

function buildDetailSnapshot(detail: DcxAdminNewsletterDetail): string {
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
        "flex w-full flex-col gap-1 border px-4 py-4 text-left transition",
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

function NewsletterSendRow(props: {
  row: DcxAdminNewsletterSendCatalogRow
  onCancel: () => void
  cancelDisabled: boolean
}) {
  return (
        <div className="border border-black/6 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-950">
            {props.row.send_status === "cancelled" ? "Cancelled send" : "Prepared send"}
          </p>
          <p className="text-xs text-slate-500">
            Scheduled {formatTimestampLabel(props.row.scheduled_send_at_ts_ms)}
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {props.row.send_status}
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-4">
        <p>{props.row.total_recipient_count} recipients</p>
        <p>{props.row.send_candidate_count} send candidates</p>
        <p>{props.row.skipped_recipient_count} skipped</p>
        <p>
          {props.row.blocked_missing_translation_count > 0
            ? `${props.row.blocked_missing_translation_count} waiting translation`
            : `${props.row.tracked_link_count} tracked links`}
        </p>
      </div>
      {props.row.send_status === "scheduled" ? (
        <button
          type="button"
          onClick={props.onCancel}
          disabled={props.cancelDisabled}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel prepared send
        </button>
      ) : null}
    </div>
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
  const sendsCatalogQuery = useQuery({
    queryKey: ["dcx_admin_newsletter_sends_catalog", props.routeLanguageCode, props.routeEmailKey],
    queryFn: async () =>
      readDcxAdminNewsletterSendsCatalog({
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
  const createTranslationMutation = useMutation({
    mutationFn: async (params: { targetLanguageCode: string }) =>
      createDcxAdminNewsletterTranslation({
        apiBaseUrl: props.apiBaseUrl,
        emailKey: props.routeEmailKey ?? "",
        sourceLanguageCode: props.routeLanguageCode ?? "en",
        targetLanguageCode: params.targetLanguageCode,
      }),
    onSuccess: async (payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dcx_admin_newsletters_catalog"] }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_admin_newsletter_detail", props.routeLanguageCode, props.routeEmailKey],
        }),
        queryClient.invalidateQueries({
          queryKey: ["dcx_admin_newsletter_sends_catalog", props.routeLanguageCode, props.routeEmailKey],
        }),
      ])
      props.onOpenNewsletter({
        emailKey: payload.data.email_key,
        languageCode: payload.data.language_code,
      })
    },
  })
  const prepareSendMutation = useMutation({
    mutationFn: async (params: { scheduledSendAtTsMs: number | null }) =>
      prepareDcxAdminNewsletterSend({
        apiBaseUrl: props.apiBaseUrl,
        emailKey: props.routeEmailKey ?? "",
        languageCode: props.routeLanguageCode ?? "en",
        scheduledSendAtTsMs: params.scheduledSendAtTsMs,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["dcx_admin_newsletter_sends_catalog", props.routeLanguageCode, props.routeEmailKey],
      })
    },
  })
  const cancelSendMutation = useMutation({
    mutationFn: async (params: { emailSendId: number }) =>
      cancelDcxAdminNewsletterSend({
        apiBaseUrl: props.apiBaseUrl,
        emailSendId: params.emailSendId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["dcx_admin_newsletter_sends_catalog", props.routeLanguageCode, props.routeEmailKey],
      })
    },
  })

  const newsletters = catalogQuery.data?.data.newsletters ?? []
  const detail = detailQuery.data?.data ?? null
  const preparedSends = sendsCatalogQuery.data?.data.newsletter_sends ?? []
  const [newNewsletterSubject, setNewNewsletterSubject] = useState("")
  const [editorDraft, setEditorDraft] = useState<{ email_subject: string; email_body: string } | null>(null)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("")
  const [visualState, setVisualState] = useState<DcxAdminEditableFieldVisualState>("idle")
  const [scheduledSendInput, setScheduledSendInput] = useState("")
  const [sendStatusText, setSendStatusText] = useState(
    "Prepare one send now or schedule it for later. This stage snapshots recipients and tracked links only.",
  )

  useEffect(() => {
    if (!detail) {
      setEditorDraft(null)
      setLastSavedSnapshot("")
      setVisualState("idle")
      return
    }

    const nextDraft = {
      email_subject: detail.email_subject,
      email_body: detail.email_body,
    }
    setEditorDraft(nextDraft)
    setLastSavedSnapshot(buildDetailSnapshot(detail))
    setVisualState("idle")
  }, [detail?.email_id, detail?.updated_at_ts_ms])

  useEffect(() => {
    if (!detail) {
      return
    }
    setScheduledSendInput(buildDateTimeLocalInputValue(Date.now() + 60 * 60 * 1000))
    if ((detail.language_readiness.total_blocked_missing_translation_count ?? 0) > 0) {
      setSendStatusText(
        `This newsletter still needs translations before sending. ${detail.language_readiness.total_blocked_missing_translation_count} eligible recipients are currently blocked by missing language coverage.`,
      )
    } else {
      setSendStatusText(
        "Prepare one send now or schedule it for later. This stage snapshots recipients and tracked links only.",
      )
    }
  }, [detail?.email_id])

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)
      if (resetStateTimeoutRef.current) clearTimeout(resetStateTimeoutRef.current)
    }
  }, [])

  const draftSnapshot = editorDraft ? buildDraftSnapshot(editorDraft) : ""
  const isDirty = detail !== null && editorDraft !== null && draftSnapshot !== lastSavedSnapshot
  const isAnyWritePending = createDraftMutation.isPending || saveMutation.isPending || createTranslationMutation.isPending
  const scheduledSendAtTsMs = readTimestampFromDateTimeLocalInput(scheduledSendInput)
  const isSendMutationPending = prepareSendMutation.isPending || cancelSendMutation.isPending
  const hasMissingNewsletterLanguagesForEligibleUsers =
    (detail?.language_readiness.total_blocked_missing_translation_count ?? 0) > 0
  const canPrepareSend =
    detail !== null &&
    !isDirty &&
    !isAnyWritePending &&
    !isSendMutationPending &&
    !hasMissingNewsletterLanguagesForEligibleUsers
  const selectedNewsletterIds = useMemo(
    () => new Set(props.routeEmailKey ? [props.routeEmailKey] : []),
    [props.routeEmailKey],
  )

  async function persistCurrentDraft(): Promise<void> {
    if (!detail || !editorDraft || !isDirty) {
      return
    }
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
      autosaveTimeoutRef.current = null
    }

    setVisualState("saving")
    try {
      await saveMutation.mutateAsync({
        emailId: detail.email_id,
        emailSubject: editorDraft.email_subject,
        emailBody: editorDraft.email_body,
      })
      setVisualState("saved")
      if (resetStateTimeoutRef.current) clearTimeout(resetStateTimeoutRef.current)
      resetStateTimeoutRef.current = setTimeout(() => {
        setVisualState("idle")
      }, DCX_ADMIN_EDITABLE_FIELD_SAVED_VISIBLE_MS)
    } catch (error) {
      setVisualState("error")
    }
  }

  useEffect(() => {
    if (!detail || !editorDraft || !isDirty || isAnyWritePending) {
      return
    }

    setVisualState("editing")

    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current)
    autosaveTimeoutRef.current = setTimeout(() => {
      void persistCurrentDraft()
    }, 30000)
  }, [detail, editorDraft, isDirty, isAnyWritePending])

  async function handlePrepareSendNow() {
    try {
      const payload = await prepareSendMutation.mutateAsync({ scheduledSendAtTsMs: null })
      setSendStatusText(
        `Prepared one newsletter send for ${formatTimestampLabel(payload.data.scheduled_send_at_ts_ms)}.`,
      )
    } catch (error) {
      setSendStatusText(
        (error as Error & { suggested_action?: string }).suggested_action ??
          "We could not prepare that newsletter send just now.",
      )
    }
  }

  async function handlePrepareScheduledSend() {
    if (scheduledSendAtTsMs === null) {
      setSendStatusText("Choose one valid date and time before preparing a scheduled send.")
      return
    }
    try {
      const payload = await prepareSendMutation.mutateAsync({
        scheduledSendAtTsMs,
      })
      setSendStatusText(
        `Prepared one scheduled newsletter send for ${formatTimestampLabel(payload.data.scheduled_send_at_ts_ms)}.`,
      )
    } catch (error) {
      setSendStatusText(
        (error as Error & { suggested_action?: string }).suggested_action ??
          "We could not prepare that scheduled send just now.",
      )
    }
  }

  async function handleCancelPreparedSend(emailSendId: number) {
    try {
      const payload = await cancelSendMutation.mutateAsync({ emailSendId })
      setSendStatusText(
        `Prepared send ${payload.data.email_send_id} is now ${payload.data.send_status}.`,
      )
    } catch (error) {
      setSendStatusText(
        (error as Error & { suggested_action?: string }).suggested_action ??
          "We could not cancel that prepared send just now.",
      )
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="space-y-6">
        <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-5 space-y-2 border-b border-black/6 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Content</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Newsletters</h2>
            <p className="text-sm leading-6 text-slate-600">
              Compose newsletter content drafts in English first, with the same translation-ready immutable model already used by transactional email templates.
            </p>
          </div>

          <div className="space-y-3 border border-black/6 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              New newsletter
            </p>
            <input
              value={newNewsletterSubject}
              onChange={(event) => setNewNewsletterSubject(event.target.value)}
              placeholder="Newsletter subject"
              className="h-11 border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none"
            />
            <Button
              type="button"
              onClick={() =>
                createDraftMutation.mutate({
                  emailSubject: newNewsletterSubject,
                  languageCode: "en",
                })
              }
              disabled={createDraftMutation.isPending || newNewsletterSubject.trim() === ""}
              className="rounded-none bg-slate-900 px-5 text-white hover:bg-slate-800"
            >
              {createDraftMutation.isPending ? "Creating newsletter..." : "New newsletter"}
            </Button>
            {createDraftMutation.isError ? (
              <p className="text-sm text-red-600">
                {(createDraftMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (createDraftMutation.error as Error).message}
              </p>
            ) : null}
          </div>
        </article>

        <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
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

      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Editor</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">
              {detail ? `${detail.language.language_name_native} newsletter` : "Select a newsletter"}
            </h3>
          </div>
          {detail ? (
            <p className={["text-xs font-medium", readDcxAdminEditableFieldStatusTextClass(visualState)].join(" ")}>
              {readDcxAdminEditableFieldCompactStatusLabel(visualState)}
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
                className={["h-12 w-full border bg-slate-50 px-4 text-base outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
              />
            </label>

            <section className="space-y-4 border border-black/6 bg-slate-50 px-4 py-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Translations
                </p>
                <h4 className="text-lg font-semibold tracking-tight text-slate-950">
                  Existing and missing language rows
                </h4>
                <p className="text-sm leading-6 text-slate-600">
                  Newsletters follow the same original/translation model as transactional templates. Create missing language rows here before preparing real sends for users who prefer those languages.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {detail.translation_summary.existing_translations.map((translation) => (
                  <button
                    key={translation.language.language_code}
                    type="button"
                    onClick={() =>
                      props.onOpenNewsletter({
                        emailKey: translation.email_key,
                        languageCode: translation.language.language_code,
                      })
                    }
                    className={[
                      "border px-4 py-2 text-sm font-medium transition",
                      translation.is_current_language
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950",
                    ].join(" ")}
                  >
                    {translation.language.language_name_native}
                    {translation.is_original ? " · original" : ""}
                  </button>
                ))}
              </div>

              {detail.translation_summary.missing_languages.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Missing languages
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {detail.translation_summary.missing_languages.map((language) => (
                      <Button
                        key={language.language_code}
                        type="button"
                        onClick={() =>
                          createTranslationMutation.mutate({
                            targetLanguageCode: language.language_code,
                          })
                        }
                        disabled={createTranslationMutation.isPending}
                        variant="outline"
                        className="rounded-none border-slate-200 bg-white px-4 py-2 text-slate-700 hover:border-slate-300 hover:text-slate-950"
                      >
                        {createTranslationMutation.isPending
                          ? "Creating..."
                          : `Create ${language.language_name_native}`}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-emerald-700">
                  This newsletter already has live rows in every currently supported language.
                </p>
              )}

              {createTranslationMutation.isError ? (
                <p className="text-sm text-red-600">
                  {(createTranslationMutation.error as Error & { suggested_action?: string }).suggested_action ??
                    (createTranslationMutation.error as Error).message}
                </p>
              ) : null}
            </section>

            <div className="grid gap-4 xl:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Body markdown</span>
                <Textarea
                  value={editorDraft.email_body}
                  onChange={(event) => setEditorDraft({ ...editorDraft, email_body: event.target.value })}
                  rows={18}
                  className={["min-h-[28rem] w-full resize-y rounded-none border bg-slate-50 px-4 py-4 font-mono text-sm leading-7 outline-none", readDcxAdminEditableFieldBorderClass(visualState)].join(" ")}
                />
              </label>
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</span>
                <div
                  className="min-h-[28rem] border border-black/6 bg-slate-50 px-5 py-5 text-slate-700"
                  dangerouslySetInnerHTML={{
                    __html: renderDcxBasicMarkdownToHtml(editorDraft.email_body),
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => void persistCurrentDraft()}
                disabled={!isDirty || isAnyWritePending}
                variant="outline"
                className="rounded-none border-slate-200 bg-white px-5 text-slate-700 hover:border-slate-300 hover:text-slate-950"
              >
                {saveMutation.isPending ? "Saving..." : "Save newsletter"}
              </Button>
            </div>

            <section className="space-y-4 border border-black/6 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Send preparation
                  </p>
                  <h4 className="text-lg font-semibold tracking-tight text-slate-950">
                    Prepare newsletter sends
                  </h4>
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  {sendsCatalogQuery.data?.data.total_send_count ?? 0} prepared sends
                </div>
              </div>

              <p className="text-sm leading-6 text-slate-600">{sendStatusText}</p>

              <div className="border border-black/6 bg-white px-4 py-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Language readiness
                  </p>
                  <p className="text-sm leading-6 text-slate-600">
                    Newsletters only prepare send candidates when a live translation exists in the user’s preferred language. Transactional fallback-to-English does not apply here.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                  <p>{detail.language_readiness.total_evaluated_recipient_count} eligible recipients</p>
                  <p>{detail.language_readiness.total_send_candidate_count} ready to send</p>
                  <p>{detail.language_readiness.total_blocked_missing_translation_count} waiting translation</p>
                </div>
                <div className="mt-4 space-y-3">
                  {detail.language_readiness.language_rows.map((row) => (
                    <div
                      key={row.language.language_code}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-black/6 bg-slate-50 px-4 py-3 text-sm"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-slate-950">{row.language.language_name_native}</p>
                        <p className="text-slate-600">
                          {row.eligible_recipient_count} eligible · {row.send_candidate_count} ready
                        </p>
                      </div>
                      <div
                        className={[
                          "px-3 py-1 text-xs font-medium",
                          row.has_live_translation
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-amber-200 bg-amber-50 text-amber-700",
                        ].join(" ")}
                      >
                        {row.has_live_translation
                          ? "translation ready"
                          : `${row.blocked_missing_translation_count} blocked`}
                      </div>
                    </div>
                  ))}
                </div>
                {detail.language_readiness.missing_languages.length > 0 ? (
                    <div className="mt-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    This newsletter still needs live translations in{" "}
                    {detail.language_readiness.missing_languages
                      .map((language) => language.language_name_native)
                      .join(", ")}{" "}
                    before all eligible users can receive it in their preferred language.
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <input
                  type="datetime-local"
                  value={scheduledSendInput}
                  onChange={(event) => setScheduledSendInput(event.target.value)}
                  className="h-11 border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none"
                />
                <Button
                  type="button"
                  onClick={handlePrepareSendNow}
                  disabled={!canPrepareSend}
                  className="rounded-none bg-slate-900 px-5 text-white hover:bg-slate-800"
                >
                  {prepareSendMutation.isPending ? "Preparing..." : "Prepare send now"}
                </Button>
                <Button
                  type="button"
                  onClick={handlePrepareScheduledSend}
                  disabled={!canPrepareSend || scheduledSendAtTsMs === null}
                  variant="outline"
                  className="rounded-none border-slate-200 bg-white px-5 text-slate-700 hover:border-slate-300 hover:text-slate-950"
                >
                  Prepare scheduled send
                </Button>
              </div>

              {sendsCatalogQuery.isLoading ? (
                <p className="text-sm text-slate-500">Loading prepared sends...</p>
              ) : null}
              {sendsCatalogQuery.isError ? (
                <p className="text-sm text-red-600">
                  {(sendsCatalogQuery.error as Error & { suggested_action?: string }).suggested_action ??
                    (sendsCatalogQuery.error as Error).message}
                </p>
              ) : null}

              <div className="space-y-3">
                {preparedSends.map((preparedSend) => (
                  <NewsletterSendRow
                    key={preparedSend.email_send_id}
                    row={preparedSend}
                    onCancel={() => handleCancelPreparedSend(preparedSend.email_send_id)}
                    cancelDisabled={isSendMutationPending}
                  />
                ))}
                {preparedSends.length === 0 && !sendsCatalogQuery.isLoading ? (
                  <p className="text-sm text-slate-500">
                    No prepared sends exist for this newsletter yet.
                  </p>
                ) : null}
              </div>
            </section>

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
