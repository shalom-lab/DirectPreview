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

function SettingsContent() {
  const { settings, ready, updateSettings, t } = useAppSettings()

  if (!ready) {
    return (
      <div className="dp-themed min-h-screen flex items-center justify-center text-[var(--dp-text-muted)]">
        ...
      </div>
    )
  }

  return (
    <div
      className="dp-themed min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--dp-shell-bg)", color: "var(--dp-text)" }}>
      <header
        className="border-b px-6 py-4 flex items-center gap-4"
        style={{
          backgroundColor: "var(--dp-header-bg)",
          borderColor: "var(--dp-border)"
        }}>
        <button
          type="button"
          onClick={openDashboardPage}
          className="px-3 py-1.5 text-sm rounded-md hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "var(--dp-preview-bg)", color: "var(--dp-text)" }}>
          ← {t("settings_back")}
        </button>
        <h1 className="text-lg font-semibold">{t("settings_title")}</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8">
        <section
          className="rounded-xl border p-5 space-y-3"
          style={{
            backgroundColor: "var(--dp-sidebar-bg)",
            borderColor: "var(--dp-border)"
          }}>
          <label
            htmlFor="locale-select"
            className="block text-sm font-medium">
            {t("settings_language")}
          </label>
          <select
            id="locale-select"
            value={settings.locale}
            onChange={(e) =>
              updateSettings({ locale: e.target.value as LocaleId })
            }
            className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{
              backgroundColor: "var(--dp-doc-bg)",
              borderColor: "var(--dp-border)",
              color: "var(--dp-text)"
            }}>
            <option value="auto">{t("settings_language_auto")}</option>
            {LOCALE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </section>

        <section
          className="rounded-xl border p-5 space-y-4"
          style={{
            backgroundColor: "var(--dp-sidebar-bg)",
            borderColor: "var(--dp-border)"
          }}>
          <h2 className="text-sm font-medium">{t("settings_theme")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {THEME_OPTIONS.map((themeId) => {
              const tokens = THEMES[themeId]
              const selected = settings.theme === themeId
              return (
                <button
                  key={themeId}
                  type="button"
                  onClick={() => updateSettings({ theme: themeId })}
                  className={`relative rounded-lg border-2 p-3 text-left transition-all ${
                    selected
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-transparent hover:border-slate-300"
                  }`}
                  style={{ backgroundColor: tokens.previewBg }}>
                  <div className="flex gap-2 mb-2">
                    <span
                      className="w-8 h-8 rounded-md border"
                      style={{
                        backgroundColor: tokens.shellBg,
                        borderColor: tokens.border
                      }}
                    />
                    <span
                      className="w-8 h-8 rounded-md border"
                      style={{
                        backgroundColor: tokens.docBg,
                        borderColor: tokens.border
                      }}
                    />
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: tokens.text }}>
                    {t(THEME_LABEL_KEYS[themeId])}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </main>

      <footer
        className="max-w-2xl w-full mx-auto px-6 pb-8 pt-2 mt-auto"
        style={{ borderColor: "var(--dp-border)" }}>
        <div
          className="rounded-xl border p-5 text-center"
          style={{
            backgroundColor: "var(--dp-sidebar-bg)",
            borderColor: "var(--dp-border)"
          }}>
          <p className="text-sm font-medium mb-1">{t("settings_github_title")}</p>
          <p className="text-xs dp-text-muted mb-4">{t("settings_github_hint")}</p>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block transition-opacity hover:opacity-85">
            <img
              src={GITHUB_STARS_BADGE_URL}
              alt={t("settings_star_cta")}
              height={28}
            />
          </a>
          <p className="text-xs dp-text-muted mt-3">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline">
              shalom-lab/DirectPreview
            </a>
          </p>
        </div>
      </footer>
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
