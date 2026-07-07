import React from "react"

import {
  AppSettingsProvider,
  openDashboardPage,
  useAppSettings,
  type ThemeId
} from "~providers/AppSettingsProvider"
import { LOCALE_OPTIONS } from "~utils/locales"
import type { LocaleId } from "~utils/settings"
import { THEMES } from "~utils/settings"
import { GITHUB_REPO_URL, GITHUB_STARS_BADGE_URL } from "~utils/github"
import "~style.css"

const THEME_OPTIONS: ThemeId[] = [
  "default",
  "eye-green",
  "eye-yellow",
  "eye-blue"
]

const THEME_LABEL_KEYS: Record<ThemeId, string> = {
  default: "settings_theme_default",
  "eye-green": "settings_theme_eye_green",
  "eye-yellow": "settings_theme_eye_yellow",
  "eye-blue": "settings_theme_eye_blue"
}

const cardStyle = {
  backgroundColor: "var(--dp-sidebar-bg)",
  borderColor: "var(--dp-border)"
} as const

function SettingsCard({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-xl border p-5 shadow-sm"
      style={cardStyle}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--dp-text)" }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function SettingsContent() {
  const { settings, ready, updateSettings, t } = useAppSettings()

  if (!ready) {
    return (
      <div className="dp-themed min-h-screen flex items-center justify-center dp-text-muted">
        ...
      </div>
    )
  }

  return (
    <div
      className="dp-themed min-h-screen dp-dot-grid"
      style={{ color: "var(--dp-text)" }}>
      <header
        className="border-b px-6 py-3.5 flex items-center gap-3"
        style={{
          backgroundColor: "var(--dp-header-bg)",
          borderColor: "var(--dp-border)"
        }}>
        <button
          type="button"
          onClick={openDashboardPage}
          className="px-3 py-1.5 text-sm rounded-lg border transition-colors hover:opacity-90"
          style={{
            backgroundColor: "var(--dp-doc-bg)",
            borderColor: "var(--dp-border)",
            color: "var(--dp-text)"
          }}>
          ← {t("settings_back")}
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-mono flex-shrink-0">
            DP
          </span>
          <h1 className="text-base font-semibold truncate">{t("settings_title")}</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto w-full px-5 py-6 space-y-4">
        <SettingsCard title={t("settings_language")}>
          <select
            id="locale-select"
            value={settings.locale}
            onChange={(e) =>
              updateSettings({ locale: e.target.value as LocaleId })
            }
            className="w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-200 dp-viewer-input">
            <option value="auto">{t("settings_language_auto")}</option>
            {LOCALE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </SettingsCard>

        <SettingsCard title={t("settings_theme")}>
          <div className="grid grid-cols-2 gap-3">
            {THEME_OPTIONS.map((themeId) => {
              const tokens = THEMES[themeId]
              const selected = settings.theme === themeId
              return (
                <button
                  key={themeId}
                  type="button"
                  onClick={() => updateSettings({ theme: themeId })}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    selected
                      ? "border-blue-500 ring-2 ring-blue-200/80"
                      : "border-transparent hover:opacity-90"
                  }`}
                  style={{ backgroundColor: tokens.previewBg }}>
                  <div
                    className="h-10 rounded-md border mb-2 dp-dot-grid-surface"
                    style={{ borderColor: tokens.border }}
                  />
                  <span className="text-sm font-medium" style={{ color: tokens.text }}>
                    {t(THEME_LABEL_KEYS[themeId])}
                  </span>
                </button>
              )
            })}
          </div>
        </SettingsCard>

        <SettingsCard title={t("settings_github_title")}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm dp-text-muted leading-relaxed">
                {t("settings_github_hint")}
              </p>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline">
                shalom-lab/DirectPreview
              </a>
            </div>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-shrink-0 self-start sm:self-center transition-opacity hover:opacity-85">
              <img
                src={GITHUB_STARS_BADGE_URL}
                alt={t("settings_star_cta")}
                height={28}
              />
            </a>
          </div>
        </SettingsCard>
      </main>
    </div>
  )
}

function SettingsPage() {
  return (
    <AppSettingsProvider>
      <SettingsContent />
    </AppSettingsProvider>
  )
}

export default SettingsPage
