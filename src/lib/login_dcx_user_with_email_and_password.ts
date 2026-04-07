/**
 * CONTEXT:
 * This file submits the first shared DCX email/password login request from the admin frontend.
 * It exists so dcx_admin can establish the shared browser session cookie through one explicit
 * backend auth contract.
 *
 * CONTRACT:
 * preconditions: The frontend knows the backend base URL and the user supplies one email/password pair.
 * postconditions: Returns the canonical backend login payload on success and relies on the backend
 * response to set the shared session cookie.
 * side_effects: Creates one backend session through HTTP.
 * idempotent: No.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The admin login page needs a narrow, testable login capability.
 * WHEN TO USE it: Use it from the admin login form.
 * WHEN NOT TO USE it: Do not use it for password setup or reset.
 * WHAT CAN GO WRONG: Credentials can be wrong or the backend can fail to create a session.
 * WHAT COMES NEXT: A successful login can immediately bootstrap `/auth/session` and authorize admin routes.
 *
 * TESTS:
 * No frontend test harness exists in dcx_admin yet.
 *
 * ERRORS:
 * - API_DCX_AUTH_LOGIN_INVALID_CREDENTIALS: Credentials were not accepted.
 *   suggested_action: Retry with the correct email and password.
 *   common_causes: Wrong password, no password set yet, unknown email.
 *   recovery_steps: Re-enter credentials carefully or use password setup/reset once connected.
 *   retry_safe: Yes.
 *
 * CODE:
 */
type DcxAuthLoginSuccessResponse = {
  ok: true
  data: {
    user: {
      user_id: number
      user_uuid: string
      primary_email: string
      user_role: string
      account_status: string
      allowed_surfaces: {
        app: boolean
        admin: boolean
      }
    }
    session_expires_at_ts_ms: number
  }
  context?: {
    surface?: string
    view?: string
    auth_mode?: string
  }
}

type DcxAuthLoginErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function loginDcxUserWithEmailAndPassword(params: {
  apiBaseUrl: string
  email: string
  password: string
}): Promise<DcxAuthLoginSuccessResponse> {
  const loginUrl = new URL("/auth/login/password", params.apiBaseUrl)
  const response = await fetch(loginUrl.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
    }),
  })

  const payload = (await response.json()) as DcxAuthLoginSuccessResponse | DcxAuthLoginErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_AUTH_LOGIN_FAILED",
            message: "We could not complete the DCX login.",
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
