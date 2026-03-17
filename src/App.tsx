/**
 * CONTEXT:
 * Minimal hello-world surface for the DCX admin frontend.
 * This now proves the local React + TanStack + shadcn stack boots cleanly while consuming
 * the shared branding package for the common button primitive, shared backend welcome banner,
 * and logo asset.
 *
 * CONTRACT:
 * preconditions: The Vite React app has booted, is wrapped in a QueryClientProvider, and the local branding package dependency is installed.
 * postconditions: Renders a stable admin hello-world screen with a shared branding logo, a shared branding button, a shared backend welcome banner, and one TanStack-backed status line.
 * side_effects: None.
 * idempotent: Yes.
 * retry_safe: Yes.
 * blocking_behavior: Non-blocking render after the in-memory query resolves and the shared banner performs its own backend fetch.
 *
 * NARRATIVE:
 * WHY this exists: To verify the MVP admin frontend can consume shared branding assets and shared UI primitives while also connecting to the backend shell.
 * WHEN TO USE it: During initial setup and smoke testing of the admin workspace.
 * WHEN NOT TO USE it: Once real admin flows replace the bootstrap screen.
 * WHAT CAN GO WRONG: Missing provider wiring, broken branding package dependency, broken asset import, or backend unavailability can stop parts of the screen from rendering correctly.
 * WHAT COMES NEXT: Replace this screen with the first real admin flow while continuing to consume shared branding elements.
 *
 * TESTS:
 * - renders the DCX Admin heading
 * - renders the shared logo asset without import errors
 * - renders the shared branding button without import errors
 * - renders the shared backend welcome banner without import errors
 * - renders the TanStack query status as ready
 *
 * ERRORS:
 * - ADMIN_HELLO_WORLD_PROVIDER_MISSING: TanStack hooks used outside the provider.
 *   suggested_action: Wrap the app tree in QueryClientProvider.
 *   common_causes: Provider removed from main.tsx.
 *   recovery_steps: Restore QueryClientProvider around <App />.
 *   retry_safe: Yes.
 * - ADMIN_HELLO_WORLD_BRANDING_DEPENDENCY_MISSING: Shared branding imports cannot resolve.
 *   suggested_action: Reinstall dependencies and confirm @prompteoai/dcx-branding is present.
 *   common_causes: Local file dependency not installed or stale node_modules state.
 *   recovery_steps: Run npm install again in dcx_admin after any branding package change.
 *   retry_safe: Yes.
 *
 * CODE:
 */
import { useQuery } from "@tanstack/react-query"
import { Button, SharedBackendWelcomeMessageBanner } from "@prompteoai/dcx-branding"
import dcxLogo from "@prompteoai/dcx-branding/assets/dcx_logo.png"

function App() {
  const { data } = useQuery({
    queryKey: ["dcx_admin_bootstrap_status"],
    queryFn: async () => ({ status: "ready" as const }),
  })

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-950">
      <section className="mx-auto flex max-w-3xl flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="flex items-center gap-4">
          <img src={dcxLogo} alt="DCX logo" className="h-12 w-12 rounded-xl object-contain" />
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            DCX Admin
          </p>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            Admin frontend hello world
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            React, TanStack Query, and shadcn are installed and rendering inside the
            admin workspace. The shared branding package now supplies the button,
            logo, and backend welcome banner.
          </p>
        </div>

        <SharedBackendWelcomeMessageBanner apiBaseUrl="http://127.0.0.1:8000" />

        <div className="flex flex-wrap items-center gap-4">
          <Button>shared branding button works</Button>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
            TanStack status: {data?.status ?? "loading"}
          </span>
        </div>
      </section>
    </main>
  )
}

export default App

