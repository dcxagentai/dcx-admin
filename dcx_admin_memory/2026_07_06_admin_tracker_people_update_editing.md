# Admin tracker accountability polish

Added the second tracker polish pass on 2026-07-06:

- Work items can now carry an optional assigned user, displayed as a first name on cards and detail headers.
- Activity updates show the author's first name and can be edited from update rows.
- The update type selector now renders colored labels for notes, progress, blockers, decisions, questions, and actions.
- The global update composer was simplified: no visible header/field labels, a full-width update text area first, then type, level, and add button.
- The old standalone tracker title/action block was removed; refresh and new-item actions now live with the work/update lists.
- The update type selector was kept on the standard `SelectValue` path with colored trigger/items, after the direct badge-in-trigger version behaved poorly in the browser.
- Index screens no longer show a default right-hand recent activity panel; the right side appears only for selected/editing content.
- Work items can now be created from an activity update. The edit-update panel shows "Levels from this update" and a compact "Create level" action.
- The edit-update save button was moved to its own row so it cannot overflow in the right panel.
- Work item detail panels now show a clickable origin update when `origin_update_id` is present.
- Renamed `Who` to `Team`, with `/tracker/team` as the canonical route and `/tracker/who` left as a compatibility alias.
- Tracker menu order is Team, Updates, Long-term, Strategies, Operations, Challenges, Tasks, Archived.
- Team uses `public_display_name` when available, falls back to email-derived names, and displays one vertical sequence per person: assigned levels first, then updates.
- The user-facing tracker vocabulary now uses `Levels` for structured work rows and keeps `Updates` for activity notes. The stored work-item model remains unchanged.
- `not_started` still stays as the stored status value, but the UI label is `Future`.
- Status badges use stronger filled backgrounds with white text because they carry workflow state.
- Level badges use neutral monochrome labels so hierarchy stays visible without competing with status.
- Update-kind badges use lighter colored chips with dark text. The user-facing categories are Progress, Problem, Question, Concepts, and Other; backend values still use the existing safe strings (`progress`, `blocker`, `question`, `decision`, `note`) for now.
- Existing `action` updates are displayed as Other and are normalized to `note` if edited from the UI.
- Tracker badge colors now use explicit hex palettes in `dcx_admin_tracker_page.tsx` rather than relying on Tailwind color utility shades.
- The tracker update-kind and level selectors use the shared Base UI combobox trigger/value wrapper so rich badge chips render in both the trigger and dropdown rows.
- Tracker comboboxes disable query filtering for fixed option lists so all options remain visible after selecting one, and use tighter dropdown row padding.
- Level badge colors use a grey ramp from near-black `#111827` through `#374151`, `#6b7280`, `#d1d5db`, to very light `#f8fafc`.
- The top update composer has a `Create level` action. It uses the selected level as parent context when present and seeds the new level title/description from composer text when present.
- The Team view renders assigned levels in hierarchy order with indentation and a small nested marker; row text only keeps descendant counts where relevant.
- Clicking a Team level opens its detail/edit panel inline below that row, with a Hide/Cancel affordance, instead of opening the right-side panel.
- Level rows now place the level chip and title on the same line for denser scanning, including the Team list and regular tracker level cards.
- Added an `Archived` tracker view and item archive/restore controls. Archived items are removed from normal item/update lists.
- Update rows now lead their metadata with author name, then date, then item/type/edit context to better match the future weekly email digest.
- Users detail has a Tracker Team membership toggle backed by `is_tracker_team_member`.

Backend support depends on the matching SQL migration in `dcx_api/storage/dcx_admin_tracker_people_and_update_editing_2026_07_06.sql`.
