/**
 * CONTEXT:
 * This file prepares one newsletter send via the admin backend.
 *
 * CODE:
 */
type SuccessResponse = {
  ok: true
  data: {
    email_send_id: number
    email_key: string
    send_status: string
    scheduled_send_at_ts_ms: number
    send_audience_scope: "all" | "admins" | "devs"
    summary: {
      send_audience_scope: "all" | "admins" | "devs"
      prepared_recipient_count: number
      send_candidate_count: number
      skipped_recipient_count: number
      tracked_link_count: number
    }
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

export async function prepareDcxAdminNewsletterSend(params: {
  apiBaseUrl: string
  emailKey: string
  languageCode: string
  scheduledSendAtTsMs: number | null
  sendAudienceScope: "all" | "admins" | "devs"
}): Promise<SuccessResponse> {
  const response = await fetch(
    new URL(
      `/admin/content/newsletters/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.emailKey)}/sends/prepare`,
      params.apiBaseUrl,
    ),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduled_send_at_ts_ms: params.scheduledSendAtTsMs,
        send_audience_scope: params.sendAudienceScope,
      }),
    },
  )
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_NEWSLETTER_SEND_PREPARE_FAILED",
            message: "We could not prepare that newsletter send.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
