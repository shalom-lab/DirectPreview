import React, { useEffect, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"

import {
  AppSettingsProvider,
  openDashboardPage,
  useAppSettings,
  type ThemeId
} from "~providers/AppSettingsProvider"
import { db, syncFileCategoriesAfterSettingsChange } from "~db"
import {
  diffCategories,
  normalizeCategories
} from "~utils/categories"
import { normalizeExcludeSites } from "~utils/exclude-sites"
import { GITHUB_REPO_URL, GITHUB_STARS_BADGE_URL } from "~utils/github"
import { LOCALE_OPTIONS } from "~utils/locales"
import type { LocaleId } from "~utils/settings"
import { THEMES } from "~utils/settings"
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
  const [categoriesDraft, setCategoriesDraft] = useState("")
  const [categoriesSaving, setCategoriesSaving] = useState(false)
  const [excludeDraft, setExcludeDraft] = useState("")
  const [excludeSaving, setExcludeSaving] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearMessage, setClearMessage] = useState<string | null>(null)

  const historyCount = useLiveQuery(() => db.files.count(), []) ?? 0

  useEffect(() => {
    if (!ready) return
    setCategoriesDraft(settings.categories.join("\n"))
  }, [ready, settings.categories])

  useEffect(() => {
    if (!ready) return
    setExcludeDraft(settings.eyeExcludeSites.join("\n"))
  }, [ready, settings.eyeExcludeSites])

  const saveCategories = async () => {
    const previous = settings.categories
    const next = normalizeCategories(categoriesDraft)
    setCategoriesDraft(next.join("\n"))

    if (
      previous.length === next.length &&
      previous.every((name, i) => name === next[i])
    ) {
      return
    }

    setCategoriesSaving(true)
    try {
      const { renames, deleted } = diffCategories(previous, next)
      await updateSettings({ categories: next })
      await syncFileCategoriesAfterSettingsChange(renames, deleted)
    } finally {
      setCategoriesSaving(false)
    }
  }

  const saveExcludeSites = async () => {
    const previous = settings.eyeExcludeSites
    const next = normalizeExcludeSites(excludeDraft)
    setExcludeDraft(next.join("\n"))

    if (
      previous.length === next.length &&
      previous.every((name, i) => name === next[i])
    ) {
      return
    }

    setExcludeSaving(true)
    try {
      await updateSettings({ eyeExcludeSites: next })
    } finally {
      setExcludeSaving(false)
    }
  }

  const executeClearAll = async () => {
    setClearing(true)
    setClearMessage(null)
    try {
      await db.files.clear()
      setClearConfirmOpen(false)
      setClearMessage(t("settings_clearAll_done"))
    } catch {
      setClearMessage(t("error_deleteFailed"))
    } finally {
      setClearing(false)
    }
  }

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

      <main className="max-w-4xl mx-auto w-full px-5 py-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="space-y-4">
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
                      <span
                        className="text-sm font-medium"
                        style={{ color: tokens.text }}>
                        {t(THEME_LABEL_KEYS[themeId])}
                      </span>
                    </button>
                  )
                })}
              </div>
            </SettingsCard>

            <SettingsCard title={t("settings_data")}>
              <p className="text-xs dp-text-muted mb-3 leading-relaxed">
                {t("settings_clearAll_hint")}
              </p>
              <button
                type="button"
                onClick={() => setClearConfirmOpen(true)}
                disabled={historyCount === 0 || clearing}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {t("settings_clearAll_btn")}
                {historyCount > 0 ? ` (${historyCount})` : ""}
              </button>
              {clearMessage && (
                <p className="text-xs mt-2 dp-text-muted">{clearMessage}</p>
              )}
            </SettingsCard>
          </div>

          <div className="space-y-4">
            <SettingsCard title={t("settings_categories")}>
              <p className="text-xs dp-text-muted mb-3 leading-relaxed">
                {t("settings_categories_hint")}
              </p>
              <textarea
                value={categoriesDraft}
                onChange={(e) => setCategoriesDraft(e.target.value)}
                onBlur={() => {
                  void saveCategories()
                }}
                rows={10}
                placeholder={t("settings_categories_placeholder")}
                className="w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-200 dp-viewer-input resize-y min-h-[12rem] font-mono leading-relaxed"
              />
              {categoriesSaving && (
                <p className="text-xs dp-text-muted mt-2">
                  {t("settings_categories_saving")}
                </p>
              )}
            </SettingsCard>

            <SettingsCard title={t("settings_eye_exclude")}>
              <p className="text-xs dp-text-muted mb-3 leading-relaxed">
                {t("settings_eye_exclude_hint")}
              </p>
              <textarea
                value={excludeDraft}
                onChange={(e) => setExcludeDraft(e.target.value)}
                onBlur={() => {
                  void saveExcludeSites()
                }}
                rows={6}
                placeholder={t("settings_eye_exclude_placeholder")}
                className="w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-200 dp-viewer-input resize-y min-h-[8rem] font-mono leading-relaxed"
              />
              {excludeSaving && (
                <p className="text-xs dp-text-muted mt-2">
                  {t("settings_eye_exclude_saving")}
                </p>
              )}
            </SettingsCard>

            <SettingsCard title={t("settings_github_title")}>
              <div className="flex flex-col gap-4">
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
                  className="inline-flex flex-shrink-0 self-start transition-opacity hover:opacity-85">
                  <img
                    src={GITHUB_STARS_BADGE_URL}
                    alt={t("settings_star_cta")}
                    height={28}
                  />
                </a>
              </div>
            </SettingsCard>
          </div>
        </div>
      </main>

      {clearConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => !clearing && setClearConfirmOpen(false)}>
          <div
            className="rounded-xl shadow-xl border w-full max-w-md mx-4 p-6"
            style={{
              backgroundColor: "var(--dp-doc-bg)",
              borderColor: "var(--dp-border)",
              color: "var(--dp-text)"
            }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">
              {t("preview_confirmDeleteTitle")}
            </h3>
            <p className="mt-3 text-sm dp-text-muted leading-relaxed">
              {t("preview_confirmDeleteAll", String(historyCount))}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={clearing}
                onClick={() => setClearConfirmOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                style={{
                  backgroundColor: "var(--dp-surface-muted)",
                  borderColor: "var(--dp-border)"
                }}>
                {t("preview_cancel")}
              </button>
              <button
                type="button"
                disabled={clearing}
                onClick={() => {
                  void executeClearAll()
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50">
                {t("preview_confirmDeleteBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
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
