/**
 * CONTEXT:
 * This file saves whether a user appears on the Tracker Team screen.
 *
 * CODE:
 */
type SuccessResponse = {
  ok: true
  data: {
    user_id: number
    is_tracker_team_member: boolean
  }
}

type ErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function saveDcxAdminUserTrackerTeamMembership(params: {
  apiBaseUrl: string
  userId: number
  isTrackerTeamMember: boolean
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/users/tracker-team-membership/save", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: params.userId,
      is_tracker_team_member: params.isTrackerTeamMember,
    }),
  })

  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_USER_TRACKER_TEAM_MEMBERSHIP_SAVE_FAILED",
            message: "We could not save that Tracker Team setting.",
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
