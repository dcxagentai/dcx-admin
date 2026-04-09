/**
 * CONTEXT:
 * This file reads one admin content-page category detail row from the backend.
 * It exists so the category editor can open one path-based route for one language/category pair.
 *
 * CODE:
 */
type Language = {
  language_code: string
  language_name_en: string
  language_name_native: string
  is_rtl: boolean
}

export type DcxAdminContentPageCategoryDetail = {
  category_id: number
  category_key: string
  category_name: string
  category_description: string
  category_slug: string
  language_id: number
  is_original: boolean
  translation_of_id: number | null
  created_at_ts_ms: number
  updated_at_ts_ms: number
  language: Language
  translation_summary: {
    existing_translations: Array<{
      category_id: number
      category_key: string
      is_original: boolean
      is_current_language: boolean
      language: Language
    }>
    missing_languages: Language[]
  }
}

type SuccessResponse = {
  ok: true
  data: DcxAdminContentPageCategoryDetail
}

type ErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAdminContentPageCategoryDetail(params: {
  apiBaseUrl: string
  categoryKey: string
  languageCode: string
}): Promise<SuccessResponse> {
  const response = await fetch(
    new URL(
      `/admin/content/page-categories/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.categoryKey)}`,
      params.apiBaseUrl,
    ),
    {
      method: "GET",
      credentials: "include",
    },
  )

  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_CONTENT_PAGE_CATEGORY_DETAIL_READ_FAILED",
            message: "We could not load that DCX content page category.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }

  return payload
}
