/**
 * CONTEXT:
 * This file reads the admin schedule operations catalog from the backend.
 *
 * CODE:
 */
export type DcxAdminScheduleOperationRow = {
  operation_kind: "newsletter_send" | "sequence_launch"
  operation_id: string
  operation_key: string
  title: string
  scheduled_at_ts_ms: number
  status: string
  audience_scope: string
  source_surface: "newsletter" | "sequence"
}

type SuccessResponse = {
  ok: true
  data: {
    operations: DcxAdminScheduleOperationRow[]
    total_operation_count: number
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

export async function readDcxAdminScheduleOperationsCatalog(params: {
  apiBaseUrl: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/operations/schedule", params.apiBaseUrl), {
    method: "GET",
    credentials: "include",
  })
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_SCHEDULE_OPERATIONS_CATALOG_READ_FAILED",
            message: "We could not load the schedule operations.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
