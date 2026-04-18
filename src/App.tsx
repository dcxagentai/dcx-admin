/**
 * CONTEXT:
 * Root app composition for the DCX admin internal workspace.
 * It now projects the protected admin routes into the same shadcn sidebar-shell pattern
 * already proven on the app surface, while preserving the existing auth and content plumbing.
 */
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { DcxAdminAuthLoginPage } from "./components/dcx_admin_auth_login_page"
import { DcxAdminContentPageCategoriesPage } from "./components/dcx_admin_content_page_categories_page"
import { DcxAdminContentPagesPage } from "./components/dcx_admin_content_pages_page"
import { DcxAdminEmailsCatalogPage } from "./components/dcx_admin_emails_catalog_page"
import { DcxAdminNewslettersPage } from "./components/dcx_admin_newsletters_page"
import { DcxAdminPublicSitePublishPage } from "./components/dcx_admin_public_site_publish_page"
import { DcxAdminShell } from "./components/dcx_admin_shell"
import { DcxAdminUsersListPage } from "./components/dcx_admin_users_list_page"
import { DcxAdminUxStringsCatalogPage } from "./components/dcx_admin_ux_strings_catalog_page"
import { DcxAdminWorkspacePlaceholderPage } from "./components/dcx_admin_workspace_placeholder_page"
import { loginDcxUserWithEmailAndPassword } from "./lib/login_dcx_user_with_email_and_password"
import { logoutAuthenticatedDcxUser } from "./lib/logout_authenticated_dcx_user"
import { readDcxAuthenticatedSession } from "./lib/read_dcx_authenticated_session"

const DCX_AUTH_LOGOUT_SYNC_STORAGE_KEY = "dcx_auth_logout_at_ts_ms"

function buildDcxAdminLinkedAppAuthPath(pathname: "/login" | "/password/reset/request", languageCode: string): string {
  const normalizedLanguageCode = ["en", "es", "fr", "de"].includes(languageCode) ? languageCode : "en"

  if (pathname === "/login") {
    return `/${normalizedLanguageCode}/t/login`
  }

  return `/${normalizedLanguageCode}/t/password/reset/request`
}

function redirectToLoginScreen(): void {
  if (window.location.pathname === "/login" && window.location.search === "") {
    return
  }

  window.location.replace("/login")
}

type DcxAdminScreen =
  | "users"
  | "schedule"
  | "content_page_categories"
  | "ux_strings"
  | "emails"
  | "content_pages"
  | "newsletters"
  | "email_sequences"
  | "content_public"
  | "content_app"
  | "content_admin"
  | "publish_public_site"

type DcxAdminRouteState = {
  activeScreen: DcxAdminScreen
  pathname: string
  initialEmailType: string | null
  routeLanguageCode: string | null
  routeCategoryKey: string | null
  routePageKey: string | null
  routeEmailKey?: string | null
  routeNewsletterKey: string | null
}

function readDcxAdminRouteStateFromPathname(pathname: string): DcxAdminRouteState {
  if (pathname === "/schedule") {
    return {
      activeScreen: "schedule",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/content/page-categories") {
    return {
      activeScreen: "content_page_categories",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
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
        initialEmailType: null,
        routeLanguageCode: decodeURIComponent(categorySegments[0]),
        routeCategoryKey: decodeURIComponent(categorySegments.slice(1).join("/")),
        routePageKey: null,
        routeEmailKey: null,
        routeNewsletterKey: null,
      }
    }
  }

  if (pathname === "/content/pages") {
    return {
      activeScreen: "content_pages",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname.startsWith("/content/pages/")) {
    const pageSegments = pathname.replace("/content/pages/", "").split("/").filter(Boolean)
    if (pageSegments.length >= 2) {
      return {
        activeScreen: "content_pages",
        pathname,
        initialEmailType: null,
        routeLanguageCode: decodeURIComponent(pageSegments[0]),
        routeCategoryKey: null,
        routePageKey: decodeURIComponent(pageSegments.slice(1).join("/")),
        routeEmailKey: null,
        routeNewsletterKey: null,
      }
    }
  }

  if (pathname === "/content/newsletters" || pathname === "/content/emails/newsletters") {
    return {
      activeScreen: "newsletters",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (
    pathname.startsWith("/content/newsletters/") ||
    pathname.startsWith("/content/emails/newsletters/")
  ) {
    const routePrefix = pathname.startsWith("/content/emails/newsletters/")
      ? "/content/emails/newsletters/"
      : "/content/newsletters/"
    const newsletterSegments = pathname.replace(routePrefix, "").split("/").filter(Boolean)
    if (newsletterSegments.length >= 2) {
      return {
        activeScreen: "newsletters",
        pathname,
        initialEmailType: null,
        routeLanguageCode: decodeURIComponent(newsletterSegments[0]),
        routeCategoryKey: null,
        routePageKey: null,
        routeEmailKey: null,
        routeNewsletterKey: decodeURIComponent(newsletterSegments.slice(1).join("/")),
      }
    }
  }

  if (pathname === "/translations/ux") {
    return {
      activeScreen: "ux_strings",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/content/ux") {
    return {
      activeScreen: "ux_strings",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/ux/public") {
    return {
      activeScreen: "content_public",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname.startsWith("/content/emails/transactional/")) {
    const emailSegments = pathname.replace("/content/emails/transactional/", "").split("/").filter(Boolean)
    if (emailSegments.length >= 2) {
      return {
        activeScreen: "emails",
        pathname,
        initialEmailType: "transactional",
        routeLanguageCode: decodeURIComponent(emailSegments[0]),
        routeCategoryKey: null,
        routePageKey: null,
        routeEmailKey: decodeURIComponent(emailSegments.slice(1).join("/")),
        routeNewsletterKey: null,
      }
    }
  }

  if (pathname === "/ux/app") {
    return {
      activeScreen: "content_app",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/ux/admin") {
    return {
      activeScreen: "content_admin",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/translations/emails") {
    return {
      activeScreen: "emails",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/content/emails/transactional") {
    return {
      activeScreen: "emails",
      pathname,
      initialEmailType: "transactional",
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/content/emails/sequences") {
    return {
      activeScreen: "email_sequences",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname.startsWith("/translations/emails/")) {
    const emailType = pathname.replace("/translations/emails/", "").trim()
    return {
      activeScreen: "emails",
      pathname,
      initialEmailType: emailType === "" ? null : decodeURIComponent(emailType),
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/content/public") {
    return {
      activeScreen: "content_public",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/content/app") {
    return {
      activeScreen: "content_app",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/content/admin") {
    return {
      activeScreen: "content_admin",
      pathname,
      initialEmailType: null,
      routeLanguageCode: null,
      routeCategoryKey: null,
      routePageKey: null,
      routeEmailKey: null,
      routeNewsletterKey: null,
    }
  }

  if (pathname === "/publish") {
    return {
      activeScreen: "publish_public_site",
      pathname,
      initialEmailType: null,
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
    initialEmailType: null,
    routeLanguageCode: null,
    routeCategoryKey: null,
    routePageKey: null,
    routeNewsletterKey: null,
  }
}

function buildPathnameForEmailType(emailType: string | null): string {
  if (!emailType || emailType === "transactional") {
    return "/content/emails/transactional"
  }

  if (emailType === "newsletter") {
    return "/content/emails/newsletters"
  }

  if (emailType === "sequence") {
    return "/content/emails/sequences"
  }

  return `/content/emails/${encodeURIComponent(emailType)}`
}

function buildPathnameForContentPageCategory(params: { languageCode: string; categoryKey: string }): string {
  return `/content/page-categories/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.categoryKey)}`
}

function buildPathnameForContentPage(params: { languageCode: string; pageKey: string }): string {
  return `/content/pages/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.pageKey)}`
}

function buildPathnameForNewsletter(params: { languageCode: string; emailKey: string }): string {
  return `/content/emails/newsletters/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.emailKey)}`
}

function buildPathnameForTransactionalEmail(params: { languageCode: string; emailKey: string }): string {
  return `/content/emails/transactional/${encodeURIComponent(params.languageCode)}/${encodeURIComponent(params.emailKey)}`
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

function readDcxAdminScreenTitle(activeScreen: DcxAdminScreen): string {
  if (activeScreen === "content_page_categories") {
    return "Categories"
  }

  if (activeScreen === "schedule") {
    return "Schedule"
  }

  if (activeScreen === "content_pages") {
    return "Pages"
  }

  if (activeScreen === "newsletters") {
    return "Newsletters"
  }

  if (activeScreen === "ux_strings") {
    return "UX"
  }

  if (activeScreen === "emails") {
    return "Transactional"
  }

  if (activeScreen === "email_sequences") {
    return "Sequences"
  }

  if (activeScreen === "content_public") {
    return "Public UX"
  }

  if (activeScreen === "content_app") {
    return "App UX"
  }

  if (activeScreen === "content_admin") {
    return "Admin UX"
  }

  if (activeScreen === "publish_public_site") {
    return "Publish"
  }

  return "Users"
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
  const routeEmailKey = routeState.routeEmailKey ?? null
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

  if (authenticatedSessionQuery.isLoading && !authenticatedSessionSummary && window.location.pathname !== "/login") {
    return null
  }

  if (!authenticatedSessionSummary) {
    const loginSurfaceErrorMessage = loginMutation.isError
      ? (loginMutation.error as Error & { suggested_action?: string }).message
      : null

    return (
      <DcxAdminAuthLoginPage
        isPending={loginMutation.isPending}
        errorMessage={loginSurfaceErrorMessage}
        onSubmit={(email, password) => loginMutation.mutate({ email, password })}
        onForgotPassword={() => {
          window.location.assign(
            `${appBaseUrl.replace(/\/$/, "")}${buildDcxAdminLinkedAppAuthPath("/password/reset/request", "en")}`,
          )
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
        <section className="mx-auto max-w-5xl border border-black/6 bg-white px-6 py-8 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
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
                className="border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
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
    <DcxAdminShell
      title={readDcxAdminScreenTitle(activeScreen)}
      currentPathname={routeState.pathname}
      userEmail={authenticatedSessionSummary.primary_email}
      userRole={authenticatedSessionSummary.user_role}
      appHref={appBaseUrl}
      onNavigateWithinAdmin={navigateToPathname}
      onLogout={() => logoutMutation.mutate()}
      isLogoutPending={logoutMutation.isPending}
    >
      {activeScreen === "users" ? (
        <DcxAdminUsersListPage
          apiBaseUrl={apiBaseUrl}
        />
      ) : null}

      {activeScreen === "schedule" ? (
        <DcxAdminWorkspacePlaceholderPage
          eyebrow="Schedule"
          title="Queued publishing and send timing"
          description="This section will own scheduled newsletter dispatches, later page publishing windows, and other date-based operations that need clear internal control."
          currentShapeTitle="Planned admin mechanics"
          currentShapeItems={[
            "Review scheduled newsletter sends before they leave the system.",
            "Cancel or reschedule queued operations without editing the content itself.",
            "Extend the same model later to future timed page publishing workflows.",
          ]}
        />
      ) : null}

      {activeScreen === "content_page_categories" ? (
        <DcxAdminContentPageCategoriesPage
          apiBaseUrl={apiBaseUrl}
          routeLanguageCode={routeLanguageCode}
          routeCategoryKey={routeCategoryKey}
          onOpenCategory={(params) => navigateToPathname(buildPathnameForContentPageCategory(params))}
          onReturnToCatalog={() => navigateToPathname("/content/page-categories")}
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
          onReturnToCatalog={() => navigateToPathname("/content/pages")}
        />
      ) : null}

      {activeScreen === "emails" ? (
        <DcxAdminEmailsCatalogPage
          apiBaseUrl={apiBaseUrl}
          initialEmailType={initialEmailType}
          routeLanguageCode={routeLanguageCode}
          routeEmailKey={routeEmailKey}
          onOpenEmail={(params) => navigateToPathname(buildPathnameForTransactionalEmail(params))}
          onReturnToCatalog={() => navigateToPathname(buildPathnameForEmailType("transactional"))}
        />
      ) : null}

      {activeScreen === "newsletters" ? (
        <DcxAdminNewslettersPage
          apiBaseUrl={apiBaseUrl}
          routeLanguageCode={routeLanguageCode}
          routeEmailKey={routeNewsletterKey}
          onOpenNewsletter={(params) => navigateToPathname(buildPathnameForNewsletter(params))}
          onReturnToCatalog={() => navigateToPathname("/content/emails/newsletters")}
        />
      ) : null}

      {activeScreen === "email_sequences" ? (
        <DcxAdminWorkspacePlaceholderPage
          eyebrow="Content / Emails"
          title="Reusable email sequences"
          description="This route is reserved for future onboarding, nurture, and operational email sequences that should be composed once and sent in a controlled order."
          currentShapeTitle="Planned sequence controls"
          currentShapeItems={[
            "Sequence templates will sit beside newsletters and transactional emails in the same admin shell.",
            "Each sequence step can later point at one immutable email-content row with send timing rules.",
            "The navigation is in place now so the client can already see where that workflow will live.",
          ]}
        />
      ) : null}

      {activeScreen === "content_public" ? (
        <DcxAdminUxStringsCatalogPage
          apiBaseUrl={apiBaseUrl}
          surfaceScope="public"
          eyebrow="UX"
          title="Public-site UX strings"
          description="Browse and edit the live public-site UX strings that feed the multilingual public frontend experience."
        />
      ) : null}

      {activeScreen === "content_app" ? (
        <DcxAdminUxStringsCatalogPage
          apiBaseUrl={apiBaseUrl}
          surfaceScope="app"
          eyebrow="UX"
          title="App UX strings"
          description="Browse and edit the live app UX strings, including the account and shell labels already wired through the multilingual user surface."
        />
      ) : null}

      {activeScreen === "content_admin" ? (
        <DcxAdminUxStringsCatalogPage
          apiBaseUrl={apiBaseUrl}
          surfaceScope="admin"
          eyebrow="UX"
          title="Admin UX strings"
          description="Browse and edit the live admin-facing UX strings as the internal CMS language and workflow copy continue to grow."
        />
      ) : null}

      {activeScreen === "publish_public_site" ? (
        <DcxAdminPublicSitePublishPage
          apiBaseUrl={apiBaseUrl}
        />
      ) : null}
    </DcxAdminShell>
  )
}

export default App
