/**
 * CONTEXT:
 * Language selection helpers for the DCX admin frontend.
 * They let admin editors use one consistent flag-plus-language combobox pattern
 * across translation-aware editors without each screen inventing its own mapping.
 */
export type DcxAdminLanguageComboboxOption = {
  languageCode: string
  languageNameNative: string
  regionCode: string
  label: string
  subtitle: string
  searchLabel: string
}

export type DcxAdminSupportedLanguageRow = {
  language_code: string
  language_name_native: string
}

const DCX_ADMIN_LANGUAGE_TO_REGION_CODE: Record<string, string> = {
  de: "DE",
  en: "GB",
  es: "ES",
  fr: "FR",
}

const DCX_ADMIN_SUPPORTED_LANGUAGE_ROWS: DcxAdminSupportedLanguageRow[] = [
  {
    language_code: "en",
    language_name_native: "English",
  },
  {
    language_code: "de",
    language_name_native: "Deutsch",
  },
  {
    language_code: "es",
    language_name_native: "Español",
  },
  {
    language_code: "fr",
    language_name_native: "Français",
  },
]

export function readDcxAdminLanguageFlagRegionCode(languageCode: string): string {
  const normalizedLanguageCode = languageCode.trim().toLowerCase()
  const primaryLanguageCode = normalizedLanguageCode.split("-")[0] ?? normalizedLanguageCode

  return (
    DCX_ADMIN_LANGUAGE_TO_REGION_CODE[normalizedLanguageCode] ??
    DCX_ADMIN_LANGUAGE_TO_REGION_CODE[primaryLanguageCode] ??
    primaryLanguageCode.toUpperCase()
  )
}

export function buildDcxAdminLanguageComboboxOption(params: {
  languageCode: string
  languageNameNative: string
  isOriginal?: boolean
}): DcxAdminLanguageComboboxOption {
  const regionCode = readDcxAdminLanguageFlagRegionCode(params.languageCode)
  const label = params.languageNameNative
  const subtitle = `${params.languageCode.toUpperCase()}${params.isOriginal ? " · original" : ""}`

  return {
    languageCode: params.languageCode,
    languageNameNative: params.languageNameNative,
    regionCode,
    label,
    subtitle,
    searchLabel: `${params.languageNameNative} ${params.languageCode} ${regionCode}`,
  }
}

export function readDcxAdminSupportedLanguageRows(): DcxAdminSupportedLanguageRow[] {
  return [...DCX_ADMIN_SUPPORTED_LANGUAGE_ROWS]
}

export function readDcxAdminMissingLanguageRows(existingLanguageCodes: string[]): DcxAdminSupportedLanguageRow[] {
  const existingLanguageCodeSet = new Set(
    existingLanguageCodes.map((languageCode) => languageCode.trim().toLowerCase()),
  )

  return DCX_ADMIN_SUPPORTED_LANGUAGE_ROWS.filter(
    (language) => !existingLanguageCodeSet.has(language.language_code),
  )
}
