/**
 * CONTEXT:
 * First editable UX-strings viewer for the DCX admin frontend.
 * It exists to let internal users browse one original string row against one selected language
 * row, then autosave edits on the selected-language panel using the immutable backend version model.
 */
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  readDcxAdminLiveUxStringsCatalog,
  type DcxAdminUxStringCatalogRow,
} from "../lib/read_dcx_admin_live_ux_strings_catalog"
import { saveDcxAdminLiveUxStringRow } from "../lib/save_dcx_admin_live_ux_string_row"

type Props = {
  apiBaseUrl: string
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

function CatalogTextCard(props: {
  eyebrow: string
  title: string
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
    <article className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
      <div className="mb-5 space-y-2 border-b border-black/6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {props.eyebrow}
        </p>
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">{props.title}</h3>
      </div>

      {props.row ? (
        <div className="space-y-6">
          {props.editable ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Text
                </p>
                <p
                  className={[
                    "text-xs font-medium",
                    readEditableFieldStatusTextClass(props.visualState ?? "idle"),
                  ].join(" ")}
                >
                  {props.statusText}
                </p>
              </div>
              <textarea
                value={props.draftText ?? ""}
                onFocus={props.onFocusText}
                onChange={(event) => props.onChangeText?.(event.target.value)}
                onBlur={props.onBlurText}
                disabled={props.isDisabled}
                rows={7}
                className={[
                  "w-full resize-y rounded-[1.25rem] border bg-slate-50 px-5 py-4 text-base leading-7 text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:opacity-70",
                  readEditableFieldBorderClass(props.visualState ?? "idle"),
                ].join(" ")}
              />
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-5 py-5">
              <p className="whitespace-pre-wrap text-base leading-7 text-slate-900">{props.row.text}</p>
            </div>
          )}

          <dl>
            <MetadataRow
              label="Language"
              value={`${props.row.language.language_name_native} (${props.row.language.language_code})`}
            />
            <MetadataRow label="String id" value={String(props.row.ux_string_id)} />
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

export function DcxAdminUxStringsCatalogPage(props: Props) {
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

  const uxStrings = catalogQuery.data?.data.ux_strings ?? []
  const totalLiveRowCount = catalogQuery.data?.data.total_live_row_count ?? 0

  const availableGroups = buildUniqueValues(uxStrings.map((row) => row.string_group))
  const [selectedGroup, setSelectedGroup] = useState("")

  useEffect(() => {
    if (availableGroups.length === 0) {
      setSelectedGroup("")
      return
    }

    if (!availableGroups.includes(selectedGroup)) {
      setSelectedGroup(availableGroups[0])
    }
  }, [availableGroups.join("|"), selectedGroup])

  const groupRows = uxStrings.filter((row) => row.string_group === selectedGroup)
  const availableKeys = buildUniqueValues(groupRows.map((row) => row.string_key))
  const [selectedKey, setSelectedKey] = useState("")

  useEffect(() => {
    if (availableKeys.length === 0) {
      setSelectedKey("")
      return
    }

    if (!availableKeys.includes(selectedKey)) {
      setSelectedKey(availableKeys[0])
    }
  }, [availableKeys.join("|"), selectedKey])

  const selectedKeyRows = groupRows.filter((row) => row.string_key === selectedKey)
  const availableLanguageCodes = buildUniqueValues(
    selectedKeyRows.map((row) => row.language.language_code),
  )
  const [selectedLanguageCode, setSelectedLanguageCode] = useState("")

  useEffect(() => {
    if (availableLanguageCodes.length === 0) {
      setSelectedLanguageCode("")
      return
    }

    if (!availableLanguageCodes.includes(selectedLanguageCode)) {
      const firstNonOriginalRow = selectedKeyRows.find((row) => row.is_original === false)
      setSelectedLanguageCode(
        firstNonOriginalRow?.language.language_code ?? availableLanguageCodes[0],
      )
    }
  }, [availableLanguageCodes.join("|"), selectedLanguageCode, selectedKeyRows])

  const originalRow = selectedKeyRows.find((row) => row.is_original) ?? null
  const selectedLanguageRow =
    selectedKeyRows.find((row) => row.language.language_code === selectedLanguageCode) ?? null

  const [selectedLanguageDraftText, setSelectedLanguageDraftText] = useState("")
  const [selectedLanguageVisualState, setSelectedLanguageVisualState] =
    useState<EditableFieldVisualState>("idle")
  const [selectedLanguageStatusText, setSelectedLanguageStatusText] = useState(
    "Blue means editable. Click into the selected language text to adjust.",
  )

  useEffect(() => {
    if (selectedLanguageRow) {
      setSelectedLanguageDraftText(selectedLanguageRow.text)
    }
  }, [selectedLanguageRow?.ux_string_id, selectedLanguageRow?.text])

  useEffect(() => {
    setSelectedLanguageVisualState("idle")
    setSelectedLanguageStatusText(
      "Blue means editable. Click into the selected language text to adjust.",
    )
  }, [selectedGroup, selectedKey, selectedLanguageCode])

  useEffect(() => {
    return () => {
      if (resetVisualStateTimeoutRef.current) {
        clearTimeout(resetVisualStateTimeoutRef.current)
      }
    }
  }, [])

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
        setSelectedLanguageStatusText(
          savePayload.data.was_noop ? "No changes to save." : "Saved.",
        )

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

  return (
    <section className="flex flex-col gap-6">
      <section className="rounded-[1.75rem] border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-black/6 pb-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Content
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              UX strings
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Browse one live original string row against one selected language row. The selected
              language panel is now editable and autosaves into the immutable multilingual
              UX-string model.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {totalLiveRowCount} live rows
          </div>
        </div>

        {catalogQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading live UX strings...</p>
        ) : null}

        {catalogQuery.isError ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
              UX strings read blocked
            </p>
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
          <div className="grid gap-4 md:grid-cols-3">
            <LabeledSelect
              label="Group"
              value={selectedGroup}
              options={availableGroups.map((group) => ({ value: group, label: group }))}
              onChange={setSelectedGroup}
            />
            <LabeledSelect
              label="UX string"
              value={selectedKey}
              options={availableKeys.map((key) => ({ value: key, label: key }))}
              onChange={setSelectedKey}
            />
            <LabeledSelect
              label="Language"
              value={selectedLanguageCode}
              options={selectedKeyRows.map((row) => ({
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
          <CatalogTextCard
            eyebrow="Original"
            title={originalRow ? `${originalRow.string_group} / ${originalRow.string_key}` : "Original row"}
            row={originalRow}
            emptyMessage="No live original row exists for this UX string yet."
          />
          <CatalogTextCard
            eyebrow="Selected language"
            title={
              selectedLanguageRow
                ? `${selectedLanguageRow.language.language_name_native} (${selectedLanguageRow.language.language_code})`
                : "Selected language row"
            }
            row={selectedLanguageRow}
            emptyMessage="No live row exists for the selected language yet."
            editable={selectedLanguageRow !== null}
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
                setSelectedLanguageStatusText(
                  "Blue means editable. Click into the selected language text to adjust.",
                )
                return
              }

              setSelectedLanguageVisualState("saving")
              setSelectedLanguageStatusText("Saving...")
              void saveSelectedLanguageDraftWithRetries(selectedLanguageRow, selectedLanguageDraftText)
            }}
            isDisabled={saveUxStringMutation.isPending}
          />
        </section>
      ) : null}
    </section>
  )
}
