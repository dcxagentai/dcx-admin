/**
 * CONTEXT:
 * This file reads the prepared-send catalog for one newsletter from the admin backend.
 *
 * CODE:
 */
export type DcxAdminNewsletterSendCatalogRow = {
  email_send_id: number
  source_email_id: number
  email_key: string
  send_status: string
  send_audience_type: string
  send_audience_scope: "all" | "admins" | "devs" | "shareholders"
  scheduled_send_at_ts_ms: number
  send_started_at_ts_ms: number | null
  send_completed_at_ts_ms: number | null
  cancelled_at_ts_ms: number | null
  created_at_ts_ms: number
  updated_at_ts_ms: number
  language_code: string
  total_recipient_count: number
  send_candidate_count: number
  skipped_recipient_count: number
  blocked_missing_translation_count: number
  pending_recipient_count: number
  sending_recipient_count: number
  sent_recipient_count: number
  delivered_recipient_count: number
  failed_recipient_count: number
  bounced_recipient_count: number
  complained_recipient_count: number
  cancelled_recipient_count: number
  tracked_link_count: number
  total_click_count: number
  unique_clicked_link_count: number
}

type SuccessResponse = {
  ok: true
  data: {
    newsletter_sends: DcxAdminNewsletterSendCatalogRow[]
    total_send_count: number
  }
}

type ErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAdminNewsletterSendsCatalog(params: {
  apiBaseUrl: string
  emailKey: string
  languageCode: string
}): Promise<SuccessResponse> {
  const response = await fetch(
    new URL(
      `/admin/content/newsletters/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.emailKey)}/sends`,
      params.apiBaseUrl,
    ),
    { method: "GET", credentials: "include" },
  )
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_NEWSLETTER_SENDS_CATALOG_READ_FAILED",
            message: "We could not load the newsletter send rows.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
