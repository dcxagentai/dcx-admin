/**
 * CONTEXT:
 * This file enqueues AI translation jobs from admin content screens.
 */
export type DcxAdminAiTranslationEntityKind = "content_page" | "content_page_category" | "email" | "newsletter"

export type DcxAdminAiTranslationJobRow = {
  job_id: number | null
  job_status: string
  target_row_id: number | null
  was_enqueued: boolean
  target_language: {
    id: number
    language_code: string
    language_name_en: string
    language_name_native: string
    is_rtl: boolean
  }
}

type SuccessResponse = {
  ok: true
  data: {
    entity_kind: DcxAdminAiTranslationEntityKind
    entity_key: string
    source_language_code: string
    source_row_id: number
    source_content_hash: string
    jobs: DcxAdminAiTranslationJobRow[]
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

export async function enqueueDcxAdminAiTranslationJobs(params: {
  apiBaseUrl: string
  entityKind: DcxAdminAiTranslationEntityKind
  entityKey: string
  sourceLanguageCode: string
  targetLanguageCodes?: string[]
}): Promise<SuccessResponse> {
  const response = await fetch(new URL("/admin/translations/ai-jobs", params.apiBaseUrl), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entity_kind: params.entityKind,
      entity_key: params.entityKey,
      source_language_code: params.sourceLanguageCode,
      target_language_codes: params.targetLanguageCodes,
    }),
  })
  const payload = (await response.json()) as SuccessResponse | ErrorResponse
  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_AI_TRANSLATION_ENQUEUE_FAILED",
            message: "We could not enqueue AI translation.",
            suggested_action: "Retry after confirming the backend is reachable.",
          }
    const error = new Error(errorPayload.message) as Error & { code?: string; suggested_action?: string }
    error.code = errorPayload.code
    error.suggested_action = errorPayload.suggested_action
    throw error
  }
  return payload
}
