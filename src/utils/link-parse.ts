import {
  extractFilenameFromText,
  getFileExtension,
  resolveFileType,
  type SupportedType
} from "~utils/file"

export const SUPPORTED_EXT_RE = /\.(xlsx|docx|doc|pdf)(\?|#|$)/i
const DOC_EXT_ONLY_RE = /\.(xlsx|docx|doc|pdf)$/i

const GENERIC_TEXT_RE =
  /^(下载|download|点击下载|查看|预览|附件|文件|点击|打开|save|open|更多)$/i

const DOWNLOAD_PATH_RE =
  /\/(download|downloads|attachment|attachments|file|files|export|getfile|downfile|doc|docs|resource|resources|uploads?)(\/|$)/i

const PAGE_EXT_RE = /\.(html?|php|asp|aspx|jsp|jspx|cgi|do|action|vue)(\?|#|$)/i

const FILENAME_QUERY_KEYS = [
  "filename",
  "file",
  "name",
  "download",
  "attname",
  "attach",
  "fn",
  "savedownload"
]

export { extractFilenameFromText }

function normalizeText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim()
}

/** URL 路径或 query 中是否指向文档文件 */
export function hrefPointsToDocument(href: string): boolean {
  if (!href || SUPPORTED_EXT_RE.test(href.split("#")[0])) {
    return SUPPORTED_EXT_RE.test(href)
  }

  try {
    const url = new URL(href)
    const path = decodeURIComponent(url.pathname)

    if (SUPPORTED_EXT_RE.test(path)) return true

    for (const key of FILENAME_QUERY_KEYS) {
      const value = url.searchParams.get(key)
      if (!value) continue
      const decoded = decodeURIComponent(value)
      if (SUPPORTED_EXT_RE.test(decoded) || extractFilenameFromText(decoded)) {
        return true
      }
    }
  } catch {
    return false
  }

  return false
}

/** 是否处于「下载/附件」语义上下文 */
function hasDownloadContext(anchor: HTMLAnchorElement, href: string): boolean {
  if (anchor.hasAttribute("download")) return true

  try {
    const url = new URL(href)
    if (DOWNLOAD_PATH_RE.test(url.pathname)) return true
    if (
      url.searchParams.has("download") ||
      url.searchParams.has("attachment") ||
      url.searchParams.has("response-content-disposition")
    ) {
      return true
    }
  } catch {
    return false
  }

  return /response-content-disposition|content-disposition=attachment/i.test(href)
}

function isObviousPageLink(href: string): boolean {
  try {
    const url = new URL(href)
    return (
      PAGE_EXT_RE.test(url.pathname) && !hrefPointsToDocument(href)
    )
  } catch {
    return false
  }
}

function getExplicitFilename(anchor: HTMLAnchorElement): string | null {
  const downloadAttr = anchor.getAttribute("download")?.trim()
  if (downloadAttr && !GENERIC_TEXT_RE.test(downloadAttr)) {
    const name = normalizeText(downloadAttr)
    if (DOC_EXT_ONLY_RE.test(name) || extractFilenameFromText(name)) return name
  }

  const text = normalizeText(anchor.innerText || anchor.textContent || "")
  if (text) {
    const fromText = extractFilenameFromText(text)
    if (fromText) return fromText
    if (DOC_EXT_ONLY_RE.test(text) && !GENERIC_TEXT_RE.test(text)) return text
  }

  const title = anchor.getAttribute("title")?.trim()
  if (title && !GENERIC_TEXT_RE.test(title)) {
    const fromTitle = extractFilenameFromText(title)
    if (fromTitle) return fromTitle
    if (DOC_EXT_ONLY_RE.test(title)) return title
  }

  return null
}

/** 严格判断：仅对文件下载链接返回 true（用于展示眼睛图标） */
export function isFileDownloadLink(anchor: HTMLAnchorElement): boolean {
  const href = anchor.href

  if (
    !href ||
    href.startsWith("javascript:") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href === "#"
  ) {
    return false
  }

  if (isObviousPageLink(href)) return false

  const hrefIsDoc = hrefPointsToDocument(href)
  const downloadContext = hasDownloadContext(anchor, href)
  const explicitName = getExplicitFilename(anchor)

  const text = normalizeText(anchor.innerText || anchor.textContent || "")
  if (text.length > 150 && !explicitName) return false

  // 1. URL 直接指向文档文件
  if (hrefIsDoc) return true

  // 2. download 属性 + 可识别的文档名
  if (anchor.hasAttribute("download") && explicitName) return true

  // 3. 下载/附件路径 + 链接文字含明确文件名
  if (downloadContext && explicitName) return true

  // 4. 链接文字含明确文件名，且 URL 带文档扩展名或处于下载上下文
  if (explicitName && !isObviousPageLink(href)) {
    if (downloadContext || hrefIsDoc) return true
    const hrefExt = getFileExtension(href)
    if (["xlsx", "docx", "doc", "pdf"].includes(hrefExt)) return true
  }

  return false
}

/** @deprecated 使用 isFileDownloadLink */
export function isLikelyDocumentLink(anchor: HTMLAnchorElement): boolean {
  return isFileDownloadLink(anchor)
}

export function extractLinkLabel(anchor: HTMLAnchorElement): string | null {
  const explicit = getExplicitFilename(anchor)
  if (explicit) return explicit

  const href = anchor.href
  if (hrefPointsToDocument(href)) {
    try {
      const url = new URL(href)
      const segment = decodeURIComponent(url.pathname.split("/").pop() || "")
      if (SUPPORTED_EXT_RE.test(segment)) return segment

      for (const key of FILENAME_QUERY_KEYS) {
        const value = url.searchParams.get(key)
        if (!value) continue
        const decoded = decodeURIComponent(value)
        const embedded = extractFilenameFromText(decoded)
        if (embedded) return embedded
        if (DOC_EXT_ONLY_RE.test(decoded)) return decoded
      }
    } catch {
      // fall through
    }
  }

  const downloadAttr = anchor.getAttribute("download")?.trim()
  if (downloadAttr && !GENERIC_TEXT_RE.test(downloadAttr)) {
    return normalizeText(downloadAttr)
  }

  return null
}

export function resolveLinkType(
  anchor: HTMLAnchorElement,
  label: string
): SupportedType | "" {
  return (
    resolveFileType(label, "", "") ||
    resolveFileType(anchor.href, getFileExtension(anchor.href), "")
  )
}
