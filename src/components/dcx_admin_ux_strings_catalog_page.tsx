/**
 * CONTEXT:
 * Editable UX strings admin surface for the DCX internal frontend.
 * It exists to let internal users browse one surface-scoped UX strings catalog in a table,
 * then open one dedicated editor route for a selected string group/key/language row.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"

import {
  readDcxAdminLiveUxStringsCatalog,
  type DcxAdminUxStringCatalogRow,
} from "../lib/read_dcx_admin_live_ux_strings_catalog"
import { createDcxAdminUxStringTranslation } from "../lib/create_dcx_admin_ux_string_translation"
import { readDcxAdminMissingLanguageRows } from "../lib/dcx_admin_language_flag_options"
import { saveDcxAdminLiveUxStringRow } from "../lib/save_dcx_admin_live_ux_string_row"
import { DcxAdminLanguageFlagLabel } from "./dcx_admin_language_flag_label"
import {
  DcxAdminUnifiedTranslationLanguageSelector,
} from "./dcx_admin_translation_language_controls"
import { Button } from "@/components/ui/button"
import { DcxAdminDataTable } from "@/components/ui/dcx_admin_data_table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  apiBaseUrl: string
  surfaceScope?: "all" | "public" | "app" | "admin"
  eyebrow?: string
  title?: string
  description?: string
  routeLanguageCode?: string | null
  routeStringGroup?: string | null
  routeStringKey?: string | null
  onOpenUxString?: (params: {
    languageCode: string
    stringGroup: string
    stringKey: string
  }) => void
  onReturnToCatalog?: () => void
}

type EditableFieldVisualState = "idle" | "editing" | "saving" | "saved" | "error"

const uxStringColumnHelper = createColumnHelper<DcxAdminUxStringCatalogRow>()

function formatTimestampLabel(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestampMs))
}

function renderLanguageLabel(language: DcxAdminUxStringCatalogRow["language"]): string {
  return `${language.language_name_native} (${language.language_code})`
}

function readMatchesSurfaceScope(
  row: DcxAdminUxStringCatalogRow,
  surfaceScope: NonNullable<Props["surfaceScope"]>,
): boolean {
  if (surfaceScope === "all") {
    return true
  }

  if (surfaceScope === "app") {
    return row.string_group.startsWith("app_")
  }

  if (surfaceScope === "admin") {
    return row.string_group.startsWith("admin_")
  }

  return !row.string_group.startsWith("app_") && !row.string_group.startsWith("admin_")
}

function MetadataRow(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 py-3 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </dt>
      <dd className="max-w-[18rem] text-right text-sm text-slate-900">{props.value}</dd>
    </div>
  )
}

function readEditableFieldBorderClass(visualState: EditableFieldVisualState): string {
  if (visualState === "editing" || visualState === "saving") {
    return "border-amber-300"
  }

  if (visualState === "saved") {
    return "border-emerald-300"
  }

  if (visualState === "error") {
    return "border-red-300"
  }

  return "border-sky-300"
}

function readEditableFieldStatusTextClass(visualState: EditableFieldVisualState): string {
  if (visualState === "editing" || visualState === "saving") {
    return "text-amber-600"
  }

  if (visualState === "saved") {
    return "text-emerald-600"
  }

  if (visualState === "error") {
    return "text-red-600"
  }

  return "text-sky-700"
}

function readCatalogColumnDefinitionId(
  columnDefinition: ColumnDef<DcxAdminUxStringCatalogRow, unknown>,
): string | null {
  const accessorKey =
    "accessorKey" in columnDefinition && typeof columnDefinition.accessorKey === "string"
      ? columnDefinition.accessorKey
      : null

  if (typeof columnDefinition.id === "string") {
    return columnDefinition.id
  }

  return accessorKey
}

function readCatalogColumnWidthClassName(columnId: string): string {
  if (columnId === "string_group") {
    return "w-[22%]"
  }

  if (columnId === "string_key") {
    return "w-[24%]"
  }

  if (columnId === "text") {
    return "w-[24%]"
  }

  if (columnId === "language") {
    return "w-[16%]"
  }

  if (columnId === "updated_at_ts_ms") {
    return "w-[14%] whitespace-nowrap"
  }

  return ""
}

function readCatalogColumnToggleLabel(columnId: string): string {
  if (columnId === "string_group") {
    return "Group"
  }

  if (columnId === "string_key") {
    return "Key"
  }

  if (columnId === "text") {
    return "Text"
  }

  if (columnId === "language") {
    return "Language"
  }

  if (columnId === "updated_at_ts_ms") {
    return "Updated"
  }

  return columnId
}

function DcxAdminSortableHeader(props: {
  column: {
    getIsSorted: () => false | "asc" | "desc"
    toggleSorting: (desc?: boolean) => void
  }
  title: string
}) {
  const isSorted = props.column.getIsSorted()

  return (
    <button
      type="button"
      onClick={() => props.column.toggleSorting(isSorted === "asc")}
      className="inline-flex items-center gap-1 text-left"
    >
      <span>{props.title}</span>
      <span className="text-[0.8rem] text-slate-400">{isSorted ? (isSorted === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  )
}

function CatalogTextCard(props: {
  eyebrow: string
  title?: React.ReactNode
  headerAccessory?: React.ReactNode
  row: DcxAdminUxStringCatalogRow | null
  emptyMessage: string
  editable?: boolean
  draftText?: string
  visualState?: EditableFieldVisualState
  statusText?: string
  onFocusText?: () => void
  onChangeText?: (nextText: string) => void
  onBlurText?: () => void
  isDisabled?: boolean
}) {
  return (
    <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {props.eyebrow}
          </p>
          {props.title ? (
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">{props.title}</h3>
          ) : null}
        </div>
        {props.headerAccessory ? (
          <div className="w-full max-w-sm">{props.headerAccessory}</div>
        ) : null}
      </div>

      {props.row ? (
        <div className="space-y-6">
          {props.editable ? (
            <div>
              <Textarea
                value={props.draftText ?? ""}
                onFocus={props.onFocusText}
                onChange={(event) => props.onChangeText?.(event.target.value)}
                onBlur={props.onBlurText}
                disabled={props.isDisabled}
                rows={7}
                className={[
                  "w-full resize-y rounded-none border bg-slate-50 px-5 py-4 text-base leading-7 text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:opacity-70",
                  readEditableFieldBorderClass(props.visualState ?? "idle"),
                ].join(" ")}
              />
            </div>
          ) : (
            <div className="border border-slate-200 bg-slate-50 px-5 py-5">
              <p className="whitespace-pre-wrap text-base leading-7 text-slate-900">{props.row.text}</p>
            </div>
          )}

        </div>
      ) : (
        <p className="text-sm text-slate-500">{props.emptyMessage}</p>
      )}
    </article>
  )
}

function CatalogTextMetadataCard(props: {
  eyebrow: string
  row: DcxAdminUxStringCatalogRow | null
  emptyMessage: string
}) {
  return (
    <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
      <div className="mb-5 border-b border-black/6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {props.eyebrow}
        </p>
      </div>

      {props.row ? (
        <dl>
          <MetadataRow
            label="Language"
            value={
              <DcxAdminLanguageFlagLabel
                languageCode={props.row.language.language_code}
                label={`${props.row.language.language_name_native} (${props.row.language.language_code})`}
                className="justify-end gap-2"
                flagClassName="h-3 w-5 min-w-5"
                textClassName="text-sm text-slate-900"
              />
            }
          />
          <MetadataRow label="String id" value={String(props.row.ux_string_id)} />
          <MetadataRow label="Group" value={props.row.string_group} />
          <MetadataRow label="Key" value={props.row.string_key} />
          <MetadataRow label="Is original" value={props.row.is_original ? "Yes" : "No"} />
          <MetadataRow
            label="Translation of id"
            value={props.row.translation_of_id ? String(props.row.translation_of_id) : "Not linked"}
          />
          <MetadataRow label="Updated at" value={formatTimestampLabel(props.row.updated_at_ts_ms)} />
        </dl>
      ) : (
        <p className="text-sm text-slate-500">{props.emptyMessage}</p>
      )}
    </article>
  )
}

export function DcxAdminUxStringsCatalogPage(props: Props) {
  const surfaceScope = props.surfaceScope ?? "all"
  const queryClient = useQueryClient()
  const resetVisualStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const catalogQuery = useQuery({
    queryKey: ["dcx_admin_live_ux_strings_catalog"],
    queryFn: async () =>
      readDcxAdminLiveUxStringsCatalog({
        apiBaseUrl: props.apiBaseUrl,
      }),
  })
  const saveUxStringMutation = useMutation({
    mutationFn: async (params: { uxStringId: number; text: string }) =>
      saveDcxAdminLiveUxStringRow({
        apiBaseUrl: props.apiBaseUrl,
        uxStringId: params.uxStringId,
        text: params.text,
      }),
  })
  const createTranslationMutation = useMutation({
    mutationFn: async (params: { targetLanguageCode: string }) =>
      createDcxAdminUxStringTranslation({
        apiBaseUrl: props.apiBaseUrl,
        stringGroup: props.routeStringGroup ?? "",
        stringKey: props.routeStringKey ?? "",
        sourceLanguageCode: props.routeLanguageCode ?? "en",
        targetLanguageCode: params.targetLanguageCode,
      }),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({
        queryKey: ["dcx_admin_live_ux_strings_catalog"],
      })
      props.onOpenUxString?.({
        stringGroup: payload.data.string_group,
        stringKey: payload.data.string_key,
        languageCode: payload.data.language_code,
      })
    },
  })

  const allUxStrings = catalogQuery.data?.data.ux_strings ?? []
  const uxStrings = allUxStrings.filter((row) => readMatchesSurfaceScope(row, surfaceScope))
  const totalLiveRowCount = uxStrings.length

  const [catalogFilterQuery, setCatalogFilterQuery] = useState("")
  const [catalogSorting, setCatalogSorting] = useState<SortingState>([
    { id: "updated_at_ts_ms", desc: true },
  ])
  const [catalogVisibility, setCatalogVisibility] = useState<VisibilityState>({})
  const [selectedLanguageDraftText, setSelectedLanguageDraftText] = useState("")
  const [selectedLanguageVisualState, setSelectedLanguageVisualState] =
    useState<EditableFieldVisualState>("idle")
  const [selectedLanguageStatusText, setSelectedLanguageStatusText] = useState(
    "Blue means editable. Click into the selected language text to adjust.",
  )

  const catalogRows = useMemo(
    () => uxStrings.filter((row) => row.is_original),
    [uxStrings],
  )

  const filteredCatalogRows = useMemo(() => {
    const normalizedFilterQuery = catalogFilterQuery.trim().toLowerCase()

    if (normalizedFilterQuery === "") {
      return catalogRows
    }

    return catalogRows.filter((row) => {
      const group = row.string_group.toLowerCase()
      const key = row.string_key.toLowerCase()
      const text = row.text.toLowerCase()
      const language = renderLanguageLabel(row.language).toLowerCase()

      return (
        group.includes(normalizedFilterQuery) ||
        key.includes(normalizedFilterQuery) ||
        text.includes(normalizedFilterQuery) ||
        language.includes(normalizedFilterQuery)
      )
    })
  }, [catalogFilterQuery, catalogRows])

  const selectedStringRows = useMemo(
    () =>
      uxStrings.filter(
        (row) =>
          row.string_group === (props.routeStringGroup ?? "") &&
          row.string_key === (props.routeStringKey ?? ""),
      ),
    [props.routeStringGroup, props.routeStringKey, uxStrings],
  )

  const availableLanguageRows = useMemo(
    () =>
      [...selectedStringRows].sort((left, right) => {
        if (left.is_original !== right.is_original) {
          return left.is_original ? -1 : 1
        }

        return renderLanguageLabel(left.language).localeCompare(renderLanguageLabel(right.language))
      }),
    [selectedStringRows],
  )
  const missingLanguageRows = useMemo(
    () =>
      readDcxAdminMissingLanguageRows(
        availableLanguageRows.map((row) => row.language.language_code),
      ),
    [availableLanguageRows],
  )

  const originalRow = selectedStringRows.find((row) => row.is_original) ?? null
  const selectedLanguageRow =
    selectedStringRows.find((row) => row.language.language_code === props.routeLanguageCode) ?? originalRow ?? null

  useEffect(() => {
    if (selectedLanguageRow) {
      setSelectedLanguageDraftText(selectedLanguageRow.text)
    }
  }, [selectedLanguageRow?.ux_string_id, selectedLanguageRow?.text])

  useEffect(() => {
    setSelectedLanguageVisualState("idle")
    setSelectedLanguageStatusText("Blue means editable. Click into the selected language text to adjust.")
  }, [props.routeStringGroup, props.routeStringKey, props.routeLanguageCode])

  useEffect(() => {
    return () => {
      if (resetVisualStateTimeoutRef.current) {
        clearTimeout(resetVisualStateTimeoutRef.current)
      }
    }
  }, [])

  const catalogColumns = useMemo<ColumnDef<DcxAdminUxStringCatalogRow, any>[]>(
    () => [
      uxStringColumnHelper.accessor("string_group", {
        id: "string_group",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Group" />,
        cell: ({ row }) => (
          <span className="block truncate font-mono text-xs text-slate-700" title={row.original.string_group}>
            {row.original.string_group}
          </span>
        ),
      }),
      uxStringColumnHelper.accessor("string_key", {
        id: "string_key",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Key" />,
        cell: ({ row }) => (
          <span className="block truncate font-mono text-xs text-slate-700" title={row.original.string_key}>
            {row.original.string_key}
          </span>
        ),
      }),
      uxStringColumnHelper.accessor("text", {
        id: "text",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Text" />,
        cell: ({ row }) => (
          <span className="block truncate text-sm text-slate-900" title={row.original.text}>
            {row.original.text}
          </span>
        ),
      }),
      uxStringColumnHelper.accessor("language", {
        id: "language",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Language" />,
        cell: ({ row }) => <span className="text-sm text-slate-900">{renderLanguageLabel(row.original.language)}</span>,
        sortingFn: (left, right) =>
          renderLanguageLabel(left.original.language).localeCompare(renderLanguageLabel(right.original.language)),
      }),
      uxStringColumnHelper.accessor("updated_at_ts_ms", {
        id: "updated_at_ts_ms",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Updated" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-slate-900">
            {formatTimestampLabel(row.original.updated_at_ts_ms)}
          </span>
        ),
      }),
    ],
    [],
  )

  async function saveSelectedLanguageDraftWithRetries(
    targetRow: DcxAdminUxStringCatalogRow,
    nextText: string,
  ): Promise<void> {
    for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
      try {
        const savePayload = await saveUxStringMutation.mutateAsync({
          uxStringId: targetRow.ux_string_id,
          text: nextText,
        })

        await queryClient.invalidateQueries({
          queryKey: ["dcx_admin_live_ux_strings_catalog"],
        })

        setSelectedLanguageVisualState("saved")
        setSelectedLanguageStatusText(savePayload.data.was_noop ? "No changes to save." : "Saved.")

        if (resetVisualStateTimeoutRef.current) {
          clearTimeout(resetVisualStateTimeoutRef.current)
        }

        resetVisualStateTimeoutRef.current = setTimeout(() => {
          setSelectedLanguageVisualState("idle")
          setSelectedLanguageStatusText(
            "Blue means editable. Click into the selected language text to adjust.",
          )
        }, 1400)

        return
      } catch (error) {
        if (attemptNumber < 3) {
          setSelectedLanguageVisualState("saving")
          setSelectedLanguageStatusText(`Retrying save (${attemptNumber + 1}/3)...`)
          await new Promise((resolve) => setTimeout(resolve, 700 * attemptNumber))
          continue
        }

        const saveError = error as Error & { suggested_action?: string }
        setSelectedLanguageVisualState("error")
        setSelectedLanguageStatusText(
          saveError.suggested_action ?? "Save failed. Please click back in and retry.",
        )
        return
      }
    }
  }

  const isCatalogRoute =
    !props.routeStringGroup || !props.routeStringKey || !props.routeLanguageCode || !props.onOpenUxString

  const catalogContent = (
    <section className="space-y-6">
      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {props.eyebrow ?? "Content"}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {props.title ?? "UX strings"}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {props.description ??
                "Browse one surface-scoped UX strings catalog, then open one dedicated editor route for the selected string row."}
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {totalLiveRowCount} live rows
          </div>
        </div>

        {catalogQuery.isLoading ? <p className="text-sm text-slate-500">Loading live UX strings...</p> : null}
        {catalogQuery.isError ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">UX strings read blocked</p>
            <p className="text-sm leading-6 text-slate-600">
              {(catalogQuery.error as Error & { suggested_action?: string }).message}
            </p>
            <p className="text-sm text-slate-500">
              {(catalogQuery.error as Error & { suggested_action?: string }).suggested_action ??
                "Sign in with a valid admin or dev session, then retry."}
            </p>
          </div>
        ) : null}

        {!catalogQuery.isLoading && !catalogQuery.isError ? (
          catalogRows.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 border-b border-black/6 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <Input
                  value={catalogFilterQuery}
                  onChange={(event) => setCatalogFilterQuery(event.target.value)}
                  placeholder="Filter UX strings..."
                  className="w-full lg:max-w-sm"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="rounded-none">
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {catalogColumns
                      .map((columnDefinition) => ({
                        columnId: readCatalogColumnDefinitionId(columnDefinition),
                        columnDefinition,
                      }))
                      .filter(
                        (
                          candidate,
                        ): candidate is {
                          columnId: string
                          columnDefinition: ColumnDef<DcxAdminUxStringCatalogRow, unknown>
                        } => candidate.columnId !== null,
                      )
                      .map(({ columnId }) => (
                        <DropdownMenuCheckboxItem
                          key={columnId}
                          checked={catalogVisibility[columnId] !== false}
                          onCheckedChange={(checked) => {
                            setCatalogVisibility((currentVisibility) => ({
                              ...currentVisibility,
                              [columnId]: Boolean(checked),
                            }))
                          }}
                        >
                          {readCatalogColumnToggleLabel(columnId)}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <DcxAdminDataTable
                columns={catalogColumns}
                data={filteredCatalogRows}
                emptyLabel="No live UX strings currently exist for this surface."
                sorting={catalogSorting}
                onSortingChange={setCatalogSorting}
                columnVisibility={catalogVisibility}
                onColumnVisibilityChange={setCatalogVisibility}
                readColumnWidthClassName={readCatalogColumnWidthClassName}
                onRowClick={(row) =>
                  props.onOpenUxString?.({
                    languageCode: row.language.language_code,
                    stringGroup: row.string_group,
                    stringKey: row.string_key,
                  })
                }
                readRowClassName={(row) =>
                  row.string_group === props.routeStringGroup && row.string_key === props.routeStringKey
                    ? "bg-slate-50"
                    : ""
                }
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">No live UX-string groups currently exist for this surface.</p>
          )
        ) : null}
      </article>
    </section>
  )

  const editorContent = (
    <section className="space-y-6">
      <Button type="button" variant="outline" className="w-fit rounded-none" onClick={props.onReturnToCatalog}>
        Back to UX strings
      </Button>

      <article className="space-y-6 border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Editor</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">
              {selectedLanguageRow
                ? `${selectedLanguageRow.string_group} / ${selectedLanguageRow.string_key}`
                : "Select a UX string"}
            </h3>
          </div>
          {selectedLanguageRow ? (
            <div className="w-full max-w-lg space-y-3">
              <p
                className={[
                  "text-right text-xs font-medium",
                  readEditableFieldStatusTextClass(selectedLanguageVisualState),
                ].join(" ")}
              >
                {selectedLanguageStatusText}
              </p>
              <DcxAdminUnifiedTranslationLanguageSelector
                existingLanguageRows={availableLanguageRows.map((row) => ({
                  language_code: row.language.language_code,
                  language_name_native: row.language.language_name_native,
                  is_original: row.is_original,
                }))}
                selectedLanguageCode={selectedLanguageRow.language.language_code}
                onSelectExistingLanguage={(languageCode) => {
                  const matchingRow = availableLanguageRows.find(
                    (row) => row.language.language_code === languageCode,
                  )
                  if (!matchingRow) {
                    return
                  }
                  props.onOpenUxString?.({
                    languageCode,
                    stringGroup: matchingRow.string_group,
                    stringKey: matchingRow.string_key,
                  })
                }}
                missingLanguages={missingLanguageRows}
                onCreateMissingLanguage={(languageCode) => {
                  createTranslationMutation.mutate({
                    targetLanguageCode: languageCode,
                  })
                }}
                isCreatePending={createTranslationMutation.isPending}
              />
            </div>
          ) : null}
        </div>

        {catalogQuery.isLoading ? <p className="text-sm text-slate-500">Loading live UX string detail...</p> : null}
        {catalogQuery.isError ? (
          <p className="text-sm text-red-600">
            {(catalogQuery.error as Error & { suggested_action?: string }).suggested_action ??
              (catalogQuery.error as Error).message}
          </p>
        ) : null}

        {!catalogQuery.isLoading && !catalogQuery.isError && selectedLanguageRow ? (
          <div className="space-y-6">
            {createTranslationMutation.isError ? (
              <p className="text-sm text-red-600">
                {(createTranslationMutation.error as Error & { suggested_action?: string })
                  .suggested_action ??
                  "We could not create that UX-string translation right now."}
              </p>
            ) : null}

            {originalRow ? (
              <div className="space-y-6">
                <section className="grid gap-6 xl:grid-cols-2">
                  <CatalogTextCard
                    eyebrow="Original"
                    row={originalRow}
                    emptyMessage="No live original row exists for this UX string yet."
                  />
                  <CatalogTextCard
                    eyebrow="Selected language"
                    row={selectedLanguageRow}
                    emptyMessage="No live row exists for the selected language yet."
                    editable
                    draftText={selectedLanguageDraftText}
                    visualState={selectedLanguageVisualState}
                    statusText={selectedLanguageStatusText}
                    onFocusText={() => {
                      if (saveUxStringMutation.isPending) {
                        return
                      }

                      setSelectedLanguageVisualState("editing")
                      setSelectedLanguageStatusText("Editing. Click away to autosave.")
                    }}
                    onChangeText={setSelectedLanguageDraftText}
                    onBlurText={() => {
                      if (!selectedLanguageRow || saveUxStringMutation.isPending) {
                        return
                      }

                      if (selectedLanguageDraftText === selectedLanguageRow.text) {
                        setSelectedLanguageVisualState("idle")
                        setSelectedLanguageStatusText("Blue means editable. Click into the selected language text to adjust.")
                        return
                      }

                      setSelectedLanguageVisualState("saving")
                      setSelectedLanguageStatusText("Saving...")
                      void saveSelectedLanguageDraftWithRetries(selectedLanguageRow, selectedLanguageDraftText)
                    }}
                    isDisabled={saveUxStringMutation.isPending}
                  />
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <CatalogTextMetadataCard
                    eyebrow="Original metadata"
                    row={originalRow}
                    emptyMessage="No live original metadata exists for this UX string yet."
                  />
                  <CatalogTextMetadataCard
                    eyebrow="Selected metadata"
                    row={selectedLanguageRow}
                    emptyMessage="No live metadata exists for the selected language yet."
                  />
                </section>
              </div>
            ) : (
              <div className="space-y-6">
                <CatalogTextCard
                  eyebrow="Template"
                  row={selectedLanguageRow}
                  emptyMessage="No live row exists for the selected language yet."
                  editable
                  draftText={selectedLanguageDraftText}
                  visualState={selectedLanguageVisualState}
                  statusText={selectedLanguageStatusText}
                  onFocusText={() => {
                    if (saveUxStringMutation.isPending) {
                      return
                    }

                    setSelectedLanguageVisualState("editing")
                    setSelectedLanguageStatusText("Editing. Click away to autosave.")
                  }}
                  onChangeText={setSelectedLanguageDraftText}
                  onBlurText={() => {
                    if (!selectedLanguageRow || saveUxStringMutation.isPending) {
                      return
                    }

                    if (selectedLanguageDraftText === selectedLanguageRow.text) {
                      setSelectedLanguageVisualState("idle")
                      setSelectedLanguageStatusText("Blue means editable. Click into the selected language text to adjust.")
                      return
                    }

                    setSelectedLanguageVisualState("saving")
                    setSelectedLanguageStatusText("Saving...")
                    void saveSelectedLanguageDraftWithRetries(selectedLanguageRow, selectedLanguageDraftText)
                  }}
                  isDisabled={saveUxStringMutation.isPending}
                />

                <CatalogTextMetadataCard
                  eyebrow="Template metadata"
                  row={selectedLanguageRow}
                  emptyMessage="No live metadata exists for the selected language yet."
                />
              </div>
            )}
          </div>
        ) : null}
      </article>
    </section>
  )

  if (isCatalogRoute) {
    return catalogContent
  }

  return editorContent
}
