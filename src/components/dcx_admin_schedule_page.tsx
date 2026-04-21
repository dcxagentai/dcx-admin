/**
 * CONTEXT:
 * First admin schedule surface for the DCX internal frontend.
 * It exists to show one simple unified table of future-timed newsletter sends and sequence launches.
 */
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table"

import {
  readDcxAdminScheduleOperationsCatalog,
  type DcxAdminScheduleOperationRow,
} from "../lib/read_dcx_admin_schedule_operations_catalog"
import { DcxAdminDataTable } from "@/components/ui/dcx_admin_data_table"

type Props = {
  apiBaseUrl: string
}

const scheduleColumnHelper = createColumnHelper<DcxAdminScheduleOperationRow>()

function formatTimestampLabel(timestampMs: number): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(timestampMs),
  )
}

function readAudienceLabel(audienceScope: string): string {
  if (audienceScope === "admins") {
    return "Admins only"
  }
  if (audienceScope === "devs") {
    return "Devs only"
  }
  if (audienceScope === "newsletters") {
    return "Newsletters audience"
  }
  if (audienceScope === "all_email") {
    return "All promotional email"
  }
  return "All eligible users"
}

export function DcxAdminSchedulePage(props: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "scheduled_at_ts_ms", desc: false },
  ])
  const scheduleQuery = useQuery({
    queryKey: ["dcx_admin_schedule_operations_catalog"],
    queryFn: async () => readDcxAdminScheduleOperationsCatalog({ apiBaseUrl: props.apiBaseUrl }),
  })

  const operations = scheduleQuery.data?.data.operations ?? []
  const scheduleColumns = useMemo(
    () => [
      scheduleColumnHelper.accessor("title", {
        id: "title",
        header: "Operation",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-950">{row.original.title}</p>
            <p className="font-mono text-xs text-slate-500">{row.original.operation_key}</p>
          </div>
        ),
      }),
      scheduleColumnHelper.accessor("scheduled_at_ts_ms", {
        id: "scheduled_at_ts_ms",
        header: "Scheduled for",
        cell: ({ row }) => formatTimestampLabel(row.original.scheduled_at_ts_ms),
      }),
      scheduleColumnHelper.accessor("status", {
        id: "status",
        header: "Status",
      }),
      scheduleColumnHelper.accessor("audience_scope", {
        id: "audience_scope",
        header: "Audience",
        cell: ({ row }) => readAudienceLabel(row.original.audience_scope),
      }),
      scheduleColumnHelper.accessor("operation_kind", {
        id: "operation_kind",
        header: "Type",
        cell: ({ row }) =>
          row.original.operation_kind === "newsletter_send" ? "Newsletter send" : "Sequence launch",
      }),
      scheduleColumnHelper.accessor("source_surface", {
        id: "source_surface",
        header: "Surface",
      }),
    ],
    [],
  )

  return (
    <section className="space-y-6">
      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="space-y-3 border-b border-black/6 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Schedule</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Queued operations</h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            This first pass shows the timed work we already know about: scheduled newsletter sends and scheduled sequence launches. Later we can extend the same list to page publishing windows and deeper operational controls.
          </p>
        </div>

        <div className="space-y-3 pt-5">
          {scheduleQuery.isLoading ? <p className="text-sm text-slate-500">Loading scheduled operations...</p> : null}
          {scheduleQuery.isError ? (
            <p className="text-sm text-red-600">
              {(scheduleQuery.error as Error & { suggested_action?: string }).suggested_action ??
                (scheduleQuery.error as Error).message}
            </p>
          ) : null}

          {!scheduleQuery.isLoading && !scheduleQuery.isError ? (
            <DcxAdminDataTable
              columns={scheduleColumns}
              data={operations}
              emptyLabel="No scheduled newsletter or sequence operations exist yet."
              sorting={sorting}
              onSortingChange={setSorting}
            />
          ) : null}
        </div>
      </article>
    </section>
  )
}
