/**
 * CONTEXT:
 * This file provides one reusable TanStack-plus-shadcn table shell for the DCX admin surface.
 * It exists so list screens can share one rendering pattern while keeping their own
 * column definitions, grouped data slices, and future sorting or filtering behavior.
 */
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"

import { cn } from "@/lib/utils"

import { Button } from "./button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"

type Props<TData> = {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  emptyLabel: string
  tableClassName?: string
  readColumnWidthClassName?: (columnId: string) => string
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>
  pageSize?: number
  hidePaginationFooter?: boolean
  onRowClick?: (row: TData) => void
  readRowClassName?: (row: TData) => string
}

export function DcxAdminDataTable<TData>(props: Props<TData>) {
  const table = useReactTable({
    data: props.data,
    columns: props.columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: props.onSortingChange,
    onColumnVisibilityChange: props.onColumnVisibilityChange,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: props.pageSize ?? 50,
      },
    },
    state: {
      sorting: props.sorting,
      columnVisibility: props.columnVisibility,
    },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalRowCount = props.data.length
  const pageRowCount = table.getRowModel().rows.length
  const visibleRowStart = totalRowCount === 0 ? 0 : pageIndex * pageSize + 1
  const visibleRowEnd = totalRowCount === 0 ? 0 : pageIndex * pageSize + pageRowCount

  return (
    <div className="space-y-4">
      <Table className={cn("min-w-full table-fixed border-collapse", props.tableClassName)}>
        <TableHeader className="bg-slate-50/80">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="text-left">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "px-6 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500",
                    props.readColumnWidthClassName?.(header.column.id),
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row, rowIndex) => (
              <TableRow
                key={row.id}
                onClick={
                  props.onRowClick
                    ? () => props.onRowClick?.(row.original)
                    : undefined
                }
                className={cn(
                  rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                  props.readRowClassName?.(row.original),
                  props.onRowClick ? "cursor-pointer hover:bg-slate-50" : null,
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-6 py-4 align-top text-sm text-slate-900",
                      props.readColumnWidthClassName?.(cell.column.id),
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="bg-white">
              <TableCell
                colSpan={props.columns.length}
                className="px-6 py-10 text-sm text-slate-500"
              >
                {props.emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {totalRowCount > 0 && props.hidePaginationFooter !== true ? (
        <div className="flex flex-col gap-3 px-6 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {visibleRowStart}-{visibleRowEnd} of {totalRowCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
