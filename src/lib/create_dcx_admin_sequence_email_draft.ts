/**
 * CONTEXT:
 * This file creates one new admin sequence-email draft via the backend.
 *
 * CODE:
 */
type SuccessResponse = {
  ok: true
  data: {
    email_id: number
    email_key: string
    language_code: string
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

export async function createDcxAdminSequenceEmailDraft(params: {
  apiBaseUrl: string
  emailSubject: string
  languageCode: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/content/emails/sequence/create-draft", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email_subject: params.emailSubject,
      language_code: params.languageCode,
    }),
  })
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_SEQUENCE_EMAIL_DRAFT_CREATE_FAILED",
            message: "We could not create that DCX sequence email draft.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
