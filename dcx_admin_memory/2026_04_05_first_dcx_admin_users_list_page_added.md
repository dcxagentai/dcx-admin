The first real `dcx_admin` surface now replaces the old bootstrap shell.

Files added:
- `src/lib/read_dcx_admin_users_list.ts`
- `src/components/dcx_admin_users_list_page.tsx`
- `public/_redirects`

Files updated:
- `src/App.tsx`

What the first admin page does:
- Renders the first read-only users list for the admin app
- Uses TanStack Query to fetch `GET /admin/users/list`
- Reads an optional temporary local debug `?admin_user_id=` from the browser URL
- Displays:
  - total user count
  - confirmed user count
  - number of preferred languages currently represented
  - a compact users table with email, account status, preferred language, confirmation state, timestamps, and user UUID

Design direction used:
- minimalist
- compact
- business / premium
- intentionally close to the first `dcx_app` account page so the internal surfaces already feel related

Routing note:
- No full client router was introduced yet because this first admin slice only needs one meaningful surface.
- `public/_redirects` now contains:
  - `/* /index.html 200`
- This ensures static hosting can serve `/users` cleanly instead of only working through local Vite dev fallback behavior.

Local test path:
- `http://localhost:5173/users?admin_user_id=1`
- if another Vite app is already using `5173`, use the port Vite assigns and keep the same path/query

Verification:
- `npm run build` passed in `dcx_admin`
- packaged `dist/` contains `_redirects`

Why this shape was chosen:
- It is the smallest credible first admin surface using the agreed stack:
  - React
  - TanStack Query
  - shadcn
  - Tailwind
- It gives the next auth/roles phase a real admin destination page to protect.
- It is intentionally read-only so we can keep moving without exposing live admin mutation before auth exists.

Next most natural admin step:
- add real admin session-backed identity
- then add adjacent read-only lists for email templates and UX strings
- then move into controlled edit surfaces once auth and roles are in place
