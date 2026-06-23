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
  ar: "AE",
  de: "DE",
  en: "GB",
  es: "ES",
  fr: "FR",
  hi: "IN",
  id: "ID",
  pt: "BR",
  ru: "RU",
  tr: "TR",
  ur: "PK",
  vi: "VN",
  zh: "CN",
}

const DCX_ADMIN_SUPPORTED_LANGUAGE_ROWS: DcxAdminSupportedLanguageRow[] = [
  {
    language_code: "ar",
    language_name_native: "العربية",
  },
  {
    language_code: "de",
    language_name_native: "Deutsch",
  },
  {
    language_code: "en",
    language_name_native: "English",
  },
  {
    language_code: "es",
    language_name_native: "Español",
  },
  {
    language_code: "fr",
    language_name_native: "Français",
  },
  {
    language_code: "hi",
    language_name_native: "हिन्दी",
  },
  {
    language_code: "id",
    language_name_native: "Bahasa Indonesia",
  },
  {
    language_code: "pt",
    language_name_native: "Português",
  },
  {
    language_code: "ru",
    language_name_native: "Русский",
  },
  {
    language_code: "tr",
    language_name_native: "Türkçe",
  },
  {
    language_code: "ur",
    language_name_native: "اردو",
  },
  {
    language_code: "vi",
    language_name_native: "Tiếng Việt",
  },
  {
    language_code: "zh",
    language_name_native: "中文",
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
