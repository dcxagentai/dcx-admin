/**
 * CONTEXT:
 * This file cancels one prepared newsletter send via the admin backend.
 *
 * CODE:
 */
type SuccessResponse = {
  ok: true
  data: {
    email_send_id: number
    send_status: string
    cancelled_at_ts_ms: number
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

export async function cancelDcxAdminNewsletterSend(params: {
  apiBaseUrl: string
  emailSendId: number
}): Promise<SuccessResponse> {
  const response = await fetch(
    new URL(`/admin/content/newsletters/sends/${params.emailSendId}/cancel`, params.apiBaseUrl),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  )
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_NEWSLETTER_SEND_CANCEL_FAILED",
            message: "We could not cancel that prepared newsletter send.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
