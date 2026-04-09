/**
 * CONTEXT:
 * This file creates one first translation row for an existing admin newsletter.
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

export async function createDcxAdminNewsletterTranslation(params: {
  apiBaseUrl: string
  emailKey: string
  sourceLanguageCode: string
  targetLanguageCode: string
}): Promise<SuccessResponse> {
  const response = await fetch(
    new URL(
      `/admin/content/newsletters/${encodeURIComponent(params.sourceLanguageCode)}/${encodeURIComponent(params.emailKey)}/translations/${encodeURIComponent(params.targetLanguageCode)}/create`,
      params.apiBaseUrl,
    ),
    { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } },
  )
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_NEWSLETTER_TRANSLATION_CREATE_FAILED",
            message: "We could not create that DCX newsletter translation.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
