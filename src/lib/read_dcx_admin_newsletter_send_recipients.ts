/**
 * CONTEXT:
 * This file reads one newsletter send's recipient delivery snapshot from the admin backend.
 *
 * CODE:
 */
export type DcxAdminNewsletterSendRecipientRow = {
  email_send_recipient_id: number
  user_id: number
  recipient_email: string
  user_role: string
  delivery_decision: string
  delivery_status: string
  provider_message_id: string | null
  sent_at_ts_ms: number | null
  delivered_at_ts_ms: number | null
  bounced_at_ts_ms: number | null
  complained_at_ts_ms: number | null
  failed_at_ts_ms: number | null
  failure_reason: string | null
  last_provider_event_at_ts_ms: number | null
  last_provider_event_type: string | null
  preferred_language: {
    language_code: string
    language_name: string
    language_name_native: string
  } | null
}

export type DcxAdminNewsletterSendRecipientsSummary = {
  total_recipient_count: number
  pending_recipient_count: number
  sending_recipient_count: number
  sent_recipient_count: number
  delivered_recipient_count: number
  failed_recipient_count: number
  bounced_recipient_count: number
  complained_recipient_count: number
  cancelled_recipient_count: number
  skipped_recipient_count: number
}

export type DcxAdminNewsletterSendRecipientsPayload = {
  email_send_id: number
  email_search: string
  visible_rows_limit: number
  filtered_recipient_count: number
  summary: DcxAdminNewsletterSendRecipientsSummary
  recipients: DcxAdminNewsletterSendRecipientRow[]
}

type SuccessResponse = {
  ok: true
  data: DcxAdminNewsletterSendRecipientsPayload
}

type ErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAdminNewsletterSendRecipients(params: {
  apiBaseUrl: string
  emailSendId: number
  emailSearch: string
}): Promise<SuccessResponse> {
  const url = new URL(
    `/admin/content/newsletters/sends/${encodeURIComponent(String(params.emailSendId))}/recipients`,
    params.apiBaseUrl,
  )
  if (params.emailSearch.trim() !== "") {
    url.searchParams.set("email_search", params.emailSearch.trim())
  }

  const response = await fetch(url, { credentials: "include" })
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_NEWSLETTER_SEND_RECIPIENTS_READ_FAILED",
            message: "We could not load the newsletter recipient rows.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
