/**
 * CONTEXT:
 * This file saves one admin content-page category live row through the backend immutable version model.
 *
 * CODE:
 */
type SuccessResponse = {
  ok: true
  data: {
    category_id: number
    previous_category_id?: number
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

export async function saveDcxAdminContentPageCategoryLiveRow(params: {
  apiBaseUrl: string
  categoryId: number
  categoryName: string
  categoryDescription: string
  categorySlug: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/content/page-categories/save-live-row", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category_id: params.categoryId,
      category_name: params.categoryName,
      category_description: params.categoryDescription,
      category_slug: params.categorySlug,
    }),
  })

  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_CONTENT_PAGE_CATEGORY_SAVE_FAILED",
            message: "We could not save that DCX content page category.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
