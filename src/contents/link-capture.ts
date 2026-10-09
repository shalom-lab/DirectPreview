import type { PlasmoCSConfig } from "plasmo"

import {
  isUrlExcluded,
  normalizeExcludeSites
} from "~utils/exclude-sites"
import {
  extractLinkLabel,
  isFileDownloadLink,
  resolveLinkType
} from "~utils/link-parse"
import { MESSAGE_ACTIONS } from "~utils/security"
import { initLocaleFromStorage, t } from "~utils/i18n"

/** Must match SETTINGS_STORAGE_KEY in settings.ts — avoid importing settings
 *  here so content scripts do not pull a Parcel-split chunk (MODULE_NOT_FOUND). */
const SETTINGS_STORAGE_KEY = "directpreview_settings"

/** 内联 SVG，避免 content script 中 raw: 导入变成扩展 URL 字符串 */
const EYE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"],
  run_at: "document_end",
  all_frames: true
}

const DP_MARK = "data-dp-enhanced"

let pageExcluded = false

function injectStyles(): void {
  if (document.getElementById("dp-preview-styles")) return

  const style = document.createElement("style")
  style.id = "dp-preview-styles"
  style.textContent = `
    .dp-preview-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      margin-left: 4px;
      padding: 0;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #f8fafc;
      color: #2563eb;
      cursor: pointer;
      vertical-align: middle;
      flex-shrink: 0;
      transition: all 0.15s ease;
      line-height: 0;
    }
    .dp-preview-btn:hover {
      background: #2563eb;
      border-color: #2563eb;
      color: #fff;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);
    }
    .dp-preview-btn:active {
      transform: scale(0.95);
    }
  `
  document.head.appendChild(style)
}

function openPreview(anchor: HTMLAnchorElement): void {
  const label = extractLinkLabel(anchor)
  if (!label) return

  const type = resolveLinkType(anchor, label)
  if (!type) return

  void chrome.runtime.sendMessage({
    action: MESSAGE_ACTIONS.OPEN_PREVIEW,
    url: anchor.href,
    name: label,
    type
  })
}

function enhanceLink(anchor: HTMLAnchorElement): void {
  if (pageExcluded) return
  if (anchor.hasAttribute(DP_MARK)) return
  if (!isFileDownloadLink(anchor)) return

  anchor.setAttribute(DP_MARK, "true")

  const btn = document.createElement("button")
  btn.type = "button"
  btn.className = "dp-preview-btn"
  btn.title = t("link_previewTitle")
  btn.setAttribute("aria-label", t("link_previewAria"))
  btn.innerHTML = EYE_ICON_SVG

  btn.addEventListener("click", (event) => {
    event.preventDefault()
    event.stopPropagation()
    openPreview(anchor)
  })

  anchor.insertAdjacentElement("afterend", btn)
}

function removeEyeButtons(): void {
  document.querySelectorAll(".dp-preview-btn").forEach((node) => node.remove())
  document.querySelectorAll(`a[${DP_MARK}]`).forEach((node) => {
    node.removeAttribute(DP_MARK)
  })
}

function scanLinks(root: ParentNode = document.body): void {
  if (pageExcluded || !root) return

  if (root instanceof HTMLAnchorElement) {
    enhanceLink(root)
  }

  root.querySelectorAll?.(`a:not([${DP_MARK}])`).forEach((node) => {
    if (node instanceof HTMLAnchorElement) enhanceLink(node)
  })
}

function readExcludePatterns(stored: unknown): string[] {
  if (!stored || typeof stored !== "object") return []
  const sites = (stored as { eyeExcludeSites?: unknown }).eyeExcludeSites
  return Array.isArray(sites) ? normalizeExcludeSites(sites as string[]) : []
}

async function refreshExcludeState(): Promise<void> {
  let patterns: string[] = []
  try {
    const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY)
    patterns = readExcludePatterns(result[SETTINGS_STORAGE_KEY])
  } catch {
    patterns = []
  }

  const nextExcluded = isUrlExcluded(location.href, patterns)
  if (nextExcluded === pageExcluded) return

  pageExcluded = nextExcluded
  if (pageExcluded) {
    removeEyeButtons()
  } else {
    scanLinks()
  }
}

function boot(): void {
  if (!document.body) return

  const observer = new MutationObserver((mutations) => {
    if (pageExcluded) return
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLAnchorElement) {
          enhanceLink(node)
        } else if (node instanceof HTMLElement) {
          scanLinks(node)
        }
      })
    }
  })

  void Promise.all([initLocaleFromStorage(), refreshExcludeState()]).finally(
    () => {
      if (!pageExcluded) {
        injectStyles()
        scanLinks()
      }
      observer.observe(document.body, { childList: true, subtree: true })
    }
  )

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[SETTINGS_STORAGE_KEY]) return
    void refreshExcludeState().then(() => {
      if (!pageExcluded) injectStyles()
    })
  })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot)
} else {
  boot()
}
