The admin newsletters editor now includes a first send-preparation section.

What the UI can now do:
- prepare one newsletter send immediately
- prepare one newsletter send for a future datetime
- list existing prepared sends for the current newsletter
- cancel one prepared send while still in `scheduled` state

Important UX decisions:
- send-preparation buttons are disabled while the newsletter draft is dirty or autosave is still pending
- this avoids preparing a send from stale backend content while the admin thinks they are using unsaved text
- the send section is intentionally honest about the current stage:
  - recipient snapshots and tracked links are created now
  - actual provider delivery comes in the next step

Files added:
- `src/lib/read_dcx_admin_newsletter_sends_catalog.ts`
- `src/lib/prepare_dcx_admin_newsletter_send.ts`
- `src/lib/cancel_dcx_admin_newsletter_send.ts`

Main UI file updated:
- `src/components/dcx_admin_newsletters_page.tsx`

Verification:
- `dcx_admin` production build passed after the new send-preparation controls were added
