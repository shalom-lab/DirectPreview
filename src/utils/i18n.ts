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

type MessageBundle = Record<string, { message: string }>

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
  const message =
    BUNDLES[locale][key]?.message ?? BUNDLES.en[key]?.message ?? key

  if (message !== key) {
    return applySubstitutions(message, substitutions)
  }

  try {
    if (typeof chrome !== "undefined" && chrome.i18n?.getMessage) {
      const chromeMessage = chrome.i18n.getMessage(key, substitutions)
      if (chromeMessage) return chromeMessage
    }
  } catch {
    // ignore
  }

  return applySubstitutions(message, substitutions)
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
  substitutions?: string | string[]
): string {
  if (!substitutions) return message

  const subs = Array.isArray(substitutions) ? substitutions : [substitutions]
  let result = message

  subs.forEach((sub, index) => {
    result = result.replace(new RegExp(`\\$${index + 1}\\$`, "g"), sub)
  })

  if (subs.length > 0) {
    result = result.replace(/\$[A-Z][A-Z0-9_]*\$/g, () => subs[0])
  }

  return result
}
