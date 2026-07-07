import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react"

import { setLocaleOverride, subscribeLocale, t as translate } from "~utils/i18n"
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  themeToCssVars,
  type AppSettings,
  type LocaleId,
  type ThemeId
} from "~utils/settings"

interface AppSettingsContextValue {
  settings: AppSettings
  ready: boolean
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  t: typeof translate
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)

function applyThemeToDocument(theme: ThemeId): void {
  const vars = themeToCssVars(theme)
  const root = document.documentElement
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

export function AppSettingsProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)
  const [localeVersion, setLocaleVersion] = useState(0)

  useEffect(() => {
    let active = true

    loadSettings().then((loaded) => {
      if (!active) return
      setSettings(loaded)
      setLocaleOverride(loaded.locale)
      applyThemeToDocument(loaded.theme)
      setReady(true)
    })

    const unsubscribe = subscribeLocale(() => {
      setLocaleVersion((value) => value + 1)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    applyThemeToDocument(settings.theme)
  }, [settings.theme, ready])

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch }
      setSettings(next)
      setLocaleOverride(next.locale)
      await saveSettings(next)
      setLocaleVersion((value) => value + 1)
    },
    [settings]
  )

  const value = useMemo(
    () => ({
      settings,
      ready,
      updateSettings,
      t: translate
    }),
    [settings, ready, updateSettings, localeVersion]
  )

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings(): AppSettingsContextValue {
  const context = useContext(AppSettingsContext)
  if (!context) {
    throw new Error("useAppSettings must be used within AppSettingsProvider")
  }
  return context
}

export function openSettingsPage(): void {
  window.location.href = chrome.runtime.getURL("tabs/settings.html")
}

export function openDashboardPage(): void {
  window.location.href = chrome.runtime.getURL("tabs/preview.html")
}

export type { LocaleId, ThemeId }
