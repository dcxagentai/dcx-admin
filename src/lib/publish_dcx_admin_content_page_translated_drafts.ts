/**
 * CONTEXT:
 * This file publishes all existing translated draft rows for one admin content page.
 *
 * CODE:
 */
type SuccessResponse = {
  ok: true
  data: {
    page_key: string
    published_count: number
    published_languages: string[]
    published_page_ids: number[]
    previous_page_ids?: number[]
    was_noop: boolean
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

export async function publishDcxAdminContentPageTranslatedDrafts(params: {
  apiBaseUrl: string
  pageKey: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/content/pages/publish-translated-drafts", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      page_key: params.pageKey,
    }),
  })

  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_CONTENT_PAGE_TRANSLATED_DRAFTS_PUBLISH_FAILED",
            message: "We could not publish the translated draft pages.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
