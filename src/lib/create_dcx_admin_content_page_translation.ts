/**
 * CONTEXT:
 * This file creates one first translation row for an existing admin content page.
 *
 * CODE:
 */
type SuccessResponse = {
  ok: true
  data: {
    page_id: number
    page_key: string
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

export async function createDcxAdminContentPageTranslation(params: {
  apiBaseUrl: string
  pageKey: string
  sourceLanguageCode: string
  targetLanguageCode: string
}): Promise<SuccessResponse> {
  const response = await fetch(
    new URL(
      `/admin/content/pages/${encodeURIComponent(params.sourceLanguageCode)}/${encodeURIComponent(params.pageKey)}/translations/${encodeURIComponent(params.targetLanguageCode)}/create`,
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
            code: "DCX_ADMIN_CONTENT_PAGE_TRANSLATION_CREATE_FAILED",
            message: "We could not create that DCX page translation.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
