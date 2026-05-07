/**
 * CONTEXT:
 * This file reads one admin newsletter detail row from the backend.
 *
 * CODE:
 */
import type { DcxAdminNewsletterCatalogRow } from "./read_dcx_admin_newsletters_catalog"

export type DcxAdminNewsletterDetail = DcxAdminNewsletterCatalogRow & {
  translation_summary: {
    original_email_id: number
    original_language_code: string
    existing_translations: Array<{
      email_id: number
      email_key: string
      email_subject: string
      is_original: boolean
      created_at_ts_ms: number
      updated_at_ts_ms: number
      is_current_language: boolean
      language: DcxAdminNewsletterCatalogRow["language"]
    }>
    missing_languages: DcxAdminNewsletterCatalogRow["language"][]
  }
  language_readiness: {
    send_audience_scope: "all" | "admins" | "devs" | "shareholders"
    total_evaluated_recipient_count: number
    total_send_candidate_count: number
    total_blocked_missing_translation_count: number
    language_rows: Array<{
      language: DcxAdminNewsletterCatalogRow["language"]
      eligible_recipient_count: number
      send_candidate_count: number
      blocked_missing_translation_count: number
      has_live_translation: boolean
    }>
    missing_languages: Array<
      DcxAdminNewsletterCatalogRow["language"] & {
        blocked_missing_translation_count: number
      }
    >
  }
}

type SuccessResponse = {
  ok: true
  data: DcxAdminNewsletterDetail
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
  sendAudienceScope?: "all" | "admins" | "devs" | "shareholders"
}): Promise<SuccessResponse> {
  const url = new URL(
    `/admin/content/newsletters/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.emailKey)}`,
    params.apiBaseUrl,
  )
  url.searchParams.set("send_audience_scope", params.sendAudienceScope ?? "all")

  const response = await fetch(
    url,
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
