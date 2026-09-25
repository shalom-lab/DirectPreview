/** 转义正则特殊字符 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function normalizeSearchQuery(query: string): string {
  return query.trim()
}

/** 在纯文本中统计不区分大小写的匹配次数 */
export function countTextMatches(text: string, query: string): number {
  const q = normalizeSearchQuery(query)
  if (!q || !text) return 0
  const re = new RegExp(escapeRegExp(q), "gi")
  return (text.match(re) || []).length
}

/**
 * 清除 root 内由本工具写入的 <mark.dp-search-hit>
 */
export function clearDomHighlights(root: HTMLElement): void {
  const marks = root.querySelectorAll("mark.dp-search-hit")
  marks.forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    parent.replaceChild(document.createTextNode(mark.textContent || ""), mark)
    parent.normalize()
  })
}

/**
 * 在 DOM 文本节点中包裹匹配为黄色 <mark>，返回匹配数
 */
export function applyDomHighlights(root: HTMLElement, query: string): number {
  clearDomHighlights(root)
  const q = normalizeSearchQuery(query)
  if (!q) return 0

  const re = new RegExp(escapeRegExp(q), "gi")
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      const tag = parent.tagName
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "MARK") {
        return NodeFilter.FILTER_REJECT
      }
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    }
  })

  const textNodes: Text[] = []
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text)
  }

  let count = 0
  for (const textNode of textNodes) {
    const text = textNode.textContent || ""
    re.lastIndex = 0
    if (!re.test(text)) continue
    re.lastIndex = 0

    const frag = document.createDocumentFragment()
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIndex) {
        frag.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index))
        )
      }
      const mark = document.createElement("mark")
      mark.className = "dp-search-hit"
      mark.dataset.searchIndex = String(count)
      mark.textContent = match[0]
      frag.appendChild(mark)
      count += 1
      lastIndex = match.index + match[0].length
      if (match[0].length === 0) {
        re.lastIndex += 1
      }
    }
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)))
    }
    textNode.parentNode?.replaceChild(frag, textNode)
  }

  return count
}

export function setActiveDomHighlight(
  root: HTMLElement,
  index: number
): HTMLElement | null {
  const marks = root.querySelectorAll<HTMLElement>("mark.dp-search-hit")
  marks.forEach((mark) => mark.classList.remove("dp-search-hit-active"))
  if (index < 0 || index >= marks.length) return null
  const active = marks[index]
  active.classList.add("dp-search-hit-active")
  active.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
  return active
}

export type HighlightSegment =
  | { type: "text"; value: string }
  | { type: "hit"; value: string; index: number }

/** 将纯文本拆成可渲染的高亮片段 */
export function splitHighlightSegments(
  text: string,
  query: string
): HighlightSegment[] {
  const q = normalizeSearchQuery(query)
  if (!q || !text) return [{ type: "text", value: text }]

  const re = new RegExp(escapeRegExp(q), "gi")
  const segments: HighlightSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let hitIndex = 0

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: "hit", value: match[0], index: hitIndex })
    hitIndex += 1
    lastIndex = match.index + match[0].length
    if (match[0].length === 0) re.lastIndex += 1
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) })
  }

  return segments.length ? segments : [{ type: "text", value: text }]
}
