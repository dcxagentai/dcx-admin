/**
 * CONTEXT:
 * This file reads the admin newsletters catalog from the backend.
 *
 * CODE:
 */
export type DcxAdminNewsletterCatalogRow = {
  email_id: number
  email_type: string
  email_key: string
  email_subject: string
  email_body: string
  is_original: boolean
  is_live: boolean
  version_of_id: number | null
  translation_of_id: number | null
  created_at_ts_ms: number
  updated_at_ts_ms: number
  language: {
    id: number
    language_code: string
    language_name_en: string
    language_name_native: string
    is_rtl: boolean
  }
}

type SuccessResponse = {
  ok: true
  data: {
    newsletters: DcxAdminNewsletterCatalogRow[]
    total_live_row_count: number
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

export async function readDcxAdminNewslettersCatalog(params: {
  apiBaseUrl: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/content/newsletters/catalog", params.apiBaseUrl), {
    method: "GET",
    credentials: "include",
  })
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_NEWSLETTERS_CATALOG_READ_FAILED",
            message: "We could not load the DCX newsletters catalog.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
