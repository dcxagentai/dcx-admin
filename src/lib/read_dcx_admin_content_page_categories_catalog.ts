/**
 * CONTEXT:
 * This file reads the admin content-page categories catalog from the backend.
 * It exists so the pages list/editor can populate category choices from the durable backend table.
 *
 * CODE:
 */
export type DcxAdminContentPageCategoryRow = {
  category_id: number
  category_key: string
  category_name: string
  category_description: string
  category_slug: string
  language_id: number
  created_at_ts_ms: number
  updated_at_ts_ms: number
  language: {
    language_code: string
    language_name_en: string
    language_name_native: string
    is_rtl: boolean
  }
}

type SuccessResponse = {
  ok: true
  data: {
    categories: DcxAdminContentPageCategoryRow[]
    total_live_category_count: number
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

export async function readDcxAdminContentPageCategoriesCatalog(params: {
  apiBaseUrl: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/content/pages/categories", params.apiBaseUrl), {
    method: "GET",
    credentials: "include",
  })

  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_CONTENT_PAGE_CATEGORIES_CATALOG_READ_FAILED",
            message: "We could not load the DCX content page categories.",
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
