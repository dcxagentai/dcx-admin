/**
 * CONTEXT:
 * First editable emails viewer for the DCX admin frontend.
 * It exists to let internal users browse one original email row against one selected language
 * row, then autosave edits on the selected-language panel using the immutable backend version model.
 */
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  readDcxAdminLiveEmailsCatalog,
  type DcxAdminEmailCatalogRow,
} from "../lib/read_dcx_admin_live_emails_catalog"
import { saveDcxAdminLiveEmailRow } from "../lib/save_dcx_admin_live_email_row"

type Props = {
  apiBaseUrl: string
  debugAdminUserId: number | null
  initialEmailType?: string | null
  onEmailTypeRouteChange?: (nextEmailType: string | null) => void
}

type EditableFieldVisualState = "idle" | "editing" | "saving" | "saved" | "error"

function formatTimestampLabel(timestampMs: number | null): string {
  if (typeof timestampMs !== "number") {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestampMs))
}

function buildUniqueValues(values: string[]): string[] {
  return [...new Set(values)]
}

function LabeledSelect(props: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-300"
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function MetadataRow(props: { label: string; value: string }) {
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

function CatalogEmailCard(props: {
  eyebrow: string
  title: string
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
    <article className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
      <div className="mb-5 space-y-2 border-b border-black/6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {props.eyebrow}
        </p>
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">{props.title}</h3>
      </div>

      {props.row ? (
        <div className="space-y-6">
          <div className="space-y-4" ref={editableSurfaceRef}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Template
              </p>
              {props.editable ? (
                <p
                  className={[
                    "text-xs font-medium",
                    readEditableFieldStatusTextClass(props.visualState ?? "idle"),
                  ].join(" ")}
                >
                  {props.statusText}
                </p>
              ) : null}
            </div>

            {props.editable ? (
              <>
                <div className="rounded-[1.25rem] border border-black/6 bg-slate-50 px-5 py-4">
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
                      "mt-3 w-full resize-y rounded-[1.1rem] border bg-white px-4 py-3 text-base leading-7 text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:opacity-70",
                      readEditableFieldBorderClass(props.visualState ?? "idle"),
                    ].join(" ")}
                  />
                </div>

                <div className="rounded-[1.25rem] border border-black/6 bg-slate-50 px-5 py-5">
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
                      "mt-3 w-full resize-y rounded-[1.1rem] border bg-white px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:opacity-70",
                      readEditableFieldBorderClass(props.visualState ?? "idle"),
                    ].join(" ")}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Subject
                  </p>
                  <p className="mt-3 text-base leading-7 text-slate-900">{props.row.email_subject}</p>
                </div>

                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-5 py-5">
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

          <dl>
            <MetadataRow
              label="Language"
              value={`${props.row.language.language_name_native} (${props.row.language.language_code})`}
            />
            <MetadataRow label="Email id" value={String(props.row.email_id)} />
            <MetadataRow label="Is original" value={props.row.is_original ? "Yes" : "No"} />
            <MetadataRow
              label="Translation of id"
              value={props.row.translation_of_id ? String(props.row.translation_of_id) : "Not linked"}
            />
            <MetadataRow
              label="Updated at"
              value={formatTimestampLabel(props.row.updated_at_ts_ms)}
            />
          </dl>
        </div>
      ) : (
        <p className="text-sm text-slate-500">{props.emptyMessage}</p>
      )}
    </article>
  )
}

export function DcxAdminEmailsCatalogPage(props: Props) {
  const queryClient = useQueryClient()
  const resetVisualStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const catalogQuery = useQuery({
    queryKey: ["dcx_admin_live_emails_catalog", props.debugAdminUserId],
    queryFn: async () =>
      readDcxAdminLiveEmailsCatalog({
        apiBaseUrl: props.apiBaseUrl,
        debugAdminUserId: props.debugAdminUserId,
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
        debugAdminUserId: props.debugAdminUserId,
        emailId: params.emailId,
        emailSubject: params.emailSubject,
        emailBody: params.emailBody,
      }),
  })

  const emails = catalogQuery.data?.data.emails ?? []
  const totalLiveRowCount = catalogQuery.data?.data.total_live_row_count ?? 0

  const availableTypes = buildUniqueValues(emails.map((row) => row.email_type))
  const [selectedType, setSelectedType] = useState("")

  useEffect(() => {
    if (availableTypes.length === 0) {
      setSelectedType("")
      return
    }

    if (
      props.initialEmailType &&
      availableTypes.includes(props.initialEmailType) &&
      selectedType !== props.initialEmailType
    ) {
      setSelectedType(props.initialEmailType)
      return
    }

    if (!availableTypes.includes(selectedType)) {
      setSelectedType(availableTypes[0])
    }
  }, [availableTypes.join("|"), props.initialEmailType, selectedType])

  const typeRows = emails.filter((row) => row.email_type === selectedType)
  const availableEmailKeys = buildUniqueValues(typeRows.map((row) => row.email_key))
  const [selectedEmailKey, setSelectedEmailKey] = useState("")

  useEffect(() => {
    if (availableEmailKeys.length === 0) {
      setSelectedEmailKey("")
      return
    }

    if (!availableEmailKeys.includes(selectedEmailKey)) {
      setSelectedEmailKey(availableEmailKeys[0])
    }
  }, [availableEmailKeys.join("|"), selectedEmailKey])

  const selectedEmailRows = typeRows.filter((row) => row.email_key === selectedEmailKey)
  const availableLanguageCodes = buildUniqueValues(
    selectedEmailRows.map((row) => row.language.language_code),
  )
  const [selectedLanguageCode, setSelectedLanguageCode] = useState("")

  useEffect(() => {
    if (availableLanguageCodes.length === 0) {
      setSelectedLanguageCode("")
      return
    }

    if (!availableLanguageCodes.includes(selectedLanguageCode)) {
      const firstNonOriginalRow = selectedEmailRows.find((row) => row.is_original === false)
      setSelectedLanguageCode(
        firstNonOriginalRow?.language.language_code ?? availableLanguageCodes[0],
      )
    }
  }, [availableLanguageCodes.join("|"), selectedLanguageCode, selectedEmailRows])

  const originalRow = selectedEmailRows.find((row) => row.is_original) ?? null
  const selectedLanguageRow =
    selectedEmailRows.find((row) => row.language.language_code === selectedLanguageCode) ?? null

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
  }, [selectedType, selectedEmailKey, selectedLanguageCode])

  useEffect(() => {
    return () => {
      if (resetVisualStateTimeoutRef.current) {
        clearTimeout(resetVisualStateTimeoutRef.current)
      }
    }
  }, [])

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
          queryKey: ["dcx_admin_live_emails_catalog", props.debugAdminUserId],
        })

        setSelectedLanguageVisualState("saved")
        setSelectedLanguageStatusText(
          savePayload.data.was_noop ? "No changes to save." : "Saved.",
        )

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

  return (
    <section className="flex flex-col gap-6">
      <section className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-black/6 pb-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Content
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Emails
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Browse one live original email row against one selected language row. The selected
              language panel is now editable and autosaves into the immutable multilingual
              email-template model.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {totalLiveRowCount} live rows
          </div>
        </div>

        {catalogQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading live emails...</p>
        ) : null}

        {catalogQuery.isError ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
              Emails read blocked
            </p>
            <p className="text-sm leading-6 text-slate-600">
              {(catalogQuery.error as Error & { suggested_action?: string }).message}
            </p>
            <p className="text-sm text-slate-500">
              {(catalogQuery.error as Error & { suggested_action?: string }).suggested_action ??
                "Use ?admin_user_id=<existing_user_id> locally until admin auth is connected."}
            </p>
          </div>
        ) : null}

        {!catalogQuery.isLoading && !catalogQuery.isError ? (
          <div className="grid gap-4 md:grid-cols-3">
            <LabeledSelect
              label="Type"
              value={selectedType}
              options={availableTypes.map((type) => ({ value: type, label: type }))}
              onChange={(nextType) => {
                setSelectedType(nextType)
                props.onEmailTypeRouteChange?.(nextType)
              }}
            />
            <LabeledSelect
              label="Email"
              value={selectedEmailKey}
              options={availableEmailKeys.map((emailKey) => ({ value: emailKey, label: emailKey }))}
              onChange={setSelectedEmailKey}
            />
            <LabeledSelect
              label="Language"
              value={selectedLanguageCode}
              options={selectedEmailRows.map((row) => ({
                value: row.language.language_code,
                label: `${row.language.language_name_native} (${row.language.language_code})`,
              }))}
              onChange={setSelectedLanguageCode}
            />
          </div>
        ) : null}
      </section>

      {!catalogQuery.isLoading && !catalogQuery.isError ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <CatalogEmailCard
            eyebrow="Original"
            title={originalRow ? `${originalRow.email_type} / ${originalRow.email_key}` : "Original email row"}
            row={originalRow}
            emptyMessage="No live original row exists for this email yet."
          />
          <CatalogEmailCard
            eyebrow="Selected language"
            title={
              selectedLanguageRow
                ? `${selectedLanguageRow.language.language_name_native} (${selectedLanguageRow.language.language_code})`
                : "Selected language row"
            }
            row={selectedLanguageRow}
            emptyMessage="No live row exists for the selected language yet."
            editable={selectedLanguageRow !== null}
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
      ) : null}
    </section>
  )
}
