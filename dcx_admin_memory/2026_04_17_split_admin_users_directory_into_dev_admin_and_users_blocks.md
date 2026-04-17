The admin users directory is now split into three separate blocks driven by the real backend `user_role` field rather than email-domain heuristics.

What changed:
- `dcx_api/admin/users/read_dcx_admin_user_list.py` now includes `u.user_role` in the admin users-list payload.
- `dcx_admin/src/lib/read_dcx_admin_users_list.ts` now carries that `user_role` field in the frontend type.
- `dcx_admin/src/components/dcx_admin_users_list_page.tsx` now groups rows into:
  - `Dev` for `user_role == "dev"`
  - `Admin` for `user_role == "admin"`
  - `Users` for everything else

Why:
- We already had a real role signal in the backend auth/session layer, so it was safer and clearer to reuse that than to infer categories from email addresses.
- This keeps the internal directory aligned with actual access semantics:
  - `dev` and `admin` can access admin
  - `user` is the normal product user role

Checks completed:
- backend `py_compile` passed for the updated admin users-list capability and test file
- admin frontend TypeScript check passed via the direct npm/node execution path

Follow-up:
- If we later add more internal role types, the grouping helper in `dcx_admin_users_list_page.tsx` is the place to expand the directory sections deliberately.
