Context
- We extended the new DCX admin TanStack-plus-shadcn table pattern from users/pages/categories into the email content area.
- The goal was to stop using cramped split-view selector layouts for newsletters and transactional emails, and instead use the more standard catalog-list route plus dedicated editor route model.

What changed
- `App.tsx` now treats transactional emails and newsletters as proper list-vs-item route families, and passes `onReturnToCatalog` handlers into both surfaces.
- `dcx_admin_newsletters_page.tsx` now has two modes:
  - catalog route: intro, create-new form, filterable/sortable/column-toggleable newsletter table
  - item route: full-width newsletter editor with back button, top save action, main edit fields first, translations below, send-preparation below that
- `dcx_admin_emails_catalog_page.tsx` now has two modes:
  - catalog route: filterable/sortable/column-toggleable transactional email table built from original rows only
  - item route: back button, translation/language switcher, then either one editable full-width template card or an original-vs-selected-language comparison layout

Important implementation notes
- For both new catalogs, we list only original rows in the table so the list acts like a CMS catalog rather than a per-translation dump.
- Clicking a catalog row opens the dedicated item route using the original row language code.
- Transactional emails do not yet have a “create missing translation” action on the admin surface, so the item route only switches among existing live language rows.
- Newsletters keep the existing autosave timer plus a top-level explicit save button.

Why this matters
- The content lists now feel like normal modern CMS lists.
- The editors have enough room to be credible to the client.
- We now have a much clearer reusable admin pattern:
  - catalog route with table tooling
  - item route with back button
  - edit fields before translation management
  - actions collected near the editor status/header

What to judge next in-browser
- Whether the newsletter catalog columns are the right information density.
- Whether transactional emails should eventually get a create-translation action similar to newsletters.
- Whether these email catalogs want additional status columns or row actions once real volume grows.
