CONTEXT:
Second admin Tracker UX pass after the first real example showed the page will get crowded quickly.

WHAT CHANGED:
- Kept the left pane as the work map, but added search plus level, pillar, and status filters.
- Added expand and collapse controls for the nested work-item tree.
- Active filters force matching branches open so search/filter results are not hidden behind collapsed parents.
- Changed selection behavior to read-first: clicking an item now opens a brief/detail view instead of immediately showing the edit form.
- Added an explicit Edit button and kept New child available from the selected item.
- Added a Cancel path for create/edit mode.
- Added a breadcrumb trail in the selected item panel so tasks can be read in their long-term/strategy/operation/battle context.
- Moved activity updates into the selected work item detail panel so notes, blockers, decisions, and actions feel attached to the actual situation.
- Kept a recent activity panel only for the empty/no-selection state.
- Put Current state above Description in the edit form because it is the more operationally useful field during weekly calls.

VERIFICATION:
- `cmd /c node_modules\.bin\tsc -b` passed.
- `cmd /c node_modules\.bin\vite build --logLevel error` passed when run outside the restricted sandbox.

NOTES:
- No local Vite dev server was started for this pass; the user plans to check the live version directly.
- The next UX pressure point is likely parent selection once many items exist.
