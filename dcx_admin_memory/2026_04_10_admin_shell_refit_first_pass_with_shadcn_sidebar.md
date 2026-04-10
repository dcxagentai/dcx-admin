Admin surface first-pass shadcn refit completed.

What changed
- Replaced the old rounded hero header + pill-tab shell in `src/App.tsx` with a real shadcn sidebar shell.
- Added new admin shell components:
  - `src/components/dcx_admin_shell.tsx`
  - `src/components/admin-sidebar.tsx`
  - `src/components/admin-nav-main.tsx`
  - `src/components/admin-nav-user.tsx`
- Added shared editable-field visual helpers in:
  - `src/lib/dcx_admin_editable_field_visuals.ts`
- Added missing shadcn mobile hook required by the sidebar primitive:
  - `src/hooks/use-mobile.ts`

Shell/navigation behavior
- Sidebar now holds the real admin route structure:
  - Users
  - Content
    - Categories
    - Pages
    - Newsletters
  - Translations
    - UX Strings
    - Emails
  - Publish
    - Public Site
- Open/closed section state persists in local storage.
- Lower-left footer now includes an `App workspace` link above the account/logout popup.
- Popup shows admin identity + logout.
- Main content header now shows only the active section title with sidebar trigger.
- Removed route chip, breadcrumb-like clutter, and the old top row of tab buttons.
- Session-check loading flash was removed for the normal authenticated shell path by returning `null` during the initial admin session fetch.

Visual refit
- Flattened the visible admin surfaces away from the older rounded-card style toward square corners.
- Applied that first pass to:
  - users
  - publish
  - categories
  - pages
  - newsletters
  - UX strings
  - emails
- Categories/pages/newsletters now use the shared compact save-state language:
  - Editable
  - Changed, unsaved
  - Saved
  - Save failed
- Saved state visibility was standardized to the same longer 10-second human-readable duration proven on the app surface.

What is still intentionally incomplete
- Categories/pages/newsletters still use a mix of plain HTML controls and shadcn primitives rather than a full `Field`/`Input`/`Select` conversion.
- UX strings and email template editors still keep the older autosave copy and layout logic internally, though their outer surfaces were flattened.
- Some pills/badges/buttons remain rounded; the refit concentrated first on the shell, cards, selects, and editor surfaces.
- No multilingual admin shell labels were added yet; this pass focused on layout/system polish rather than admin string seeding.

Verification
- `npm run build` in `dcx_admin` passed after the refit.

Suggested next polish moves
1. Convert categories/pages/newsletters forms to real shadcn `Field` + `Input` + `Select` composition.
2. Standardize rounded treatments for admin buttons/badges if we want the full sharper 2026 look.
3. Port the app’s compact status-label-on-field-line pattern deeper into admin editors and template editors.
4. Consider multilingual shell strings for admin after the visible layout polish is stable.
