/**
 * CONTEXT:
 * Managed emails admin surface for the DCX internal frontend.
 * It exists to let internal users browse one email subtype in one table-driven catalog,
 * then open one dedicated editor route that compares the original row with one selected language row.
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
  readDcxAdminLiveEmailsCatalog,
  type DcxAdminEmailCatalogRow,
} from "../lib/read_dcx_admin_live_emails_catalog"
import { createDcxAdminEmailTranslation } from "../lib/create_dcx_admin_email_translation"
import { createDcxAdminSequenceEmailDraft } from "../lib/create_dcx_admin_sequence_email_draft"
import { readDcxAdminMissingLanguageRows } from "../lib/dcx_admin_language_flag_options"
import { saveDcxAdminLiveEmailRow } from "../lib/save_dcx_admin_live_email_row"
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

type Props = {
  apiBaseUrl: string
  initialEmailType?: string | null
  routeEmailKey?: string | null
  routeLanguageCode?: string | null
  onOpenEmail: (params: { emailKey: string; languageCode: string }) => void
  onReturnToCatalog: () => void
}

type EditableFieldVisualState = "idle" | "editing" | "saving" | "saved" | "error"

const transactionalEmailColumnHelper = createColumnHelper<DcxAdminEmailCatalogRow>()

function formatTimestampLabel(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestampMs))
}

function renderLanguageLabel(language: DcxAdminEmailCatalogRow["language"]): string {
  return `${language.language_name_native} (${language.language_code})`
}

function readManagedEmailPluralLabel(emailType: string): string {
  if (emailType === "sequence") {
    return "Sequence emails"
  }

  return "Transactional emails"
}

function readManagedEmailSingularLabel(emailType: string): string {
  if (emailType === "sequence") {
    return "sequence email"
  }

  return "transactional email"
}

function readManagedEmailCatalogDescription(emailType: string): string {
  if (emailType === "sequence") {
    return "Create and edit sequence-specific email content that ordered sequence steps can reuse without borrowing newsletter or transactional templates."
  }

  return "Browse live transactional templates in one catalog, then open one dedicated editor route to compare the original template with one selected language row."
}

function readManagedEmailFilterPlaceholder(emailType: string): string {
  if (emailType === "sequence") {
    return "Filter sequence emails..."
  }

  return "Filter transactional emails..."
}

function readManagedEmailEmptyLabel(emailType: string): string {
  if (emailType === "sequence") {
    return "No sequence email templates exist yet."
  }

  return "No transactional email templates exist yet."
}

function readManagedEmailTranslationErrorFallback(emailType: string): string {
  if (emailType === "sequence") {
    return "We could not create that sequence email translation right now."
  }

  return "We could not create that transactional email translation right now."
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
  columnDefinition: ColumnDef<DcxAdminEmailCatalogRow, unknown>,
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
  if (columnId === "email_subject") {
    return "w-[32%]"
  }

  if (columnId === "email_key") {
    return "w-[25%]"
  }

  if (columnId === "language") {
    return "w-[18%]"
  }

  if (columnId === "updated_at_ts_ms") {
    return "w-[15%] whitespace-nowrap"
  }

  return ""
}

function readCatalogColumnToggleLabel(columnId: string): string {
  if (columnId === "email_subject") {
    return "Subject"
  }

  if (columnId === "email_key") {
    return "Key"
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

function CatalogEmailCard(props: {
  eyebrow: string
  title?: React.ReactNode
  headerAccessory?: React.ReactNode
  row: DcxAdminEmailCatalogRow | null
  emptyMessage: string
  editable?: boolean
  draftSubject?: string
  draftBody?: string
  visualState?: EditableFieldVisualState
  statusText?: string
  onFocusField?: () => void
  onChangeSubject?: (nextSubject: string) => void
  onChangeBody?: (nextBody: string) => void
  onBlurField?: () => void
  isDisabled?: boolean
}) {
  const editableSurfaceRef = useRef<HTMLDivElement | null>(null)

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
          <div className="space-y-4" ref={editableSurfaceRef}>
            {props.editable ? (
              <>
                <div className="border border-black/6 bg-slate-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Subject
                  </p>
                  <textarea
                    value={props.draftSubject ?? ""}
                    onFocus={props.onFocusField}
                    onChange={(event) => props.onChangeSubject?.(event.target.value)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        if (
                          editableSurfaceRef.current &&
                          editableSurfaceRef.current.contains(document.activeElement)
                        ) {
                          return
                        }

                        props.onBlurField?.()
                      }, 0)
                    }}
                    disabled={props.isDisabled}
                    rows={2}
                    className={[
                      "mt-3 w-full resize-y border bg-white px-4 py-3 text-base leading-7 text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:opacity-70",
                      readEditableFieldBorderClass(props.visualState ?? "idle"),
                    ].join(" ")}
                  />
                </div>

                <div className="border border-black/6 bg-slate-50 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Body
                  </p>
                  <textarea
                    value={props.draftBody ?? ""}
                    onFocus={props.onFocusField}
                    onChange={(event) => props.onChangeBody?.(event.target.value)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        if (
                          editableSurfaceRef.current &&
                          editableSurfaceRef.current.contains(document.activeElement)
                        ) {
                          return
                        }

                        props.onBlurField?.()
                      }, 0)
                    }}
                    disabled={props.isDisabled}
                    rows={12}
                    className={[
                      "mt-3 w-full resize-y border bg-white px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:opacity-70",
                      readEditableFieldBorderClass(props.visualState ?? "idle"),
                    ].join(" ")}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Subject
                  </p>
                  <p className="mt-3 text-base leading-7 text-slate-900">{props.row.email_subject}</p>
                </div>

                <div className="border border-slate-200 bg-slate-50 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Body
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-900">
                    {props.row.email_body}
                  </p>
                </div>
              </>
            )}
          </div>

        </div>
      ) : (
        <p className="text-sm text-slate-500">{props.emptyMessage}</p>
      )}
    </article>
  )
}

function CatalogEmailMetadataCard(props: {
  eyebrow: string
  row: DcxAdminEmailCatalogRow | null
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
          <MetadataRow label="Email id" value={String(props.row.email_id)} />
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

export function DcxAdminEmailsCatalogPage(props: Props) {
  const queryClient = useQueryClient()
  const resetVisualStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedType =
    props.initialEmailType && props.initialEmailType.trim() !== "" ? props.initialEmailType : "transactional"
  const catalogQuery = useQuery({
    queryKey: ["dcx_admin_live_emails_catalog"],
    queryFn: async () =>
      readDcxAdminLiveEmailsCatalog({
        apiBaseUrl: props.apiBaseUrl,
      }),
  })
  const saveEmailMutation = useMutation({
    mutationFn: async (params: {
      emailId: number
      emailSubject: string
      emailBody: string
    }) =>
      saveDcxAdminLiveEmailRow({
        apiBaseUrl: props.apiBaseUrl,
        emailId: params.emailId,
        emailSubject: params.emailSubject,
        emailBody: params.emailBody,
      }),
  })
  const createTranslationMutation = useMutation({
    mutationFn: async (params: { targetLanguageCode: string }) =>
      createDcxAdminEmailTranslation({
        apiBaseUrl: props.apiBaseUrl,
        emailKey: props.routeEmailKey ?? "",
        sourceLanguageCode: props.routeLanguageCode ?? "en",
        targetLanguageCode: params.targetLanguageCode,
      }),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({
        queryKey: ["dcx_admin_live_emails_catalog"],
      })
      props.onOpenEmail({
        emailKey: payload.data.email_key,
        languageCode: payload.data.language_code,
      })
    },
  })
  const createSequenceEmailDraftMutation = useMutation({
    mutationFn: async (params: { emailSubject: string; languageCode: string }) =>
      createDcxAdminSequenceEmailDraft({
        apiBaseUrl: props.apiBaseUrl,
        emailSubject: params.emailSubject,
        languageCode: params.languageCode,
      }),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({
        queryKey: ["dcx_admin_live_emails_catalog"],
      })
      props.onOpenEmail({
        emailKey: payload.data.email_key,
        languageCode: payload.data.language_code,
      })
    },
  })

  const emails = catalogQuery.data?.data.emails ?? []
  const [newSequenceEmailSubject, setNewSequenceEmailSubject] = useState("")

  const [catalogFilterQuery, setCatalogFilterQuery] = useState("")
  const [catalogSorting, setCatalogSorting] = useState<SortingState>([
    { id: "updated_at_ts_ms", desc: true },
  ])
  const [catalogVisibility, setCatalogVisibility] = useState<VisibilityState>({})

  const catalogRows = useMemo(
    () =>
      emails.filter(
        (row) => row.email_type === selectedType && row.is_original,
      ),
    [emails, selectedType],
  )
  const typeLiveRowCount = useMemo(
    () => emails.filter((row) => row.email_type === selectedType).length,
    [emails, selectedType],
  )

  const filteredCatalogRows = useMemo(() => {
    const normalizedFilterQuery = catalogFilterQuery.trim().toLowerCase()

    if (normalizedFilterQuery === "") {
      return catalogRows
    }

    return catalogRows.filter((row) => {
      const subject = row.email_subject.toLowerCase()
      const key = row.email_key.toLowerCase()
      const language = renderLanguageLabel(row.language).toLowerCase()

      return (
        subject.includes(normalizedFilterQuery) ||
        key.includes(normalizedFilterQuery) ||
        language.includes(normalizedFilterQuery)
      )
    })
  }, [catalogFilterQuery, catalogRows])

  const selectedEmailRows = useMemo(
    () =>
      emails.filter(
        (row) => row.email_type === selectedType && row.email_key === (props.routeEmailKey ?? ""),
      ),
    [emails, props.routeEmailKey, selectedType],
  )

  const availableLanguageRows = useMemo(
    () =>
      [...selectedEmailRows].sort((left, right) => {
        if (left.is_original !== right.is_original) {
          return left.is_original ? -1 : 1
        }

        return renderLanguageLabel(left.language).localeCompare(renderLanguageLabel(right.language))
      }),
    [selectedEmailRows],
  )
  const missingLanguageRows = useMemo(
    () =>
      readDcxAdminMissingLanguageRows(
        availableLanguageRows.map((row) => row.language.language_code),
      ),
    [availableLanguageRows],
  )

  const originalRow = selectedEmailRows.find((row) => row.is_original) ?? null
  const selectedLanguageRow =
    selectedEmailRows.find((row) => row.language.language_code === props.routeLanguageCode) ?? originalRow ?? null

  const [selectedLanguageDraftSubject, setSelectedLanguageDraftSubject] = useState("")
  const [selectedLanguageDraftBody, setSelectedLanguageDraftBody] = useState("")
  const [selectedLanguageVisualState, setSelectedLanguageVisualState] =
    useState<EditableFieldVisualState>("idle")
  const [selectedLanguageStatusText, setSelectedLanguageStatusText] = useState(
    "Blue means editable. Click into the selected language email fields to adjust.",
  )

  useEffect(() => {
    if (selectedLanguageRow) {
      setSelectedLanguageDraftSubject(selectedLanguageRow.email_subject)
      setSelectedLanguageDraftBody(selectedLanguageRow.email_body)
    }
  }, [
    selectedLanguageRow?.email_id,
    selectedLanguageRow?.email_subject,
    selectedLanguageRow?.email_body,
  ])

  useEffect(() => {
    setSelectedLanguageVisualState("idle")
    setSelectedLanguageStatusText(
      "Blue means editable. Click into the selected language email fields to adjust.",
    )
  }, [selectedType, props.routeEmailKey, props.routeLanguageCode])

  useEffect(() => {
    return () => {
      if (resetVisualStateTimeoutRef.current) {
        clearTimeout(resetVisualStateTimeoutRef.current)
      }
    }
  }, [])

  const catalogColumns = useMemo<ColumnDef<DcxAdminEmailCatalogRow, any>[]>(
    () => [
      transactionalEmailColumnHelper.accessor("email_subject", {
        id: "email_subject",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Subject" />,
        cell: ({ row }) => (
          <span className="block truncate text-sm font-semibold text-slate-950" title={row.original.email_subject}>
            {row.original.email_subject}
          </span>
        ),
      }),
      transactionalEmailColumnHelper.accessor("email_key", {
        id: "email_key",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Key" />,
        cell: ({ row }) => (
          <span className="block truncate font-mono text-xs text-slate-600" title={row.original.email_key}>
            {row.original.email_key}
          </span>
        ),
      }),
      transactionalEmailColumnHelper.accessor("language", {
        id: "language",
        header: ({ column }) => <DcxAdminSortableHeader column={column} title="Language" />,
        cell: ({ row }) => <span className="text-sm text-slate-900">{renderLanguageLabel(row.original.language)}</span>,
        sortingFn: (left, right) =>
          renderLanguageLabel(left.original.language).localeCompare(renderLanguageLabel(right.original.language)),
      }),
      transactionalEmailColumnHelper.accessor("updated_at_ts_ms", {
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
    targetRow: DcxAdminEmailCatalogRow,
    nextEmailSubject: string,
    nextEmailBody: string,
  ): Promise<void> {
    for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
      try {
        const savePayload = await saveEmailMutation.mutateAsync({
          emailId: targetRow.email_id,
          emailSubject: nextEmailSubject,
          emailBody: nextEmailBody,
        })

        await queryClient.invalidateQueries({
          queryKey: ["dcx_admin_live_emails_catalog"],
        })

        setSelectedLanguageVisualState("saved")
        setSelectedLanguageStatusText(savePayload.data.was_noop ? "No changes to save." : "Saved.")

        if (resetVisualStateTimeoutRef.current) {
          clearTimeout(resetVisualStateTimeoutRef.current)
        }

        resetVisualStateTimeoutRef.current = setTimeout(() => {
          setSelectedLanguageVisualState("idle")
          setSelectedLanguageStatusText(
            "Blue means editable. Click into the selected language email fields to adjust.",
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

  const isCatalogRoute = !props.routeEmailKey || !props.routeLanguageCode

  const catalogContent = (
    <section className="space-y-6">
      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Content</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {readManagedEmailPluralLabel(selectedType)}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {readManagedEmailCatalogDescription(selectedType)}
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {typeLiveRowCount} live rows
          </div>
        </div>

        {catalogQuery.isLoading ? <p className="text-sm text-slate-500">Loading live emails...</p> : null}
        {catalogQuery.isError ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Emails read blocked</p>
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
          <div className="space-y-4">
            {selectedType === "sequence" ? (
              <div className="flex flex-col gap-3 border-b border-black/6 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <Input
                  value={newSequenceEmailSubject}
                  onChange={(event) => setNewSequenceEmailSubject(event.target.value)}
                  placeholder="Welcome to DCX"
                  className="w-full lg:max-w-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    createSequenceEmailDraftMutation.isPending ||
                    newSequenceEmailSubject.trim() === ""
                  }
                  onClick={() => {
                    void createSequenceEmailDraftMutation
                      .mutateAsync({
                        emailSubject: newSequenceEmailSubject,
                        languageCode: "en",
                      })
                      .then(() => {
                        setNewSequenceEmailSubject("")
                      })
                      .catch(() => undefined)
                  }}
                >
                  {createSequenceEmailDraftMutation.isPending ? "Creating..." : "New sequence email"}
                </Button>
              </div>
            ) : null}

            {selectedType === "sequence" && createSequenceEmailDraftMutation.isError ? (
              <p className="text-sm text-red-600">
                {(createSequenceEmailDraftMutation.error as Error & { suggested_action?: string }).suggested_action ??
                  (createSequenceEmailDraftMutation.error as Error).message}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 border-b border-black/6 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <Input
                value={catalogFilterQuery}
                onChange={(event) => setCatalogFilterQuery(event.target.value)}
                placeholder={readManagedEmailFilterPlaceholder(selectedType)}
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
                        columnDefinition: ColumnDef<DcxAdminEmailCatalogRow, unknown>
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
              emptyLabel={readManagedEmailEmptyLabel(selectedType)}
              sorting={catalogSorting}
              onSortingChange={setCatalogSorting}
              columnVisibility={catalogVisibility}
              onColumnVisibilityChange={setCatalogVisibility}
              readColumnWidthClassName={readCatalogColumnWidthClassName}
              onRowClick={(row) =>
                props.onOpenEmail({
                  emailKey: row.email_key,
                  languageCode: row.language.language_code,
                })
              }
              readRowClassName={(row) => (row.email_key === props.routeEmailKey ? "bg-slate-50" : "")}
            />
          </div>
        ) : null}
      </article>
    </section>
  )

  const editorContent = (
    <section className="space-y-6">
      <Button type="button" variant="outline" className="w-fit rounded-none" onClick={props.onReturnToCatalog}>
        Back to {readManagedEmailPluralLabel(selectedType).toLowerCase()}
      </Button>

      <article className="space-y-6 border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/6 pb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Editor</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">
              {selectedLanguageRow
                ? `${selectedLanguageRow.email_type} / ${selectedLanguageRow.email_key}`
                : `Select a ${readManagedEmailSingularLabel(selectedType)}`}
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
                  props.onOpenEmail({
                    emailKey: matchingRow.email_key,
                    languageCode,
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

        {catalogQuery.isLoading ? <p className="text-sm text-slate-500">Loading live email detail...</p> : null}
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
                  readManagedEmailTranslationErrorFallback(selectedType)}
              </p>
            ) : null}

            {originalRow ? (
              <div className="space-y-6">
                <section className="grid gap-6 xl:grid-cols-2">
                  <CatalogEmailCard
                    eyebrow="Original"
                    row={originalRow}
                    emptyMessage="No live original row exists for this email yet."
                  />
                  <CatalogEmailCard
                    eyebrow="Selected language"
                    row={selectedLanguageRow}
                    emptyMessage="No live row exists for the selected language yet."
                    editable
                    draftSubject={selectedLanguageDraftSubject}
                    draftBody={selectedLanguageDraftBody}
                    visualState={selectedLanguageVisualState}
                    statusText={selectedLanguageStatusText}
                    onFocusField={() => {
                      if (saveEmailMutation.isPending) {
                        return
                      }

                      setSelectedLanguageVisualState("editing")
                      setSelectedLanguageStatusText("Editing. Click away to autosave.")
                    }}
                    onChangeSubject={setSelectedLanguageDraftSubject}
                    onChangeBody={setSelectedLanguageDraftBody}
                    onBlurField={() => {
                      if (!selectedLanguageRow || saveEmailMutation.isPending) {
                        return
                      }

                      if (
                        selectedLanguageDraftSubject === selectedLanguageRow.email_subject &&
                        selectedLanguageDraftBody === selectedLanguageRow.email_body
                      ) {
                        setSelectedLanguageVisualState("idle")
                        setSelectedLanguageStatusText(
                          "Blue means editable. Click into the selected language email fields to adjust.",
                        )
                        return
                      }

                      setSelectedLanguageVisualState("saving")
                      setSelectedLanguageStatusText("Saving...")
                      void saveSelectedLanguageDraftWithRetries(
                        selectedLanguageRow,
                        selectedLanguageDraftSubject,
                        selectedLanguageDraftBody,
                      )
                    }}
                    isDisabled={saveEmailMutation.isPending}
                  />
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <CatalogEmailMetadataCard
                    eyebrow="Original metadata"
                    row={originalRow}
                    emptyMessage="No live original metadata exists for this email yet."
                  />
                  <CatalogEmailMetadataCard
                    eyebrow="Selected metadata"
                    row={selectedLanguageRow}
                    emptyMessage="No live metadata exists for the selected language yet."
                  />
                </section>
              </div>
            ) : (
              <div className="space-y-6">
                <CatalogEmailCard
                  eyebrow="Template"
                  row={selectedLanguageRow}
                  emptyMessage="No live row exists for the selected language yet."
                  editable
                  draftSubject={selectedLanguageDraftSubject}
                  draftBody={selectedLanguageDraftBody}
                  visualState={selectedLanguageVisualState}
                  statusText={selectedLanguageStatusText}
                  onFocusField={() => {
                    if (saveEmailMutation.isPending) {
                      return
                    }

                    setSelectedLanguageVisualState("editing")
                    setSelectedLanguageStatusText("Editing. Click away to autosave.")
                  }}
                  onChangeSubject={setSelectedLanguageDraftSubject}
                  onChangeBody={setSelectedLanguageDraftBody}
                  onBlurField={() => {
                    if (!selectedLanguageRow || saveEmailMutation.isPending) {
                      return
                    }

                    if (
                      selectedLanguageDraftSubject === selectedLanguageRow.email_subject &&
                      selectedLanguageDraftBody === selectedLanguageRow.email_body
                    ) {
                      setSelectedLanguageVisualState("idle")
                      setSelectedLanguageStatusText(
                        "Blue means editable. Click into the selected language email fields to adjust.",
                      )
                      return
                    }

                    setSelectedLanguageVisualState("saving")
                    setSelectedLanguageStatusText("Saving...")
                    void saveSelectedLanguageDraftWithRetries(
                      selectedLanguageRow,
                      selectedLanguageDraftSubject,
                      selectedLanguageDraftBody,
                    )
                  }}
                  isDisabled={saveEmailMutation.isPending}
                />

                <CatalogEmailMetadataCard
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
