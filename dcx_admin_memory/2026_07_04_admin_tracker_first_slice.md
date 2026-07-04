CONTEXT:
Added the first admin Tracker frontend slice for DCX internal project structure and activity logging.

WHAT CHANGED:
- Added `/tracker` to the admin route resolver and sidebar.
- Added `DcxAdminTrackerPage`, a two-pane admin surface:
  - left: nested work-item map
  - right: selected item editor and activity updates
- Added frontend API clients for:
  - reading tracker catalog
  - saving tracker work items
  - creating tracker updates

MODEL:
- Work item fields:
  - title
  - description
  - current_state
  - level: long_term, strategy, operation, battle, task
  - pillar: legibility, investors, building, customers, other
  - status: not_started, active, waiting, done
  - optional parent_work_item_id
- Updates are activity-log entries attached to one work item.

VERIFICATION:
- `cmd /c node_modules\.bin\tsc -b` passed.
- `cmd /c node_modules\.bin\vite build` passed when run outside the restricted sandbox.
- Local admin Vite dev server was started at `http://127.0.0.1:5175/tracker`.

NOTES:
- The backend tracker migration must be applied before the page can load real data from the API.
- No target dates, owners, health labels, or tags were added by design.
