import React, { useEffect, useMemo, useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"

import { WordViewer } from "~components/WordViewer"
import { DocxViewer } from "~components/DocxViewer"
import { ExcelViewer } from "~components/ExcelViewer"
import { PdfViewer } from "~components/PdfViewer"
import { buildPreviewRecord, db, savePreviewRecord, type PreviewFile } from "~db"
import {
  alignNameWithType,
  consumePendingPreview,
  createTypedBlob,
  decodeFilename,
  fetchRemoteFile,
  getMimeType,
  reconcileFileType,
  resolveFileType,
  validateFileBytes
} from "~utils/file"
import { assertFileSize, sanitizeFilename } from "~utils/security"
import { te } from "~utils/i18n"
import {
  AppSettingsProvider,
  openSettingsPage,
  useAppSettings
} from "~providers/AppSettingsProvider"
import "~style.css"

type DeleteConfirm =
  | { kind: "one"; id: string; name: string }
  | { kind: "all"; count: number }

function DirectPreviewDashboard() {
  const { t } = useAppSettings()
  const [activeFile, setActiveFile] = useState<PreviewFile | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null)
  const [listQuery, setListQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBatchDownloading, setIsBatchDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const capturedRef = useRef(false)

  const documentHistory = useLiveQuery(() =>
    db.files.orderBy("createdAt").reverse().toArray()
  )

  const filteredHistory = useMemo(() => {
    if (!documentHistory) return []
    const q = listQuery.trim().toLowerCase()
    if (!q) return documentHistory
    return documentHistory.filter((f) => f.name.toLowerCase().includes(q))
  }, [documentHistory, listQuery])

  const selectedCount = selectedIds.size
  const allFilteredSelected =
    filteredHistory.length > 0 &&
    filteredHistory.every((f) => selectedIds.has(f.id))

  useEffect(() => {
    if (capturedRef.current) return
    capturedRef.current = true

    const bootstrap = async () => {
      try {
        const query = new URLSearchParams(window.location.search)
        const fromSession = query.get("from") === "session"

        if (fromSession) {
          const pending = await consumePendingPreview()
          if (pending?.url) {
            document.title = `DirectPreview - ${decodeFilename(pending.name)}`
            await createFromUrl(pending.url, pending.name, pending.type)
          }
          return
        }

        const targetUrl = query.get("url")
        const targetName = query.get("name") || "document"
        const targetType = query.get("type") || ""

        if (targetUrl) {
          document.title = `DirectPreview - ${decodeFilename(targetName)}`
          await createFromUrl(targetUrl, targetName, targetType)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("error_initFailed")
        setError(msg)
      }
    }

    bootstrap()
  }, [])

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [isRenaming])

  const createFromUrl = async (url: string, name: string, type: string) => {
    setIsFetching(true)
    setError(null)
    try {
      const fetched = await fetchRemoteFile(url, name, type)
      const record = buildPreviewRecord({
        name: fetched.name,
        url,
        type: fetched.type,
        buffer: fetched.buffer
      })
      await savePreviewRecord(record)
      setActiveFile(record)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("error_fetchFailed")
      setError(msg)
      console.error("fetch failed:", err)
    } finally {
      setIsFetching(false)
    }
  }

  const createFromLocalFile = async (file: File) => {
    setError(null)
    const decodedName = decodeFilename(file.name)
    const type = resolveFileType(decodedName)

    if (!type) {
      setError(t("error_unsupportedFormat"))
      return
    }

    try {
      assertFileSize(file.size)

      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const reconciledType = reconcileFileType(bytes, type)

      if (!validateFileBytes(bytes, reconciledType)) {
        throw te("error_formatMismatchShort", reconciledType.toUpperCase())
      }

      const record = buildPreviewRecord({
        name: alignNameWithType(decodedName, reconciledType),
        type: reconciledType,
        buffer
      })

      await savePreviewRecord(record)
      setActiveFile(record)
      document.title = `DirectPreview - ${record.name}`
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("error_localReadFailed")
      setError(msg)
    }
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await createFromLocalFile(file)
    e.target.value = ""
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await createFromLocalFile(file)
  }

  const updateName = async () => {
    if (!activeFile || !renameValue.trim()) {
      setIsRenaming(false)
      return
    }

    const nextName = sanitizeFilename(decodeFilename(renameValue.trim()))
    const nextType = resolveFileType(nextName, activeFile.type)

    if (!nextType) {
      setError(t("error_invalidRenameExt"))
      setIsRenaming(false)
      return
    }

    try {
      const updated: PreviewFile = {
        ...activeFile,
        name: nextName,
        type: nextType,
        mime: getMimeType(nextType)
      }

      await db.files.put(updated)
      setActiveFile(updated)
      document.title = `DirectPreview - ${nextName}`
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_renameFailed"))
    } finally {
      setIsRenaming(false)
    }
  }

  const requestDeleteFile = (id: string, name: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setDeleteConfirm({ kind: "one", id, name })
  }

  const requestClearAll = () => {
    if (!documentHistory?.length) return
    setDeleteConfirm({ kind: "all", count: documentHistory.length })
  }

  const executeDelete = async () => {
    if (!deleteConfirm) return

    try {
      if (deleteConfirm.kind === "one") {
        await db.files.delete(deleteConfirm.id)
        if (activeFile?.id === deleteConfirm.id) {
          setActiveFile(null)
          document.title = "DirectPreview"
        }
      } else {
        await db.files.clear()
        setActiveFile(null)
        document.title = "DirectPreview"
      }
      setDeleteConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_deleteFailed"))
      setDeleteConfirm(null)
    }
  }

  const downloadBlob = async (file: PreviewFile) => {
    const buffer = await file.blob.arrayBuffer()
    const typedBlob =
      file.blob.type === file.mime
        ? file.blob
        : createTypedBlob(buffer, file.type)

    const blobUrl = URL.createObjectURL(typedBlob)
    const anchor = document.createElement("a")
    anchor.href = blobUrl
    anchor.download = sanitizeFilename(file.name)
    anchor.click()
    URL.revokeObjectURL(blobUrl)
  }

  const downloadFile = async (file: PreviewFile, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      await downloadBlob(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_downloadFailed"))
    }
  }

  const downloadBatch = async () => {
    if (!documentHistory || selectedIds.size === 0) return

    setIsBatchDownloading(true)
    setError(null)

    try {
      const files = documentHistory.filter((f) => selectedIds.has(f.id))
      for (let i = 0; i < files.length; i++) {
        await downloadBlob(files[i])
        if (i < files.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 350))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_batchDownloadFailed"))
    } finally {
      setIsBatchDownloading(false)
    }
  }

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filteredHistory.forEach((f) => next.delete(f.id))
      } else {
        filteredHistory.forEach((f) => next.add(f.id))
      }
      return next
    })
  }

  const downloadViaNative = () => {
    if (!activeFile?.url) return
    chrome.runtime.sendMessage({
      action: "ROUTE_NATIVE_DOWNLOAD",
      url: activeFile.url
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const startRename = () => {
    if (!activeFile) return
    setRenameValue(activeFile.name)
    setIsRenaming(true)
  }

  return (
    <div
      className="dp-themed flex h-screen w-screen antialiased"
      style={{
        backgroundColor: "var(--dp-shell-bg)",
        color: "var(--dp-text)"
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.docx,.doc,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/pdf"
        className="hidden"
        onChange={handleFileInput}
      />

      <aside
        className="w-80 border-r flex flex-col flex-shrink-0"
        style={{
          backgroundColor: "var(--dp-sidebar-bg)",
          borderColor: "var(--dp-border)"
        }}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-lg flex items-center gap-2 text-slate-900">
            <span className="bg-blue-600 text-white p-1 rounded text-xs px-1.5 font-mono">
              DP
            </span>
            <span>DirectPreview</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={openSettingsPage}
              title={t("preview_settings")}
              className="w-8 h-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors text-base leading-none">
              ⚙
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title={t("preview_importLocal")}
              className="w-8 h-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors text-lg leading-none">
              +
            </button>
            <button
              onClick={requestClearAll}
              title={t("preview_clearAll")}
              disabled={!documentHistory?.length}
              className="w-8 h-8 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-30 text-sm">
              {t("preview_clearAllBtn")}
            </button>
          </div>
        </div>

        <div className="px-3 pb-2 space-y-2 border-b border-slate-100">
          <input
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder={t("preview_filterPlaceholder")}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
                disabled={filteredHistory.length === 0}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              {t("preview_selectAll")}
              {listQuery && (
                <span className="text-slate-400">({filteredHistory.length})</span>
              )}
            </label>
            <button
              onClick={downloadBatch}
              disabled={selectedCount === 0 || isBatchDownloading}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {isBatchDownloading
                ? t("preview_batchDownloading")
                : `${t("preview_batchDownload")}${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {documentHistory?.length === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="m-2 p-6 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
              <p className="text-sm text-slate-500">{t("preview_dragImport")}</p>
              <p className="text-xs text-slate-400 mt-1">{t("preview_formatsHint")}</p>
            </div>
          )}
          {documentHistory && documentHistory.length > 0 && filteredHistory.length === 0 && (
            <div className="p-4 text-sm text-slate-400 text-center">
              {t("preview_noMatch", listQuery)}
            </div>
          )}
          {filteredHistory.map((f) => (
            <div
              key={f.id}
              onClick={() => {
                setActiveFile(f)
                document.title = `DirectPreview - ${f.name}`
                setError(null)
              }}
              className={`group p-3 rounded-lg cursor-pointer transition-all ${
                activeFile?.id === f.id
                  ? "bg-blue-50 text-blue-600 font-medium shadow-sm"
                  : selectedIds.has(f.id)
                    ? "bg-slate-100 text-slate-700"
                    : "hover:bg-slate-50 text-slate-600"
              }`}>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(f.id)}
                  onChange={() => toggleSelect(f.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate text-sm flex-1">{f.name}</div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => downloadFile(f, e)}
                        title={t("preview_downloadDirect")}
                        className="w-6 h-6 rounded text-xs hover:bg-blue-100 text-blue-600">
                        ↓
                      </button>
                      <button
                        onClick={(e) => requestDeleteFile(f.id, f.name, e)}
                        title={t("preview_delete")}
                        className="w-6 h-6 rounded text-xs hover:bg-red-100 text-red-500">
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex justify-between">
                    <span>{f.type.toUpperCase()}</span>
                    <span>{formatSize(f.size)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 border-b px-6 flex items-center justify-between flex-shrink-0"
          style={{
            backgroundColor: "var(--dp-header-bg)",
            borderColor: "var(--dp-border)"
          }}>
          <div className="min-w-0 flex-1">
            {isRenaming ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  updateName()
                }}>
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={updateName}
                  onKeyDown={(e) => e.key === "Escape" && setIsRenaming(false)}
                  className="flex-1 max-w-md px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </form>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h2
                  onDoubleClick={startRename}
                  title={t("preview_doubleClickRename")}
                  className="truncate font-medium text-slate-700 max-w-xl cursor-default">
                  {activeFile?.name || t("preview_waitingCapture")}
                </h2>
                {activeFile && (
                  <button
                    onClick={startRename}
                    className="text-xs text-slate-400 hover:text-blue-600 flex-shrink-0">
                    {t("preview_rename")}
                  </button>
                )}
              </div>
            )}
            {activeFile && (
              <p className="text-xs text-slate-400 mt-0.5">
                {formatSize(activeFile.size)} ·{" "}
                {new Date(activeFile.createdAt).toLocaleString()}
              </p>
            )}
          </div>

          {activeFile && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => downloadFile(activeFile)}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100">
                {t("preview_directDownload")}
              </button>
              {activeFile.url && (
                <button
                  onClick={downloadViaNative}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors">
                  {t("preview_downloadFromUrl")}
                </button>
              )}
              <button
                onClick={() => requestDeleteFile(activeFile.id, activeFile.name)}
                className="px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-md text-sm font-medium transition-colors">
                {t("preview_delete")}
              </button>
            </div>
          )}
        </header>

        <section className="flex-1 p-6 overflow-auto dp-dot-grid">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}
          {isFetching ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-medium">
              {t("preview_fetching")}
            </div>
          ) : activeFile ? (
            <div
              className="p-6 rounded-xl shadow-sm border min-h-full dp-dot-grid-surface"
              style={{ borderColor: "var(--dp-border)" }}>
              {activeFile.type === "xlsx" && (
                <ExcelViewer blob={activeFile.blob} />
              )}
              {activeFile.type === "docx" && (
                <DocxViewer blob={activeFile.blob} />
              )}
              {activeFile.type === "doc" && (
                <WordViewer blob={activeFile.blob} declaredType="doc" />
              )}
              {activeFile.type === "pdf" && (
                <PdfViewer blob={activeFile.blob} />
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="h-full flex flex-col items-center justify-center cursor-pointer transition-colors dp-text-muted dp-dot-grid-surface rounded-xl border"
              style={{ borderColor: "var(--dp-border)" }}>
              <p className="text-lg mb-2">{t("preview_sandboxEmpty")}</p>
              <p className="text-sm">{t("preview_sandboxEmptyHint")}</p>
            </div>
          )}
        </section>
      </main>

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">
              {t("preview_confirmDeleteTitle")}
            </h3>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              {deleteConfirm.kind === "one"
                ? t("preview_confirmDeleteOne", deleteConfirm.name)
                : t("preview_confirmDeleteAll", String(deleteConfirm.count))}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                {t("preview_cancel")}
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
                {t("preview_confirmDeleteBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewTab() {
  return (
    <AppSettingsProvider>
      <DirectPreviewDashboard />
    </AppSettingsProvider>
  )
}

export default PreviewTab
