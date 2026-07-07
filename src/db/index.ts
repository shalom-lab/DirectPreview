import Dexie, { type Table } from "dexie"

import {
  createTypedBlob,
  decodeFilename,
  generateFileId,
  getMimeType,
  resolveDisplayName,
  resolveFileType,
  type SupportedType
} from "~utils/file"
import {
  assertFileSize,
  MAX_HISTORY_ITEMS,
  sanitizeFilename,
  validateRemoteUrl
} from "~utils/security"

export { type SupportedType }

export interface PreviewFile {
  id: string
  name: string
  url: string
  type: SupportedType
  mime: string
  size: number
  blob: Blob
  createdAt: number
}

export function buildPreviewRecord({
  name,
  url = "",
  type,
  buffer
}: {
  name: string
  url?: string
  type: SupportedType
  buffer: ArrayBuffer
}): PreviewFile {
  assertFileSize(buffer.byteLength)

  const decodedName = sanitizeFilename(decodeFilename(name))
  const resolvedType = resolveFileType(decodedName, type) || type
  const safeUrl = url ? validateRemoteUrl(url) : ""

  return {
    id: generateFileId(),
    name: resolveDisplayName(decodedName, resolvedType, safeUrl),
    url: safeUrl,
    type: resolvedType,
    mime: getMimeType(resolvedType),
    size: buffer.byteLength,
    blob: createTypedBlob(buffer, resolvedType),
    createdAt: Date.now()
  }
}

class DirectPreviewDB extends Dexie {
  files!: Table<PreviewFile>

  constructor() {
    super("DirectPreviewDB")
    this.version(1).stores({
      files: "id, name, type, url, createdAt"
    })
    this.version(2)
      .stores({
        files: "id, name, type, url, createdAt"
      })
      .upgrade(async (tx) => {
        const files = await tx.table("files").toArray()
        for (const file of files) {
          try {
            const type = resolveFileType(file.name, file.type)
            if (!type || !file.blob) continue

            const buffer = await file.blob.arrayBuffer()
            await tx.table("files").put({
              ...file,
              name: sanitizeFilename(decodeFilename(file.name)),
              type,
              mime: getMimeType(type),
              blob: createTypedBlob(buffer, type)
            })
          } catch {
            await tx.table("files").delete(file.id)
          }
        }
      })
  }
}

export const db = new DirectPreviewDB()

export async function savePreviewRecord(record: PreviewFile): Promise<void> {
  await db.files.put(record)
  await pruneHistoryIfNeeded()
}

async function pruneHistoryIfNeeded(): Promise<void> {
  const count = await db.files.count()
  if (count <= MAX_HISTORY_ITEMS) return

  const excess = count - MAX_HISTORY_ITEMS
  const oldest = await db.files.orderBy("createdAt").limit(excess).toArray()
  await db.files.bulkDelete(oldest.map((file) => file.id))
}
