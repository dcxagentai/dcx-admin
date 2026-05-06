/**
 * CONTEXT:
 * This file reads one admin email-sequence detail payload from the backend.
 *
 * CODE:
 */
export type DcxAdminEmailSequenceDetailStep = {
  sequence_step_id: number
  step_key: string
  step_name: string
  step_order: number
  source_email_id: number
  delay_minutes_from_trigger: number
  is_active: boolean
  created_at_ts_ms: number
  updated_at_ts_ms: number
  source_email_key: string
  source_email_subject: string
  source_email_type: string
  source_language_code: string
}

export type DcxAdminEmailSequenceDetail = {
  sequence_id: number
  sequence_key: string
  sequence_name: string
  sequence_type: "campaign" | "onboarding"
  audience_type: "newsletters" | "all_email" | "admins" | "devs" | "shareholders"
  trigger_type: "user_signup" | "manual_launch" | "scheduled_launch"
  scheduled_launch_at_ts_ms: number | null
  is_live: boolean
  created_by_user_id: number | null
  updated_by_user_id: number | null
  created_at_ts_ms: number
  updated_at_ts_ms: number
  steps: DcxAdminEmailSequenceDetailStep[]
}

type SuccessResponse = {
  ok: true
  data: DcxAdminEmailSequenceDetail
}

type ErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAdminEmailSequenceDetail(params: {
  apiBaseUrl: string
  sequenceKey: string
}): Promise<SuccessResponse> {
  const response = await fetch(
    new URL(`/admin/content/emails/sequences/${encodeURIComponent(params.sequenceKey)}`, params.apiBaseUrl),
    {
      method: "GET",
      credentials: "include",
    },
  )
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_EMAIL_SEQUENCE_DETAIL_READ_FAILED",
            message: "We could not load that email sequence.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
