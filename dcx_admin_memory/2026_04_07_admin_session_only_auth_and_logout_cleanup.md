Follow-up auth UX hardening for `dcx_admin`.

What changed
- Removed the last frontend parsing/use of `?admin_user_id=`.
- The admin shell now clears admin workspace queries and hard-redirects to `/login` when logout completes or when another same-origin tab broadcasts logout.
- Session rechecks now route cleanly back to `/login` instead of leaving the workspace mounted around an auth error.

Why
- The temporary debug query path is no longer part of the intended auth model.
- The admin workspace should now behave like a genuinely protected internal surface, not a bootstrap screen with local escape hatches.

Verification
- `dcx_admin` production build passed after the change.

Behavior note
- Same-origin tabs should now drop out more cleanly after logout.
- Cross-origin/subdomain tabs still rely on session recheck on focus/visibility/poll.
