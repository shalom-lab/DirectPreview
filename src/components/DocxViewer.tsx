import React, { useEffect, useRef, useState } from "react"
import { renderAsync } from "docx-preview"

import { DocumentSearchBar } from "~components/DocumentSearchBar"
import { validateFileBytes } from "~utils/file"
import { t, te } from "~utils/i18n"
import {
  applyDomHighlights,
  clearDomHighlights,
  setActiveDomHighlight
} from "~utils/text-highlight"

interface DocxViewerProps {
  blob: Blob
  /** 渲染失败时回调；若提供则不再展示错误 UI，交给调用方处理（例如回退文本预览） */
  onError?: (message: string) => void
}

export function DocxViewer({ blob, onError }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [query, setQuery] = useState("")
  const [matchCount, setMatchCount] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    container.innerHTML = ""
    setLoading(true)
    setReady(false)
    setError(null)
    setQuery("")
    setMatchCount(0)
    setActiveIndex(0)

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
          className: "docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          useBase64URL: true
        })

        if (!cancelled) {
          setLoading(false)
          setReady(true)
        }
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : t("docx_parseFailed")
        if (onErrorRef.current) {
          onErrorRef.current(message)
          return
        }
        setError(message)
        setLoading(false)
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [blob])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !ready) return

    const count = applyDomHighlights(container, query)
    setMatchCount(count)
    setActiveIndex(0)
    if (count > 0) {
      setActiveDomHighlight(container, 0)
    }

    return () => {
      clearDomHighlights(container)
    }
  }, [query, ready])

  useEffect(() => {
    const container = containerRef.current
    if (!container || matchCount === 0) return
    setActiveDomHighlight(container, activeIndex)
  }, [activeIndex, matchCount])

  const go = (delta: number) => {
    if (matchCount === 0) return
    setActiveIndex((prev) => (prev + delta + matchCount) % matchCount)
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>
  }

  return (
    <div className="relative min-h-[400px]">
      <DocumentSearchBar
        query={query}
        onQueryChange={setQuery}
        matchCount={matchCount}
        activeIndex={activeIndex}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        disabled={loading || !ready}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm pointer-events-none">
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
