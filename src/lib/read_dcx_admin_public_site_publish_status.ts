/**
 * CONTEXT:
 * This file reads the first admin-facing public-site publish status.
 * It exists so the admin workspace can see whether live public UX-string edits are still waiting
 * for a Cloudflare Pages rebuild now that the public Astro site reads from dcx_api at build time.
 *
 * CONTRACT:
 * preconditions: The dcx_admin frontend knows the backend base URL and carries one authenticated admin/dev session cookie.
 * postconditions: Returns the canonical backend public-site publish-status payload on success.
 * side_effects: None.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The admin publish surface should consume one explicit backend read contract
 * rather than embedding fetch details in the page.
 * WHEN TO USE it: Use it from TanStack Query in the admin publish screen only.
 * WHEN NOT TO USE it: Do not use it for triggering the deploy; the matching run helper owns that.
 * WHAT CAN GO WRONG: The backend can reject the current session, the publish-state SQL may not be applied yet, or the network can fail.
 * WHAT COMES NEXT: Keep this read path stable while more admin publishing controls are added.
 *
 * TESTS:
 * No frontend test harness exists in dcx_admin yet.
 *
 * ERRORS:
 * - DCX_ADMIN_PUBLIC_SITE_PUBLISH_STATUS_READ_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the API is reachable, the publish-state SQL exists, and the browser still has a valid admin/dev session.
 *   common_causes: Missing or expired session, publish-state table missing, backend unavailable.
 *   recovery_steps: Sign in again if needed, apply the SQL if needed, then retry after backend health is restored.
 *   retry_safe: Yes.
 *
 * CODE:
 */
export type DcxAdminPublicSitePendingChangePreviewRow = {
  content_kind: "ux_string" | "content_page"
  item_id: number
  primary_label: string
  secondary_label: string | null
  public_path: string | null
  language_code: string
  language_name_native: string
  updated_at_ts_ms: number
}

export type DcxAdminPublicSitePublishStatusData = {
  surface_key: string
  runtime_environment: string
  publish_execution_mode: "local_manual_rebuild" | "cloudflare_pages_hook"
  last_successful_publish_at_ts_ms: number | null
  last_successful_publish_by_user_id: number | null
  last_attempted_publish_at_ts_ms: number | null
  last_attempted_publish_by_user_id: number | null
  last_publish_status: string
  last_publish_message: string | null
  created_at_ts_ms: number
  updated_at_ts_ms: number
  pending_change_count: number
  pending_changes_preview: DcxAdminPublicSitePendingChangePreviewRow[]
  public_managed_content_kinds: string[]
  public_managed_groups: string[]
}

type DcxAdminPublicSitePublishStatusSuccessResponse = {
  ok: true
  data: DcxAdminPublicSitePublishStatusData
  context?: {
    surface?: string
    view?: string
    identity_resolution_mode?: string
  }
}

type DcxAdminPublicSitePublishStatusErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function readDcxAdminPublicSitePublishStatus(params: {
  apiBaseUrl: string
}): Promise<DcxAdminPublicSitePublishStatusSuccessResponse> {
  const statusUrl = new URL("/admin/publish/public-site/status", params.apiBaseUrl)

  const response = await fetch(statusUrl.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAdminPublicSitePublishStatusSuccessResponse
    | DcxAdminPublicSitePublishStatusErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_PUBLIC_SITE_PUBLISH_STATUS_READ_FAILED",
            message: "We could not load the DCX public-site publish status.",
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
