/**
 * CONTEXT:
 * This file reads the shared authenticated DCX browser session for the admin frontend.
 * It exists so dcx_admin can bootstrap protected routes from one canonical backend auth contract.
 *
 * CONTRACT:
 * preconditions: The frontend knows the backend base URL and may or may not already have a valid
 * shared DCX session cookie.
 * postconditions: Returns the canonical backend session payload on success.
 * side_effects: None.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The admin shell needs one narrow session-check capability before rendering
 * protected internal routes.
 * WHEN TO USE it: Use it during admin bootstrap and after login/logout mutations.
 * WHEN NOT TO USE it: Do not use it for backend route authorization.
 * WHAT CAN GO WRONG: The browser may not have a valid session cookie or the backend can be unreachable.
 * WHAT COMES NEXT: The same session bootstrap can later gate richer internal admin routes.
 *
 * TESTS:
 * No frontend test harness exists in dcx_admin yet.
 *
 * ERRORS:
 * - DCX_AUTH_SESSION_REQUIRED: No valid shared session exists.
 *   suggested_action: Sign in first.
 *   common_causes: No session cookie, expired session, revoked session.
 *   recovery_steps: Sign in again, then retry.
 *   retry_safe: Yes.
 *
 * CODE:
 */
export type DcxAuthenticatedSessionSummary = {
  user_id: number
  user_uuid: string
  primary_email: string
  user_role: string
  account_status: string
  preferred_timezone: {
    id: number
    iana_name: string
    display_label: string
  } | null
  allowed_surfaces: {
    app: boolean
    admin: boolean
  }
  session: {
    session_id: number
    issued_at_ts_ms: number
    expires_at_ts_ms: number
    last_seen_at_ts_ms: number | null
  }
}

type DcxAuthenticatedSessionSuccessResponse = {
  ok: true
  data: DcxAuthenticatedSessionSummary
  context?: {
    surface?: string
    view?: string
    auth_mode?: string
  }
}

type DcxAuthenticatedSessionErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAuthenticatedSession(params: {
  apiBaseUrl: string
}): Promise<DcxAuthenticatedSessionSuccessResponse> {
  const sessionUrl = new URL("/auth/session", params.apiBaseUrl)
  const response = await fetch(sessionUrl.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAuthenticatedSessionSuccessResponse
    | DcxAuthenticatedSessionErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_AUTH_SESSION_READ_FAILED",
            message: "We could not read the current DCX session.",
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
