/**
 * CONTEXT:
 * This file reads the current authenticated user's timezone clock preferences for the DCX admin sidebar.
 * It intentionally reuses the app account-summary route because the preferred timezone and sidebar
 * clock choices belong to the shared user account, not to a separate admin-only profile.
 */
export type DcxAdminAuthenticatedUserClockTimezone = {
  id: number
  iana_name: string
  display_label: string
  region_label: string
}

type DcxAdminAuthenticatedUserClockTimezonesSuccessResponse = {
  ok: true
  data: {
    preferred_timezone: DcxAdminAuthenticatedUserClockTimezone | null
    selected_sidebar_clock_timezones: DcxAdminAuthenticatedUserClockTimezone[]
  }
}

type DcxAdminAuthenticatedUserClockTimezonesErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAdminAuthenticatedUserClockTimezones(params: {
  apiBaseUrl: string
}): Promise<DcxAdminAuthenticatedUserClockTimezonesSuccessResponse> {
  const accountSummaryUrl = new URL("/users/me/account-summary", params.apiBaseUrl)

  const response = await fetch(accountSummaryUrl.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAdminAuthenticatedUserClockTimezonesSuccessResponse
    | DcxAdminAuthenticatedUserClockTimezonesErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_CLOCK_TIMEZONES_READ_FAILED",
            message: "We could not load the current user's sidebar clocks.",
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

  return {
    ok: true,
    data: {
      preferred_timezone: payload.data.preferred_timezone,
      selected_sidebar_clock_timezones: payload.data.selected_sidebar_clock_timezones,
    },
  }
}
