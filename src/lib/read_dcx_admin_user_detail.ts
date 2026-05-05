/**
 * CONTEXT:
 * Reads one admin user detail payload with usage and content-free activity.
 */

export type DcxAdminActivityEvent = {
  activity_event_id: number
  activity_kind: string
  surface: string
  entity_kind: string
  entity_id: number | null
  event_status: string
  activity_summary: string
  activity_metadata: Record<string, unknown>
  actor_user_id: number | null
  created_at_ts_ms: number
}

export type DcxAdminUserActivity = {
  events: DcxAdminActivityEvent[]
  event_count: number
}

export type DcxAdminUserUsage = {
  total_prompt_tokens: number
  total_candidates_tokens: number
  total_tokens: number
  total_events: number
  recent_events: {
    provider_name: string
    model_name: string
    prompt_version: string
    usage_source_kind: string
    usage_source_id: number | null
    prompt_token_count: number
    candidates_token_count: number
    total_token_count: number
    created_at_ts_ms: number
  }[]
  daily_totals: {
    usage_day: string
    total_token_count: number
    event_count: number
  }[]
}

export type DcxAdminUserDetail = {
  user_id: number
  usage: DcxAdminUserUsage
  activity: DcxAdminUserActivity
}

type DcxAdminUserDetailSuccessResponse = {
  ok: true
  data: DcxAdminUserDetail
  context?: Record<string, unknown>
}

type DcxAdminUserDetailErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAdminUserDetail(params: {
  apiBaseUrl: string
  userId: number
}): Promise<DcxAdminUserDetailSuccessResponse> {
  const response = await fetch(new URL(`/admin/users/${params.userId}/detail`, params.apiBaseUrl).toString(), {
    credentials: "include",
  })
  const payload = (await response.json()) as DcxAdminUserDetailSuccessResponse | DcxAdminUserDetailErrorResponse
  if (!response.ok || !payload.ok) {
    const errorPayload = payload as DcxAdminUserDetailErrorResponse
    const error = new Error(errorPayload.error?.message ?? "We could not load that user detail.") as Error & {
      suggested_action?: string
    }
    error.suggested_action = errorPayload.error?.suggested_action
    throw error
  }
  return payload
}
