The admin frontend now behaves like a small internal workspace instead of a single read-only users page.

Files added:
- `src/lib/read_dcx_admin_live_ux_strings_catalog.ts`
- `src/lib/read_dcx_admin_live_emails_catalog.ts`
- `src/components/dcx_admin_ux_strings_catalog_page.tsx`
- `src/components/dcx_admin_emails_catalog_page.tsx`

Files updated:
- `src/App.tsx`
- `src/components/dcx_admin_users_list_page.tsx`

Existing supporting file still used:
- `public/_redirects`

What changed:
- the app root now keeps one local internal tab state for:
  - `Users`
  - `UX Strings`
  - `Emails`
- screen selection is intentionally not stored in URLs yet
- the first users screen was reshaped to sit inside the shared admin workspace shell
- the new UX strings screen provides:
  - group dropdown
  - string dropdown
  - language dropdown
  - original row on one card
  - selected language row on the adjacent card
- the new emails screen provides:
  - type dropdown
  - email dropdown
  - language dropdown
  - original email on one card
  - selected language email on the adjacent card

Design direction used:
- minimalist
- compact
- premium internal-tool feel
- visually aligned with the first `dcx_app` account page

Local testing path:
- open the admin root and keep the temporary debug id in the query string:
  - `http://localhost:5174/?admin_user_id=5`
- then switch between the three internal tabs in the page itself

Why this shape was chosen:
- the user wanted to avoid URL-based selection state for now
- these read-only catalog screens are primarily about validating the schema and viewing model before CRUD is added
- the internal tabbed workspace is the smallest useful way to make multiple admin surfaces available without introducing a router early

Verification:
- `npm run build` passed in `dcx_admin`
- packaged `dist/` still contains `_redirects`

Next most natural admin step:
- judge the UX of the two content viewers locally
- then add the first controlled CRUD surfaces for emails and UX strings before finally wrapping the whole thing in real auth and permissions
