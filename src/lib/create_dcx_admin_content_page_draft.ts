/**
 * CONTEXT:
 * This file creates one new admin content-page draft via the backend.
 * It exists so the pages list can start one new immutable page identity before the editor autosaves it.
 *
 * CODE:
 */
type SuccessResponse = {
  ok: true
  data: {
    page_id: number
    page_key: string
    page_slug: string
    language_code: string
    publication_status: string
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

export async function createDcxAdminContentPageDraft(params: {
  apiBaseUrl: string
  categoryKey: string
  pageTitle: string
  languageCode: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/content/pages/create-draft", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category_key: params.categoryKey,
      page_title: params.pageTitle,
      language_code: params.languageCode,
    }),
  })

  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_CONTENT_PAGE_DRAFT_CREATE_FAILED",
            message: "We could not create that DCX content page draft.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & {
      code?: string
      suggested_action?: string
    }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
