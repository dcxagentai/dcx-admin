Context
- The admin workspace previously kept all screen-selection state at the root route and switched tabs locally.
- The product direction now wants client-legible internal routes such as `/users`, `/translations/ux`, and `/translations/emails`.

What changed
- Replaced root-only screen selection in `src/App.tsx` with lightweight path-based route handling built on the browser History API.
- Current supported routes:
  - `/users`
  - `/translations/ux`
  - `/translations/emails`
  - `/translations/emails/:email_type`
- The app still preserves the local debug admin query parameter, for example:
  - `/users?admin_user_id=5`
- The emails screen now accepts a route-driven initial email type and pushes URL updates when the type dropdown changes.

Why this shape
- It gives cleaner client-facing and internal URLs without adding a routing dependency yet.
- It keeps deeper selection state local inside each screen while still making the main admin surfaces addressable.
- It leaves room to introduce a full router later if nested pages or auth guards need it.

Verification
- `dcx_admin` production build passed after the route update.

What comes next
- User can now test:
  - `/users?admin_user_id=5`
  - `/translations/ux?admin_user_id=5`
  - `/translations/emails?admin_user_id=5`
  - `/translations/emails/transactional?admin_user_id=5`
- Future admin additions such as public publish status can naturally slot into more path-based routes instead of more root tabs.
