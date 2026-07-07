import React, { useCallback, useEffect, useRef, useState } from "react"
import * as pdfjsLib from "pdfjs-dist"

import { validateFileBytes } from "~utils/file"
import { t, te } from "~utils/i18n"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

interface PdfViewerProps {
  blob: Blob
}

export function PdfViewer({ blob }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pageInfo, setPageInfo] = useState({ current: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)
  const generationRef = useRef(0)

  const renderPage = useCallback(async (pageNum: number, generation: number) => {
    const pdf = pdfRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas) return

    renderTaskRef.current?.cancel()

    const page = await pdf.getPage(pageNum)
    if (generation !== generationRef.current) return

    const viewport = page.getViewport({ scale: 1.5 })
    const context = canvas.getContext("2d")
    if (!context) return

    canvas.height = viewport.height
    canvas.width = viewport.width

    const task = page.render({ canvasContext: context, viewport })
    renderTaskRef.current = task

    try {
      await task.promise
      if (generation === generationRef.current) {
        setPageInfo({ current: pageNum, total: pdf.numPages })
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
    setPageInfo({ current: 0, total: 0 })

    const load = async () => {
      try {
        const buffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(buffer)

        if (!validateFileBytes(bytes, "pdf")) {
          throw te("pdf_invalid")
        }

        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
          .promise

        if (generation !== generationRef.current) {
          pdf.destroy()
          return
        }

        pdfDoc = pdf
        pdfRef.current = pdf
        await renderPage(1, generation)
      } catch (err) {
        if (generation === generationRef.current) {
          setError(err instanceof Error ? err.message : t("pdf_parseFailed"))
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      generationRef.current += 1
      renderTaskRef.current?.cancel()
      pdfDoc?.destroy()
      pdfRef.current = null
    }
  }, [blob, renderPage])

  const goToPage = (delta: number) => {
    const next = pageInfo.current + delta
    if (next < 1 || next > pageInfo.total) return
    setLoading(true)
    void renderPage(next, generationRef.current)
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {pageInfo.total > 1 && (
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <button
            onClick={() => goToPage(-1)}
            disabled={pageInfo.current <= 1 || loading}
            className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed">
            {t("pdf_prev")}
          </button>
          <span>
            {pageInfo.current} / {pageInfo.total}
          </span>
          <button
            onClick={() => goToPage(1)}
            disabled={pageInfo.current >= pageInfo.total || loading}
            className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed">
            {t("pdf_next")}
          </button>
        </div>
      )}
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
    </div>
  )
}
