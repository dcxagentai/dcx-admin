/**
 * CONTEXT:
 * This file saves one selected live UX-string row from the DCX admin frontend.
 * It exists so the admin UX-strings screen can autosave edited selected-language text into the
 * immutable backend version model without embedding HTTP details in the page component.
 *
 * CONTRACT:
 * preconditions: The admin frontend knows the backend base URL and may temporarily provide a
 * local debug admin user id through the browser query string.
 * postconditions: Returns the canonical backend save wrapper on success.
 * side_effects: Creates one new immutable live UX-string row version when content changed.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The admin UX-strings editor should use one explicit save contract rather than
 * embedding request details in the page.
 * WHEN TO USE it: Use it from the selected-language UX-string editor only.
 * WHEN NOT TO USE it: Do not use it for catalog reads or for creating brand-new string identities.
 * WHAT CAN GO WRONG: The backend can reject the local debug admin identity path, the selected live
 * row id can be stale, the text can be invalid, or the network can fail.
 * WHAT COMES NEXT: Keep this save path stable while real admin auth replaces the temporary local
 * `?admin_user_id=` testing path.
 *
 * TESTS:
 * No frontend test harness exists in dcx_admin yet.
 *
 * ERRORS:
 * - DCX_ADMIN_UX_STRING_SAVE_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the API is reachable, the local debug admin id is valid, and the
 *   selected row is still current.
 *   common_causes: Missing debug admin user id, stale row id, invalid blank text, backend unavailable.
 *   recovery_steps: Retry after refreshing the catalog and confirming a valid local admin id.
 *   retry_safe: Yes.
 *
 * CODE:
 */
type DcxAdminSaveLiveUxStringRowSuccessResponse = {
  ok: true
  data: {
    ux_string_id: number
    previous_ux_string_id?: number
    was_noop: boolean
  }
  context?: {
    surface?: string
    view?: string
    operation?: string
    identity_resolution_mode?: string
  }
}

type DcxAdminSaveLiveUxStringRowErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function saveDcxAdminLiveUxStringRow(params: {
  apiBaseUrl: string
  debugAdminUserId: number | null
  uxStringId: number
  text: string
}): Promise<DcxAdminSaveLiveUxStringRowSuccessResponse> {
  const saveUrl = new URL("/admin/content/ux-strings/save-live-row", params.apiBaseUrl)

  if (typeof params.debugAdminUserId === "number" && Number.isFinite(params.debugAdminUserId)) {
    saveUrl.searchParams.set("admin_user_id", String(params.debugAdminUserId))
  }

  const response = await fetch(saveUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ux_string_id: params.uxStringId,
      text: params.text,
    }),
  })

  const payload = (await response.json()) as
    | DcxAdminSaveLiveUxStringRowSuccessResponse
    | DcxAdminSaveLiveUxStringRowErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_UX_STRING_SAVE_FAILED",
            message: "We could not save the DCX UX-string row.",
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
