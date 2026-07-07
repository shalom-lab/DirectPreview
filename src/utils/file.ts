import {
  assertFileSize,
  FETCH_TIMEOUT_MS,
  sanitizeFilename,
  validateRemoteUrl
} from "~utils/security"
import { te } from "~utils/i18n"

export const SUPPORTED_TYPES = ["xlsx", "docx", "doc", "pdf"] as const
export type SupportedType = (typeof SUPPORTED_TYPES)[number]

const MIME_MAP: Record<SupportedType, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pdf: "application/pdf"
}

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] as const // %PDF
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0] as const // legacy .doc / .xls
const FILENAME_IN_TEXT_RE = /([^\s/\\<>:"|?*]+\.(xlsx|docx|doc|pdf))\b/i

export function extractFilenameFromText(text: string): string | null {
  const match = text.match(FILENAME_IN_TEXT_RE)
  return match?.[1] ?? null
}

export function getFileExtension(name: string): string {
  const base = name.split(/[/\\]/).pop() || name
  const dot = base.lastIndexOf(".")
  if (dot <= 0) return ""
  return base.slice(dot + 1).toLowerCase()
}

export function decodeFilename(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed

  try {
    if (/%[0-9A-Fa-f]{2}/.test(trimmed)) {
      return decodeURIComponent(trimmed)
    }
  } catch {
    // fall through
  }

  try {
    if (/[\x80-\xFF]/.test(trimmed)) {
      const bytes = Uint8Array.from(trimmed, (c) => c.charCodeAt(0) & 0xff)
      return new TextDecoder("utf-8").decode(bytes)
    }
  } catch {
    // fall through
  }

  return trimmed
}

export function parseFilenameFromDisposition(
  header: string | null
): string | null {
  if (!header) return null

  const utf8Match = header.match(/filename\*=(?:UTF-8|utf-8)''([^;\n]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim())
    } catch {
      return utf8Match[1].trim()
    }
  }

  const quoted = header.match(/filename="([^"]+)"/i)
  if (quoted?.[1]) return decodeFilename(quoted[1])

  const plain = header.match(/filename=([^;\n]+)/i)
  if (plain?.[1]) return decodeFilename(plain[1].trim())

  return null
}

export function mimeToType(mime: string): SupportedType | "" {
  const lower = mime.toLowerCase()
  if (lower.includes("spreadsheetml")) return "xlsx"
  if (lower.includes("wordprocessingml")) return "docx"
  if (lower.includes("msword") || lower.includes("application/doc")) return "doc"
  if (lower.includes("pdf")) return "pdf"
  return ""
}

/** 修正 document.bin 等错误扩展名，确保文件名后缀与真实类型一致 */
export function ensureFilenameExtension(
  name: string,
  type: SupportedType
): string {
  const sanitized = sanitizeFilename(decodeFilename(name))
  const currentExt = getFileExtension(sanitized)
  const stem =
    currentExt && sanitized.endsWith(`.${currentExt}`)
      ? sanitized.slice(0, -(currentExt.length + 1))
      : sanitized

  const safeStem = stem || "document"
  if (currentExt === type) return sanitized

  const wrongGeneric =
    !currentExt || currentExt === "bin" || currentExt === "dat"

  if (wrongGeneric || currentExt !== type) {
    return `${safeStem}.${type}`
  }

  return sanitized
}

/** 从下载 URL 路径或 query 参数推断真实文件名 */
export function guessFilenameFromUrl(
  url: string,
  type: SupportedType
): string | null {
  try {
    const parsed = new URL(url)

    for (const key of ["filename", "file", "name", "download", "attname"]) {
      const value = parsed.searchParams.get(key)
      if (!value) continue
      const candidate = ensureFilenameExtension(decodeFilename(value), type)
      if (resolveFileType(candidate, type) === type) return candidate
    }

    const segment = parsed.pathname.split("/").pop() || ""
    if (!segment || segment === "/") return null

    const decoded = decodeFilename(segment)
    const candidate = ensureFilenameExtension(decoded, type)
    if (resolveFileType(candidate, "", "") === type) return candidate

    if (getFileExtension(decoded)) return candidate
  } catch {
    return null
  }

  return null
}

/** 判断是否为无意义的系统生成文件名（纯数字、哈希、document.bin 等） */
export function isGarbageFilename(name: string): boolean {
  const base = sanitizeFilename(decodeFilename(name.split(/[/\\]/).pop() || name))
  const stem = base.replace(/\.[^.]+$/, "")
  const ext = getFileExtension(base)

  if (!stem || stem === "document") return true
  if (ext === "bin" || ext === "dat") return true
  if (/^\d+$/.test(stem)) return true
  if (/^[\d._-]+$/.test(stem) && stem.replace(/\D/g, "").length >= 6) return true
  if (/^[0-9a-f-]{20,}$/i.test(stem)) return true

  return false
}

export function resolveDisplayName(
  rawName: string,
  type: SupportedType,
  sourceUrl = "",
  linkLabel = ""
): string {
  if (linkLabel) {
    return ensureFilenameExtension(
      sanitizeFilename(decodeFilename(linkLabel)),
      type
    )
  }

  let name = ensureFilenameExtension(
    sanitizeFilename(decodeFilename(rawName.split(/[/\\]/).pop() || rawName)),
    type
  )

  if (isGarbageFilename(name) && sourceUrl) {
    const fromUrl = guessFilenameFromUrl(sourceUrl, type)
    if (fromUrl && !isGarbageFilename(fromUrl)) {
      name = fromUrl
    }
  }

  return ensureFilenameExtension(name, type)
}

export function resolveFileType(
  name: string,
  hint = "",
  mime = ""
): SupportedType | "" {
  const fromHint = hint.toLowerCase()
  if (SUPPORTED_TYPES.includes(fromHint as SupportedType)) {
    return fromHint as SupportedType
  }

  const fromMime = mimeToType(mime)
  if (fromMime) return fromMime

  const ext = getFileExtension(name)
  if (SUPPORTED_TYPES.includes(ext as SupportedType)) {
    return ext as SupportedType
  }

  return ""
}

export function getMimeType(type: SupportedType): string {
  return MIME_MAP[type]
}

function matchMagic(bytes: Uint8Array, magic: readonly number[]): boolean {
  if (bytes.length < magic.length) return false
  return magic.every((value, index) => bytes[index] === value)
}

function inferZipOfficeType(bytes: Uint8Array): "xlsx" | "docx" | "" {
  const sample = bytes.slice(0, Math.min(bytes.length, 65536))
  const haystack = new TextDecoder("latin1").decode(sample)

  if (haystack.includes("word/")) return "docx"
  if (haystack.includes("xl/")) return "xlsx"
  return ""
}

function inferOleWordMarkers(bytes: Uint8Array): boolean {
  const sample = bytes.slice(0, Math.min(bytes.length, 512 * 1024))
  const haystack = new TextDecoder("latin1").decode(sample)

  return /WordDocument|MSWordDoc|Word\.Document|1Table|0Table/i.test(haystack)
}

function inferOleOfficeType(bytes: Uint8Array): "doc" | "" {
  if (inferOleWordMarkers(bytes)) return "doc"
  return ""
}

function isRtfDocument(bytes: Uint8Array): boolean {
  const head = new TextDecoder("ascii").decode(bytes.slice(0, 8))
  return head.startsWith("{\\rtf")
}

/** 根据文件魔数修正声明类型（常见于 .doc 实为 .docx） */
export function reconcileFileType(
  bytes: Uint8Array,
  declaredType: SupportedType
): SupportedType {
  const sniffed = inferTypeFromBytes(bytes)

  if (declaredType === "doc" && sniffed === "docx") return "docx"
  if (declaredType === "docx" && sniffed === "doc") return "doc"

  if (sniffed && sniffed !== declaredType) {
    if (sniffed === "pdf" || sniffed === "xlsx" || sniffed === "docx") {
      return sniffed
    }
  }

  if (declaredType === "doc" && matchMagic(bytes, ZIP_MAGIC)) {
    const zipType = inferZipOfficeType(bytes)
    if (zipType === "docx") return "docx"
  }

  return declaredType
}

export function alignNameWithType(name: string, type: SupportedType): string {
  const decoded = sanitizeFilename(decodeFilename(name))
  const stem = decoded.replace(/\.[^.]+$/, "") || "document"
  return `${stem}.${type}`
}

export function inferTypeFromBytes(bytes: Uint8Array): SupportedType | "" {
  if (matchMagic(bytes, PDF_MAGIC)) return "pdf"
  if (matchMagic(bytes, ZIP_MAGIC)) return inferZipOfficeType(bytes)
  if (isRtfDocument(bytes)) return "doc"
  if (matchMagic(bytes, OLE_MAGIC)) return inferOleOfficeType(bytes) || "doc"
  return ""
}

export function validateFileBytes(
  bytes: Uint8Array,
  type: SupportedType
): boolean {
  if (type === "pdf") return matchMagic(bytes, PDF_MAGIC)

  if (type === "doc") {
    if (matchMagic(bytes, ZIP_MAGIC) && inferZipOfficeType(bytes) === "docx") {
      return true
    }
    if (isRtfDocument(bytes)) return true
    if (matchMagic(bytes, OLE_MAGIC)) return true
    return false
  }

  if (type === "docx" || type === "xlsx") {
    if (!matchMagic(bytes, ZIP_MAGIC)) return false
    const sniffed = inferZipOfficeType(bytes)
    if (sniffed && sniffed !== type) return false
    return true
  }

  return false
}

export function createTypedBlob(
  buffer: ArrayBuffer,
  type: SupportedType
): Blob {
  return new Blob([buffer], { type: getMimeType(type) })
}

export function generateFileId(): string {
  return crypto.randomUUID()
}

export function isHtmlResponse(contentType: string | null): boolean {
  if (!contentType) return false
  const lower = contentType.toLowerCase()
  return lower.includes("text/html") || lower.includes("application/xhtml")
}

export interface FetchedFile {
  buffer: ArrayBuffer
  name: string
  type: SupportedType
  mime: string
  size: number
}

export async function fetchRemoteFile(
  url: string,
  fallbackName: string,
  fallbackType: string
): Promise<FetchedFile> {
  const safeUrl = validateRemoteUrl(url)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(safeUrl, {
      credentials: "include",
      redirect: "follow",
      signal: controller.signal
    })
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw te("error_downloadTimeout")
    }
    throw te("error_networkFailed")
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw te("error_httpStatus", String(response.status))
  }

  const contentType = response.headers.get("Content-Type")
  if (isHtmlResponse(contentType)) {
    throw te("error_htmlResponse")
  }

  const buffer = await response.arrayBuffer()
  assertFileSize(buffer.byteLength)

  const bytes = new Uint8Array(buffer)
  const headerName = parseFilenameFromDisposition(
    response.headers.get("Content-Disposition")
  )

  let name = sanitizeFilename(decodeFilename(headerName || fallbackName))
  let type = resolveFileType(name, fallbackType, contentType || "")

  if (!type) {
    const inferred = inferTypeFromBytes(bytes)
    if (inferred) type = inferred
  }

  if (!type) {
    throw te("error_formatUnknown")
  }

  name = resolveDisplayName(name, type, safeUrl)

  type = reconcileFileType(bytes, type)
  name = alignNameWithType(name, type)

  if (!validateFileBytes(bytes, type)) {
    throw te("error_fileTypeMismatch", type.toUpperCase())
  }

  return {
    buffer,
    name: resolveDisplayName(
      name,
      type,
      safeUrl,
      extractFilenameFromText(fallbackName) ||
        (!isGarbageFilename(fallbackName) ? fallbackName : "")
    ),
    type,
    mime: getMimeType(type),
    size: buffer.byteLength
  }
}

export const PENDING_PREVIEW_KEY = "directpreview_pending_capture"

export interface PendingPreviewPayload {
  url: string
  name: string
  type: string
}

export async function storePendingPreview(
  payload: PendingPreviewPayload
): Promise<void> {
  const safe: PendingPreviewPayload = {
    url: validateRemoteUrl(payload.url),
    name: sanitizeFilename(decodeFilename(payload.name)),
    type: payload.type
  }
  await chrome.storage.session.set({ [PENDING_PREVIEW_KEY]: safe })
}

export async function consumePendingPreview(): Promise<PendingPreviewPayload | null> {
  const result = await chrome.storage.session.get(PENDING_PREVIEW_KEY)
  const payload = result[PENDING_PREVIEW_KEY] as
    | PendingPreviewPayload
    | undefined

  if (!payload?.url) return null

  await chrome.storage.session.remove(PENDING_PREVIEW_KEY)

  try {
    return {
      url: validateRemoteUrl(payload.url),
      name: sanitizeFilename(decodeFilename(payload.name)),
      type: payload.type
    }
  } catch {
    return null
  }
}
