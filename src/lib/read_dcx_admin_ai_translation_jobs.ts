/**
 * CONTEXT:
 * This file reads recent AI translation jobs for one admin content identity.
 */
import type {
  DcxAdminAiTranslationEntityKind,
} from "./enqueue_dcx_admin_ai_translation_jobs"

export type DcxAdminAiTranslationJobStatusRow = {
  job_id: number
  entity_kind: DcxAdminAiTranslationEntityKind
  entity_key: string
  email_type: string
  source_language_code: string
  target_language: {
    id: number
    language_code: string
    language_name_en: string
    language_name_native: string
    is_rtl: boolean
  }
  source_row_id_snapshot: number
  target_row_id: number | null
  source_content_hash: string
  target_content_hash: string
  job_status: string
  attempt_count: number
  provider_name: string
  model_name: string
  prompt_version: string
  last_error_code: string | null
  last_error_detail: string | null
  created_at_ts_ms: number
  updated_at_ts_ms: number
}

type SuccessResponse = {
  ok: true
  data: {
    entity_kind: DcxAdminAiTranslationEntityKind
    entity_key: string
    jobs: DcxAdminAiTranslationJobStatusRow[]
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

export async function readDcxAdminAiTranslationJobs(params: {
  apiBaseUrl: string
  entityKind: DcxAdminAiTranslationEntityKind
  entityKey: string
}): Promise<SuccessResponse> {
  const url = new URL("/admin/translations/ai-jobs", params.apiBaseUrl)
  url.searchParams.set("entity_kind", params.entityKind)
  url.searchParams.set("entity_key", params.entityKey)

  const response = await fetch(url, { method: "GET", credentials: "include" })
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_AI_TRANSLATION_JOBS_READ_FAILED",
            message: "We could not load AI translation jobs.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
