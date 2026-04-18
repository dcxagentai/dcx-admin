Context
- We extended the new DCX admin table-plus-dedicated-editor pattern into the UX strings area.
- Before this change, UX strings still used the older three-selector layout with one original card and one selected-language card on the same screen.

What changed
- `App.tsx` now supports item routes for UX strings across:
  - generic UX: `/content/ux/:language/:group/:key` and `/translations/ux/:language/:group/:key`
  - public UX: `/ux/public/:language/:group/:key` and `/content/public/:language/:group/:key`
  - app UX: `/ux/app/:language/:group/:key` and `/content/app/:language/:group/:key`
  - admin UX: `/ux/admin/:language/:group/:key` and `/content/admin/:language/:group/:key`
- `dcx_admin_ux_strings_catalog_page.tsx` now has two modes:
  - catalog route: filterable/sortable/column-toggleable table of original rows only
  - item route: back button plus a dedicated editor with language-row switching and either:
    - one editable full-width card when the selected language is the original row
    - or an original-vs-selected-language comparison layout when a translation exists

Important implementation notes
- The table uses original rows only so the catalog behaves like a CMS list rather than a translation dump.
- The editor still supports autosave-on-blur for the selected language row.
- There is no translation-creation action yet for UX strings, so the editor only switches among existing live language rows.

Why this matters
- Public/app/admin UX surfaces now follow the same list-vs-edit interaction model as pages, categories, newsletters, and transactional emails.
- The UX editor has more room and a clearer mental model for the client.
- The admin surface is converging on one reusable catalog-and-editor pattern rather than a mix of competing layouts.

What to judge next in-browser
- Whether the UX strings table columns are the right density and ordering.
- Whether group/key/text should stay as separate columns or whether one of them should collapse for tighter scanning.
- Whether UX strings later need row actions or translation-creation tools once more operational workflows are in place.
