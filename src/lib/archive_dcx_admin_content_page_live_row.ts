/**
 * CONTEXT:
 * This file archives one admin content-page live row through the backend immutable version model.
 *
 * CODE:
 */
type SuccessResponse = {
  ok: true
  data: {
    page_id: number
    previous_page_id?: number
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

export async function archiveDcxAdminContentPageLiveRow(params: {
  apiBaseUrl: string
  pageId: number
  categoryKey: string
  pageTitle: string
  pageLede: string
  pageBodyMarkdown: string
  metaTitle: string
  metaDescription: string
  pageSlug: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/content/pages/archive-live-row", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      page_id: params.pageId,
      category_key: params.categoryKey,
      page_title: params.pageTitle,
      page_lede: params.pageLede,
      page_body_markdown: params.pageBodyMarkdown,
      meta_title: params.metaTitle,
      meta_description: params.metaDescription,
      page_slug: params.pageSlug,
    }),
  })

  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_CONTENT_PAGE_ARCHIVE_FAILED",
            message: "We could not archive that DCX content page.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
