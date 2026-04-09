Added a first dedicated admin category editor route and aligned document-like editors with the calmer save model discussed with the user.

Category surface:
- new route shape:
  - `/content/page-categories`
  - `/content/page-categories/<language>/<category_key>`
- supports:
  - create English original category
  - open/save category rows
  - create translation rows
- frontend component:
  - `dcx_admin_content_page_categories_page.tsx`

Document save behavior updated:
- pages, newsletters, and categories now:
  - stay orange while there are unsaved changes
  - expose an explicit save button
  - autosave every 30 seconds while dirty
  - clear the pending autosave timer when the user presses save manually
- field blur does not trigger saves for these long-form editors

Also widened related plumbing:
- admin route state now includes a category editor screen
- logout/session cleanup clears category detail query state too
- public publish status now counts category changes as pending public content
- public content-page bundle and publish preview can fall back to the original category row when a translated category row does not yet exist

Verification:
- `dcx_api_app_test.py` passed
- `dcx_admin` build passed
