/**
 * CONTEXT:
 * This file saves one selected live email-template row from the DCX admin frontend.
 * It exists so the admin emails screen can autosave edited selected-language content into the
 * immutable backend version model while placeholder validation stays enforced server-side.
 *
 * CONTRACT:
 * preconditions: The admin frontend knows the backend base URL and carries one authenticated admin/dev session cookie.
 * postconditions: Returns the canonical backend save wrapper on success.
 * side_effects: Creates one new immutable live email row version when content changed.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The admin emails editor should use one explicit save contract rather than
 * embedding request details in the page.
 * WHEN TO USE it: Use it from the selected-language email editor only.
 * WHEN NOT TO USE it: Do not use it for catalog reads or for sending outbound email.
 * WHAT CAN GO WRONG: The backend can reject the current session, the selected live row id can be stale, the subject/body can be invalid, placeholder codes can be malformed, or the network can fail.
 * WHAT COMES NEXT: Keep this save path stable while more admin content-editing surfaces are added.
 *
 * TESTS:
 * No frontend test harness exists in dcx_admin yet.
 *
 * ERRORS:
 * - DCX_ADMIN_EMAIL_SAVE_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the API is reachable, the current admin/dev session is still valid, and the selected row is still current with exact placeholder tokens preserved.
 *   common_causes: Missing or expired session, stale row id, invalid blank content, malformed
 *   placeholder syntax, backend unavailable.
 *   recovery_steps: Sign in again if needed, then retry after refreshing the catalog and correcting the edited content.
 *   retry_safe: Yes.
 *
 * CODE:
 */
type DcxAdminSaveLiveEmailRowSuccessResponse = {
  ok: true
  data: {
    email_id: number
    previous_email_id?: number
    was_noop: boolean
  }
  context?: {
    surface?: string
    view?: string
    operation?: string
    identity_resolution_mode?: string
  }
}

type DcxAdminSaveLiveEmailRowErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function saveDcxAdminLiveEmailRow(params: {
  apiBaseUrl: string
  emailId: number
  emailSubject: string
  emailBody: string
}): Promise<DcxAdminSaveLiveEmailRowSuccessResponse> {
  const saveUrl = new URL("/admin/content/emails/save-live-row", params.apiBaseUrl)

  const response = await fetch(saveUrl.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_id: params.emailId,
      email_subject: params.emailSubject,
      email_body: params.emailBody,
    }),
  })

  const payload = (await response.json()) as
    | DcxAdminSaveLiveEmailRowSuccessResponse
    | DcxAdminSaveLiveEmailRowErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_EMAIL_SAVE_FAILED",
            message: "We could not save the DCX email template row.",
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
