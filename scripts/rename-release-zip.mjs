/**
 * Rename Plasmo's chrome-mv3-prod.zip → DirectPreview-{version}.zip
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
const version = pkg.version
if (!version) {
  console.error("package.json missing version")
  process.exit(1)
}

const src = path.join(root, "build", "chrome-mv3-prod.zip")
const dest = path.join(root, "build", `DirectPreview-${version}.zip`)

if (!fs.existsSync(src)) {
  console.error(`Missing package output: ${src}`)
  process.exit(1)
}

fs.copyFileSync(src, dest)
fs.unlinkSync(src)
console.log(`release zip ← ${path.relative(root, dest)}`)
