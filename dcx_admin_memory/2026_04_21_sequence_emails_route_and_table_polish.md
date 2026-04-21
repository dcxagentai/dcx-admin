Sequence emails and first-pass table polish landed in this slice.

What changed:
- Added a real `Sequence Emails` lane to admin routing/navigation instead of forcing sequence steps to borrow the transactional email editor path.
- `DcxAdminEmailsCatalogPage` is now a managed-email surface that can render either transactional or sequence content with type-aware labels, back links, empty states, and translation error copy.
- Added sequence-email draft creation from the admin sequence-email catalog through the new backend route.
- `DcxAdminEmailSequencesPage` now restricts source-email options to live original `sequence` emails only.
- The sequence catalog now uses the shared `DcxAdminDataTable` TanStack/shadcn pattern instead of bespoke card rows.
- The schedule page now uses the same shared table shell for queued operations.

Why this matters:
- The admin information architecture now better matches the product model:
  - newsletters
  - sequence plans
  - sequence emails
  - transactional emails
- New slices are starting to converge back onto the same shared UI patterns instead of drifting into one-off list implementations.

Verification:
- `dcx_admin` production build passed after these changes.

What still comes next:
- Sequence detail editing is still a first-pass form surface; later we can polish that editor further with more shared field/group primitives.
- Schedule still only shows newsletter sends and sequence launches, not future page-publish jobs.
