/**
 * CONTEXT:
 * First admin newsletters surface for the DCX internal frontend.
 * It exists to let internal users browse newsletter drafts in one table-driven catalog,
 * then open one dedicated full-width editor route for the selected newsletter.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { CalendarDaysIcon } from "lucide-react"

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
import {
  readDcxAdminNewsletterSendRecipients,
  type DcxAdminNewsletterSendRecipientRow,
  type DcxAdminNewsletterSendRecipientsPayload,
} from "../lib/read_dcx_admin_newsletter_send_recipients"
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
import {
  buildDcxAdminCalendarDateFromTimestamp,
  buildDcxAdminTimeInputValueFromTimestamp,
  formatDcxAdminCalendarDateLabel,
  formatDcxAdminTimestampLabel,
  readDcxAdminTimestampFromCalendarDateAndTime,
} from "../lib/dcx_admin_timezone_datetime"
import { DcxAdminUnifiedTranslationLanguageSelector } from "./dcx_admin_translation_language_controls"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Calendar } from "@/components/ui/calendar"
import { DcxAdminDataTable } from "@/components/ui/dcx_admin_data_table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  apiBaseUrl: string
  adminTimezoneIanaName: string | null
  routeEmailKey: string | null
  routeLanguageCode: string | null
  onOpenNewsletter: (params: { emailKey: string; languageCode: string }) => void
  onReturnToCatalog: () => void
}

type DcxAdminNewsletterSendAudienceScope = "all" | "admins" | "devs" | "shareholders"

const newsletterColumnHelper = createColumnHelper<DcxAdminNewsletterCatalogRow>()
const newsletterRecipientColumnHelper = createColumnHelper<DcxAdminNewsletterSendRecipientRow>()

function readNewsletterSendHeading(sendStatus: string): string {
  if (sendStatus === "cancelled") {
    return "Cancelled send"
  }

  if (sendStatus === "sending") {
    return "Dispatch in progress"
  }

  if (sendStatus === "sent") {
    return "Dispatch complete"
  }

  if (sendStatus === "failed") {
    return "Dispatch completed with issues"
  }

  return "Prepared send"
}

function readNewsletterSendAudienceScopeLabel(
  audienceScope: DcxAdminNewsletterSendAudienceScope,
): string {
  if (audienceScope === "admins") {
    return "Admins only"
  }

  if (audienceScope === "devs") {
    return "Devs only"
  }

  if (audienceScope === "shareholders") {
    return "Shareholders"
  }

  return "All eligible users"
}

function readNewsletterSendStatusBadgeClass(sendStatus: string): string {
  if (sendStatus === "cancelled") {
    return "border-slate-200 bg-slate-100 text-slate-600"
  }

  if (sendStatus === "sending") {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }

  if (sendStatus === "sent") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (sendStatus === "failed") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-slate-200 bg-slate-50 text-slate-600"
}

function readNewsletterRecipientStatusBadgeClass(deliveryStatus: string): string {
  if (deliveryStatus === "delivered") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (deliveryStatus === "failed" || deliveryStatus === "bounced" || deliveryStatus === "complained") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  if (deliveryStatus === "sent" || deliveryStatus === "sending") {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }

  if (deliveryStatus === "skipped" || deliveryStatus === "cancelled") {
    return "border-slate-200 bg-slate-100 text-slate-600"
  }

  return "border-slate-200 bg-slate-50 text-slate-600"
}

function readNewsletterSendTimestampSummary(row: DcxAdminNewsletterSendCatalogRow, timezoneIanaName: string | null): string {
  if (row.send_status === "cancelled" && row.cancelled_at_ts_ms !== null) {
    return `Cancelled ${formatDcxAdminTimestampLabel(row.cancelled_at_ts_ms, timezoneIanaName)}`
  }

  if (row.send_completed_at_ts_ms !== null) {
    return `Completed ${formatDcxAdminTimestampLabel(row.send_completed_at_ts_ms, timezoneIanaName)}`
  }

  if (row.send_started_at_ts_ms !== null) {
    return `Started ${formatDcxAdminTimestampLabel(row.send_started_at_ts_ms, timezoneIanaName)}`
  }

  return `Scheduled ${formatDcxAdminTimestampLabel(row.scheduled_send_at_ts_ms, timezoneIanaName)}`
}

function readNewsletterRecipientOutcomeTimestamp(
  row: DcxAdminNewsletterSendRecipientRow,
): number | null {
  return (
    row.complained_at_ts_ms ??
    row.bounced_at_ts_ms ??
    row.failed_at_ts_ms ??
    row.delivered_at_ts_ms ??
    row.sent_at_ts_ms
  )
}

function readNewsletterRecipientOutcomeLabel(row: DcxAdminNewsletterSendRecipientRow): string {
  if (row.last_provider_event_type !== null && row.last_provider_event_type.trim() !== "") {
    return row.last_provider_event_type
  }

  return row.delivery_status
}

function readDcxAdminNewsletterRecipientColumnWidthClassName(columnId: string): string {
  if (columnId === "recipient_email") {
    return "w-[15rem]"
  }

  if (columnId === "delivery_status" || columnId === "user_role") {
    return "w-[8rem]"
  }

  if (columnId === "sent_at_ts_ms" || columnId === "outcome") {
    return "w-[12rem]"
  }

  if (columnId === "provider_message_id") {
    return "w-[15rem]"
  }

  return "w-[12rem]"
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

function renderLanguageLabel(language: DcxAdminNewsletterCatalogRow["language"]): string {
  return `${language.language_name_native} (${language.language_code})`
}

function readCatalogColumnDefinitionId(
  columnDefinition: ColumnDef<DcxAdminNewsletterCatalogRow, unknown>,
): string | null {
  const accessorKey =
    "accessorKey" in columnDefinition && typeof columnDefinition.accessorKey === "string"
      ? columnDefinition.accessorKey
      : null

  if (typeof columnDefinition.id === "string") {
    return columnDefinition.id
  }

  return accessorKey
}

function readCatalogColumnWidthClassName(columnId: string): string {
  if (columnId === "email_subject") {
    return "w-[30%]"
  }

  if (columnId === "email_key") {
    return "w-[25%]"
  }

  if (columnId === "language") {
    return "w-[18%]"
  }

  if (columnId === "updated_at_ts_ms") {
    return "w-[17%] whitespace-nowrap"
  }

  return ""
}

function readCatalogColumnToggleLabel(columnId: string): string {
  if (columnId === "email_subject") {
    return "Subject"
  }

  if (columnId === "email_key") {
    return "Key"
  }

  if (columnId === "language") {
    return "Language"
  }

  if (columnId === "updated_at_ts_ms") {
    return "Updated"
  }

  return columnId
}

function DcxAdminSortableHeader(props: {
  column: {
    getIsSorted: () => false | "asc" | "desc"
    toggleSorting: (desc?: boolean) => void
  }
  title: string
}) {
  const isSorted = props.column.getIsSorted()

  return (
    <button
      type="button"
      onClick={() => props.column.toggleSorting(isSorted === "asc")}
      className="inline-flex items-center gap-1 text-left"
    >
      <span>{props.title}</span>
      <span className="text-[0.8rem] text-slate-400">{isSorted ? (isSorted === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  )
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

function NewsletterContentComparisonCard(props: {
  eyebrow: string
  detail: DcxAdminNewsletterDetail | null
  draft?: { email_subject: string; email_body: string } | null
  editable?: boolean
  visualState?: DcxAdminEditableFieldVisualState
  onChangeDraft?: (patch: Partial<{ email_subject: string; email_body: string }>) => void
}) {
  return (
    <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
      <div className="mb-5 border-b border-black/6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {props.eyebrow}
        </p>
      </div>

      {props.detail ? (
        <div className="space-y-4">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Subject
            </span>
            {props.editable && props.draft && props.onChangeDraft ? (
              <input
                value={props.draft.email_subject}
                onChange={(event) =>
                  props.onChangeDraft?.({ email_subject: event.target.value })
                }
                className={[
                  "h-12 w-full border bg-slate-50 px-4 text-base outline-none",
                  readDcxAdminEditableFieldBorderClass(props.visualState ?? "idle"),
                ].join(" ")}
              />
            ) : (
              <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900">
                {props.detail.email_subject}
              </div>
            )}
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Body markdown
            </span>
            {props.editable && props.draft && props.onChangeDraft ? (
              <Textarea
                value={props.draft.email_body}
                onChange={(event) =>
                  props.onChangeDraft?.({ email_body: event.target.value })
                }
                rows={18}
                className={[
                  "min-h-[28rem] w-full resize-y rounded-none border bg-slate-50 px-4 py-4 font-mono text-sm leading-7 outline-none",
                  readDcxAdminEditableFieldBorderClass(props.visualState ?? "idle"),
                ].join(" ")}
              />
            ) : (
              <div className="min-h-[28rem] border border-slate-200 bg-slate-50 px-4 py-4 whitespace-pre-wrap text-sm leading-7 text-slate-900">
                {props.detail.email_body || "No body yet."}
              </div>
            )}
          </label>
        </div>
      ) : null}
    </article>
  )
}

function NewsletterMetadataCard(props: {
  eyebrow: string
  detail: DcxAdminNewsletterDetail | null
  adminTimezoneIanaName: string | null
}) {
  return (
    <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
      <div className="mb-5 border-b border-black/6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {props.eyebrow}
        </p>
      </div>

      {props.detail ? (
        <dl>
          <MetadataRow label="Email key" value={props.detail.email_key} />
          <MetadataRow
            label="Language"
            value={`${props.detail.language.language_name_native} (${props.detail.language.language_code})`}
          />
          <MetadataRow label="Email ID" value={String(props.detail.email_id)} />
          <MetadataRow label="Is original" value={props.detail.is_original ? "Yes" : "No"} />
          <MetadataRow
            label="Translation of ID"
            value={props.detail.translation_of_id === null ? "Not linked" : String(props.detail.translation_of_id)}
          />
          <MetadataRow
            label="Updated at"
            value={formatDcxAdminTimestampLabel(props.detail.updated_at_ts_ms, props.adminTimezoneIanaName)}
          />
        </dl>
      ) : null}
    </article>
  )
}

function NewsletterSendRecipientsSheet(props: {
  open: boolean
  selectedSend: DcxAdminNewsletterSendCatalogRow | null
  recipientsPayload: DcxAdminNewsletterSendRecipientsPayload | null
  recipientsLoading: boolean
  recipientsError: Error | null
  emailSearch: string
  onEmailSearchChange: (nextValue: string) => void
  onOpenChange: (isOpen: boolean) => void
  adminTimezoneIanaName: string | null
}) {
  const [recipientSorting, setRecipientSorting] = useState<SortingState>([])
  const recipientColumns = useMemo<ColumnDef<DcxAdminNewsletterSendRecipientRow, any>[]>(
    () => [
      newsletterRecipientColumnHelper.accessor("recipient_email", {
        header: "Email",
        cell: (cellContext) => (
          <span className="block truncate font-medium text-slate-950" title={cellContext.getValue()}>
            {cellContext.getValue()}
          </span>
        ),
      }),
      newsletterRecipientColumnHelper.accessor("user_role", {
        header: "Role",
        cell: (cellContext) => (
          <span className="capitalize text-slate-700">{cellContext.getValue() || "user"}</span>
        ),
      }),
      newsletterRecipientColumnHelper.accessor("preferred_language", {
        header: "Language",
        cell: (cellContext) => {
          const language = cellContext.getValue()
          return (
            <span className="text-slate-700">
              {language ? `${language.language_name_native} (${language.language_code})` : "-"}
            </span>
          )
        },
      }),
      newsletterRecipientColumnHelper.accessor("delivery_status", {
        header: "Status",
        cell: (cellContext) => (
          <span
            className={[
              "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
              readNewsletterRecipientStatusBadgeClass(cellContext.getValue()),
            ].join(" ")}
          >
            {cellContext.getValue()}
          </span>
        ),
      }),
      newsletterRecipientColumnHelper.accessor("sent_at_ts_ms", {
        header: "Sent",
        cell: (cellContext) => {
          const timestamp = cellContext.getValue()
          return (
            <span className="text-slate-700">
              {timestamp === null ? "-" : formatDcxAdminTimestampLabel(timestamp, props.adminTimezoneIanaName)}
            </span>
          )
        },
      }),
      newsletterRecipientColumnHelper.display({
        id: "outcome",
        header: "Outcome",
        cell: (cellContext) => {
          const row = cellContext.row.original
          const timestamp = readNewsletterRecipientOutcomeTimestamp(row)
          return (
            <div className="space-y-1">
              <p className="text-sm text-slate-900">{readNewsletterRecipientOutcomeLabel(row)}</p>
              <p className="text-xs text-slate-500">
                {timestamp === null ? "-" : formatDcxAdminTimestampLabel(timestamp, props.adminTimezoneIanaName)}
              </p>
            </div>
          )
        },
      }),
      newsletterRecipientColumnHelper.accessor("provider_message_id", {
        header: "Provider ID",
        cell: (cellContext) => (
          <span className="block truncate text-xs text-slate-500" title={cellContext.getValue() ?? ""}>
            {cellContext.getValue() ?? "-"}
          </span>
        ),
      }),
      newsletterRecipientColumnHelper.accessor("failure_reason", {
        header: "Failure",
        cell: (cellContext) => (
          <span className="block truncate text-xs text-rose-700" title={cellContext.getValue() ?? ""}>
            {cellContext.getValue() ?? "-"}
          </span>
        ),
      }),
    ],
    [props.adminTimezoneIanaName],
  )

  const summary = props.recipientsPayload?.summary
  const visibleLimit = props.recipientsPayload?.visible_rows_limit ?? 25
  const filteredCount = props.recipientsPayload?.filtered_recipient_count ?? 0
  const visibleCount = props.recipientsPayload?.recipients.length ?? 0
  const hasSearch = props.emailSearch.trim() !== ""

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="overflow-y-auto p-0 data-[side=right]:w-[96vw] data-[side=right]:max-w-[96vw] data-[side=right]:sm:max-w-[56rem]">
        <SheetHeader className="border-b border-black/6 px-6 py-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recipients</p>
          <SheetTitle>
            {props.selectedSend ? `Send ${props.selectedSend.email_send_id}` : "Newsletter send"}
          </SheetTitle>
          <SheetDescription>
            Recipient delivery snapshot for this newsletter send.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-6 py-6">
          {props.selectedSend ? (
            <div className="border border-black/6 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p>
                {readNewsletterSendTimestampSummary(props.selectedSend, props.adminTimezoneIanaName)}
              </p>
              <p className="mt-1">
                Audience: {readNewsletterSendAudienceScopeLabel(props.selectedSend.send_audience_scope)}
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <NewsletterSendRecipientSummaryCard label="Total" value={summary?.total_recipient_count ?? 0} />
            <NewsletterSendRecipientSummaryCard label="Delivered" value={summary?.delivered_recipient_count ?? 0} />
            <NewsletterSendRecipientSummaryCard label="Failed" value={summary?.failed_recipient_count ?? 0} />
            <NewsletterSendRecipientSummaryCard label="Bounced" value={summary?.bounced_recipient_count ?? 0} />
            <NewsletterSendRecipientSummaryCard label="Complaints" value={summary?.complained_recipient_count ?? 0} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full max-w-md space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Search email
              </label>
              <Input
                value={props.emailSearch}
                onChange={(event) => props.onEmailSearchChange(event.target.value)}
                placeholder="Search recipient email..."
                className="h-10 rounded-md"
              />
            </div>
            <p className="text-sm text-slate-500">
              {hasSearch
                ? `Showing ${visibleCount} of ${filteredCount} matching recipients`
                : `Showing first ${Math.min(visibleCount, visibleLimit)} of ${summary?.total_recipient_count ?? 0} recipients`}
            </p>
          </div>

          {props.recipientsLoading ? (
            <p className="text-sm text-slate-500">Loading recipient rows...</p>
          ) : null}
          {props.recipientsError ? (
            <p className="text-sm text-red-600">
              {(props.recipientsError as Error & { suggested_action?: string }).suggested_action ??
                props.recipientsError.message}
            </p>
          ) : null}

          <div className="overflow-hidden border border-black/6 bg-white">
            <DcxAdminDataTable
              columns={recipientColumns}
              data={props.recipientsPayload?.recipients ?? []}
              emptyLabel={hasSearch ? "No recipient emails match that search." : "No recipient rows found for this send."}
              readColumnWidthClassName={readDcxAdminNewsletterRecipientColumnWidthClassName}
              sorting={recipientSorting}
              onSortingChange={setRecipientSorting}
              pageSize={25}
              hidePaginationFooter
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function NewsletterSendRecipientSummaryCard(props: { label: string; value: number }) {
  return (
    <div className="border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{props.value}</p>
    </div>
  )
}

function NewsletterSendRow(props: {
  row: DcxAdminNewsletterSendCatalogRow
  adminTimezoneIanaName: string | null
  onCancel: () => void
  cancelDisabled: boolean
  onOpenRecipients: () => void
}) {
  const awaitingProviderCount =
    props.row.pending_recipient_count + props.row.sending_recipient_count
  const hasOperationalIssues =
    props.row.failed_recipient_count > 0 ||
    props.row.bounced_recipient_count > 0 ||
    props.row.complained_recipient_count > 0 ||
    props.row.blocked_missing_translation_count > 0

  return (
    <div className="border border-black/6 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-950">
            {readNewsletterSendHeading(props.row.send_status)}
          </p>
          <p className="text-xs text-slate-500">
            {readNewsletterSendTimestampSummary(props.row, props.adminTimezoneIanaName)}
          </p>
        </div>
        <div
          className={[
            "rounded-full border px-3 py-1 text-xs font-medium",
            readNewsletterSendStatusBadgeClass(props.row.send_status),
          ].join(" ")}
        >
          {props.row.send_status}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-5">
        <p>{props.row.total_recipient_count} recipients</p>
        <p>{props.row.send_candidate_count} send candidates</p>
        <p>{props.row.tracked_link_count} tracked links</p>
        <p>{props.row.total_click_count} clicks</p>
        <p>{props.row.unique_clicked_link_count} clicked links</p>
      </div>

      <div className="mt-3">
        <p className="text-sm text-slate-600">
          Audience: {readNewsletterSendAudienceScopeLabel(props.row.send_audience_scope)}
        </p>
      </div>

      <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-5">
        <p>{awaitingProviderCount} awaiting provider</p>
        <p>{props.row.sent_recipient_count} accepted by provider</p>
        <p>{props.row.delivered_recipient_count} delivered</p>
        <p>{props.row.skipped_recipient_count} skipped</p>
        <p>{props.row.failed_recipient_count} failed</p>
      </div>

      {hasOperationalIssues ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
          {props.row.bounced_recipient_count > 0 ? (
            <span className="border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
              {props.row.bounced_recipient_count} bounced
            </span>
          ) : null}
          {props.row.complained_recipient_count > 0 ? (
            <span className="border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">
              {props.row.complained_recipient_count} complained
            </span>
          ) : null}
          {props.row.blocked_missing_translation_count > 0 ? (
            <span className="border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
              {props.row.blocked_missing_translation_count} waiting translation
            </span>
          ) : null}
          {props.row.cancelled_recipient_count > 0 ? (
            <span className="border border-slate-200 bg-slate-100 px-3 py-1 text-slate-700">
              {props.row.cancelled_recipient_count} recipient rows cancelled
            </span>
          ) : null}
        </div>
      ) : null}

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
      <Button
        type="button"
        variant="outline"
        className="mt-4 h-10 rounded-full px-4"
        onClick={props.onOpenRecipients}
      >
        Recipients
      </Button>
    </div>
  )
}

export function DcxAdminNewslettersPage(props: Props) {
  const queryClient = useQueryClient()
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const preserveSavedVisualStateRef = useRef(false)
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
  const currentDetailData = detailQuery.data?.data ?? null
  const originalTranslationRow =
    currentDetailData?.translation_summary.existing_translations.find((translation) => translation.is_original) ??
    null
  const originalNewsletterDetailQuery = useQuery({
    queryKey: [
      "dcx_admin_newsletter_detail_original",
      originalTranslationRow?.language.language_code,
      originalTranslationRow?.email_key,
    ],
    queryFn: async () =>
      readDcxAdminNewsletterDetail({
        apiBaseUrl: props.apiBaseUrl,
        emailKey: originalTranslationRow?.email_key ?? "",
        languageCode: originalTranslationRow?.language.language_code ?? "en",
      }),
    enabled: Boolean(currentDetailData && !currentDetailData.is_original && originalTranslationRow),
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
  const [selectedRecipientSend, setSelectedRecipientSend] =
    useState<DcxAdminNewsletterSendCatalogRow | null>(null)
  const [recipientEmailSearch, setRecipientEmailSearch] = useState("")
  const recipientsQuery = useQuery({
    queryKey: [
      "dcx_admin_newsletter_send_recipients",
      selectedRecipientSend?.email_send_id,
      recipientEmailSearch,
    ],
    queryFn: async () =>
      readDcxAdminNewsletterSendRecipients({
        apiBaseUrl: props.apiBaseUrl,
        emailSendId: selectedRecipientSend?.email_send_id ?? 0,
        emailSearch: recipientEmailSearch,
      }),
    enabled: selectedRecipientSend !== null,
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
    mutationFn: async (params: {
      scheduledSendAtTsMs: number | null
      sendAudienceScope: DcxAdminNewsletterSendAudienceScope
    }) =>
      prepareDcxAdminNewsletterSend({
        apiBaseUrl: props.apiBaseUrl,
        emailKey: props.routeEmailKey ?? "",
        languageCode: props.routeLanguageCode ?? "en",
        scheduledSendAtTsMs: params.scheduledSendAtTsMs,
        sendAudienceScope: params.sendAudienceScope,
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
  const detail = currentDetailData
  const originalDetail =
    detail?.is_original ? detail : originalNewsletterDetailQuery.data?.data ?? null
  const preparedSends = sendsCatalogQuery.data?.data.newsletter_sends ?? []
  const [newNewsletterSubject, setNewNewsletterSubject] = useState("")
  const [editorDraft, setEditorDraft] = useState<{ email_subject: string; email_body: string } | null>(
    null,
  )
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("")
  const [visualState, setVisualState] = useState<DcxAdminEditableFieldVisualState>("idle")
  const [nextAutosaveAtTsMs, setNextAutosaveAtTsMs] = useState<number | null>(null)
  const [autosaveCountdownSeconds, setAutosaveCountdownSeconds] = useState<number | null>(null)
  const [scheduledSendDate, setScheduledSendDate] = useState<Date | undefined>(undefined)
  const [scheduledSendTime, setScheduledSendTime] = useState("")
  const [sendAudienceScope, setSendAudienceScope] =
    useState<DcxAdminNewsletterSendAudienceScope>("all")
  const [sendStatusText, setSendStatusText] = useState(
    "Prepare one send now or schedule it for later. Once dispatch runs, this section will update with delivery outcomes and click activity.",
  )
  const [catalogFilterQuery, setCatalogFilterQuery] = useState("")
  const [catalogSorting, setCatalogSorting] = useState<SortingState>([
    { id: "updated_at_ts_ms", desc: true },
  ])
  const [catalogVisibility, setCatalogVisibility] = useState<VisibilityState>({})

  useEffect(() => {
    if (!detail) {
      setEditorDraft(null)
      setLastSavedSnapshot("")
      setNextAutosaveAtTsMs(null)
      setAutosaveCountdownSeconds(null)
      setVisualState("idle")
      return
    }

    const nextDraft = {
      email_subject: detail.email_subject,
      email_body: detail.email_body,
    }
    setEditorDraft(nextDraft)
    setLastSavedSnapshot(buildDetailSnapshot(detail))
    setNextAutosaveAtTsMs(null)
    setAutosaveCountdownSeconds(null)
    if (preserveSavedVisualStateRef.current) {
      preserveSavedVisualStateRef.current = false
    } else {
      setVisualState("idle")
    }
  }, [detail?.email_id, detail?.updated_at_ts_ms])

  useEffect(() => {
    if (!detail) {
      return
    }

    const defaultScheduledSendAtTsMs = Date.now() + 60 * 60 * 1000
    setScheduledSendDate(buildDcxAdminCalendarDateFromTimestamp(defaultScheduledSendAtTsMs, props.adminTimezoneIanaName))
    setScheduledSendTime(buildDcxAdminTimeInputValueFromTimestamp(defaultScheduledSendAtTsMs, props.adminTimezoneIanaName))
    if ((detail.language_readiness.total_blocked_missing_translation_count ?? 0) > 0) {
      setSendStatusText(
        `This newsletter still needs translations before sending. ${detail.language_readiness.total_blocked_missing_translation_count} eligible recipients are currently blocked by missing language coverage.`,
      )
      return
    }

    setSendStatusText(
      "Prepare one send now or schedule it for later. Once dispatch runs, this section will update with delivery outcomes and click activity.",
    )
  }, [detail?.email_id, props.adminTimezoneIanaName])

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
      if (resetStateTimeoutRef.current) {
        clearTimeout(resetStateTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!nextAutosaveAtTsMs) {
      setAutosaveCountdownSeconds(null)
      return
    }

    const updateCountdown = () => {
      const secondsRemaining = Math.max(0, Math.ceil((nextAutosaveAtTsMs - Date.now()) / 1000))
      setAutosaveCountdownSeconds(secondsRemaining)
    }

    updateCountdown()
    const intervalId = window.setInterval(updateCountdown, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [nextAutosaveAtTsMs])

  const catalogRows = useMemo(
    () => newsletters.filter((newsletter) => newsletter.is_original),
    [newsletters],
  )

  const filteredNewsletters = useMemo(() => {
    const normalizedFilterQuery = catalogFilterQuery.trim().toLowerCase()

    if (normalizedFilterQuery === "") {
      return catalogRows
    }

    return catalogRows.filter((newsletter) => {
      const subject = newsletter.email_subject.toLowerCase()
      const key = newsletter.email_key.toLowerCase()
      const language = renderLanguageLabel(newsletter.language).toLowerCase()

      return (
        subject.includes(normalizedFilterQuery) ||
        key.includes(normalizedFilterQuery) ||
        language.includes(normalizedFilterQuery)
      )
    })
  }, [catalogFilterQuery, catalogRows])

  const draftSnapshot = editorDraft ? buildDraftSnapshot(editorDraft) : ""
  const isDirty = detail !== null && editorDraft !== null && draftSnapshot !== lastSavedSnapshot
  const isAnyWritePending =
    createDraftMutation.isPending || saveMutation.isPending || createTranslationMutation.isPending
  const scheduledSendAtTsMs = readDcxAdminTimestampFromCalendarDateAndTime(
    scheduledSendDate,
    scheduledSendTime,
    props.adminTimezoneIanaName,
  )
  const isSendMutationPending = prepareSendMutation.isPending || cancelSendMutation.isPending
  const hasMissingNewsletterLanguagesForEligibleUsers =
    (detail?.language_readiness.total_blocked_missing_translation_count ?? 0) > 0
  const canPrepareSend =
    detail !== null &&
    !isDirty &&
    !isAnyWritePending &&
    !isSendMutationPending &&
    !hasMissingNewsletterLanguagesForEligibleUsers
  const isCatalogRoute = !props.routeEmailKey || !props.routeLanguageCode

  const catalogColumns = useMemo<ColumnDef<DcxAdminNewsletterCatalogRow, any>[]>(
    () => [
      newsletterColumnHelper.accessor("email_subject", {
        id: "email_subject",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Subject" />,
        cell: ({ row }) => (
          <span className="block truncate text-sm font-semibold text-slate-950" title={row.original.email_subject}>
            {row.original.email_subject}
          </span>
        ),
      }),
      newsletterColumnHelper.accessor("email_key", {
        id: "email_key",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Key" />,
        cell: ({ row }) => (
          <span className="block truncate font-mono text-xs text-slate-600" title={row.original.email_key}>
            {row.original.email_key}
          </span>
        ),
      }),
      newsletterColumnHelper.accessor("language", {
        id: "language",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Language" />,
        cell: ({ row }) => <span className="text-sm text-slate-900">{renderLanguageLabel(row.original.language)}</span>,
        sortingFn: (left, right) =>
          renderLanguageLabel(left.original.language).localeCompare(renderLanguageLabel(right.original.language)),
      }),
      newsletterColumnHelper.accessor("updated_at_ts_ms", {
        id: "updated_at_ts_ms",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Updated" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-slate-900">
            {formatDcxAdminTimestampLabel(row.original.updated_at_ts_ms, props.adminTimezoneIanaName)}
          </span>
        ),
      }),
    ],
    [props.adminTimezoneIanaName],
  )

  async function persistCurrentDraft(): Promise<void> {
    if (!detail || !editorDraft || !isDirty) {
      return
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
      autosaveTimeoutRef.current = null
    }
    setNextAutosaveAtTsMs(null)
    setAutosaveCountdownSeconds(null)

    setVisualState("saving")
    try {
      const savedSnapshot = buildDraftSnapshot(editorDraft)
      await saveMutation.mutateAsync({
        emailId: detail.email_id,
        emailSubject: editorDraft.email_subject,
        emailBody: editorDraft.email_body,
      })
      preserveSavedVisualStateRef.current = true
      setLastSavedSnapshot(savedSnapshot)
      setVisualState("saved")
      if (resetStateTimeoutRef.current) {
        clearTimeout(resetStateTimeoutRef.current)
      }
      resetStateTimeoutRef.current = setTimeout(() => {
        setVisualState("idle")
      }, DCX_ADMIN_EDITABLE_FIELD_SAVED_VISIBLE_MS)
    } catch {
      setNextAutosaveAtTsMs(null)
      setAutosaveCountdownSeconds(null)
      setVisualState("error")
    }
  }

  useEffect(() => {
    if (!detail || !editorDraft || !isDirty || isAnyWritePending) {
      setNextAutosaveAtTsMs(null)
      setAutosaveCountdownSeconds(null)
      return
    }

    setVisualState("editing")

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }

    const nextAutosaveTsMs = Date.now() + 30000
    setNextAutosaveAtTsMs(nextAutosaveTsMs)
    setAutosaveCountdownSeconds(30)
    autosaveTimeoutRef.current = setTimeout(() => {
      void persistCurrentDraft()
    }, 30000)
  }, [detail, editorDraft, isDirty, isAnyWritePending])

  async function handlePrepareSendNow() {
    try {
      const payload = await prepareSendMutation.mutateAsync({
        scheduledSendAtTsMs: null,
        sendAudienceScope,
      })
      setSendStatusText(
        `Prepared one newsletter send for ${readNewsletterSendAudienceScopeLabel(payload.data.send_audience_scope).toLowerCase()} at ${formatDcxAdminTimestampLabel(payload.data.scheduled_send_at_ts_ms, props.adminTimezoneIanaName)}. The worker will pick it up and update this section as provider events arrive.`,
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
        sendAudienceScope,
      })
      setSendStatusText(
        `Prepared one scheduled newsletter send for ${readNewsletterSendAudienceScopeLabel(payload.data.send_audience_scope).toLowerCase()} at ${formatDcxAdminTimestampLabel(payload.data.scheduled_send_at_ts_ms, props.adminTimezoneIanaName)}. Delivery outcomes will appear here after dispatch starts.`,
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
      setSendStatusText(`Prepared send ${payload.data.email_send_id} is now ${payload.data.send_status}.`)
    } catch (error) {
      setSendStatusText(
        (error as Error & { suggested_action?: string }).suggested_action ??
          "We could not cancel that prepared send just now.",
      )
    }
  }

  const catalogContent = (
    <section className="space-y-6">
      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-5 space-y-2 border-b border-black/6 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Content</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Newsletters</h2>
          <p className="text-sm leading-6 text-slate-600">
            Create newsletter drafts, browse the catalog in one place, then open a dedicated editor route for each newsletter.
          </p>
        </div>

        <div className="space-y-3 border border-black/6 bg-slate-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">New newsletter</p>
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
            {catalogRows.length} live rows
          </div>
        </div>

        {catalogQuery.isLoading ? <p className="text-sm text-slate-500">Loading newsletters...</p> : null}
        {catalogQuery.isError ? (
          <p className="text-sm text-red-600">
            {(catalogQuery.error as Error & { suggested_action?: string }).suggested_action ??
              (catalogQuery.error as Error).message}
          </p>
        ) : null}

        {!catalogQuery.isLoading && !catalogQuery.isError ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 border-b border-black/6 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <Input
                value={catalogFilterQuery}
                onChange={(event) => setCatalogFilterQuery(event.target.value)}
                placeholder="Filter newsletters..."
                className="w-full lg:max-w-sm"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="rounded-none">
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {catalogColumns
                    .map((columnDefinition) => ({
                      columnId: readCatalogColumnDefinitionId(columnDefinition),
                      columnDefinition,
                    }))
                    .filter(
                      (
                        candidate,
                      ): candidate is {
                        columnId: string
                        columnDefinition: ColumnDef<DcxAdminNewsletterCatalogRow, unknown>
                      } => candidate.columnId !== null,
                    )
                    .map(({ columnId }) => (
                      <DropdownMenuCheckboxItem
                        key={columnId}
                        checked={catalogVisibility[columnId] !== false}
                        onCheckedChange={(checked) => {
                          setCatalogVisibility((currentVisibility) => ({
                            ...currentVisibility,
                            [columnId]: Boolean(checked),
                          }))
                        }}
                      >
                        {readCatalogColumnToggleLabel(columnId)}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <DcxAdminDataTable
              columns={catalogColumns}
              data={filteredNewsletters}
              emptyLabel="No newsletters exist yet."
              sorting={catalogSorting}
              onSortingChange={setCatalogSorting}
              columnVisibility={catalogVisibility}
              onColumnVisibilityChange={setCatalogVisibility}
              readColumnWidthClassName={readCatalogColumnWidthClassName}
              onRowClick={(newsletter) =>
                props.onOpenNewsletter({
                  emailKey: newsletter.email_key,
                  languageCode: newsletter.language.language_code,
                })
              }
              readRowClassName={(newsletter) =>
                newsletter.email_key === props.routeEmailKey ? "bg-slate-50" : ""
              }
            />
          </div>
        ) : null}
      </article>
    </section>
  )

  const editorContent = (
    <section className="space-y-6">
      <Button type="button" variant="outline" className="w-fit" onClick={props.onReturnToCatalog}>
        Back to newsletters
      </Button>

      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Editor</p>
            {detail ? (
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                {(originalDetail?.email_subject ?? detail.email_subject) || detail.email_key}
              </h3>
            ) : (
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">Select a newsletter</h3>
            )}
          </div>
          {detail ? (
            <div className="flex min-w-[24rem] flex-col items-end gap-3">
              <div className="flex flex-wrap items-center justify-end gap-3">
                {detail &&
                !(visualState === "editing" && autosaveCountdownSeconds !== null && !isAnyWritePending) ? (
                  <p className={["text-xs font-medium", readDcxAdminEditableFieldStatusTextClass(visualState)].join(" ")}>
                    {visualState === "saving"
                      ? "Saving..."
                      : readDcxAdminEditableFieldCompactStatusLabel(visualState)}
                  </p>
                ) : null}
                {detail && isDirty && autosaveCountdownSeconds !== null && !isAnyWritePending ? (
                  <p className="text-xs font-medium text-amber-600">
                    Autosave in ... {autosaveCountdownSeconds}s
                  </p>
                ) : null}
                <ButtonGroup>
                  <Button
                    type="button"
                    onClick={() => void persistCurrentDraft()}
                    disabled={!isDirty || isAnyWritePending}
                    variant="outline"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save newsletter"}
                  </Button>
                </ButtonGroup>
              </div>
              <div className="w-full max-w-[32rem]">
                <DcxAdminUnifiedTranslationLanguageSelector
                  existingLanguageRows={detail.translation_summary.existing_translations.map((translation) => ({
                    language_code: translation.language.language_code,
                    language_name_native: translation.language.language_name_native,
                    is_original: translation.is_original,
                  }))}
                  selectedLanguageCode={detail.language.language_code}
                  onSelectExistingLanguage={(languageCode) => {
                    const matchingTranslation = detail.translation_summary.existing_translations.find(
                      (translation) => translation.language.language_code === languageCode,
                    )
                    if (!matchingTranslation) {
                      return
                    }
                    props.onOpenNewsletter({
                      emailKey: matchingTranslation.email_key,
                      languageCode,
                    })
                  }}
                  missingLanguages={detail.translation_summary.missing_languages}
                  onCreateMissingLanguage={(languageCode) =>
                    createTranslationMutation.mutate({
                      targetLanguageCode: languageCode,
                    })
                  }
                  isCreatePending={createTranslationMutation.isPending}
                />
              </div>
            </div>
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
            {detail && !detail.is_original && originalNewsletterDetailQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading original newsletter reference...</p>
            ) : null}

            {detail.is_original ? (
              <>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Subject</span>
                  <input
                    value={editorDraft.email_subject}
                    onChange={(event) => setEditorDraft({ ...editorDraft, email_subject: event.target.value })}
                    className={[
                      "h-12 w-full border bg-slate-50 px-4 text-base outline-none",
                      readDcxAdminEditableFieldBorderClass(visualState),
                    ].join(" ")}
                  />
                </label>

                <div className="grid gap-4 xl:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Body markdown</span>
                    <Textarea
                      value={editorDraft.email_body}
                      onChange={(event) => setEditorDraft({ ...editorDraft, email_body: event.target.value })}
                      rows={18}
                      className={[
                        "min-h-[28rem] w-full resize-y rounded-none border bg-slate-50 px-4 py-4 font-mono text-sm leading-7 outline-none",
                        readDcxAdminEditableFieldBorderClass(visualState),
                      ].join(" ")}
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

                <NewsletterMetadataCard
                  eyebrow="Template metadata"
                  detail={detail}
                  adminTimezoneIanaName={props.adminTimezoneIanaName}
                />
              </>
            ) : (
              <>
                <div className="grid gap-6 xl:grid-cols-2">
                  <NewsletterContentComparisonCard eyebrow="Original" detail={originalDetail} />
                  <NewsletterContentComparisonCard
                    eyebrow="Selected language"
                    detail={detail}
                    draft={editorDraft}
                    editable
                    visualState={visualState}
                    onChangeDraft={(patch) =>
                      setEditorDraft((currentDraft) =>
                        currentDraft ? { ...currentDraft, ...patch } : currentDraft,
                      )
                    }
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <NewsletterMetadataCard
                    eyebrow="Original metadata"
                    detail={originalDetail}
                    adminTimezoneIanaName={props.adminTimezoneIanaName}
                  />
                  <NewsletterMetadataCard
                    eyebrow="Selected metadata"
                    detail={detail}
                    adminTimezoneIanaName={props.adminTimezoneIanaName}
                  />
                </div>
              </>
            )}

            {detail.translation_summary.missing_languages.length === 0 ? (
              <p className="text-sm text-emerald-700">
                This newsletter already has live rows in every currently supported language.
              </p>
            ) : null}

            {createTranslationMutation.isError ? (
              <p className="text-sm text-red-600">
                {(createTranslationMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (createTranslationMutation.error as Error).message}
              </p>
            ) : null}

            <section className="space-y-4 border border-black/6 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Send operations</p>
                  <h4 className="text-lg font-semibold tracking-tight text-slate-950">Prepare and review newsletter sends</h4>
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  {sendsCatalogQuery.data?.data.total_send_count ?? 0} send rows
                </div>
              </div>

              <p className="text-sm leading-6 text-slate-600">{sendStatusText}</p>

              <div className="border border-black/6 bg-white px-4 py-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Language readiness</p>
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
                        {row.has_live_translation ? "translation ready" : `${row.blocked_missing_translation_count} blocked`}
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

              <div className="grid items-center gap-3 md:grid-cols-[12rem_minmax(0,1fr)_11rem_auto]">
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Audience</span>
                  <Select
                    value={sendAudienceScope}
                    onValueChange={(value) =>
                      setSendAudienceScope(value as DcxAdminNewsletterSendAudienceScope)
                    }
                  >
                    <SelectTrigger className="h-11 w-full bg-white px-3 text-sm">
                      <SelectValue placeholder="Choose audience" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="all">All eligible users</SelectItem>
                      <SelectItem value="admins">Admins only</SelectItem>
                      <SelectItem value="devs">Devs only</SelectItem>
                      <SelectItem value="shareholders">Shareholders</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 justify-between px-4 text-sm font-normal"
                    >
                      <span>{formatDcxAdminCalendarDateLabel(scheduledSendDate)}</span>
                      <CalendarDaysIcon className="size-4 text-slate-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledSendDate}
                      onSelect={setScheduledSendDate}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  step={60}
                  value={scheduledSendTime}
                  onChange={(event) => setScheduledSendTime(event.target.value)}
                  className="h-11 rounded-none border-slate-200 bg-white px-4 text-sm text-slate-900"
                />
                <ButtonGroup className="justify-self-start">
                  <Button
                    type="button"
                    onClick={handlePrepareSendNow}
                    disabled={!canPrepareSend}
                    className="h-11"
                  >
                    {prepareSendMutation.isPending ? "Preparing..." : "Prepare send now"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePrepareScheduledSend}
                    disabled={!canPrepareSend || scheduledSendAtTsMs === null}
                    variant="outline"
                    className="h-11"
                  >
                    Prepare scheduled send
                  </Button>
                </ButtonGroup>
              </div>

              {sendsCatalogQuery.isLoading ? <p className="text-sm text-slate-500">Loading newsletter send rows...</p> : null}
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
                    adminTimezoneIanaName={props.adminTimezoneIanaName}
                    onCancel={() => handleCancelPreparedSend(preparedSend.email_send_id)}
                    cancelDisabled={isSendMutationPending}
                    onOpenRecipients={() => {
                      setRecipientEmailSearch("")
                      setSelectedRecipientSend(preparedSend)
                    }}
                  />
                ))}
                {preparedSends.length === 0 && !sendsCatalogQuery.isLoading ? (
                  <p className="text-sm text-slate-500">No send rows exist for this newsletter yet.</p>
                ) : null}
              </div>
            </section>
            <NewsletterSendRecipientsSheet
              open={selectedRecipientSend !== null}
              selectedSend={selectedRecipientSend}
              recipientsPayload={recipientsQuery.data?.data ?? null}
              recipientsLoading={recipientsQuery.isLoading}
              recipientsError={recipientsQuery.error as Error | null}
              emailSearch={recipientEmailSearch}
              onEmailSearchChange={setRecipientEmailSearch}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setSelectedRecipientSend(null)
                  setRecipientEmailSearch("")
                }
              }}
              adminTimezoneIanaName={props.adminTimezoneIanaName}
            />
          </div>
        ) : null}
      </article>
    </section>
  )

  if (isCatalogRoute) {
    return catalogContent
  }

  return editorContent
}
