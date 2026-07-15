import React, { useCallback, useEffect, useRef, useState } from "react"
import * as pdfjsLib from "pdfjs-dist"

import { validateFileBytes } from "~utils/file"
import { t, te } from "~utils/i18n"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

const SCALE = 1.5

type ViewMode = "page" | "scroll"

interface PdfViewerProps {
  blob: Blob
}

interface PageSlotProps {
  pdf: pdfjsLib.PDFDocumentProxy
  pageNum: number
  active: boolean
  onVisible?: (pageNum: number, ratio: number) => void
}

function PageSlot({ pdf, pageNum, active, onVisible }: PageSlotProps) {
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
      setPlaceholder({ width: viewport.width, height: viewport.height })
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

        const viewport = page.getViewport({ scale: SCALE })
        const context = canvas.getContext("2d")
        if (!context) return

        canvas.width = viewport.width
        canvas.height = viewport.height
        setPlaceholder({ width: viewport.width, height: viewport.height })

        taskRef.current?.cancel()
        const task = page.render({ canvasContext: context, viewport })
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
        width: "100%",
        maxWidth: placeholder.width,
        aspectRatio: `${placeholder.width} / ${placeholder.height}`
      }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
          {active ? t("pdf_rendering") : `${pageNum}`}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`block w-full h-auto ${ready ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  )
}

function ContinuousScrollView({
  pdf,
  total,
  onCurrentPage
}: {
  pdf: pdfjsLib.PDFDocumentProxy
  total: number
  onCurrentPage: (page: number) => void
}) {
  const visibleRef = useRef<Map<number, number>>(new Map())
  const [activePages, setActivePages] = useState<Set<number>>(
    () => new Set([1])
  )

  const handleVisible = useCallback(
    (pageNum: number, ratio: number) => {
      visibleRef.current.set(pageNum, ratio)

      setActivePages((prev) => {
        const next = new Set(prev)
        // Keep nearby pages rendered for smooth scroll (±2)
        for (let i = Math.max(1, pageNum - 2); i <= Math.min(total, pageNum + 2); i++) {
          next.add(i)
        }
        // Drop far pages to free memory
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
          onVisible={handleVisible}
        />
      ))}
    </div>
  )
}

export function PdfViewer({ blob }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pageInfo, setPageInfo] = useState({ current: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<ViewMode>("page")
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)
  const generationRef = useRef(0)

  const renderPage = useCallback(async (pageNum: number, generation: number) => {
    const doc = pdfRef.current
    const canvas = canvasRef.current
    if (!doc || !canvas) return

    renderTaskRef.current?.cancel()

    const page = await doc.getPage(pageNum)
    if (generation !== generationRef.current) return

    const viewport = page.getViewport({ scale: SCALE })
    const context = canvas.getContext("2d")
    if (!context) return

    canvas.height = viewport.height
    canvas.width = viewport.width

    const task = page.render({ canvasContext: context, viewport })
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

    const load = async () => {
      try {
        const buffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(buffer)

        if (!validateFileBytes(bytes, "pdf")) {
          throw te("pdf_invalid")
        }

        const loaded = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
          .promise

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
    // Re-render current page when entering page mode or after PDF loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pdf, renderPage])

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
    }
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>
  }

  const showToolbar = pageInfo.total > 0

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600">
          {mode === "page" && pageInfo.total > 1 && (
            <>
              <button
                type="button"
                onClick={() => goToPage(-1)}
                disabled={pageInfo.current <= 1 || loading}
                className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed">
                {t("pdf_prev")}
              </button>
              <span>
                {pageInfo.current} / {pageInfo.total}
              </span>
              <button
                type="button"
                onClick={() => goToPage(1)}
                disabled={pageInfo.current >= pageInfo.total || loading}
                className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed">
                {t("pdf_next")}
              </button>
            </>
          )}

          {mode === "scroll" && (
            <span>
              {pageInfo.current} / {pageInfo.total}
            </span>
          )}

          <div className="flex rounded-md border overflow-hidden" style={{ borderColor: "var(--dp-border)" }}>
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
        </div>
      )}

      {mode === "page" && (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              {t("pdf_rendering")}
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="max-w-full shadow-sm border rounded"
            style={{ borderColor: "var(--dp-border)" }}
          />
        </div>
      )}

      {mode === "scroll" && pdf && pageInfo.total > 0 && (
        <ContinuousScrollView
          pdf={pdf}
          total={pageInfo.total}
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
