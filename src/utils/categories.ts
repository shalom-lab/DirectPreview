/** Normalize textarea / settings categories: trim, drop empty, dedupe (keep first). */
export function normalizeCategories(input: string[] | string): string[] {
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

const CATEGORY_PALETTE = [
  { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
  { bg: "#fef3c7", text: "#b45309", border: "#fcd34d" },
  { bg: "#fce7f3", text: "#be185d", border: "#f9a8d4" },
  { bg: "#e0e7ff", text: "#4338ca", border: "#a5b4fc" },
  { bg: "#ccfbf1", text: "#0f766e", border: "#5eead4" },
  { bg: "#ffedd5", text: "#c2410c", border: "#fdba74" },
  { bg: "#ede9fe", text: "#6d28d9", border: "#c4b5fd" }
] as const

export type CategoryColor = (typeof CATEGORY_PALETTE)[number]

const UNCATEGORIZED_COLOR: CategoryColor = {
  bg: "#f1f5f9",
  text: "#64748b",
  border: "#cbd5e1"
}

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function getCategoryColor(name: string | undefined | null): CategoryColor {
  if (!name) return UNCATEGORIZED_COLOR
  return CATEGORY_PALETTE[hashName(name) % CATEGORY_PALETTE.length]
}

/**
 * Diff old vs new category lists and return rename map + deleted names.
 * Same-index names that changed count as renames when the new name is unique.
 */
export function diffCategories(
  previous: string[],
  next: string[]
): { renames: Map<string, string>; deleted: string[] } {
  const nextSet = new Set(next)
  const prevSet = new Set(previous)
  const renames = new Map<string, string>()
  const deleted: string[] = []

  const max = Math.max(previous.length, next.length)
  for (let i = 0; i < max; i++) {
    const oldName = previous[i]
    const newName = next[i]
    if (oldName && newName && oldName !== newName) {
      // Treat as rename only if old is gone and new is newly introduced at this slot
      if (!nextSet.has(oldName) && !prevSet.has(newName)) {
        renames.set(oldName, newName)
      }
    }
  }

  for (const oldName of previous) {
    if (renames.has(oldName)) continue
    if (!nextSet.has(oldName)) deleted.push(oldName)
  }

  return { renames, deleted }
}
