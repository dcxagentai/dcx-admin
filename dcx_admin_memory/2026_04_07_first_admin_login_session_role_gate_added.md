`dcx_admin` now has its first real auth-aware shell with a role gate.

What changed:
- added `GET /auth/session` bootstrap from the admin shell
- added admin login page
- added shared login/logout mutations
- admin reads and writes now send cookies with `credentials: "include"`
- the admin shell checks `allowed_surfaces.admin`
- admin routes still preserve local debug `?admin_user_id=` only as a local fallback while the transition completes

Current behavior:
- authenticated `admin`/`dev` session -> admin workspace renders
- authenticated non-admin session -> access-blocked screen renders
- no session and no local debug fallback -> `/login`
- local debug `?admin_user_id=` in local/development -> still allows testing internal tools without full login

Verification completed:
- `dcx_admin` build passed after the auth shell changes

Still missing:
- password setup/reset UX
- richer admin access-denied handling
- production publish-button test with real session-backed admin access

Immediate next step:
- create one real admin/dev password credential and test a full admin login, role gate, content edit, and publish loop.
