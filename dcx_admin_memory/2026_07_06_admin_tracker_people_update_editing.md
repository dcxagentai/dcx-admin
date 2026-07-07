# Admin tracker accountability polish

Added the second tracker polish pass on 2026-07-06:

- Work items can now carry an optional assigned user, displayed as a first name on cards and detail headers.
- Activity updates show the author's first name and can be edited from update rows.
- The update type selector now renders colored labels for notes, progress, blockers, decisions, questions, and actions.
- The global update composer was simplified: no visible header/field labels, a full-width update text area first, then type, item, and add button.
- The old standalone tracker title/action block was removed; refresh and new-item actions now live with the work/update lists.
- The update type selector was kept on the standard `SelectValue` path with colored trigger/items, after the direct badge-in-trigger version behaved poorly in the browser.
- Index screens no longer show a default right-hand recent activity panel; the right side appears only for selected/editing content.
- Work items can now be created from an activity update. The edit-update panel shows "Items from this update" and a compact "Create item" action.
- The edit-update save button was moved to its own row so it cannot overflow in the right panel.
- Work item detail panels now show a clickable origin update when `origin_update_id` is present.
- Renamed `Who` to `Team`, with `/tracker/team` as the canonical route and `/tracker/who` left as a compatibility alias.
- Tracker menu order is Team, Updates, Long-term, Strategies, Operations, Challenges, Tasks, Archived.
- Team uses `public_display_name` when available, falls back to email-derived names, and displays one vertical sequence per person: assigned tasks/items first, then updates.
- Added an `Archived` tracker view and item archive/restore controls. Archived items are removed from normal item/update lists.
- Update rows now lead their metadata with author name, then date, then item/type/edit context to better match the future weekly email digest.
- Users detail has a Tracker Team membership toggle backed by `is_tracker_team_member`.

Backend support depends on the matching SQL migration in `dcx_api/storage/dcx_admin_tracker_people_and_update_editing_2026_07_06.sql`.
