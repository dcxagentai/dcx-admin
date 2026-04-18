/**
 * CONTEXT:
 * Minimal first users list for the DCX admin frontend.
 * It exists to prove the admin surface can render real management data in a compact,
 * premium interface before editing, roles, and broader admin navigation exist.
 */
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  createColumnHelper,
  type SortingState,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { DcxAdminDataTable } from "@/components/ui/dcx_admin_data_table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ArrowUpDownIcon, ChevronDownIcon } from "lucide-react"

import {
  readDcxAdminUsersList,
  type DcxAdminUserListRow,
} from "../lib/read_dcx_admin_users_list"

type Props = {
  apiBaseUrl: string
}

function DcxAdminSortableHeader(props: {
  title: string
  canSort: boolean
  sortDirection: false | "asc" | "desc"
  onToggleSort: () => void
}) {
  if (!props.canSort) {
    return props.title
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="-ml-3 h-8 px-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500 hover:bg-slate-100"
      onClick={props.onToggleSort}
    >
      {props.title}
      <ArrowUpDownIcon className="size-3.5" />
    </Button>
  )
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

function readDcxAdminDirectoryColumnWidthClass(columnId: string): string {
  if (columnId === "primary_email_value") {
    return "w-[14rem]"
  }

  if (columnId === "primary_email_status" || columnId === "primary_phone_status") {
    return "w-[7rem]"
  }

  if (columnId === "language") {
    return "w-[10rem]"
  }

  if (columnId === "last_seen" || columnId === "created") {
    return "w-[9rem]"
  }

  if (columnId === "uuid") {
    return "w-[11rem]"
  }

  return ""
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

const dcxAdminDirectoryColumnHelper = createColumnHelper<DcxAdminUserListRow>()

const dcxAdminDirectoryColumns: ColumnDef<DcxAdminUserListRow, any>[] = [
  dcxAdminDirectoryColumnHelper.accessor("primary_email", {
    id: "primary_email_value",
    enableHiding: false,
    header: ({ column }) => (
      <DcxAdminSortableHeader
        title="Email"
        canSort={column.getCanSort()}
        sortDirection={column.getIsSorted()}
        onToggleSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: (cellContext) => (
      <div className="space-y-1">
        <p
          className="block w-full truncate text-sm font-medium text-slate-950"
          title={cellContext.row.original.primary_email}
        >
          {cellContext.row.original.primary_email}
        </p>
        <p className="text-xs text-slate-500">
          {cellContext.row.original.email_communication_preference}
        </p>
      </div>
    ),
  }),
  dcxAdminDirectoryColumnHelper.display({
    id: "primary_email_status",
    header: "Email",
    enableHiding: false,
    cell: (cellContext) =>
      renderContactStatusCell({
        heading: "email",
        contactValue: cellContext.row.original.primary_email,
        isVerified: cellContext.row.original.primary_email_confirmed,
      }),
  }),
  dcxAdminDirectoryColumnHelper.display({
    id: "primary_phone_status",
    header: "Phone",
    enableHiding: false,
    cell: (cellContext) =>
      renderContactStatusCell({
        heading: "phone",
        contactValue: cellContext.row.original.primary_phone,
        isVerified: cellContext.row.original.primary_phone_confirmed,
      }),
  }),
  dcxAdminDirectoryColumnHelper.display({
    id: "language",
    enableSorting: true,
    header: ({ column }) => (
      <DcxAdminSortableHeader
        title="Language"
        canSort={column.getCanSort()}
        sortDirection={column.getIsSorted()}
        onToggleSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    sortingFn: (rowA, rowB) =>
      renderLanguageLabel(rowA.original).localeCompare(renderLanguageLabel(rowB.original)),
    cell: (cellContext) => renderLanguageLabel(cellContext.row.original),
  }),
  dcxAdminDirectoryColumnHelper.accessor("last_seen_at_ts_ms", {
    id: "last_seen",
    header: ({ column }) => (
      <DcxAdminSortableHeader
        title="Last seen"
        canSort={column.getCanSort()}
        sortDirection={column.getIsSorted()}
        onToggleSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: (cellContext) => (
      <span className="block whitespace-nowrap">{formatTimestampLabel(cellContext.getValue())}</span>
    ),
  }),
  dcxAdminDirectoryColumnHelper.accessor("created_at_ts_ms", {
    id: "created",
    header: ({ column }) => (
      <DcxAdminSortableHeader
        title="Created"
        canSort={column.getCanSort()}
        sortDirection={column.getIsSorted()}
        onToggleSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: (cellContext) => (
      <span className="block whitespace-nowrap">{formatTimestampLabel(cellContext.getValue())}</span>
    ),
  }),
  dcxAdminDirectoryColumnHelper.accessor("user_uuid", {
    id: "uuid",
    header: "UUID",
    cell: (cellContext) => (
      <span className="block w-full truncate" title={cellContext.getValue()}>
        {cellContext.getValue()}
      </span>
    ),
  }),
]

function DcxAdminUsersDirectoryTableSection(props: {
  title: string
  users: DcxAdminUserListRow[]
  emptyLabel: string
  sorting: SortingState
  onSortingChange: (nextValue: SortingState | ((old: SortingState) => SortingState)) => void
  columnVisibility: VisibilityState
  onColumnVisibilityChange: (
    nextValue:
      | VisibilityState
      | ((old: VisibilityState) => VisibilityState),
  ) => void
}) {
  return (
    <section className="overflow-hidden border border-black/6 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
      <div className="border-b border-black/6 px-6 py-5">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">{props.title}</h3>
      </div>

      <div className="overflow-x-auto">
        <DcxAdminDataTable
          columns={dcxAdminDirectoryColumns}
          data={props.users}
          emptyLabel={props.emptyLabel}
          readColumnWidthClassName={readDcxAdminDirectoryColumnWidthClass}
          sorting={props.sorting}
          onSortingChange={props.onSortingChange}
          columnVisibility={props.columnVisibility}
          onColumnVisibilityChange={props.onColumnVisibilityChange}
        />
      </div>
    </section>
  )
}

export function DcxAdminUsersListPage(props: Props) {
  const [emailFilterValue, setEmailFilterValue] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    uuid: false,
  })
  const usersListQuery = useQuery({
    queryKey: ["dcx_admin_users_list"],
    queryFn: async () =>
      readDcxAdminUsersList({
        apiBaseUrl: props.apiBaseUrl,
      }),
  })

  const users = usersListQuery.data?.data.users ?? []
  const filteredUsers = useMemo(() => {
    const normalizedFilterValue = emailFilterValue.trim().toLowerCase()
    if (normalizedFilterValue === "") {
      return users
    }

    return users.filter((user) => user.primary_email.toLowerCase().includes(normalizedFilterValue))
  }, [emailFilterValue, users])
  const groupedUsers = buildDcxAdminDirectoryGroups(filteredUsers)

  return (
    <section className="flex flex-col gap-6">
      {usersListQuery.isLoading ? (
        <section className="border border-black/6 bg-white px-6 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm text-slate-500">Loading users list...</p>
        </section>
      ) : null}

      {usersListQuery.isError ? (
        <section className="border border-black/6 bg-white px-6 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
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
        </section>
      ) : null}

      {!usersListQuery.isLoading && !usersListQuery.isError ? (
        <>
          <section className="border border-black/6 bg-white px-6 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  value={emailFilterValue}
                  onChange={(event) => setEmailFilterValue(event.target.value)}
                  placeholder="Filter emails..."
                  className="h-10 w-full min-w-0 rounded-md sm:w-[16rem]"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="h-10 rounded-md px-4">
                      Columns
                      <ChevronDownIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {dcxAdminDirectoryColumns
                      .filter((column) => column.id !== undefined)
                      .map((column) => {
                        const columnId = String(column.id)
                        const headerLabel =
                          columnId === "primary_email_value"
                            ? "Email"
                            : columnId === "primary_email_status"
                              ? "Email status"
                              : columnId === "primary_phone_status"
                                ? "Phone"
                                : columnId === "last_seen"
                                  ? "Last seen"
                                  : columnId === "created"
                                    ? "Created"
                                    : columnId === "uuid"
                                      ? "UUID"
                                      : "Language"

                        const isVisible = columnVisibility[columnId] !== false

                        return (
                          <DropdownMenuCheckboxItem
                            key={columnId}
                            checked={isVisible}
                            disabled={
                              columnId === "primary_email_value"
                              || columnId === "primary_email_status"
                              || columnId === "primary_phone_status"
                            }
                            onCheckedChange={(checked) =>
                              setColumnVisibility((currentVisibility) => ({
                                ...currentVisibility,
                                [columnId]: Boolean(checked),
                              }))
                            }
                          >
                            {headerLabel}
                          </DropdownMenuCheckboxItem>
                        )
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-md px-4"
                  onClick={() => usersListQuery.refetch()}
                >
                  Refresh
                </Button>
                <div className="border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                  Ordered by latest activity
                </div>
              </div>
            </div>
          </section>

          <DcxAdminUsersDirectoryTableSection
            title="Dev"
            users={groupedUsers.dev}
            emptyLabel="No dev users found yet."
            sorting={sorting}
            onSortingChange={setSorting}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
          />
          <DcxAdminUsersDirectoryTableSection
            title="Admin"
            users={groupedUsers.admin}
            emptyLabel="No admin users found yet."
            sorting={sorting}
            onSortingChange={setSorting}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
          />
          <DcxAdminUsersDirectoryTableSection
            title="Users"
            users={groupedUsers.user}
            emptyLabel="No standard users found yet."
            sorting={sorting}
            onSortingChange={setSorting}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
          />
        </>
      ) : null}
    </section>
  )
}
