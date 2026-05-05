/**
 * CONTEXT:
 * This file reads the first admin-facing list of DCX users.
 * It exists so the `/users` admin surface can stay thin and let TanStack Query own
 * the fetch lifecycle while the backend contract stabilizes ahead of real admin auth.
 *
 * CONTRACT:
 * preconditions: The dcx_admin frontend knows the backend base URL and carries one authenticated admin/dev session cookie.
 * postconditions: Returns the canonical backend admin-users-list payload on success.
 * side_effects: None.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The first admin surface should consume one explicit backend list contract
 * rather than embedding fetch details in the page.
 * WHEN TO USE it: Use it from TanStack Query in the initial admin users page.
 * WHEN NOT TO USE it: Do not use it for future admin write/update flows.
 * WHAT CAN GO WRONG: The backend can reject the current session, or the network can fail.
 * WHAT COMES NEXT: Keep this read path stable while more admin surfaces are added.
 *
 * TESTS:
 * No frontend test harness exists in dcx_admin yet.
 *
 * ERRORS:
 * - DCX_ADMIN_USERS_LIST_READ_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the API is reachable and the browser still has a valid admin/dev session.
 *   common_causes: Missing or expired session, backend unavailable.
 *   recovery_steps: Sign in again, then retry after backend health is restored.
 *   retry_safe: Yes.
 *
 * CODE:
 */
export type DcxAdminUserListRow = {
  user_id: number
  user_uuid: string
  primary_email: string
  primary_email_confirmed: boolean
  primary_email_confirmed_at_ts_ms: number | null
  primary_phone: string | null
  primary_phone_confirmed: boolean | null
  primary_phone_confirmed_at_ts_ms: number | null
  user_role: string
  account_status: string
  email_communication_preference: string
  last_seen_at_ts_ms: number | null
  created_at_ts_ms: number
  updated_at_ts_ms: number
  preferred_language: {
    id: number
    language_code: string
    language_name_en: string
    language_name_native: string
    is_rtl: boolean
  } | null
  total_token_count: number
  usage_event_count: number
  activity_event_count: number
}

type DcxAdminUsersListSuccessResponse = {
  ok: true
  data: {
    users: DcxAdminUserListRow[]
    total_user_count: number
  }
  context?: {
    surface?: string
    view?: string
    identity_resolution_mode?: string
  }
}

type DcxAdminUsersListErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAdminUsersList(params: {
  apiBaseUrl: string
}): Promise<DcxAdminUsersListSuccessResponse> {
  const usersListUrl = new URL("/admin/users/list", params.apiBaseUrl)

  const response = await fetch(usersListUrl.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAdminUsersListSuccessResponse
    | DcxAdminUsersListErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_USERS_LIST_READ_FAILED",
            message: "We could not load the DCX admin users list.",
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
