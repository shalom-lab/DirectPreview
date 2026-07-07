import type { PlasmoCSConfig } from "plasmo"

import {
  extractLinkLabel,
  isFileDownloadLink,
  resolveLinkType
} from "~utils/link-parse"
import { MESSAGE_ACTIONS } from "~utils/security"
import { initLocaleFromStorage, t } from "~utils/i18n"

/** 内联 SVG，避免 content script 中 raw: 导入变成扩展 URL 字符串 */
const EYE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_end",
  all_frames: true
}

const DP_MARK = "data-dp-enhanced"

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

function scanLinks(root: ParentNode = document.body): void {
  if (!root) return

  if (root instanceof HTMLAnchorElement) {
    enhanceLink(root)
  }

  root.querySelectorAll?.(`a:not([${DP_MARK}])`).forEach((node) => {
    if (node instanceof HTMLAnchorElement) enhanceLink(node)
  })
}

function boot(): void {
  if (!document.body) return

  void initLocaleFromStorage().finally(() => {
    injectStyles()
    scanLinks()
  })

  const observer = new MutationObserver((mutations) => {
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

  observer.observe(document.body, { childList: true, subtree: true })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot)
} else {
  boot()
}
