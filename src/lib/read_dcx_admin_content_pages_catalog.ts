/**
 * CONTEXT:
 * This file reads the admin content-pages catalog from the backend.
 * It exists so the pages list surface can browse current live page identities before opening one editor route.
 *
 * CODE:
 */
export type DcxAdminContentPageCatalogRow = {
  page_id: number
  page_key: string
  category_key: string
  page_title: string
  page_lede: string
  page_slug: string
  publication_status: string
  published_at_ts_ms: number | null
  language_id: number
  created_at_ts_ms: number
  updated_at_ts_ms: number
  language: {
    language_code: string
    language_name_en: string
    language_name_native: string
    is_rtl: boolean
  }
  category: {
    category_name: string
    category_slug: string
  }
}

type SuccessResponse = {
  ok: true
  data: {
    pages: DcxAdminContentPageCatalogRow[]
    total_live_page_count: number
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

export async function readDcxAdminContentPagesCatalog(params: {
  apiBaseUrl: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/content/pages/catalog", params.apiBaseUrl), {
    method: "GET",
    credentials: "include",
  })

  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_CONTENT_PAGES_CATALOG_READ_FAILED",
            message: "We could not load the DCX content pages.",
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
