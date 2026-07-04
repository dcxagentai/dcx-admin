/**
 * CONTEXT:
 * This file creates or updates one admin tracker work item.
 *
 * CODE:
 */
import type {
  DcxAdminTrackerLevel,
  DcxAdminTrackerPillar,
  DcxAdminTrackerStatus,
} from "./read_dcx_admin_tracker_catalog"

type SuccessResponse = {
  ok: true
  data: {
    work_item_id: number
    was_created: boolean
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

export async function saveDcxAdminTrackerWorkItem(params: {
  apiBaseUrl: string
  workItemId: number | null
  title: string
  description: string
  currentState: string
  level: DcxAdminTrackerLevel
  pillars: DcxAdminTrackerPillar[]
  status: DcxAdminTrackerStatus
  parentWorkItemId: number | null
}): Promise<SuccessResponse> {
  const primaryPillar = params.pillars[0] ?? "building"

  const response = await fetch(new URL("/admin/tracker/work-items/save", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      work_item_id: params.workItemId,
      title: params.title,
      description: params.description,
      current_state: params.currentState,
      level: params.level,
      pillar: primaryPillar,
      pillars: params.pillars,
      status: params.status,
      parent_work_item_id: params.parentWorkItemId,
    }),
  })

  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_TRACKER_WORK_ITEM_SAVE_FAILED",
            message: "We could not save that tracker item.",
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
