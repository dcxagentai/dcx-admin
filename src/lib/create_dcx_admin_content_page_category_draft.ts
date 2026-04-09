/**
 * CONTEXT:
 * This file creates one new admin content-page category identity from the frontend.
 *
 * CODE:
 */
type SuccessResponse = {
  ok: true
  data: {
    category_id: number
    category_key: string
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

export async function createDcxAdminContentPageCategoryDraft(params: {
  apiBaseUrl: string
  categoryName: string
  languageCode: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/content/page-categories/create-draft", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category_name: params.categoryName,
      language_code: params.languageCode,
    }),
  })
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_CONTENT_PAGE_CATEGORY_DRAFT_CREATE_FAILED",
            message: "We could not create that content-page category.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
