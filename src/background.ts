export {}

import {
  resolveDisplayName,
  resolveFileType,
  storePendingPreview
} from "~utils/file"
import {
  isExtensionSender,
  isTrustedMessage,
  MESSAGE_ACTIONS,
  validateRemoteUrl
} from "~utils/security"

const bypassSet = new Set<string>()

function buildPreviewTabUrl(itemUrl: string, name: string, type: string) {
  const params = new URLSearchParams({ name, type })
  const query = params.toString()
  const base = `tabs/preview.html?${query}`
  const full = `${base}&url=${encodeURIComponent(itemUrl)}`

  if (full.length > 1800) {
    return {
      useSession: true,
      url: chrome.runtime.getURL(`${base}&from=session`)
    }
  }

  return { useSession: false, url: chrome.runtime.getURL(full) }
}

async function openPreviewTab(
  url: string,
  name: string,
  typeHint: string
): Promise<void> {
  const safeUrl = validateRemoteUrl(url)
  const mappedType = resolveFileType(name, typeHint, "")

  if (!mappedType) {
    console.error("[DirectPreview] 无法识别文件类型:", name, typeHint)
    return
  }

  const cleanName = resolveDisplayName("document", mappedType, safeUrl, name)
  const { useSession, url: previewUrl } = buildPreviewTabUrl(
    safeUrl,
    cleanName,
    mappedType
  )

  if (useSession) {
    await storePendingPreview({
      url: safeUrl,
      name: cleanName,
      type: mappedType
    })
  }

  await chrome.tabs.create({ url: previewUrl })
}

async function openDashboard(): Promise<void> {
  const dashboardUrl = chrome.runtime.getURL("tabs/preview.html")
  const existing = await chrome.tabs.query({ url: `${dashboardUrl}*` })

  if (existing[0]?.id) {
    await chrome.tabs.update(existing[0].id, { active: true })
    if (existing[0].windowId) {
      await chrome.windows.update(existing[0].windowId, { focused: true })
    }
    return
  }

  await chrome.tabs.create({ url: dashboardUrl })
}

chrome.action.onClicked.addListener(() => {
  void openDashboard().catch((err) => {
    console.error("[DirectPreview] 打开主控台失败:", err)
  })
})

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!isExtensionSender(sender) || !isTrustedMessage(message)) {
    return false
  }

  if (message.action === MESSAGE_ACTIONS.OPEN_PREVIEW) {
    if (
      typeof message.url !== "string" ||
      typeof message.name !== "string" ||
      typeof message.type !== "string"
    ) {
      return false
    }

    void openPreviewTab(message.url, message.name, message.type).catch((err) => {
      console.error("[DirectPreview] 打开预览失败:", err)
    })
    return false
  }

  if (message.action === MESSAGE_ACTIONS.ROUTE_NATIVE_DOWNLOAD) {
    if (typeof message.url !== "string") return false

    try {
      const safeUrl = validateRemoteUrl(message.url)
      bypassSet.add(safeUrl)
      chrome.downloads.download({ url: safeUrl }, () => {
        const err = chrome.runtime.lastError
        if (err) {
          bypassSet.delete(safeUrl)
          console.error("[DirectPreview] 原网址下载失败:", err.message)
        }
      })
    } catch (err) {
      console.error("[DirectPreview] 原网址下载被拒绝:", err)
    }
    return false
  }

  return false
})
