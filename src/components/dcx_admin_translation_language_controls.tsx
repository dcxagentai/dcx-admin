/**
 * CONTEXT:
 * Shared translation-language controls for DCX admin editors.
 * It keeps the language-row switching and translation-creation affordances
 * consistent across pages, categories, newsletters, transactional emails, and UX strings.
 */
import { useState } from "react"

import { DcxCountryFlagIcon } from "@/components/ui/dcx_country_flag_icon"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTriggerIcon,
} from "@/components/ui/combobox"
import {
  buildDcxAdminLanguageComboboxOption,
  type DcxAdminLanguageComboboxOption,
} from "@/lib/dcx_admin_language_flag_options"

export type DcxAdminTranslationLanguageRow = {
  language_code: string
  language_name_native: string
  is_original?: boolean
}

type Props = {
  eyebrow?: string
  title?: string
  description?: string
  existingLanguageRows: DcxAdminTranslationLanguageRow[]
  selectedLanguageCode: string | null
  onSelectExistingLanguage: (languageCode: string) => void
  hideExistingLanguageSelector?: boolean
  missingLanguages?: Array<{
    language_code: string
    language_name_native: string
  }>
  onCreateMissingLanguage?: (languageCode: string) => void
  isCreatePending?: boolean
}

function renderLanguageOption(option: DcxAdminLanguageComboboxOption) {
  return (
    <>
      <DcxCountryFlagIcon
        regionCode={option.regionCode}
        title={option.label}
        fallbackLabel={option.languageCode.toUpperCase()}
      />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-slate-950">{option.label}</span>
        <span className="text-xs text-slate-500">{option.subtitle}</span>
      </div>
    </>
  )
}

export function DcxAdminTranslationLanguageSelector(props: {
  existingLanguageRows: DcxAdminTranslationLanguageRow[]
  selectedLanguageCode: string | null
  onSelectExistingLanguage: (languageCode: string) => void
  label?: string
}) {
  const existingLanguageOptions = props.existingLanguageRows.map((languageRow) =>
    buildDcxAdminLanguageComboboxOption({
      languageCode: languageRow.language_code,
      languageNameNative: languageRow.language_name_native,
      isOriginal: languageRow.is_original,
    }),
  )
  const selectedLanguageOption =
    existingLanguageOptions.find((option) => option.languageCode === props.selectedLanguageCode) ?? null

  return (
    <div className="space-y-2">
      {props.label ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {props.label}
        </p>
      ) : null}
      <div className="relative">
        {selectedLanguageOption ? (
          <div className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center">
            <DcxCountryFlagIcon
              regionCode={selectedLanguageOption.regionCode}
              title={selectedLanguageOption.label}
              fallbackLabel={selectedLanguageOption.languageCode.toUpperCase()}
            />
          </div>
        ) : null}
        <Combobox
          items={existingLanguageOptions}
          value={selectedLanguageOption ?? undefined}
          itemToStringLabel={(option) =>
            (option as DcxAdminLanguageComboboxOption).label
          }
          itemToStringValue={(option) =>
            (option as DcxAdminLanguageComboboxOption).searchLabel
          }
          isItemEqualToValue={(left, right) =>
            (left as DcxAdminLanguageComboboxOption).languageCode ===
            (right as DcxAdminLanguageComboboxOption).languageCode
          }
          onValueChange={(nextLanguageOption) => {
            if (!nextLanguageOption) {
              return
            }
            props.onSelectExistingLanguage(
              (nextLanguageOption as DcxAdminLanguageComboboxOption).languageCode,
            )
          }}
          autoHighlight
          openOnInputClick
        >
          <ComboboxInput
            className={selectedLanguageOption ? "pr-10 pl-16" : "pr-10"}
            placeholder="Search language row"
          />
          <ComboboxTriggerIcon />
          <ComboboxContent>
            <ComboboxEmpty>No language rows found.</ComboboxEmpty>
            <ComboboxList>
              {(option) => (
                <ComboboxItem
                  key={(option as DcxAdminLanguageComboboxOption).languageCode}
                  value={option}
                >
                  {renderLanguageOption(option as DcxAdminLanguageComboboxOption)}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    </div>
  )
}

export function DcxAdminTranslationLanguageControls(props: Props) {
  const [missingLanguageComboboxResetKey, setMissingLanguageComboboxResetKey] = useState(0)

  const missingLanguageOptions =
    props.missingLanguages?.map((language) =>
      buildDcxAdminLanguageComboboxOption({
        languageCode: language.language_code,
        languageNameNative: language.language_name_native,
      }),
    ) ?? []

  return (
    <section className="space-y-4 border border-black/6 bg-slate-50 px-4 py-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {props.eyebrow ?? "Translations"}
        </p>
        <h4 className="text-lg font-semibold tracking-tight text-slate-950">
          {props.title ?? "Available language rows"}
        </h4>
        {props.description ? (
          <p className="text-sm leading-6 text-slate-600">{props.description}</p>
        ) : null}
      </div>

      {!props.hideExistingLanguageSelector || props.onCreateMissingLanguage ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {!props.hideExistingLanguageSelector ? (
            <DcxAdminTranslationLanguageSelector
              existingLanguageRows={props.existingLanguageRows}
              selectedLanguageCode={props.selectedLanguageCode}
              onSelectExistingLanguage={props.onSelectExistingLanguage}
              label="Open language row"
            />
          ) : (
            <div />
          )}

          {props.onCreateMissingLanguage ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Create missing language row
            </p>
            <div className="relative">
              <Combobox
                key={missingLanguageComboboxResetKey}
                items={missingLanguageOptions}
                itemToStringLabel={(option) =>
                  (option as DcxAdminLanguageComboboxOption).label
                }
                itemToStringValue={(option) =>
                  (option as DcxAdminLanguageComboboxOption).searchLabel
                }
                isItemEqualToValue={(left, right) =>
                  (left as DcxAdminLanguageComboboxOption).languageCode ===
                  (right as DcxAdminLanguageComboboxOption).languageCode
                }
                onValueChange={(nextLanguageOption) => {
                  if (!nextLanguageOption) {
                    return
                  }
                  props.onCreateMissingLanguage?.(
                    (nextLanguageOption as DcxAdminLanguageComboboxOption).languageCode,
                  )
                  setMissingLanguageComboboxResetKey((currentValue) => currentValue + 1)
                }}
                autoHighlight
                openOnInputClick
                disabled={missingLanguageOptions.length === 0 || props.isCreatePending}
              >
                <ComboboxInput
                  className="pr-10"
                  placeholder={
                    missingLanguageOptions.length > 0
                      ? props.isCreatePending
                        ? "Creating language row..."
                        : "Search missing language"
                      : "All supported languages already exist"
                  }
                  disabled={missingLanguageOptions.length === 0 || props.isCreatePending}
                />
                <ComboboxTriggerIcon />
                <ComboboxContent>
                  <ComboboxEmpty>No missing languages found.</ComboboxEmpty>
                  <ComboboxList>
                    {(option) => (
                      <ComboboxItem
                        key={(option as DcxAdminLanguageComboboxOption).languageCode}
                        value={option}
                      >
                        {renderLanguageOption(option as DcxAdminLanguageComboboxOption)}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
