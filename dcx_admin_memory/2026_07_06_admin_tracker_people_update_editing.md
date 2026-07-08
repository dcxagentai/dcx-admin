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
- Tracker menu order is Team, Updates, Tasks, Challenges, Operations, Strategies, Long-term, Archived.
- Team uses `public_display_name` when available, falls back to email-derived names, and displays one vertical sequence per person: assigned levels first, then updates.
- The user-facing tracker vocabulary now uses `Levels` for structured work rows and keeps `Updates` for activity notes. The stored work-item model remains unchanged.
- `not_started` still stays as the stored status value, but the UI label is `Future`.
- Status badges use stronger filled backgrounds with white text because they carry workflow state.
- Level badges use neutral monochrome labels so hierarchy stays visible without competing with status.
- Update-kind badges use lighter colored chips with dark text. The user-facing categories are Progress, Problem, Question, Decision, Meeting, Concepts, and Other.
- Stored update kinds now include `concept` and `meeting`; `decision` displays as Decision again. Existing legacy `action` updates are displayed as Other and are normalized to `note` if edited from the UI.
- Tracker badge colors now use explicit hex palettes in `dcx_admin_tracker_page.tsx` rather than relying on Tailwind color utility shades.
- The tracker update-kind and level selectors use the shared Base UI combobox trigger/value wrapper so rich badge chips render in both the trigger and dropdown rows.
- Tracker comboboxes disable query filtering for fixed option lists so all options remain visible after selecting one, and use tighter dropdown row padding.
- Level badge colors use a grey ramp from near-black `#111827` through `#374151`, `#6b7280`, `#d1d5db`, to very light `#f8fafc`.
- The top update composer has a `Create level` action. It uses the selected level as parent context when present and seeds the new level title/description from composer text when present.
- The Team view renders assigned levels in hierarchy order with indentation and a small nested marker; row text only keeps descendant counts where relevant.
- Clicking a Team level opens its detail/edit panel inline below that row, with a Hide/Cancel affordance, instead of opening the right-side panel.
- Level rows now place the level chip and title on the same line for denser scanning, including the Team list and regular tracker level cards.
- Team level rows no longer show descendant counts; the inline detail panel is visually attached to the row and only shows actions, description, and activity updates.
- Team level rows toggle their inline detail panel open/closed on repeated clicks, so the detail drawer no longer carries a separate Hide button.
- Level and update index screens now use the same inline drawer pattern for view/edit actions; the previous right-side tracker panel path is disabled.
- Team now separates assigned non-task Levels from assigned Tasks. Task rows stay compact, while opened task drawers show the parent context path with subtle `@Name` markers when a parent level belongs to another team member.
- Added an `Archived` tracker view and item archive/restore controls. Archived items are removed from normal item/update lists.
- Update rows now lead their metadata with the colored update-kind label, then author name, date, level, and edit context, making the status/type signal easier to scan.
- Inline level/update drawers now use tighter vertical spacing so repeated open/close review feels denser and less card-heavy.
- Users detail has a Tracker Team membership toggle backed by `is_tracker_team_member`.
- Team person headers show account "Last active" beside the level/task/update counts. This is computed from shared auth session last-seen/issued timestamps, user activity events, and the older user-profile `last_seen_at_ts_ms` fallback.
- Shared auth session reads now touch both `stephen_dcx_user_auth_sessions.last_seen_at_ts_ms` and `stephen_dcx_users.last_seen_at_ts_ms` at most every five minutes, so normal app/admin usage refreshes the activity signal.
- Inline level drawers now call the item activity section `Updates`, use `--/--` for missing descriptions or item updates, and update rows render any levels/tasks created from that update in a slightly indented origin list.
- The level edit drawer has an optional `Origin` dropdown that writes `origin_update_id`, so existing levels/tasks can be retro-attached to the update that produced them.
- Origin-derived level/task rows under updates show `@Name` when assigned, completing the update -> resulting work -> responsible person loop.
- Team person headers style the `Last active:` prefix as a small amber label, with the timestamp kept as plain muted text.

Backend support depends on the matching SQL migrations in `dcx_api/storage/dcx_admin_tracker_people_and_update_editing_2026_07_06.sql` and `dcx_api/storage/dcx_admin_tracker_update_kinds_decision_meeting_2026_07_08.sql`.
