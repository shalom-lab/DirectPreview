import React, { useEffect, useState } from "react"

import { DocViewer } from "~components/DocViewer"
import { DocxViewer } from "~components/DocxViewer"
import { reconcileFileType } from "~utils/file"
import { t } from "~utils/i18n"

interface WordViewerProps {
  blob: Blob
  declaredType: "doc" | "docx"
}

export function WordViewer({ blob, declaredType }: WordViewerProps) {
  const [resolvedType, setResolvedType] = useState<"doc" | "docx" | null>(null)

  useEffect(() => {
    let cancelled = false

    const detect = async () => {
      const bytes = new Uint8Array(await blob.arrayBuffer())
      if (!cancelled) {
        setResolvedType(
          reconcileFileType(bytes, declaredType) as "doc" | "docx"
        )
      }
    }

    setResolvedType(null)
    detect()

    return () => {
      cancelled = true
    }
  }, [blob, declaredType])

  if (!resolvedType) {
    return (
      <div className="text-slate-400 text-sm">{t("word_detecting")}</div>
    )
  }

  if (resolvedType === "docx") {
    return <DocxViewer blob={blob} />
  }

  return <DocViewer blob={blob} />
}
