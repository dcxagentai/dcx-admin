/**
 * CONTEXT:
 * This file reads the admin tracker catalog for the internal DCX admin surface.
 *
 * CODE:
 */
export type DcxAdminTrackerLevel = "long_term" | "strategy" | "operation" | "battle" | "task"
export type DcxAdminTrackerPillar = "legibility" | "investors" | "building" | "customers" | "other"
export type DcxAdminTrackerStatus = "not_started" | "active" | "waiting" | "done"
export type DcxAdminTrackerUpdateKind = "note" | "progress" | "blocker" | "decision" | "question" | "action"

export type DcxAdminTrackerWorkItem = {
  work_item_id: number
  title: string
  description: string
  current_state: string
  level: DcxAdminTrackerLevel
  pillar: DcxAdminTrackerPillar
  pillars: DcxAdminTrackerPillar[]
  status: DcxAdminTrackerStatus
  parent_work_item_id: number | null
  parent_title: string | null
  origin_update_id: number | null
  assigned_to_user_id: number | null
  assigned_to_email: string | null
  assigned_to_display_name: string | null
  is_archived: boolean
  archived_by_user_id: number | null
  archived_by_email: string | null
  archived_at_ts_ms: number | null
  created_by_user_id: number | null
  created_by_email: string | null
  updated_by_user_id: number | null
  updated_by_email: string | null
  created_at_ts_ms: number
  updated_at_ts_ms: number
  update_count: number
  latest_update_at_ts_ms: number | null
}

export type DcxAdminTrackerUpdate = {
  update_id: number
  work_item_id: number
  work_item_title: string
  author_user_id: number | null
  author_email: string | null
  author_display_name: string | null
  update_kind: DcxAdminTrackerUpdateKind
  update_body: string
  created_at_ts_ms: number
  updated_at_ts_ms: number
  updated_by_user_id: number | null
  updated_by_email: string | null
  updated_by_display_name: string | null
}

export type DcxAdminTrackerAssignableUser = {
  user_id: number
  primary_email: string
  display_name: string | null
  user_role: string
  account_status: string
  is_tracker_team_member: boolean
}

type SuccessResponse = {
  ok: true
  data: {
    work_items: DcxAdminTrackerWorkItem[]
    updates: DcxAdminTrackerUpdate[]
    assignable_users: DcxAdminTrackerAssignableUser[]
    total_work_item_count: number
    returned_update_count: number
  }
  context: {
    surface: string
    view: string
    identity_resolution_mode: string
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

export async function readDcxAdminTrackerCatalog(params: {
  apiBaseUrl: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/tracker/catalog", params.apiBaseUrl), {
    credentials: "include",
  })

  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_TRACKER_CATALOG_READ_FAILED",
            message: "We could not load the DCX tracker.",
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
