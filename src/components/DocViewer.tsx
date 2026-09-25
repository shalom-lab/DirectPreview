import React, { useEffect, useMemo, useRef, useState } from "react"
import WordExtractor from "word-extractor"

import { DocumentSearchBar } from "~components/DocumentSearchBar"
import { t } from "~utils/i18n"
import {
  countTextMatches,
  splitHighlightSegments
} from "~utils/text-highlight"

interface DocViewerProps {
  blob: Blob
}

export function DocViewer({ blob }: DocViewerProps) {
  const [content, setContent] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const hitRefs = useRef<(HTMLElement | null)[]>([])

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
        setQuery("")
        setActiveIndex(0)
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

  const matchCount = useMemo(
    () => countTextMatches(content, query),
    [content, query]
  )

  const segments = useMemo(
    () => splitHighlightSegments(content, query),
    [content, query]
  )

  useEffect(() => {
    setActiveIndex(0)
  }, [query, content])

  useEffect(() => {
    if (matchCount === 0) return
    const el = hitRefs.current[activeIndex]
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [activeIndex, matchCount, segments])

  const go = (delta: number) => {
    if (matchCount === 0) return
    setActiveIndex((prev) => (prev + delta + matchCount) % matchCount)
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>
  }

  if (loading) {
    return (
      <div className="text-slate-400 text-sm">{t("doc_parsing")}</div>
    )
  }

  return (
    <div className="prose prose-slate max-w-none space-y-2">
      <DocumentSearchBar
        query={query}
        onQueryChange={setQuery}
        matchCount={matchCount}
        activeIndex={activeIndex}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
      />
      <p className="text-xs text-slate-400 !mt-0 !mb-0">{t("doc_hint")}</p>
      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
        {segments.map((seg, i) =>
          seg.type === "hit" ? (
            <mark
              key={`h-${seg.index}-${i}`}
              ref={(el) => {
                hitRefs.current[seg.index] = el
              }}
              className={`dp-search-hit${
                seg.index === activeIndex ? " dp-search-hit-active" : ""
              }`}>
              {seg.value}
            </mark>
          ) : (
            <React.Fragment key={`t-${i}`}>{seg.value}</React.Fragment>
          )
        )}
      </div>
    </div>
  )
}
