export const APP_LOCALES = [
  "zh_CN",
  "en",
  "ja",
  "es",
  "fr",
  "de",
  "ko",
  "pt_BR",
  "ru",
  "it"
] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export const LOCALE_OPTIONS: { id: AppLocale; labelKey: string }[] = [
  { id: "zh_CN", labelKey: "settings_language_zh" },
  { id: "en", labelKey: "settings_language_en" },
  { id: "ja", labelKey: "settings_language_ja" },
  { id: "es", labelKey: "settings_language_es" },
  { id: "fr", labelKey: "settings_language_fr" },
  { id: "de", labelKey: "settings_language_de" },
  { id: "ko", labelKey: "settings_language_ko" },
  { id: "pt_BR", labelKey: "settings_language_pt_br" },
  { id: "ru", labelKey: "settings_language_ru" },
  { id: "it", labelKey: "settings_language_it" }
]

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value)
}

export function detectAppLocale(uiLanguage: string): AppLocale {
  const normalized = uiLanguage.toLowerCase().replace("-", "_")

  if (normalized.startsWith("zh")) return "zh_CN"
  if (normalized.startsWith("ja")) return "ja"
  if (normalized.startsWith("ko")) return "ko"
  if (normalized.startsWith("pt")) return "pt_BR"
  if (normalized.startsWith("es")) return "es"
  if (normalized.startsWith("fr")) return "fr"
  if (normalized.startsWith("de")) return "de"
  if (normalized.startsWith("ru")) return "ru"
  if (normalized.startsWith("it")) return "it"
  if (normalized.startsWith("en")) return "en"

  return "en"
}
