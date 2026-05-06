/**
 * CONTEXT:
 * This file saves one admin email sequence and its steps through the backend.
 *
 * CODE:
 */
export type DcxAdminEmailSequenceSaveDraftStep = {
  step_key: string
  step_name: string
  source_email_id: number
  delay_minutes_from_trigger: number
  is_active: boolean
}

type SuccessResponse = {
  ok: true
  data: {
    sequence_id: number
    sequence_key: string
    saved_step_count: number
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

export async function saveDcxAdminEmailSequenceAndSteps(params: {
  apiBaseUrl: string
  sequenceKey: string
  sequenceName: string
  sequenceType: "campaign" | "onboarding"
  audienceType: "newsletters" | "all_email" | "admins" | "devs" | "shareholders"
  triggerType: "user_signup" | "manual_launch" | "scheduled_launch"
  scheduledLaunchAtTsMs: number | null
  isLive: boolean
  steps: DcxAdminEmailSequenceSaveDraftStep[]
}): Promise<SuccessResponse> {
  const response = await fetch(
    new URL(`/admin/content/emails/sequences/${encodeURIComponent(params.sequenceKey)}/save`, params.apiBaseUrl),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sequence_name: params.sequenceName,
        sequence_type: params.sequenceType,
        audience_type: params.audienceType,
        trigger_type: params.triggerType,
        scheduled_launch_at_ts_ms: params.scheduledLaunchAtTsMs,
        is_live: params.isLive,
        steps: params.steps.map((step) => ({
          step_key: step.step_key,
          step_name: step.step_name,
          source_email_id: step.source_email_id,
          delay_minutes_from_trigger: step.delay_minutes_from_trigger,
          is_active: step.is_active,
        })),
      }),
    },
  )
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_EMAIL_SEQUENCE_SAVE_FAILED",
            message: "We could not save that email sequence.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
