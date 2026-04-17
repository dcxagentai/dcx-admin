The admin users directory now uses `@tanstack/react-table` as its row/column modeling layer while preserving the existing visual grouping into three separate blocks:

- `Dev`
- `Admin`
- `Users`

What changed:
- Added `@tanstack/react-table` to `dcx_admin/package.json`
- Refactored `src/components/dcx_admin_users_list_page.tsx` so:
  - one shared TanStack column definition drives the users directory table
  - the three role-group sections reuse the same table column model
  - existing visual behavior is preserved:
    - green/amber circular verification markers
    - truncated email and UUID with full hover title
    - fixed-width table columns

Why this shape:
- It gives `dcx_admin` a reusable table foundation before more catalog/list screens are added.
- It avoids premature abstraction into a shadcn table wrapper before we know the reusable rendering surface we actually want.
- It preserves the current grouped directory layout, which is useful for internal scanning, while still moving the data grid logic onto a real table engine.

Checks:
- TypeScript build stage passed via the direct npm/node execution path.
- Full `vite build` in this Codex shell still hits the known local `esbuild spawn EPERM` issue, so the full production build should still be verified in the user's normal shell as usual.

Likely next step:
- Reuse this same TanStack approach for the next admin list screens, then decide whether to add one DCX-specific shared table shell and optionally shadcn table rendering primitives on top.
