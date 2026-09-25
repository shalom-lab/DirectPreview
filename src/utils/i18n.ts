import deMessages from "../../locales/de/messages.json"
import enMessages from "../../locales/en/messages.json"
import esMessages from "../../locales/es/messages.json"
import frMessages from "../../locales/fr/messages.json"
import itMessages from "../../locales/it/messages.json"
import jaMessages from "../../locales/ja/messages.json"
import koMessages from "../../locales/ko/messages.json"
import ptBRMessages from "../../locales/pt_BR/messages.json"
import ruMessages from "../../locales/ru/messages.json"
import zhCNMessages from "../../locales/zh_CN/messages.json"

import { detectAppLocale, type AppLocale } from "~utils/locales"
import type { LocaleId } from "~utils/settings"

type MessageEntry = {
  message: string
  placeholders?: Record<string, { content: string; example?: string }>
}

type MessageBundle = Record<string, MessageEntry>

const BUNDLES: Record<AppLocale, MessageBundle> = {
  zh_CN: zhCNMessages,
  en: enMessages,
  ja: jaMessages,
  es: esMessages,
  fr: frMessages,
  de: deMessages,
  ko: koMessages,
  pt_BR: ptBRMessages,
  ru: ruMessages,
  it: itMessages
}

let localeOverride: LocaleId = "auto"
const localeListeners = new Set<() => void>()

export function setLocaleOverride(locale: LocaleId): void {
  localeOverride = locale
  localeListeners.forEach((listener) => listener())
}

export function subscribeLocale(listener: () => void): () => void {
  localeListeners.add(listener)
  return () => localeListeners.delete(listener)
}

export function resolveLocale(locale: LocaleId = localeOverride): AppLocale {
  if (locale !== "auto") return locale

  try {
    const ui = chrome?.i18n?.getUILanguage?.() ?? "en"
    return detectAppLocale(ui)
  } catch {
    return "zh_CN"
  }
}

export function t(
  key: string,
  substitutions?: string | string[]
): string {
  const locale = resolveLocale()
  const entry = BUNDLES[locale][key] ?? BUNDLES.en[key]

  if (entry?.message) {
    return applySubstitutions(entry.message, substitutions, entry.placeholders)
  }

  try {
    if (typeof chrome !== "undefined" && chrome.i18n?.getMessage) {
      const chromeMessage = chrome.i18n.getMessage(key, substitutions)
      if (chromeMessage) return chromeMessage
    }
  } catch {
    // ignore
  }

  return key
}

export function te(
  key: string,
  substitutions?: string | string[]
): Error {
  return new Error(t(key, substitutions))
}

export async function initLocaleFromStorage(): Promise<void> {
  const { loadSettings } = await import("~utils/settings")
  const settings = await loadSettings()
  setLocaleOverride(settings.locale)
}

function applySubstitutions(
  message: string,
  substitutions?: string | string[],
  placeholders?: MessageEntry["placeholders"]
): string {
  if (!substitutions) return message

  const subs = Array.isArray(substitutions) ? substitutions : [substitutions]
  let result = message

  if (placeholders) {
    for (const [name, def] of Object.entries(placeholders)) {
      const indexMatch = def.content.match(/\$(\d+)/)
      if (!indexMatch) continue
      const value = subs[Number(indexMatch[1]) - 1] ?? ""
      result = result.replace(new RegExp(`\\$${name}\\$`, "gi"), value)
    }
    return result
  }

  subs.forEach((sub, index) => {
    result = result.replace(new RegExp(`\\$${index + 1}\\$`, "g"), sub)
  })

  return result
}
