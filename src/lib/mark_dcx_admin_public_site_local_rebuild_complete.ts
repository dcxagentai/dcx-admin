/**
 * CONTEXT:
 * This file marks the local dcx_public rebuild as complete from the DCX admin frontend.
 * It exists so the admin publish screen can acknowledge a manual local Astro rebuild and reset
 * the pending-change baseline without touching Cloudflare.
 *
 * CONTRACT:
 * preconditions: The admin frontend knows the backend base URL and carries one authenticated admin/dev session cookie.
 * postconditions: Returns the canonical backend local-rebuild-complete wrapper on success.
 * side_effects: Records one local rebuild completion through the backend route.
 * idempotent: No.
 * retry_safe: Yes.
 * blocking_behavior: Async fetch over HTTP.
 *
 * NARRATIVE:
 * WHY this exists: Local development needs one explicit acknowledgement path after the developer
 * manually rebuilds dcx_public.
 * WHEN TO USE it: Use it only after manually running `npm run dev` or `npm run build` in dcx_public.
 * WHEN NOT TO USE it: Do not use it in hosted environments.
 * WHAT CAN GO WRONG: The backend can reject the current session, the route can be forbidden outside local/development, or the network can fail.
 * WHAT COMES NEXT: Keep this helper stable while the local publish simulation stays in place.
 *
 * TESTS:
 * No frontend test harness exists in dcx_admin yet.
 *
 * ERRORS:
 * - DCX_ADMIN_PUBLIC_SITE_LOCAL_REBUILD_COMPLETE_FAILED: The backend returned a non-success wrapper or the fetch failed.
 *   suggested_action: Confirm the API is reachable, the route is being used locally, and the current admin/dev session is still valid.
 *   common_causes: Missing or expired session, route called outside local mode, backend unavailable.
 *   recovery_steps: Sign in again if needed, then retry in local development after backend health is restored.
 *   retry_safe: Yes.
 *
 * CODE:
 */
type DcxAdminPublicSiteLocalRebuildCompleteSuccessResponse = {
  ok: true
  data: {
    surface_key: string
    completed_by_user_id: number
    completed_at_ts_ms: number
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

type DcxAdminPublicSiteLocalRebuildCompleteErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
    suggested_action: string
  }
}

export async function markDcxAdminPublicSiteLocalRebuildComplete(params: {
  apiBaseUrl: string
}): Promise<DcxAdminPublicSiteLocalRebuildCompleteSuccessResponse> {
  const completeUrl = new URL(
    "/admin/publish/public-site/mark-local-rebuild-complete",
    params.apiBaseUrl,
  )

  const response = await fetch(completeUrl.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const payload = (await response.json()) as
    | DcxAdminPublicSiteLocalRebuildCompleteSuccessResponse
    | DcxAdminPublicSiteLocalRebuildCompleteErrorResponse

  if (!response.ok || payload.ok !== true) {
    const errorPayload =
      payload && payload.ok === false
        ? payload.error
        : {
            code: "DCX_ADMIN_PUBLIC_SITE_LOCAL_REBUILD_COMPLETE_FAILED",
            message: "We could not record the local public rebuild completion.",
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
