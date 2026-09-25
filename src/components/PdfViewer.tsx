import React, { useCallback, useEffect, useRef, useState } from "react"
import * as pdfjsLib from "pdfjs-dist"

import { DocumentSearchBar } from "~components/DocumentSearchBar"
import { validateFileBytes } from "~utils/file"
import { t, te } from "~utils/i18n"
import {
  findPdfMatches,
  type PdfTextMatch
} from "~utils/pdf-search"
import { normalizeSearchQuery } from "~utils/text-highlight"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

/** 逻辑缩放（CSS 像素）；实际位图会再乘 devicePixelRatio */
const SCALE = 1.5

type ViewMode = "page" | "scroll"

interface PdfViewerProps {
  blob: Blob
}

function getOutputScale() {
  return Math.min(window.devicePixelRatio || 1, 3)
}

function HighlightLayer({
  matches,
  activeIndex,
  pageNum,
  pageWidth,
  pageHeight
}: {
  matches: PdfTextMatch[]
  activeIndex: number
  pageNum: number
  pageWidth: number
  pageHeight: number
}) {
  if (!pageWidth || !pageHeight) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {matches.map((match, index) => {
        if (match.pageNum !== pageNum) return null
        return (
          <div
            key={`${pageNum}-${index}-${match.left}-${match.top}`}
            data-pdf-hit={index}
            className={`dp-pdf-hit${
              index === activeIndex ? " dp-pdf-hit-active" : ""
            }`}
            style={{
              left: `${(match.left / pageWidth) * 100}%`,
              top: `${(match.top / pageHeight) * 100}%`,
              width: `${(match.width / pageWidth) * 100}%`,
              height: `${(match.height / pageHeight) * 100}%`
            }}
          />
        )
      })}
    </div>
  )
}

interface PageSlotProps {
  pdf: pdfjsLib.PDFDocumentProxy
  pageNum: number
  active: boolean
  matches: PdfTextMatch[]
  activeMatchIndex: number
  onVisible?: (pageNum: number, ratio: number) => void
}

function PageSlot({
  pdf,
  pageNum,
  active,
  matches,
  activeMatchIndex,
  onVisible
}: PageSlotProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const taskRef = useRef<pdfjsLib.RenderTask | null>(null)
  const [placeholder, setPlaceholder] = useState({ width: 600, height: 848 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    pdf.getPage(pageNum).then((page) => {
      if (cancelled) return
      const viewport = page.getViewport({ scale: SCALE })
      setPlaceholder({
        width: Math.floor(viewport.width),
        height: Math.floor(viewport.height)
      })
    })

    return () => {
      cancelled = true
    }
  }, [pdf, pageNum])

  useEffect(() => {
    const el = wrapRef.current
    if (!el || !onVisible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible(pageNum, entry.intersectionRatio)
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "200px 0px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [pageNum, onVisible])

  useEffect(() => {
    if (!active) {
      taskRef.current?.cancel()
      taskRef.current = null
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
        canvas.style.width = ""
        canvas.style.height = ""
      }
      setReady(false)
      return
    }

    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return

    const run = async () => {
      try {
        const page = await pdf.getPage(pageNum)
        if (cancelled) return

        taskRef.current?.cancel()

        const outputScale = getOutputScale()
        const viewport = page.getViewport({ scale: SCALE })
        const cssWidth = Math.floor(viewport.width)
        const cssHeight = Math.floor(viewport.height)
        const context = canvas.getContext("2d")
        if (!context) return

        canvas.width = Math.floor(cssWidth * outputScale)
        canvas.height = Math.floor(cssHeight * outputScale)
        canvas.style.width = `${cssWidth}px`
        canvas.style.height = "auto"
        setPlaceholder({ width: cssWidth, height: cssHeight })

        const transform =
          outputScale !== 1
            ? [outputScale, 0, 0, outputScale, 0, 0]
            : undefined

        const task = page.render({
          canvasContext: context,
          viewport,
          transform
        })
        taskRef.current = task
        await task.promise
        if (!cancelled) setReady(true)
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("Rendering cancelled")
        ) {
          return
        }
        throw err
      }
    }

    void run()

    return () => {
      cancelled = true
      taskRef.current?.cancel()
      taskRef.current = null
    }
  }, [pdf, pageNum, active])

  return (
    <div
      ref={wrapRef}
      data-page={pageNum}
      className="relative mx-auto shadow-sm border rounded overflow-hidden bg-white"
      style={{
        borderColor: "var(--dp-border)",
        width: placeholder.width,
        maxWidth: "100%",
        aspectRatio: `${placeholder.width} / ${placeholder.height}`
      }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
          {active ? t("pdf_rendering") : `${pageNum}`}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`block max-w-full h-auto ${ready ? "opacity-100" : "opacity-0"}`}
      />
      <HighlightLayer
        matches={matches}
        activeIndex={activeMatchIndex}
        pageNum={pageNum}
        pageWidth={placeholder.width}
        pageHeight={placeholder.height}
      />
    </div>
  )
}

function ContinuousScrollView({
  pdf,
  total,
  matches,
  activeMatchIndex,
  focusPage,
  onCurrentPage
}: {
  pdf: pdfjsLib.PDFDocumentProxy
  total: number
  matches: PdfTextMatch[]
  activeMatchIndex: number
  focusPage: number | null
  onCurrentPage: (page: number) => void
}) {
  const visibleRef = useRef<Map<number, number>>(new Map())
  const [activePages, setActivePages] = useState<Set<number>>(
    () => new Set([1])
  )

  useEffect(() => {
    if (!focusPage) return
    setActivePages((prev) => {
      const next = new Set(prev)
      for (
        let i = Math.max(1, focusPage - 2);
        i <= Math.min(total, focusPage + 2);
        i++
      ) {
        next.add(i)
      }
      return next
    })
    const el = document.querySelector(`[data-page="${focusPage}"]`)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [focusPage, total])

  const handleVisible = useCallback(
    (pageNum: number, ratio: number) => {
      visibleRef.current.set(pageNum, ratio)

      setActivePages((prev) => {
        const next = new Set(prev)
        for (
          let i = Math.max(1, pageNum - 2);
          i <= Math.min(total, pageNum + 2);
          i++
        ) {
          next.add(i)
        }
        for (const p of Array.from(next)) {
          if (Math.abs(p - pageNum) > 3) next.delete(p)
        }
        if (
          next.size === prev.size &&
          Array.from(next).every((p) => prev.has(p))
        ) {
          return prev
        }
        return next
      })

      let bestPage = pageNum
      let bestRatio = -1
      for (const [p, r] of visibleRef.current) {
        if (r > bestRatio) {
          bestRatio = r
          bestPage = p
        }
      }
      onCurrentPage(bestPage)
    },
    [total, onCurrentPage]
  )

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {Array.from({ length: total }, (_, i) => i + 1).map((pageNum) => (
        <PageSlot
          key={pageNum}
          pdf={pdf}
          pageNum={pageNum}
          active={activePages.has(pageNum)}
          matches={matches}
          activeMatchIndex={activeMatchIndex}
          onVisible={handleVisible}
        />
      ))}
    </div>
  )
}

export function PdfViewer({ blob }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pageWrapRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pageInfo, setPageInfo] = useState({ current: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<ViewMode>("scroll")
  const modeRef = useRef<ViewMode>("scroll")
  modeRef.current = mode
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)
  const generationRef = useRef(0)
  const searchGenRef = useRef(0)

  const [query, setQuery] = useState("")
  const [matches, setMatches] = useState<PdfTextMatch[]>([])
  const [activeMatchIndex, setActiveMatchIndex] = useState(0)
  const [searching, setSearching] = useState(false)
  const [focusPage, setFocusPage] = useState<number | null>(null)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })

  const renderPage = useCallback(async (pageNum: number, generation: number) => {
    const doc = pdfRef.current
    const canvas = canvasRef.current
    if (!doc || !canvas) return

    renderTaskRef.current?.cancel()

    const page = await doc.getPage(pageNum)
    if (generation !== generationRef.current) return

    const outputScale = getOutputScale()
    const viewport = page.getViewport({ scale: SCALE })
    const cssWidth = Math.floor(viewport.width)
    const cssHeight = Math.floor(viewport.height)
    const context = canvas.getContext("2d")
    if (!context) return

    canvas.width = Math.floor(cssWidth * outputScale)
    canvas.height = Math.floor(cssHeight * outputScale)
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = "auto"
    setPageSize({ width: cssWidth, height: cssHeight })

    const transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined

    const task = page.render({
      canvasContext: context,
      viewport,
      transform
    })
    renderTaskRef.current = task

    try {
      await task.promise
      if (generation === generationRef.current) {
        setPageInfo({ current: pageNum, total: doc.numPages })
        setLoading(false)
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("Rendering cancelled")
      ) {
        return
      }
      throw err
    }
  }, [])

  useEffect(() => {
    const generation = ++generationRef.current
    let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null

    setLoading(true)
    setError(null)
    setPageInfo({ current: 1, total: 0 })
    setPdf(null)
    setQuery("")
    setMatches([])
    setActiveMatchIndex(0)
    setFocusPage(null)

    const load = async () => {
      try {
        const buffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(buffer)

        if (!validateFileBytes(bytes, "pdf")) {
          throw te("pdf_invalid")
        }

        const loaded = await pdfjsLib.getDocument({
          data: new Uint8Array(buffer)
        }).promise

        if (generation !== generationRef.current) {
          loaded.destroy()
          return
        }

        pdfDoc = loaded
        pdfRef.current = loaded
        setPdf(loaded)
        setPageInfo({ current: 1, total: loaded.numPages })
        setLoading(false)
      } catch (err) {
        if (generation === generationRef.current) {
          setError(err instanceof Error ? err.message : t("pdf_parseFailed"))
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      generationRef.current += 1
      renderTaskRef.current?.cancel()
      pdfDoc?.destroy()
      pdfRef.current = null
    }
  }, [blob, renderPage])

  useEffect(() => {
    if (!pdf || mode !== "page") return
    setLoading(true)
    void renderPage(pageInfo.current || 1, generationRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pdf, renderPage])

  useEffect(() => {
    const doc = pdfRef.current
    const q = normalizeSearchQuery(query)
    if (!doc || !q) {
      setMatches([])
      setActiveMatchIndex(0)
      setSearching(false)
      setFocusPage(null)
      return
    }

    const gen = ++searchGenRef.current
    setSearching(true)
    let cancelled = false

    void (async () => {
      try {
        const found = await findPdfMatches(doc, q, SCALE)
        if (cancelled || gen !== searchGenRef.current) return
        setMatches(found)
        setActiveMatchIndex(0)
        if (found.length > 0) {
          const pageNum = found[0].pageNum
          setFocusPage(pageNum)
          if (modeRef.current === "page") {
            setLoading(true)
            void renderPage(pageNum, generationRef.current)
          }
        } else {
          setFocusPage(null)
        }
      } finally {
        if (!cancelled && gen === searchGenRef.current) setSearching(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // 仅在关键字或文档变化时重搜；mode 用闭包读取即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pdf, renderPage])

  const goToMatch = (delta: number) => {
    if (matches.length === 0) return
    const next =
      (activeMatchIndex + delta + matches.length) % matches.length
    setActiveMatchIndex(next)
    const pageNum = matches[next].pageNum
    setFocusPage(pageNum)
    if (mode === "page") {
      if (pageNum !== pageInfo.current) {
        setLoading(true)
        void renderPage(pageNum, generationRef.current)
      }
    } else {
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-pdf-hit="${next}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      })
    }
  }

  const goToPage = (delta: number) => {
    const next = pageInfo.current + delta
    if (next < 1 || next > pageInfo.total) return
    setLoading(true)
    void renderPage(next, generationRef.current)
  }

  const switchMode = (next: ViewMode) => {
    if (next === mode) return
    setMode(next)
    if (next === "scroll") {
      setLoading(false)
      if (matches[activeMatchIndex]) {
        setFocusPage(matches[activeMatchIndex].pageNum)
      }
    }
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>
  }

  const showToolbar = pageInfo.total > 0

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {showToolbar && (
        <>
          <div className="w-full self-stretch">
            <DocumentSearchBar
              query={query}
              onQueryChange={setQuery}
              matchCount={matches.length}
              activeIndex={activeMatchIndex}
              onPrev={() => goToMatch(-1)}
              onNext={() => goToMatch(1)}
              disabled={!pdf || searching}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600">
            <div
              className="flex rounded-md border overflow-hidden"
              style={{ borderColor: "var(--dp-border)" }}>
              <button
                type="button"
                onClick={() => switchMode("page")}
                className={`px-3 py-1 transition-colors ${
                  mode === "page"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}>
                {t("pdf_mode_page")}
              </button>
              <button
                type="button"
                onClick={() => switchMode("scroll")}
                className={`px-3 py-1 transition-colors ${
                  mode === "scroll"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}>
                {t("pdf_mode_scroll")}
              </button>
            </div>

            <div className="flex items-center gap-3 min-w-[9.5rem] justify-center">
              <button
                type="button"
                onClick={() => goToPage(-1)}
                disabled={
                  mode !== "page" || pageInfo.current <= 1 || loading
                }
                className={`px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                  mode !== "page" ? "invisible" : ""
                }`}>
                {t("pdf_prev")}
              </button>
              <span className="tabular-nums whitespace-nowrap">
                {pageInfo.current} / {pageInfo.total}
              </span>
              <button
                type="button"
                onClick={() => goToPage(1)}
                disabled={
                  mode !== "page" ||
                  pageInfo.current >= pageInfo.total ||
                  loading
                }
                className={`px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                  mode !== "page" ? "invisible" : ""
                }`}>
                {t("pdf_next")}
              </button>
            </div>
          </div>
        </>
      )}

      {mode === "page" && (
        <div ref={pageWrapRef} className="relative max-w-full">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm z-10">
              {t("pdf_rendering")}
            </div>
          )}
          <div className="relative inline-block max-w-full">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto shadow-sm border rounded"
              style={{ borderColor: "var(--dp-border)" }}
            />
            <HighlightLayer
              matches={matches}
              activeIndex={activeMatchIndex}
              pageNum={pageInfo.current}
              pageWidth={pageSize.width}
              pageHeight={pageSize.height}
            />
          </div>
        </div>
      )}

      {mode === "scroll" && pdf && pageInfo.total > 0 && (
        <ContinuousScrollView
          pdf={pdf}
          total={pageInfo.total}
          matches={matches}
          activeMatchIndex={activeMatchIndex}
          focusPage={focusPage}
          onCurrentPage={(page) =>
            setPageInfo((prev) =>
              prev.current === page ? prev : { ...prev, current: page }
            )
          }
        />
      )}
    </div>
  )
}
