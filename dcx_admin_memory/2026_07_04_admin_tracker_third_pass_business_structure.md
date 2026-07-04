CONTEXT:
Third admin Tracker pass based on business-consumption feedback after the first live example.

WHAT CHANGED:
- Removed Current state from the visible work-item UI. The hidden field is preserved on existing records during edits, but notes/updates now carry evolving state.
- Changed user-facing Battle labels to Challenge while keeping the stored level value `battle` for compatibility.
- Changed user-facing Active labels to In progress while keeping the stored status value `active` for compatibility.
- Added multi-select Pillars in the item editor.
- Parent selection now shows items in nested order with simple depth prefixes.
- Moved Tracker to the top of the admin sidebar.
- Added Tracker sidebar sub-views:
  - Long-term
  - Strategies
  - Operations
  - Challenges
  - Tasks
  - Updates

STORAGE:
- Multi-pillar support requires applying:
  `dcx_api/storage/dcx_admin_tracker_multi_pillar_2026_07_04.sql`
- The old `pillar` column remains the primary pillar. The new `pillars` array stores the full selected set.

VERIFICATION:
- `cmd /c node_modules\.bin\tsc -b` passed.
- Bundled Python compileall passed for tracker backend files.
- `cmd /c node_modules\.bin\vite build --logLevel error` passed when run outside the restricted sandbox.

NOTES:
- Visible menu wording uses Challenges, not Battles, because the user asked to change Battle to Challenge for business consumption.
