import React, { useEffect, useRef, useState } from "react"
import { renderAsync } from "docx-preview"

import { validateFileBytes } from "~utils/file"
import { t, te } from "~utils/i18n"

interface DocxViewerProps {
  blob: Blob
}

export function DocxViewer({ blob }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    container.innerHTML = ""
    setLoading(true)
    setError(null)

    const render = async () => {
      try {
        const buffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(buffer)

        if (!validateFileBytes(bytes, "docx")) {
          throw te("docx_invalid")
        }

        const typedBlob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        })

        await renderAsync(typedBlob, container, undefined, {
          className: "docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          useBase64URL: true
        })

        if (!cancelled) {
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("docx_parseFailed"))
          setLoading(false)
        }
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [blob])

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>
  }

  return (
    <div className="relative min-h-[400px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
          {t("docx_parsing")}
        </div>
      )}
      <div
        ref={containerRef}
        className="docx-container overflow-auto [&_.docx-wrapper]:shadow-none [&_.docx-wrapper]:bg-[var(--dp-doc-bg)]"
      />
    </div>
  )
}
