/**
 * CONTEXT:
 * This file reads one admin content-page detail row from the backend.
 * It exists so the page editor can load one path-addressable page/language pair without using query strings.
 *
 * CODE:
 */
import type { DcxAdminContentPageCategoryRow } from "./read_dcx_admin_content_page_categories_catalog"

export type DcxAdminContentPageDetail = {
  page_id: number
  page_key: string
  category_key: string
  page_title: string
  page_lede: string
  page_body_markdown: string
  meta_title: string
  meta_description: string
  page_slug: string
  publication_status: string
  published_at_ts_ms: number | null
  is_original: boolean
  is_live: boolean
  version_of_id: number | null
  translation_of_id: number | null
  created_at_ts_ms: number
  updated_at_ts_ms: number
  language: DcxAdminContentPageCategoryRow["language"]
  category: {
    category_id: number
    category_name: string
    category_description: string
    category_slug: string
  }
  translation_summary: {
    original_page_id: number
    original_language_code: string
    existing_translations: Array<{
      page_id: number
      page_key: string
      page_title: string
      page_slug: string
      publication_status: string
      is_original: boolean
      created_at_ts_ms: number
      updated_at_ts_ms: number
      is_current_language: boolean
      language: DcxAdminContentPageCategoryRow["language"]
    }>
    missing_languages: DcxAdminContentPageCategoryRow["language"][]
  }
}

type SuccessResponse = {
  ok: true
  data: DcxAdminContentPageDetail
}

type ErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAdminContentPageDetail(params: {
  apiBaseUrl: string
  pageKey: string
  languageCode: string
}): Promise<SuccessResponse> {
  const response = await fetch(
    new URL(`/admin/content/pages/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.pageKey)}`, params.apiBaseUrl),
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
            code: "DCX_ADMIN_CONTENT_PAGE_DETAIL_READ_FAILED",
            message: "We could not load that DCX content page.",
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
