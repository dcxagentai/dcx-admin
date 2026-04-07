/**
 * CONTEXT:
 * This file reads the first admin-facing live emails catalog.
 * It exists so the admin content viewer can browse multilingual email-template rows from the
 * durable backend table while all selection state stays local to the admin screen.
 *
 * CONTRACT:
 * preconditions: The dcx_admin frontend knows the backend base URL and carries one authenticated admin/dev session cookie.
 * postconditions: Returns the canonical backend emails-catalog payload on success.
 * side_effects: None.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The first admin emails surface should consume one explicit backend read
 * contract rather than embedding fetch details in the page.
 * WHEN TO USE it: Use it from TanStack Query in the read-only admin emails viewer.
 * WHEN NOT TO USE it: Do not use it for future admin write/update flows.
 * WHAT CAN GO WRONG: The backend can reject the current session, or the network can fail.
 * WHAT COMES NEXT: Keep this read path stable while more admin content tooling is added.
 *
 * TESTS:
 * No frontend test harness exists in dcx_admin yet.
 *
 * ERRORS:
 * - DCX_ADMIN_EMAILS_CATALOG_READ_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the API is reachable and the browser still has a valid admin/dev session.
 *   common_causes: Missing or expired session, backend unavailable.
 *   recovery_steps: Sign in again, then retry after backend health is restored.
 *   retry_safe: Yes.
 *
 * CODE:
 */
export type DcxAdminEmailCatalogRow = {
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

type DcxAdminLiveEmailsCatalogSuccessResponse = {
  ok: true
  data: {
    emails: DcxAdminEmailCatalogRow[]
    total_live_row_count: number
  }
  context?: {
    surface?: string
    view?: string
    identity_resolution_mode?: string
  }
}

type DcxAdminLiveEmailsCatalogErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAdminLiveEmailsCatalog(params: {
  apiBaseUrl: string
}): Promise<DcxAdminLiveEmailsCatalogSuccessResponse> {
  const catalogUrl = new URL("/admin/content/emails/catalog", params.apiBaseUrl)

  const response = await fetch(catalogUrl.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAdminLiveEmailsCatalogSuccessResponse
    | DcxAdminLiveEmailsCatalogErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_EMAILS_CATALOG_READ_FAILED",
            message: "We could not load the DCX admin emails catalog.",
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
