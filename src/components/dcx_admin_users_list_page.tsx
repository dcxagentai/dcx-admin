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
  debugAdminUserId: number | null
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

export function DcxAdminUsersListPage(props: Props) {
  const usersListQuery = useQuery({
    queryKey: ["dcx_admin_users_list", props.debugAdminUserId],
    queryFn: async () =>
      readDcxAdminUsersList({
        apiBaseUrl: props.apiBaseUrl,
        debugAdminUserId: props.debugAdminUserId,
      }),
  })

  const users = usersListQuery.data?.data.users ?? []
  const totalUserCount = usersListQuery.data?.data.total_user_count ?? 0
  const confirmedUserCount = buildConfirmedUserCount(users)
  const languageCount = buildLanguageCount(users)

  return (
    <section className="flex flex-col gap-6">
      <section className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
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
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Read-only MVP admin surface
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Local debug admin: {props.debugAdminUserId ?? "not provided"}
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-full px-4 text-xs"
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
                "Use ?admin_user_id=<existing_user_id> locally until admin auth is connected."}
            </p>
          </div>
        ) : null}
      </section>

      {!usersListQuery.isLoading && !usersListQuery.isError ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.5rem] border border-black/6 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total users</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{totalUserCount}</p>
            </article>
            <article className="rounded-[1.5rem] border border-black/6 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Confirmed</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{confirmedUserCount}</p>
            </article>
            <article className="rounded-[1.5rem] border border-black/6 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Languages seen</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{languageCount}</p>
            </article>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-4 border-b border-black/6 px-6 py-5">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Directory
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  Current DCX users
                </h2>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Ordered by latest activity
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50/80">
                  <tr className="text-left">
                    {["Email", "Status", "Language", "Confirmed", "Last seen", "Created", "UUID"].map((heading) => (
                      <th
                        key={heading}
                        className="px-6 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, userIndex) => (
                    <tr
                      key={user.user_id}
                      className={userIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-950">{user.primary_email}</p>
                          <p className="text-xs text-slate-500">{user.email_communication_preference}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-900">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {user.account_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-900">
                        {renderLanguageLabel(user)}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-900">
                        {user.primary_email_confirmed ? "Yes" : "No"}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-900">
                        {formatTimestampLabel(user.last_seen_at_ts_ms)}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-900">
                        {formatTimestampLabel(user.created_at_ts_ms)}
                      </td>
                      <td className="px-6 py-4 align-top text-xs text-slate-500">
                        {user.user_uuid}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 ? (
                <div className="px-6 py-10 text-sm text-slate-500">No DCX users found yet.</div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </section>
  )
}
