/**
 * CONTEXT:
 * This file creates one admin email-sequence draft via the backend.
 *
 * CODE:
 */
type SuccessResponse = {
  ok: true
  data: {
    sequence_id: number
    sequence_key: string
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

export async function createDcxAdminEmailSequenceDraft(params: {
  apiBaseUrl: string
  sequenceName: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/content/emails/sequences/create-draft", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sequence_name: params.sequenceName,
    }),
  })
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_EMAIL_SEQUENCE_DRAFT_CREATE_FAILED",
            message: "We could not create that email sequence.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
