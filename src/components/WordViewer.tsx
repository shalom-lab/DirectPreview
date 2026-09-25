import React, { useState } from "react"

import { DocViewer } from "~components/DocViewer"
import { DocxViewer } from "~components/DocxViewer"

interface WordViewerProps {
  blob: Blob
  /** 保留入参以兼容调用方；实际统一先试 docx，失败再回退文本 */
  declaredType?: "doc" | "docx"
}

export function WordViewer({ blob }: WordViewerProps) {
  const [failedBlob, setFailedBlob] = useState<Blob | null>(null)

  if (failedBlob === blob) {
    return <DocViewer blob={blob} />
  }

  return (
    <DocxViewer blob={blob} onError={() => setFailedBlob(blob)} />
  )
}
