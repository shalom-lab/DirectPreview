import fs from "node:fs"

const version = process.argv[2]?.trim()

if (!version) {
  console.error("Usage: node scripts/sync-version.mjs <version>")
  process.exit(1)
}

if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Invalid semver: ${version}`)
  process.exit(1)
}

const packagePath = new URL("../package.json", import.meta.url)
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"))

pkg.version = version

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)
console.log(`package.json version → ${version}`)
