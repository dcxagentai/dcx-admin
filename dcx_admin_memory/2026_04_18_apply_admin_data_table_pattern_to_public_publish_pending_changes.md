# 2026_04_18_apply_admin_data_table_pattern_to_public_publish_pending_changes

## Summary
- Applied the existing admin TanStack-plus-shadcn table pattern to the `/publish` route's `Pending changes` section.
- Replaced the old stacked pending-change list with a real table using `DcxAdminDataTable`.
- Added lightweight filter and column-visibility controls so the section now behaves like the other admin catalogs.

## Files
- `src/components/dcx_admin_public_site_publish_page.tsx`

## Implementation notes
- Kept the top publish health/action cards unchanged.
- Pending changes now render as columns for:
  - item
  - kind
  - language
  - public path
  - updated
- Added filter text matching across labels, language, path, and content kind.
- Reused the admin dropdown/input/button/table primitives rather than introducing a new publish-specific table shell.

## Why this shape
- The pending changes list is operational data now, not just an informational list.
- It fits the same internal scanning workflow as users/pages/categories/newsletters/UX strings.
- This keeps admin list behavior more consistent across the surface.

## What to judge next
- Whether `/publish` wants ordering controls exposed more explicitly, or whether the current sortable headers are enough.
- Whether pending changes should eventually become clickable into the relevant editor route.
