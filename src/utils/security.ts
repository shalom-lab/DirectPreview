import { te } from "~utils/i18n"

export const MAX_FILE_SIZE = 100 * 1024 * 1024
export const FETCH_TIMEOUT_MS = 60_000
export const MAX_URL_LENGTH = 8192
export const MAX_FILENAME_LENGTH = 255
export const MAX_HISTORY_ITEMS = 200

const ALLOWED_SCHEMES = new Set(["http:", "https:"])

export const MESSAGE_ACTIONS = {
  OPEN_PREVIEW: "OPEN_PREVIEW",
  ROUTE_NATIVE_DOWNLOAD: "ROUTE_NATIVE_DOWNLOAD"
} as const

export function assertFileSize(size: number): void {
  if (size <= 0) {
    throw te("error_fileEmpty")
  }
  if (size > MAX_FILE_SIZE) {
    throw te(
      "error_fileSizeExceeded",
      String(Math.floor(MAX_FILE_SIZE / 1024 / 1024))
    )
  }
}

export function validateRemoteUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) {
    throw te("error_urlInvalid")
  }
  if (trimmed.length > MAX_URL_LENGTH) {
    throw te("error_urlTooLong")
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw te("error_urlFormatInvalid")
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw te("error_urlSchemeInvalid")
  }

  return parsed.href
}

export function sanitizeFilename(raw: string): string {
  const base = raw.split(/[/\\]/).pop() || "document"
  const cleaned = base
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[<>:"|?*]/g, "_")
    .trim()

  if (!cleaned || cleaned === "." || cleaned === "..") {
    return "document"
  }

  if (cleaned.length <= MAX_FILENAME_LENGTH) {
    return cleaned
  }

  const dot = cleaned.lastIndexOf(".")
  if (dot > 0) {
    const ext = cleaned.slice(dot)
    const stem = cleaned.slice(0, MAX_FILENAME_LENGTH - ext.length)
    return stem + ext
  }

  return cleaned.slice(0, MAX_FILENAME_LENGTH)
}

export function isExtensionSender(
  sender: chrome.runtime.MessageSender
): boolean {
  return sender.id === chrome.runtime.id
}

export function isTrustedMessage(message: unknown): message is {
  action: string
  url?: string
  name?: string
  type?: string
} {
  return (
    typeof message === "object" &&
    message !== null &&
    typeof (message as { action?: unknown }).action === "string"
  )
}
