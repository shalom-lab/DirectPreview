import React, { useEffect, useState } from "react"
import WordExtractor from "word-extractor"

import { t } from "~utils/i18n"

interface DocViewerProps {
  blob: Blob
}

export function DocViewer({ blob }: DocViewerProps) {
  const [content, setContent] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const render = async () => {
      try {
        const buffer = await blob.arrayBuffer()
        const extractor = new WordExtractor()
        const doc = await extractor.extract(Buffer.from(buffer))

        if (cancelled) return

        const body = doc.getBody()?.trim() || ""
        setContent(body || t("doc_empty"))
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("doc_parseFailed"))
        }
      } finally {
        if (!cancelled) setLoading(false)
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

  if (loading) {
    return (
      <div className="text-slate-400 text-sm">{t("doc_parsing")}</div>
    )
  }

  return (
    <div className="prose prose-slate max-w-none">
      <p className="text-xs text-slate-400 mb-4">
        {t("doc_hint")}
      </p>
      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
        {content}
      </div>
    </div>
  )
}
