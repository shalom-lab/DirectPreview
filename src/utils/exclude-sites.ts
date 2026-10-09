/** Normalize textarea / settings exclude sites: trim, drop empty, dedupe (keep first). */
export function normalizeExcludeSites(input: string[] | string): string[] {
  const lines = Array.isArray(input) ? input : input.split(/\r?\n/)
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of lines) {
    const name = raw.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    result.push(name)
  }

  return result
}

/**
 * Whether the current page URL matches any exclude pattern.
 * - Full/partial URL: matches if page URL starts with the pattern (trailing slash optional).
 * - Hostname only (no ://): matches that host and its subdomains.
 */
export function isUrlExcluded(pageUrl: string, patterns: string[]): boolean {
  if (!patterns.length) return false

  let hrefLower: string
  let hostname: string
  try {
    const url = new URL(pageUrl)
    hrefLower = url.href.toLowerCase()
    hostname = url.hostname.toLowerCase()
  } catch {
    hrefLower = pageUrl.toLowerCase()
    hostname = ""
  }

  for (const raw of patterns) {
    const pattern = raw.trim().toLowerCase()
    if (!pattern) continue

    if (!pattern.includes("://") && !pattern.startsWith("/")) {
      if (
        hostname &&
        (hostname === pattern || hostname.endsWith("." + pattern))
      ) {
        return true
      }
    }

    const p = pattern.replace(/\/+$/, "")
    if (!p) continue

    const hrefNoSlash = hrefLower.replace(/\/+$/, "")
    if (
      hrefNoSlash === p ||
      hrefLower.startsWith(p + "/") ||
      hrefLower.startsWith(p + "?") ||
      hrefLower.startsWith(p + "#") ||
      hrefNoSlash.startsWith(p + "/")
    ) {
      return true
    }
  }

  return false
}
