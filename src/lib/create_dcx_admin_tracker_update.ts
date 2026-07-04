/**
 * CONTEXT:
 * This file creates one activity update for an admin tracker work item.
 *
 * CODE:
 */
import type { DcxAdminTrackerUpdateKind } from "./read_dcx_admin_tracker_catalog"

type SuccessResponse = {
  ok: true
  data: {
    update_id: number
    work_item_id: number
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

export async function createDcxAdminTrackerUpdate(params: {
  apiBaseUrl: string
  workItemId: number
  updateKind: DcxAdminTrackerUpdateKind
  updateBody: string
}): Promise<SuccessResponse> {
  const response = await fetch(
    new URL(`/admin/tracker/work-items/${params.workItemId}/updates/create`, params.apiBaseUrl),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        update_kind: params.updateKind,
        update_body: params.updateBody,
      }),
    },
  )

  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_TRACKER_UPDATE_CREATE_FAILED",
            message: "We could not add that tracker update.",
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
