/**
 * CONTEXT:
 * This file reads the first admin-facing live UX-strings catalog.
 * It exists so the admin content viewer can browse multilingual string rows from the
 * durable backend table while all selection state stays local to the admin screen.
 *
 * CONTRACT:
 * preconditions: The dcx_admin frontend knows the backend base URL and may temporarily provide
 * a local debug admin user id through the browser query string.
 * postconditions: Returns the canonical backend UX-strings-catalog payload on success.
 * side_effects: None.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The first admin UX-strings surface should consume one explicit backend read
 * contract rather than embedding fetch details in the page.
 * WHEN TO USE it: Use it from TanStack Query in the read-only admin UX-strings viewer.
 * WHEN NOT TO USE it: Do not use it for future admin write/update flows.
 * WHAT CAN GO WRONG: The backend can reject the temporary debug admin identity path, or the
 * network can fail.
 * WHAT COMES NEXT: Keep this read path stable while the identity source changes from local
 * `?admin_user_id=` testing to real admin session-backed auth.
 *
 * TESTS:
 * No frontend test harness exists in dcx_admin yet.
 *
 * ERRORS:
 * - DCX_ADMIN_UX_STRINGS_CATALOG_READ_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the API is reachable and add a valid local `?admin_user_id=` while admin auth is not wired yet.
 *   common_causes: Missing debug admin user id, backend unavailable.
 *   recovery_steps: Retry with a valid admin user id locally, then retry after backend health is restored.
 *   retry_safe: Yes.
 *
 * CODE:
 */
export type DcxAdminUxStringCatalogRow = {
  ux_string_id: number
  string_group: string
  string_key: string
  text: string
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

type DcxAdminLiveUxStringsCatalogSuccessResponse = {
  ok: true
  data: {
    ux_strings: DcxAdminUxStringCatalogRow[]
    total_live_row_count: number
  }
  context?: {
    surface?: string
    view?: string
    identity_resolution_mode?: string
  }
}

type DcxAdminLiveUxStringsCatalogErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAdminLiveUxStringsCatalog(params: {
  apiBaseUrl: string
  debugAdminUserId: number | null
}): Promise<DcxAdminLiveUxStringsCatalogSuccessResponse> {
  const catalogUrl = new URL("/admin/content/ux-strings/catalog", params.apiBaseUrl)

  if (typeof params.debugAdminUserId === "number" && Number.isFinite(params.debugAdminUserId)) {
    catalogUrl.searchParams.set("admin_user_id", String(params.debugAdminUserId))
  }

  const response = await fetch(catalogUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAdminLiveUxStringsCatalogSuccessResponse
    | DcxAdminLiveUxStringsCatalogErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_UX_STRINGS_CATALOG_READ_FAILED",
            message: "We could not load the DCX admin UX-strings catalog.",
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
