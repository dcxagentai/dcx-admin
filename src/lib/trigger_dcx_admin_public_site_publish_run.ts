/**
 * CONTEXT:
 * This file triggers the first admin-facing public-site deploy request.
 * It exists so the admin publish screen can call one explicit backend contract rather than
 * embedding Cloudflare-trigger request details in the page.
 *
 * CONTRACT:
 * preconditions: The admin frontend knows the backend base URL and may temporarily provide a
 * local debug admin user id through the browser query string.
 * postconditions: Returns the canonical backend publish-trigger wrapper on success.
 * side_effects: Requests one Cloudflare Pages deploy through the backend route.
 * idempotent: No.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: The admin publish screen should use one explicit trigger contract rather than
 * mixing trigger request details into the page component.
 * WHEN TO USE it: Use it from the `Publish public site` button only.
 * WHEN NOT TO USE it: Do not use it for passive publish-status reads.
 * WHAT CAN GO WRONG: The backend can reject the local debug admin identity path, the deploy hook
 * can be missing, or the network can fail.
 * WHAT COMES NEXT: Keep this trigger stable while real admin auth replaces the temporary local
 * `?admin_user_id=` testing path.
 *
 * TESTS:
 * No frontend test harness exists in dcx_admin yet.
 *
 * ERRORS:
 * - DCX_ADMIN_PUBLIC_SITE_PUBLISH_TRIGGER_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the API is reachable, the deploy hook is configured, and the local debug admin id is valid.
 *   common_causes: Missing debug admin user id, missing deploy hook env var, backend unavailable.
 *   recovery_steps: Fix the backend configuration or auth state, then retry.
 *   retry_safe: Yes.
 *
 * CODE:
 */
type DcxAdminPublicSitePublishRunSuccessResponse = {
  ok: true
  data: {
    surface_key: string
    triggered_by_user_id: number
    accepted_publish_at_ts_ms: number
    last_publish_status: string
    last_publish_message: string
  }
  context?: {
    surface?: string
    view?: string
    operation?: string
    identity_resolution_mode?: string
  }
}

type DcxAdminPublicSitePublishRunErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function triggerDcxAdminPublicSitePublishRun(params: {
  apiBaseUrl: string
  debugAdminUserId: number | null
}): Promise<DcxAdminPublicSitePublishRunSuccessResponse> {
  const runUrl = new URL("/admin/publish/public-site/run", params.apiBaseUrl)

  if (typeof params.debugAdminUserId === "number" && Number.isFinite(params.debugAdminUserId)) {
    runUrl.searchParams.set("admin_user_id", String(params.debugAdminUserId))
  }

  const response = await fetch(runUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAdminPublicSitePublishRunSuccessResponse
    | DcxAdminPublicSitePublishRunErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_PUBLIC_SITE_PUBLISH_TRIGGER_FAILED",
            message: "We could not trigger the DCX public-site publish request.",
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
