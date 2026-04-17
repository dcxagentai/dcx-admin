/**
 * CONTEXT:
 * Minimal first users list for the DCX admin frontend.
 * It exists to prove the admin surface can render real management data in a compact,
 * premium interface before editing, roles, and broader admin navigation exist.
 */
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"

import {
  readDcxAdminUsersList,
  type DcxAdminUserListRow,
} from "../lib/read_dcx_admin_users_list"

type Props = {
  apiBaseUrl: string
}

function formatTimestampLabel(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestampMs))
}

function renderLanguageLabel(user: DcxAdminUserListRow): string {
  if (!user.preferred_language) {
    return "Not set"
  }

  return `${user.preferred_language.language_name_native} (${user.preferred_language.language_code})`
}

function buildConfirmedUserCount(users: DcxAdminUserListRow[]): number {
  return users.filter((user) => user.primary_email_confirmed).length
}

function buildLanguageCount(users: DcxAdminUserListRow[]): number {
  return new Set(
    users
      .map((user) => user.preferred_language?.language_code ?? null)
      .filter((languageCode): languageCode is string => languageCode !== null),
  ).size
}

function normalizeDcxAdminDirectoryRole(userRole: string | null | undefined): "dev" | "admin" | "user" {
  if (userRole === "dev") {
    return "dev"
  }

  if (userRole === "admin") {
    return "admin"
  }

  return "user"
}

function buildDcxAdminDirectoryGroups(users: DcxAdminUserListRow[]) {
  return {
    dev: users.filter((user) => normalizeDcxAdminDirectoryRole(user.user_role) === "dev"),
    admin: users.filter((user) => normalizeDcxAdminDirectoryRole(user.user_role) === "admin"),
    user: users.filter((user) => normalizeDcxAdminDirectoryRole(user.user_role) === "user"),
  }
}

function renderContactStatusCell(params: {
  heading: "email" | "phone"
  contactValue: string | null
  isVerified: boolean | null
}) {
  if (!params.contactValue) {
    return <span className="text-sm text-slate-300">-</span>
  }

  if (params.isVerified) {
    return (
      <span
        aria-label={`Primary ${params.heading} verified`}
        className="inline-flex items-center"
        title={`Primary ${params.heading} verified: ${params.contactValue}`}
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[0.7rem] font-bold leading-none text-white">
          ✓
        </span>
      </span>
    )
  }

  return (
    <span
      aria-label={`Primary ${params.heading} saved but not yet verified`}
      className="inline-flex items-center"
      title={`Primary ${params.heading} saved but not yet verified: ${params.contactValue}`}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[0.7rem] font-bold leading-none text-white">
        ✓
      </span>
    </span>
  )
}

function DcxAdminUsersDirectoryTableSection(props: {
  title: string
  users: DcxAdminUserListRow[]
  emptyLabel: string
}) {
  return (
    <section className="overflow-hidden border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
      <div className="border-b border-black/6 px-6 py-5">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">{props.title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50/80">
            <tr className="text-left">
              {[
                { key: "primary_email_value", label: "Email" },
                { key: "primary_email_status", label: "Email" },
                { key: "primary_phone_status", label: "Phone" },
                { key: "language", label: "Language" },
                { key: "last_seen", label: "Last seen" },
                { key: "created", label: "Created" },
                { key: "uuid", label: "UUID" },
              ].map((heading) => (
                <th
                  key={heading.key}
                  className="px-6 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  {heading.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.users.map((user, userIndex) => (
              <tr
                key={user.user_id}
                className={userIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
              >
                <td className="px-6 py-4 align-top">
                  <div className="space-y-1">
                    <p
                      className="max-w-[18rem] truncate text-sm font-medium text-slate-950"
                      title={user.primary_email}
                    >
                      {user.primary_email}
                    </p>
                    <p className="text-xs text-slate-500">{user.email_communication_preference}</p>
                  </div>
                </td>
                <td className="px-6 py-4 align-top text-sm text-slate-900">
                  {renderContactStatusCell({
                    heading: "email",
                    contactValue: user.primary_email,
                    isVerified: user.primary_email_confirmed,
                  })}
                </td>
                <td className="px-6 py-4 align-top text-sm text-slate-900">
                  {renderContactStatusCell({
                    heading: "phone",
                    contactValue: user.primary_phone,
                    isVerified: user.primary_phone_confirmed,
                  })}
                </td>
                <td className="px-6 py-4 align-top text-sm text-slate-900">
                  {renderLanguageLabel(user)}
                </td>
                <td className="px-6 py-4 align-top text-sm text-slate-900">
                  {formatTimestampLabel(user.last_seen_at_ts_ms)}
                </td>
                <td className="px-6 py-4 align-top text-sm text-slate-900">
                  {formatTimestampLabel(user.created_at_ts_ms)}
                </td>
                <td className="px-6 py-4 align-top text-xs text-slate-500">
                  <span className="block max-w-[16rem] truncate" title={user.user_uuid}>
                    {user.user_uuid}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {props.users.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">{props.emptyLabel}</div>
        ) : null}
      </div>
    </section>
  )
}

export function DcxAdminUsersListPage(props: Props) {
  const usersListQuery = useQuery({
    queryKey: ["dcx_admin_users_list"],
    queryFn: async () =>
      readDcxAdminUsersList({
        apiBaseUrl: props.apiBaseUrl,
      }),
  })

  const users = usersListQuery.data?.data.users ?? []
  const totalUserCount = usersListQuery.data?.data.total_user_count ?? 0
  const confirmedUserCount = buildConfirmedUserCount(users)
  const languageCount = buildLanguageCount(users)
  const groupedUsers = buildDcxAdminDirectoryGroups(users)

  return (
    <section className="flex flex-col gap-6">
      <section className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-black/6 pb-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Directory
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Users
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              View the current DCX users table in one compact internal surface while auth and
              editing are still being built.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-slate-600">
            <span className="border border-slate-200 bg-slate-50 px-3 py-1">
              Read-only MVP admin surface
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-none px-4 text-xs"
              onClick={() => usersListQuery.refetch()}
            >
              Refresh
            </Button>
          </div>
        </div>

        {usersListQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading users list...</p>
        ) : null}

        {usersListQuery.isError ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
              Admin read blocked
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              We could not load the DCX users list.
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              {(usersListQuery.error as Error & { suggested_action?: string }).message}
            </p>
            <p className="text-sm text-slate-500">
              {(usersListQuery.error as Error & { suggested_action?: string }).suggested_action ??
                "Sign in with a valid admin or dev session, then retry."}
            </p>
          </div>
        ) : null}
      </section>

      {!usersListQuery.isLoading && !usersListQuery.isError ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <article className="border border-black/6 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total users</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{totalUserCount}</p>
            </article>
            <article className="border border-black/6 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Confirmed</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{confirmedUserCount}</p>
            </article>
            <article className="border border-black/6 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Languages seen</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{languageCount}</p>
            </article>
          </section>

          <section className="border border-black/6 bg-white px-6 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Directory
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  Current DCX users
                </h2>
              </div>
              <div className="border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Ordered by latest activity
              </div>
            </div>
          </section>

          <DcxAdminUsersDirectoryTableSection
            title="Dev"
            users={groupedUsers.dev}
            emptyLabel="No dev users found yet."
          />
          <DcxAdminUsersDirectoryTableSection
            title="Admin"
            users={groupedUsers.admin}
            emptyLabel="No admin users found yet."
          />
          <DcxAdminUsersDirectoryTableSection
            title="Users"
            users={groupedUsers.user}
            emptyLabel="No standard users found yet."
          />
        </>
      ) : null}
    </section>
  )
}
