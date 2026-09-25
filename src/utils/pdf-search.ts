import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist"

import {
  escapeRegExp,
  normalizeSearchQuery
} from "~utils/text-highlight"

export interface PdfTextMatch {
  pageNum: number
  left: number
  top: number
  width: number
  height: number
}

/** 2D affine: m1 × m2（与 pdf.js Util.transform 一致） */
function transform(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
  ]
}

function findMatchesInTextItem(
  item: {
    str: string
    transform: number[]
    width: number
  },
  viewportTransform: number[],
  query: string,
  pageNum: number
): PdfTextMatch[] {
  const str = item.str
  if (!str) return []

  const re = new RegExp(escapeRegExp(query), "gi")
  const matches: PdfTextMatch[] = []
  let match: RegExpExecArray | null

  const tx = transform(viewportTransform, item.transform)
  const fontHeight = Math.hypot(tx[2], tx[3]) || 12
  const itemScale = Math.hypot(item.transform[0], item.transform[1]) || 1
  const scaleX = Math.hypot(tx[0], tx[1])
  const itemWidth = (item.width || 0) * (scaleX / itemScale)

  while ((match = re.exec(str)) !== null) {
    const start = match.index
    const len = match[0].length
    if (len === 0) {
      re.lastIndex += 1
      continue
    }

    const ratioStart = str.length ? start / str.length : 0
    const ratioLen = str.length ? len / str.length : 1
    const left = tx[4] + itemWidth * ratioStart
    const top = tx[5] - fontHeight
    const width = Math.max(itemWidth * ratioLen, 2)
    const height = Math.max(fontHeight, 2)

    matches.push({
      pageNum,
      left,
      top,
      width,
      height
    })
  }

  return matches
}

export async function findMatchesInPage(
  page: PDFPageProxy,
  pageNum: number,
  query: string,
  scale: number
): Promise<PdfTextMatch[]> {
  const q = normalizeSearchQuery(query)
  if (!q) return []

  const viewport = page.getViewport({ scale })
  const textContent = await page.getTextContent()
  const matches: PdfTextMatch[] = []

  for (const raw of textContent.items) {
    if (!("str" in raw) || typeof raw.str !== "string") continue
    matches.push(
      ...findMatchesInTextItem(
        {
          str: raw.str,
          transform: raw.transform,
          width: raw.width
        },
        viewport.transform,
        q,
        pageNum
      )
    )
  }

  return matches
}

export async function findPdfMatches(
  pdf: PDFDocumentProxy,
  query: string,
  scale: number,
  onProgress?: (pageNum: number, total: number) => void
): Promise<PdfTextMatch[]> {
  const q = normalizeSearchQuery(query)
  if (!q) return []

  const all: PdfTextMatch[] = []
  const total = pdf.numPages

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const pageMatches = await findMatchesInPage(page, pageNum, q, scale)
    all.push(...pageMatches)
    onProgress?.(pageNum, total)
  }

  return all
}

export function matchesForPage(
  matches: PdfTextMatch[],
  pageNum: number
): PdfTextMatch[] {
  return matches.filter((m) => m.pageNum === pageNum)
}
