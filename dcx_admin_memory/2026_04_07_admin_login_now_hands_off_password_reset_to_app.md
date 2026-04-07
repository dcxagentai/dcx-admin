The admin login surface now keeps password reset on the app domain instead of duplicating password UX inside admin.

What changed:
- `src/components/dcx_admin_auth_login_page.tsx` now shows a forgot-password action.
- `src/App.tsx` computes the app base URL and redirects forgot-password users to the app reset-request page.

Why this shape was chosen:
- The shared auth session is one backend model for both app and admin.
- Password setup/reset is sensitive account UX and should exist in one place only.
- Admin should apply a role gate after shared auth, not fork the credential-management flow.

Verification completed:
- `npm run build` in `dcx_admin` passed after the login-hand-off update.
