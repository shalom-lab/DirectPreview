export const SETTINGS_STORAGE_KEY = "directpreview_settings"

import type { AppLocale } from "~utils/locales"
import { isAppLocale } from "~utils/locales"

export type ThemeId = "default" | "eye-green" | "eye-yellow" | "eye-blue"
export type LocaleId = "auto" | AppLocale

export interface AppSettings {
  theme: ThemeId
  locale: LocaleId
}

export interface ThemeTokens {
  shellBg: string
  sidebarBg: string
  headerBg: string
  previewBg: string
  docBg: string
  surfaceMuted: string
  dotColor: string
  text: string
  textMuted: string
  border: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "default",
  locale: "auto"
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  default: {
    shellBg: "#f8fafc",
    sidebarBg: "#ffffff",
    headerBg: "#ffffff",
    previewBg: "#f8fafc",
    docBg: "#ffffff",
    surfaceMuted: "#f1f5f9",
    dotColor: "#cbd5e1",
    text: "#1e293b",
    textMuted: "#94a3b8",
    border: "#e2e8f0"
  },
  "eye-green": {
    shellBg: "#e8f3ec",
    sidebarBg: "#f4faf6",
    headerBg: "#f4faf6",
    previewBg: "#e3f0e8",
    docBg: "#f0f8f3",
    surfaceMuted: "#e8f3ec",
    dotColor: "#a8c9b4",
    text: "#2d4a38",
    textMuted: "#6b8f7a",
    border: "#c5dccf"
  },
  "eye-yellow": {
    shellBg: "#f5f0e3",
    sidebarBg: "#faf7ef",
    headerBg: "#faf7ef",
    previewBg: "#f0ead8",
    docBg: "#f8f4e8",
    surfaceMuted: "#f0ead8",
    dotColor: "#d4c9a8",
    text: "#4a4435",
    textMuted: "#8a8270",
    border: "#e0d5bc"
  },
  "eye-blue": {
    shellBg: "#eef3f8",
    sidebarBg: "#f6f9fc",
    headerBg: "#f6f9fc",
    previewBg: "#e6edf5",
    docBg: "#f2f7fc",
    surfaceMuted: "#e8eff7",
    dotColor: "#b8c9dc",
    text: "#2c3e50",
    textMuted: "#6b7f94",
    border: "#cdd9e8"
  }
}

export function themeToCssVars(theme: ThemeId): Record<string, string> {
  const tokens = THEMES[theme]
  return {
    "--dp-shell-bg": tokens.shellBg,
    "--dp-sidebar-bg": tokens.sidebarBg,
    "--dp-header-bg": tokens.headerBg,
    "--dp-preview-bg": tokens.previewBg,
    "--dp-doc-bg": tokens.docBg,
    "--dp-surface-muted": tokens.surfaceMuted,
    "--dp-dot-color": tokens.dotColor,
    "--dp-text": tokens.text,
    "--dp-text-muted": tokens.textMuted,
    "--dp-border": tokens.border
  }
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY)
    const stored = result[SETTINGS_STORAGE_KEY] as Partial<AppSettings> | undefined
    if (!stored) return { ...DEFAULT_SETTINGS }

    return {
      theme: isThemeId(stored.theme) ? stored.theme : DEFAULT_SETTINGS.theme,
      locale: isLocaleId(stored.locale) ? stored.locale : DEFAULT_SETTINGS.locale
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings })
}

function isThemeId(value: unknown): value is ThemeId {
  return (
    value === "default" ||
    value === "eye-green" ||
    value === "eye-yellow" ||
    value === "eye-blue"
  )
}

function isLocaleId(value: unknown): value is LocaleId {
  return value === "auto" || (typeof value === "string" && isAppLocale(value))
}
