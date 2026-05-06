/**
 * CONTEXT:
 * This file reads the admin email-sequences catalog from the backend.
 *
 * CODE:
 */
export type DcxAdminEmailSequenceCatalogRow = {
  sequence_id: number
  sequence_key: string
  sequence_name: string
  sequence_type: "campaign" | "onboarding"
  audience_type: "newsletters" | "all_email" | "admins" | "devs" | "shareholders"
  trigger_type: "user_signup" | "manual_launch" | "scheduled_launch"
  scheduled_launch_at_ts_ms: number | null
  is_live: boolean
  created_at_ts_ms: number
  updated_at_ts_ms: number
  total_step_count: number
  active_step_count: number
  total_send_count: number
  latest_send_at_ts_ms: number | null
}

type SuccessResponse = {
  ok: true
  data: {
    sequences: DcxAdminEmailSequenceCatalogRow[]
    total_sequence_count: number
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

export async function readDcxAdminEmailSequencesCatalog(params: {
  apiBaseUrl: string
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/content/emails/sequences/catalog", params.apiBaseUrl), {
    method: "GET",
    credentials: "include",
  })
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_EMAIL_SEQUENCES_CATALOG_READ_FAILED",
            message: "We could not load the email-sequences catalog.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
