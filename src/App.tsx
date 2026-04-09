/**
 * CONTEXT:
 * Root app composition for the DCX admin internal workspace.
 * It now projects the first internal surfaces into stable path-based routes so clients and
 * internal users can think in terms of `/users`, `/translations/ux`, and `/translations/emails`
 * while the shared session bootstrap decides whether this browser may enter the protected
 * admin workspace at all cleanly.
 */
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dcxLogo from "@prompteoai/dcx-branding/assets/dcx_logo.png"

import { DcxAdminAuthLoginPage } from "./components/dcx_admin_auth_login_page"
import { DcxAdminContentPageCategoriesPage } from "./components/dcx_admin_content_page_categories_page"
import { DcxAdminContentPagesPage } from "./components/dcx_admin_content_pages_page"
import { DcxAdminEmailsCatalogPage } from "./components/dcx_admin_emails_catalog_page"
import { DcxAdminNewslettersPage } from "./components/dcx_admin_newsletters_page"
import { DcxAdminPublicSitePublishPage } from "./components/dcx_admin_public_site_publish_page"
import { DcxAdminUsersListPage } from "./components/dcx_admin_users_list_page"
import { DcxAdminUxStringsCatalogPage } from "./components/dcx_admin_ux_strings_catalog_page"
import { loginDcxUserWithEmailAndPassword } from "./lib/login_dcx_user_with_email_and_password"
import { logoutAuthenticatedDcxUser } from "./lib/logout_authenticated_dcx_user"
import { readDcxAuthenticatedSession } from "./lib/read_dcx_authenticated_session"

const DCX_AUTH_LOGOUT_SYNC_STORAGE_KEY = "dcx_auth_logout_at_ts_ms"

function redirectToLoginScreen(): void {
  if (window.location.pathname === "/login" && window.location.search === "") {
    return
  }

  window.location.replace("/login")
}

type DcxAdminScreen =
  | "users"
  | "content_page_categories"
  | "ux_strings"
  | "emails"
  | "content_pages"
  | "newsletters"
  | "publish_public_site"

type DcxAdminRouteState = {
  activeScreen: DcxAdminScreen
  pathname: string
  routeChipLabel: string
  initialEmailType: string | null
  routeLanguageCode: string | null
  routeCategoryKey: string | null
  routePageKey: string | null
  routeNewsletterKey: string | null
}

function readDcxAdminRouteStateFromPathname(pathname: string): DcxAdminRouteState {
  if (pathname === "/content/page-categories") {
    return {
      activeScreen: "content_page_categories",
      pathname,
      routeChipLabel: pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname.startsWith("/content/page-categories/")) {
    const categorySegments = pathname
      .replace("/content/page-categories/", "")
      .split("/")
      .filter(Boolean)
    if (categorySegments.length >= 2) {
      return {
        activeScreen: "content_page_categories",
        pathname,
        routeChipLabel: pathname,
        initialEmailType: null,
        routeLanguageCode: decodeURIComponent(categorySegments[0]),
        routeCategoryKey: decodeURIComponent(categorySegments.slice(1).join("/")),
        routePageKey: null,
        routeNewsletterKey: null,
      }
    }
  }

  if (pathname === "/content/pages") {
    return {
      activeScreen: "content_pages",
      pathname,
      routeChipLabel: pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname.startsWith("/content/pages/")) {
    const pageSegments = pathname.replace("/content/pages/", "").split("/").filter(Boolean)
    if (pageSegments.length >= 2) {
      return {
        activeScreen: "content_pages",
        pathname,
        routeChipLabel: pathname,
        initialEmailType: null,
        routeLanguageCode: decodeURIComponent(pageSegments[0]),
        routeCategoryKey: null,
        routePageKey: decodeURIComponent(pageSegments.slice(1).join("/")),
        routeNewsletterKey: null,
      }
    }
  }

  if (pathname === "/content/newsletters") {
    return {
      activeScreen: "newsletters",
      pathname,
      routeChipLabel: pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname.startsWith("/content/newsletters/")) {
    const newsletterSegments = pathname
      .replace("/content/newsletters/", "")
      .split("/")
      .filter(Boolean)
    if (newsletterSegments.length >= 2) {
      return {
        activeScreen: "newsletters",
        pathname,
        routeChipLabel: pathname,
        initialEmailType: null,
        routeLanguageCode: decodeURIComponent(newsletterSegments[0]),
        routeCategoryKey: null,
        routePageKey: null,
        routeNewsletterKey: decodeURIComponent(newsletterSegments.slice(1).join("/")),
      }
    }
  }

  if (pathname === "/translations/ux") {
    return {
      activeScreen: "ux_strings",
      pathname,
      routeChipLabel: pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/translations/emails") {
    return {
      activeScreen: "emails",
      pathname,
      routeChipLabel: pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname.startsWith("/translations/emails/")) {
    const emailType = pathname.replace("/translations/emails/", "").trim()
    return {
      activeScreen: "emails",
      pathname,
      routeChipLabel: pathname,
      initialEmailType: emailType === "" ? null : decodeURIComponent(emailType),
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/publish/public-site") {
    return {
      activeScreen: "publish_public_site",
      pathname,
      routeChipLabel: pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeNewsletterKey: null,
    }
  }

  return {
    activeScreen: "users",
    pathname: "/users",
    routeChipLabel: "/users",
    initialEmailType: null,
    routeLanguageCode: null,
    routeCategoryKey: null,
    routePageKey: null,
    routeNewsletterKey: null,
  }
}

function buildPathnameForScreen(screen: DcxAdminScreen): string {
  if (screen === "content_page_categories") {
    return "/content/page-categories"
  }

  if (screen === "content_pages") {
    return "/content/pages"
  }

  if (screen === "newsletters") {
    return "/content/newsletters"
  }

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

function buildPathnameForContentPageCategory(params: { languageCode: string; categoryKey: string }): string {
  return `/content/page-categories/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.categoryKey)}`
}

function buildPathnameForContentPage(params: { languageCode: string; pageKey: string }): string {
  return `/content/pages/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.pageKey)}`
}

function buildPathnameForNewsletter(params: { languageCode: string; emailKey: string }): string {
  return `/content/newsletters/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.emailKey)}`
}

function readDcxAdminApiBaseUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  if (window.location.hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000"
  }

  return "http://localhost:8000"
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
  const queryClient = useQueryClient()
  const apiBaseUrl = readDcxAdminApiBaseUrl()
  const appBaseUrl =
    import.meta.env.VITE_APP_BASE_URL ??
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:5173"
      : "https://app.dcxagent.ai")
  const [routeState, setRouteState] = useState<DcxAdminRouteState>(() =>
    readDcxAdminRouteStateFromPathname(window.location.pathname),
  )
  const authenticatedSessionQuery = useQuery({
    queryKey: ["dcx_authenticated_session"],
    queryFn: async () =>
      readDcxAuthenticatedSession({
        apiBaseUrl,
      }),
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  })
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) =>
      loginDcxUserWithEmailAndPassword({
        apiBaseUrl,
        email: credentials.email,
        password: credentials.password,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dcx_authenticated_session"] })
      navigateToPathname("/users")
    },
  })
  const logoutMutation = useMutation({
    mutationFn: async () =>
      logoutAuthenticatedDcxUser({
        apiBaseUrl,
      }),
    onSuccess: async () => {
      localStorage.setItem(DCX_AUTH_LOGOUT_SYNC_STORAGE_KEY, String(Date.now()))
      queryClient.removeQueries({ queryKey: ["dcx_authenticated_session"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_users_list"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_live_ux_strings_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_live_emails_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_content_page_categories_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_content_page_category_detail"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_content_pages_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_content_page_detail"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_newsletters_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_newsletter_detail"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_public_site_publish_status"] })
      redirectToLoginScreen()
    },
  })

  useEffect(() => {
    if (window.location.search !== "") {
      window.history.replaceState({}, "", window.location.pathname)
    }

    const normalizedRouteState = readDcxAdminRouteStateFromPathname(window.location.pathname)
    if (window.location.pathname !== "/login" && window.location.pathname !== normalizedRouteState.pathname) {
      window.history.replaceState({}, "", normalizedRouteState.pathname)
      setRouteState(normalizedRouteState)
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setRouteState(readDcxAdminRouteStateFromPathname(window.location.pathname))
    }

    const handleVisibilityOrFocusChange = () => {
      void queryClient.invalidateQueries({ queryKey: ["dcx_authenticated_session"] })
    }

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== DCX_AUTH_LOGOUT_SYNC_STORAGE_KEY) {
        return
      }

      queryClient.removeQueries({ queryKey: ["dcx_authenticated_session"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_users_list"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_live_ux_strings_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_live_emails_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_content_page_categories_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_content_page_category_detail"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_content_pages_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_content_page_detail"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_newsletters_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_newsletter_detail"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_public_site_publish_status"] })
      redirectToLoginScreen()
    }

    window.addEventListener("popstate", handlePopState)
    window.addEventListener("focus", handleVisibilityOrFocusChange)
    window.addEventListener("storage", handleStorageEvent)
    document.addEventListener("visibilitychange", handleVisibilityOrFocusChange)
    return () => {
      window.removeEventListener("popstate", handlePopState)
      window.removeEventListener("focus", handleVisibilityOrFocusChange)
      window.removeEventListener("storage", handleStorageEvent)
      document.removeEventListener("visibilitychange", handleVisibilityOrFocusChange)
    }
  }, [queryClient])

  function navigateToPathname(nextPathname: string): void {
    if (window.location.pathname === nextPathname) {
      setRouteState(readDcxAdminRouteStateFromPathname(nextPathname))
      return
    }

    window.history.pushState({}, "", nextPathname)
    setRouteState(readDcxAdminRouteStateFromPathname(nextPathname))
  }

  const activeScreen = routeState.activeScreen
  const initialEmailType = useMemo(() => routeState.initialEmailType, [routeState.initialEmailType])
  const routeLanguageCode = routeState.routeLanguageCode
  const routeCategoryKey = routeState.routeCategoryKey
  const routePageKey = routeState.routePageKey
  const routeNewsletterKey = routeState.routeNewsletterKey
  const sessionRequiredErrorCode =
    (authenticatedSessionQuery.error as Error & { code?: string } | null)?.code ?? null
  const isSessionExplicitlyMissing = sessionRequiredErrorCode === "API_DCX_AUTH_SESSION_REQUIRED"
  const authenticatedSessionSummary = isSessionExplicitlyMissing
    ? null
    : authenticatedSessionQuery.data?.data ?? null

  useEffect(() => {
    if (
      authenticatedSessionSummary?.allowed_surfaces.admin &&
      window.location.pathname === "/login"
    ) {
      navigateToPathname("/users")
      return
    }

    if (
      !authenticatedSessionSummary &&
      !authenticatedSessionQuery.isLoading &&
      window.location.pathname !== "/login"
    ) {
      queryClient.removeQueries({ queryKey: ["dcx_admin_users_list"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_live_ux_strings_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_live_emails_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_content_page_categories_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_content_page_category_detail"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_content_pages_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_content_page_detail"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_newsletters_catalog"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_newsletter_detail"] })
      queryClient.removeQueries({ queryKey: ["dcx_admin_public_site_publish_status"] })
      redirectToLoginScreen()
    }
  }, [
    authenticatedSessionQuery.isLoading,
    authenticatedSessionSummary,
    queryClient,
  ])

  if (authenticatedSessionQuery.isLoading && !authenticatedSessionSummary) {
    return (
      <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl rounded-[1.75rem] border border-black/6 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm text-slate-500">Checking DCX admin session...</p>
        </section>
      </main>
    )
  }

  if (!authenticatedSessionSummary) {
    return (
      <DcxAdminAuthLoginPage
        isPending={loginMutation.isPending}
        errorMessage={
          loginMutation.isError
            ? (loginMutation.error as Error & { suggested_action?: string }).message
            : authenticatedSessionQuery.isError
              ? (authenticatedSessionQuery.error as Error & { suggested_action?: string }).message
              : null
        }
        onSubmit={(email, password) => loginMutation.mutate({ email, password })}
        onForgotPassword={() => {
          window.location.assign(`${appBaseUrl.replace(/\/$/, "")}/password/reset/request`)
        }}
      />
    )
  }

  if (
    authenticatedSessionSummary &&
    !authenticatedSessionSummary.allowed_surfaces.admin
  ) {
    return (
      <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-5xl rounded-[1.75rem] border border-black/6 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-500">
              Admin access blocked
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              This session can enter the app, but not the admin domain.
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              The current user role is `{authenticatedSessionSummary.user_role}`. Only `admin` and
              `dev` roles should access the internal admin workspace.
            </p>
            <div className="flex flex-wrap gap-3 pt-3">
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                {logoutMutation.isPending ? "Signing out..." : "Logout"}
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

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
            {authenticatedSessionSummary ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                {authenticatedSessionSummary.primary_email} · {authenticatedSessionSummary.user_role}
              </span>
            ) : null}
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Path-based admin routes now active
            </span>
            {authenticatedSessionSummary ? (
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm transition hover:border-slate-300 hover:text-slate-950"
              >
                {logoutMutation.isPending ? "Signing out..." : "Logout"}
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3 border-t border-black/6 pt-4">
            <DcxAdminWorkspaceTabButton
              label="Users"
              isActive={activeScreen === "users"}
              onClick={() => navigateToPathname(buildPathnameForScreen("users"))}
            />
            <DcxAdminWorkspaceTabButton
              label="Categories"
              isActive={activeScreen === "content_page_categories"}
              onClick={() => navigateToPathname(buildPathnameForScreen("content_page_categories"))}
            />
            <DcxAdminWorkspaceTabButton
              label="Pages"
              isActive={activeScreen === "content_pages"}
              onClick={() => navigateToPathname(buildPathnameForScreen("content_pages"))}
            />
            <DcxAdminWorkspaceTabButton
              label="Newsletters"
              isActive={activeScreen === "newsletters"}
              onClick={() => navigateToPathname(buildPathnameForScreen("newsletters"))}
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
          <DcxAdminUsersListPage
            apiBaseUrl={apiBaseUrl}
          />
        ) : null}

        {activeScreen === "content_page_categories" ? (
          <DcxAdminContentPageCategoriesPage
            apiBaseUrl={apiBaseUrl}
            routeLanguageCode={routeLanguageCode}
            routeCategoryKey={routeCategoryKey}
            onOpenCategory={(params) => navigateToPathname(buildPathnameForContentPageCategory(params))}
          />
        ) : null}

        {activeScreen === "ux_strings" ? (
          <DcxAdminUxStringsCatalogPage
            apiBaseUrl={apiBaseUrl}
          />
        ) : null}

        {activeScreen === "content_pages" ? (
          <DcxAdminContentPagesPage
            apiBaseUrl={apiBaseUrl}
            routeLanguageCode={routeLanguageCode}
            routePageKey={routePageKey}
            onOpenPage={(params) => navigateToPathname(buildPathnameForContentPage(params))}
          />
        ) : null}

        {activeScreen === "emails" ? (
          <DcxAdminEmailsCatalogPage
            apiBaseUrl={apiBaseUrl}
            initialEmailType={initialEmailType}
            onEmailTypeRouteChange={(nextEmailType) =>
              navigateToPathname(buildPathnameForEmailType(nextEmailType))
            }
          />
        ) : null}

        {activeScreen === "newsletters" ? (
          <DcxAdminNewslettersPage
            apiBaseUrl={apiBaseUrl}
            routeLanguageCode={routeLanguageCode}
            routeEmailKey={routeNewsletterKey}
            onOpenNewsletter={(params) => navigateToPathname(buildPathnameForNewsletter(params))}
          />
        ) : null}

        {activeScreen === "publish_public_site" ? (
          <DcxAdminPublicSitePublishPage
            apiBaseUrl={apiBaseUrl}
          />
        ) : null}
      </section>
    </main>
  )
}

export default App
