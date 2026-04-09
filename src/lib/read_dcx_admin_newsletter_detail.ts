/**
 * CONTEXT:
 * This file reads one admin newsletter detail row from the backend.
 *
 * CODE:
 */
import type { DcxAdminNewsletterCatalogRow } from "./read_dcx_admin_newsletters_catalog"

type SuccessResponse = {
  ok: true
  data: DcxAdminNewsletterCatalogRow
}

type ErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAdminNewsletterDetail(params: {
  apiBaseUrl: string
  emailKey: string
  languageCode: string
}): Promise<SuccessResponse> {
  const response = await fetch(
    new URL(`/admin/content/newsletters/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.emailKey)}`, params.apiBaseUrl),
    { method: "GET", credentials: "include" },
  )
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_NEWSLETTER_DETAIL_READ_FAILED",
            message: "We could not load that DCX newsletter.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
