Context
- The first admin content workspace already had read-only tabs for `Users`, `UX Strings`, and `Emails`.
- Backend immutable save routes for UX strings and emails were already in place before this frontend step:
  - `POST /admin/content/ux-strings/save-live-row`
  - `POST /admin/content/emails/save-live-row`
- The goal for this step was to make the relevant boxes in the right-hand selected-language panels editable using the same colored autosave pattern already proven on the app account page.

What changed
- Added admin save helpers:
  - `src/lib/save_dcx_admin_live_ux_string_row.ts`
  - `src/lib/save_dcx_admin_live_email_row.ts`
- Replaced the read-only selected-language panel in:
  - `src/components/dcx_admin_ux_strings_catalog_page.tsx`
  with a textarea editor that:
  - starts blue while idle/editable
  - turns orange while editing/saving
  - turns green after a successful save
  - turns red after final save failure
  - retries failed saves automatically up to 3 times
  - disables editing while a save is in flight
  - saves on blur
- Replaced the read-only selected-language panel in:
  - `src/components/dcx_admin_emails_catalog_page.tsx`
  with editable subject/body textareas that:
  - share one autosave state cycle
  - preserve the same blue/orange/green/red pattern
  - retry failed saves automatically up to 3 times
  - disable editing while a save is in flight
  - save when focus leaves the selected-language editor surface
- Both pages keep the left/original panels read-only.
- Editing the selected English/original row also works because the save target is simply the currently selected live row id.

Behavior notes
- UX strings:
  - blur with unchanged text resets to idle without saving
  - blur with changed text saves the selected row into a new immutable version
- Emails:
  - blur from subject to body does not trigger a premature save because the page waits until focus leaves the whole selected-language editor surface
  - backend placeholder validation remains the source of truth, so malformed or missing required placeholder tokens come back as a red failed state with the backend suggested action
- After successful save, the catalog query is invalidated so the UI rebinds to the new live row id created by the immutable save contract

Verification
- `dcx_admin` production build passed successfully after the edit:
  - `npm run build`
- The default shell `npm` path on this machine was broken, so the build had to be run through the direct Node/npm path
- The Vite build also needed an escalated run outside the sandbox because `esbuild` child-process spawn hit `EPERM` in the sandbox

What comes next
- User should locally test:
  - editing a selected UX string row and seeing the border/status transition through save
  - editing a selected email subject/body row and confirming placeholder validation failures show red status
- After local behavior feels right, this likely completes the basic admin mechanics for the first flow:
  - read users
  - read/edit UX strings
  - read/edit emails
- Next larger milestone remains:
  - auth and login
  - roles/permissions over `dcx_app` and `dcx_admin`
