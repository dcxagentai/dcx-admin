CONTEXT:
On 2026-07-10, the admin frontend gained Japanese as a supported language surface.

CHANGE:
- Added `ja -> JP` to `src/lib/dcx_admin_language_flag_options.ts`.
- Added a Japanese supported-language row for frontend-managed missing-language controls.
- Added Japanese into the content-page route/readiness display ordering.
- Expanded linked app auth route generation in `src/App.tsx` to allow all current core language
  codes, including `ja`, instead of only English/Spanish/French/German.

WHY:
- Admin editors should be able to create AI translations into Japanese and see Japanese route
  readiness with the same flag/selector behavior as the other core languages.

CHECKS:
- `npm run build` passed for `dcx_admin`.
