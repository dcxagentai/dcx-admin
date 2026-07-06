/**
 * CONTEXT:
 * This file archives or restores one admin tracker work item.
 *
 * CODE:
 */
type SuccessResponse = {
  ok: true
  data: {
    work_item_id: number
    is_archived: boolean
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

export async function archiveDcxAdminTrackerWorkItem(params: {
  apiBaseUrl: string
  workItemId: number
  isArchived: boolean
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/tracker/work-items/archive", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      work_item_id: params.workItemId,
      is_archived: params.isArchived,
    }),
  })

  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_TRACKER_WORK_ITEM_ARCHIVE_FAILED",
            message: "We could not archive that tracker item.",
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
