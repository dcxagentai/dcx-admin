The admin workspace now has a first publish/deploy screen at `/publish/public-site`.

What changed:
- `src/App.tsx` now includes a `Publish` workspace tab and route state for `/publish/public-site`
- `src/components/dcx_admin_public_site_publish_page.tsx`
- helpers:
  - `src/lib/read_dcx_admin_public_site_publish_status.ts`
  - `src/lib/trigger_dcx_admin_public_site_publish_run.ts`

Screen behavior:
- Reads the backend publish status via TanStack Query.
- Computes a simple color tone:
  - green: no pending public UX-string changes
  - orange: 1-9 pending public changes
  - red: failed status or 10+ pending changes
- Shows:
  - last accepted publish
  - last attempted publish
  - status/message
  - managed public groups
  - current preview list of pending live rows
- Includes one `Publish public site` button that triggers the backend Cloudflare deploy hook route.

Current limitation:
- The screen still uses the temporary `?admin_user_id=` local-debug pattern.
- Because production debug ids are intentionally blocked, the screen can only fully operate locally
  until auth/roles are added.

Verification completed:
- `npm run build` passed successfully in `dcx_admin`
