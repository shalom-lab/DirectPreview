/**
 * Post-process Plasmo build so Chrome Web Store Linux install test accepts the package.
 * - Convert icon PNGs to RGBA (indexed/palette PNGs can fail icon load on Linux)
 * - Drop empty content_scripts.css arrays
 * - Prefer http(s) matches for content scripts (host_permissions stay as needed for fetch)
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { PNG } from "pngjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const dist = path.join(root, "build", "chrome-mv3-prod")

if (!fs.existsSync(dist)) {
  console.error(`Missing build output: ${dist}`)
  process.exit(1)
}

function toRgbaPng(filePath) {
  const input = fs.readFileSync(filePath)
  const decoded = PNG.sync.read(input)
  const rgba = new PNG({
    width: decoded.width,
    height: decoded.height,
    colorType: 6
  })
  // pngjs read already expands to RGBA buffer
  decoded.data.copy(rgba.data)
  fs.writeFileSync(filePath, PNG.sync.write(rgba))
  return { width: decoded.width, height: decoded.height }
}

const iconFiles = fs
  .readdirSync(dist)
  .filter((name) => /^icon\d+\./i.test(name) && name.endsWith(".png"))

for (const name of iconFiles) {
  const filePath = path.join(dist, name)
  const { width, height } = toRgbaPng(filePath)
  console.log(`icon RGBA ← ${name} (${width}x${height})`)
}

const manifestPath = path.join(dist, "manifest.json")
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))

if (Array.isArray(manifest.content_scripts)) {
  for (const script of manifest.content_scripts) {
    if (Array.isArray(script.css) && script.css.length === 0) {
      delete script.css
    }
    if (
      Array.isArray(script.matches) &&
      script.matches.length === 1 &&
      script.matches[0] === "<all_urls>"
    ) {
      // Keep host_permissions for downloads/fetch; CS only needs pages.
      script.matches = ["http://*/*", "https://*/*"]
    }
  }
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log("manifest.json cleaned for store install")
