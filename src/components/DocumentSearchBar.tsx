import React, { useEffect, useLayoutEffect, useRef, useState } from "react"

import { t } from "~utils/i18n"

const SEARCH_DEBOUNCE_MS = 300
const POS_STORAGE_KEY = "dp-search-bar-pos-fixed-v1"

type BarPos = { x: number; y: number }

function loadPos(): BarPos | null {
  try {
    const raw = localStorage.getItem(POS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BarPos
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
      return parsed
    }
  } catch {
    // ignore
  }
  return null
}

function savePos(pos: BarPos) {
  try {
    localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(pos))
  } catch {
    // ignore
  }
}

function clampPos(pos: BarPos): BarPos {
  const maxX = Math.max(8, window.innerWidth - 80)
  const maxY = Math.max(8, window.innerHeight - 56)
  return {
    x: Math.min(Math.max(8, pos.x), maxX),
    y: Math.min(Math.max(8, pos.y), maxY)
  }
}

interface DocumentSearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  matchCount: number
  activeIndex: number
  onPrev: () => void
  onNext: () => void
  disabled?: boolean
}

export function DocumentSearchBar({
  query,
  onQueryChange,
  matchCount,
  activeIndex,
  onPrev,
  onNext,
  disabled = false
}: DocumentSearchBarProps) {
  const [draft, setDraft] = useState(query)
  const [pos, setPos] = useState<BarPos | null>(null)
  const posRef = useRef<BarPos | null>(null)
  posRef.current = pos
  const sentinelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  useLayoutEffect(() => {
    const saved = loadPos()
    if (saved) {
      setPos(clampPos(saved))
      return
    }
    const rect = sentinelRef.current?.getBoundingClientRect()
    if (rect) {
      setPos(clampPos({ x: rect.left, y: rect.top }))
    } else {
      setPos({ x: 24, y: 96 })
    }
  }, [])

  useEffect(() => {
    setDraft(query)
  }, [query])

  useEffect(() => {
    if (draft === query) return
    const timer = window.setTimeout(() => {
      onQueryChange(draft)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, query, onQueryChange])

  const hasQuery = query.trim().length > 0
  const hasMatches = matchCount > 0

  const onDragPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!posRef.current) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: posRef.current.x,
      originY: posRef.current.y
    }
  }

  const onDragPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    setPos(
      clampPos({
        x: dragRef.current.originX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.originY + (e.clientY - dragRef.current.startY)
      })
    )
  }

  const onDragPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    if (posRef.current) savePos(posRef.current)
  }

  return (
    <>
      {/* 零高度锚点：供首次定位；fixed 搜索条不再占纵向空间 */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden />
      {pos && (
        <div
          className="fixed z-[100] flex flex-nowrap items-center gap-1.5 rounded-xl border px-2 py-1.5 shadow-md backdrop-blur-md whitespace-nowrap"
          style={{
            left: pos.x,
            top: pos.y,
            backgroundColor:
              "color-mix(in srgb, var(--dp-doc-bg, #fff) 92%, transparent)",
            borderColor: "var(--dp-border)"
          }}>
          <button
            type="button"
            aria-label={t("doc_search_drag")}
            title={t("doc_search_drag")}
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={onDragPointerUp}
            onPointerCancel={onDragPointerUp}
            className="w-7 h-7 flex-shrink-0 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-3.5 h-3.5"
              aria-hidden="true">
              <circle cx="9" cy="7" r="1.5" />
              <circle cx="15" cy="7" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="17" r="1.5" />
              <circle cx="15" cy="17" r="1.5" />
            </svg>
          </button>
          <input
            type="search"
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                if (draft !== query) {
                  onQueryChange(draft)
                  return
                }
                if (e.shiftKey) onPrev()
                else onNext()
              }
            }}
            placeholder={t("doc_search_placeholder")}
            className="w-44 flex-shrink-0 px-2.5 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-200 dp-viewer-input"
            aria-label={t("doc_search_placeholder")}
          />
          {hasQuery && (
            <span className="text-xs tabular-nums whitespace-nowrap dp-text-muted min-w-[3rem] text-center px-0.5">
              {hasMatches
                ? t("doc_search_count", [
                    String(activeIndex + 1),
                    String(matchCount)
                  ])
                : t("doc_search_none")}
            </span>
          )}
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasMatches || disabled}
            className="px-2 py-1 text-sm rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            title={t("doc_search_prev")}>
            ↑
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasMatches || disabled}
            className="px-2 py-1 text-sm rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            title={t("doc_search_next")}>
            ↓
          </button>
        </div>
      )}
    </>
  )
}
