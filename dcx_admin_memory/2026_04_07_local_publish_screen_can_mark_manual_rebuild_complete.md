The admin publish screen now supports the full local-only publish simulation loop.

What changed:
- `read_dcx_admin_public_site_publish_status` now includes:
  - `runtime_environment`
  - `publish_execution_mode`
- New frontend helper:
  - `src/lib/mark_dcx_admin_public_site_local_rebuild_complete.ts`
- `src/components/dcx_admin_public_site_publish_page.tsx` now:
  - shows copy that changes based on local vs hosted publish mode
  - shows a `Mark local rebuild complete` button when:
    - `publish_execution_mode = local_manual_rebuild`
    - `last_publish_status = local_manual_rebuild_required`

Local workflow now:
1. edit public UX strings
2. click `Publish public site`
3. manually run or refresh `dcx_public`
4. click `Mark local rebuild complete`
5. pending count resets against the new baseline timestamp

Verification completed:
- `npm run build` passed successfully in `dcx_admin`
