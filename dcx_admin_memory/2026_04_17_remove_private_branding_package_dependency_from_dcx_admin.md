Cloudflare-style deploy safety work for `dcx_admin`.

The admin frontend was still depending on the private GitHub Packages package `@prompteoai/dcx-branding@0.0.6`, exactly like `dcx_app` had before its deploy fix. The actual runtime usage in admin was lightweight:

- shared theme CSS import in `src/index.css`
- logo asset import in `src/components/admin-sidebar.tsx`
- logo asset import in `src/components/dcx_admin_auth_login_page.tsx`

To make admin independently deployable without GitHub Packages auth:

- removed `@prompteoai/dcx-branding` from `dcx_admin/package.json`
- updated `package-lock.json` via `npm uninstall`
- removed the app-level `.npmrc` pointing `@prompteoai` to GitHub Packages
- copied `dcx_logo.png` into `dcx_admin/src/assets/dcx_logo.png`
- added `src/styles/dcx_admin_local_branding_theme.css`
- changed `src/index.css` to import the local admin theme file
- rewired the sidebar and admin auth login page to use the local logo asset alias path

Local verification:

- `npx tsc -b` passed in `dcx_admin`
- searching the admin repo no longer finds tracked install/build references to `@prompteoai/dcx-branding` or `npm.pkg.github.com`
- full `npm run build` from the Codex shell still hit the known local `esbuild spawn EPERM` issue while loading `vite.config.ts`, so final full-build confirmation should be run from the human's normal shell

This keeps the admin surface aligned with the app surface: `dcx_branding` can remain a reference/source repo, but `dcx_admin` no longer needs the private npm package to install or deploy.
