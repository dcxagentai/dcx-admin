/**
 * CONTEXT:
 * Root app composition for the DCX admin internal workspace.
 * It now projects the first internal surfaces into stable path-based routes so clients and
 * internal users can think in terms of `/users`, `/translations/ux`, and `/translations/emails`
 * while deeper selection state still lives locally inside each screen.
 */
import { useEffect, useMemo, useState } from "react"
import dcxLogo from "@prompteoai/dcx-branding/assets/dcx_logo.png"

import { DcxAdminEmailsCatalogPage } from "./components/dcx_admin_emails_catalog_page"
import { DcxAdminPublicSitePublishPage } from "./components/dcx_admin_public_site_publish_page"
import { DcxAdminUsersListPage } from "./components/dcx_admin_users_list_page"
import { DcxAdminUxStringsCatalogPage } from "./components/dcx_admin_ux_strings_catalog_page"

type DcxAdminScreen = "users" | "ux_strings" | "emails" | "publish_public_site"

type DcxAdminRouteState = {
  activeScreen: DcxAdminScreen
  pathname: string
  routeChipLabel: string
  initialEmailType: string | null
}

function readDcxAdminRouteStateFromPathname(pathname: string): DcxAdminRouteState {
  if (pathname === "/translations/ux") {
    return {
      activeScreen: "ux_strings",
      pathname,
      routeChipLabel: pathname,
      initialEmailType: null,
    }
  }

  if (pathname === "/translations/emails") {
    return {
      activeScreen: "emails",
      pathname,
      routeChipLabel: pathname,
      initialEmailType: null,
    }
  }

  if (pathname.startsWith("/translations/emails/")) {
    const emailType = pathname.replace("/translations/emails/", "").trim()
    return {
      activeScreen: "emails",
      pathname,
      routeChipLabel: pathname,
      initialEmailType: emailType === "" ? null : decodeURIComponent(emailType),
    }
  }

  if (pathname === "/publish/public-site") {
    return {
      activeScreen: "publish_public_site",
      pathname,
      routeChipLabel: pathname,
      initialEmailType: null,
    }
  }

  return {
    activeScreen: "users",
    pathname: "/users",
    routeChipLabel: "/users",
    initialEmailType: null,
  }
}

function buildPathnameForScreen(screen: DcxAdminScreen): string {
  if (screen === "ux_strings") {
    return "/translations/ux"
  }

  if (screen === "emails") {
    return "/translations/emails"
  }

  if (screen === "publish_public_site") {
    return "/publish/public-site"
  }

  return "/users"
}

function buildPathnameForEmailType(emailType: string | null): string {
  if (!emailType) {
    return "/translations/emails"
  }

  return `/translations/emails/${encodeURIComponent(emailType)}`
}

function DcxAdminWorkspaceTabButton(props: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm font-medium transition",
        props.isActive
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900",
      ].join(" ")}
    >
      {props.label}
    </button>
  )
}

function App() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"
  const currentSearchParams = new URLSearchParams(window.location.search)
  const requestedDebugAdminUserId = currentSearchParams.get("admin_user_id")
  const debugAdminUserId =
    requestedDebugAdminUserId !== null && /^\d+$/.test(requestedDebugAdminUserId)
      ? Number(requestedDebugAdminUserId)
      : null
  const [routeState, setRouteState] = useState<DcxAdminRouteState>(() =>
    readDcxAdminRouteStateFromPathname(window.location.pathname),
  )

  useEffect(() => {
    const normalizedRouteState = readDcxAdminRouteStateFromPathname(window.location.pathname)
    if (window.location.pathname !== normalizedRouteState.pathname) {
      window.history.replaceState({}, "", `${normalizedRouteState.pathname}${window.location.search}`)
      setRouteState(normalizedRouteState)
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setRouteState(readDcxAdminRouteStateFromPathname(window.location.pathname))
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  function navigateToPathname(nextPathname: string): void {
    if (window.location.pathname === nextPathname) {
      setRouteState(readDcxAdminRouteStateFromPathname(nextPathname))
      return
    }

    window.history.pushState({}, "", `${nextPathname}${window.location.search}`)
    setRouteState(readDcxAdminRouteStateFromPathname(nextPathname))
  }

  const activeScreen = routeState.activeScreen
  const initialEmailType = useMemo(() => routeState.initialEmailType, [routeState.initialEmailType])

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[1.75rem] border border-black/6 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={dcxLogo} alt="DCX logo" className="h-11 w-11 rounded-xl bg-[#fbfaf7] p-1.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  DCX Admin
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Internal workspace
                </h1>
              </div>
            </div>

            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {routeState.routeChipLabel}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Local debug admin: {debugAdminUserId ?? "not provided"}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Path-based admin routes now active
            </span>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-black/6 pt-4">
            <DcxAdminWorkspaceTabButton
              label="Users"
              isActive={activeScreen === "users"}
              onClick={() => navigateToPathname(buildPathnameForScreen("users"))}
            />
            <DcxAdminWorkspaceTabButton
              label="UX Strings"
              isActive={activeScreen === "ux_strings"}
              onClick={() => navigateToPathname(buildPathnameForScreen("ux_strings"))}
            />
            <DcxAdminWorkspaceTabButton
              label="Emails"
              isActive={activeScreen === "emails"}
              onClick={() => navigateToPathname(buildPathnameForScreen("emails"))}
            />
            <DcxAdminWorkspaceTabButton
              label="Publish"
              isActive={activeScreen === "publish_public_site"}
              onClick={() => navigateToPathname(buildPathnameForScreen("publish_public_site"))}
            />
          </div>
        </header>

        {activeScreen === "users" ? (
          <DcxAdminUsersListPage apiBaseUrl={apiBaseUrl} debugAdminUserId={debugAdminUserId} />
        ) : null}

        {activeScreen === "ux_strings" ? (
          <DcxAdminUxStringsCatalogPage apiBaseUrl={apiBaseUrl} debugAdminUserId={debugAdminUserId} />
        ) : null}

        {activeScreen === "emails" ? (
          <DcxAdminEmailsCatalogPage
            apiBaseUrl={apiBaseUrl}
            debugAdminUserId={debugAdminUserId}
            initialEmailType={initialEmailType}
            onEmailTypeRouteChange={(nextEmailType) =>
              navigateToPathname(buildPathnameForEmailType(nextEmailType))
            }
          />
        ) : null}

        {activeScreen === "publish_public_site" ? (
          <DcxAdminPublicSitePublishPage
            apiBaseUrl={apiBaseUrl}
            debugAdminUserId={debugAdminUserId}
          />
        ) : null}
      </section>
    </main>
  )
}

export default App
