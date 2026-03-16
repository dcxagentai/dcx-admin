## 2026-03-14 DCX Admin Hello World Stack Setup

### Summary
Set up the first working `dcx_admin` frontend hello-world inside the repo root while preserving:
- `.git`
- `AGENTS.md`
- `dcx_admin_memory/`
- `dcx_admin_scratchpads/`

The repo root is now the actual admin app root.

### What Was Installed
- React via Vite
- TypeScript
- TanStack Query
- shadcn
- Tailwind CSS

### Practical Outcome
The admin frontend now has:
- `package.json`
- `src/`
- `public/`
- Vite config
- Tailwind / shadcn configuration
- one minimal hello-world admin screen
- one shadcn button component
- TanStack Query provider wiring

### Verification
Confirmed working with:
- `npm run build`

Successful build result was produced on 2026-03-14 in `dcx_admin/dist/`.

### Notes
- The initial Vite scaffold used Vite 8, but the current shadcn/Tailwind path was smoother on Vite 7 in this environment, so the frontend was aligned to a compatible Vite + Tailwind 4 setup.
- A temporary scaffold folder was used to bootstrap the app because the repo root was non-empty; that temporary folder was removed after merge.
- The Codex sandbox still has issues with the plain `npm` shim, so package operations were executed through the bundled Node npm CLI path during setup.

### Next Likely Step
Run locally from `dcx_site/dcx_admin` with:
- `npm run dev`

Then begin replacing the hello-world screen with the first real admin flow.
