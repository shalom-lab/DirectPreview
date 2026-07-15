# Chrome Web Store — copy-paste fields

Map each block below to **Developer Dashboard → Store listing**.

---

## Text fields

| Dashboard field | Value |
|-----------------|-------|
| **Title** | DirectPreview |
| **Summary** (max 132 chars) | Preview Office & PDF links instantly—click the eye beside downloads. Local archive, Excel tools, eye-care themes. |
| **Category** | Productivity |
| **Language** | English |

### Detailed description (paste into “Description”)

DirectPreview lets you **preview Office and PDF documents on the web without downloading them first**. An eye button appears beside supported links; the original download link keeps working as usual.

**Why install it**

- Click the **eye** next to document links for instant preview — no temp files, no download dialog for a quick look
- Supported: **xlsx**, **docx**, **doc**, **pdf** (auto-detects legacy `.doc` vs `.docx`)
- Files are archived **locally** in IndexedDB (up to 200) so you can reopen, rename, delete, or batch-export later
- Excel: search, column filter, sort, A/B/C headers
- PDF: page flip **or** continuous scroll
- Eye-care themes (default / green / warm yellow / soft blue) plus a dotted canvas
- UI in **10 languages**

**How to use**

1. Open the extension dashboard from the toolbar icon
2. On any page, click the eye beside a document link — or drag / import a local file
3. Open Settings (gear) to switch language and theme

**Privacy**

Captured documents stay on your device. DirectPreview does not upload your files to developer servers.

**Open source:** https://github.com/shalom-lab/DirectPreview

---

## Image assets

| Asset | Size | Source |
|-------|------|--------|
| Store icon | 128 × 128 | `icons/icon128.png` |
| Screenshots (1–5) | 1280 × 800 | `screenshots/*.html` → Download PNG |
| Small promo tile | 440 × 280 | `promo/small-tile.html` |
| Marquee promo tile | 1400 × 560 | `promo/marquee-tile.html` |

**Suggested screenshot order**

1. `01-eye-preview-1280x800.png` — **lead with eye preview**
2. `02-dashboard-1280x800.png` — local archive
3. `03-formats-1280x800.png` — Excel / PDF / Word
4. `04-overview-1280x800.png` — feature summary

Export: open each page from `index.html` → **⬇ Download PNG** (24-bit PNG, no alpha).

---

## Privacy practices

### Single purpose

The single purpose of this extension is to let users **preview supported Office/PDF documents** (via an explicit eye-button click, dashboard open, or local file import) and **keep a local history** on the device. It does not provide ads, tracking, mining, or unrelated page modification.

### Host permission (`<all_urls>`)

Required so the content script can find document download links on pages the user visits and inject the eye preview control next to those links. Document bytes are fetched only when the user clicks preview (or imports a file). Pages are not scraped in the background for unrelated data.

### downloads justification

Used so the user can save a previewed file to disk or re-download from the original URL when they choose a download / export action in the dashboard. Not used to silently download files.

### storage justification

Stores user settings (theme, language) and IndexedDB document history / blobs **on the local device only**, so previews and preferences persist across sessions. Not synced to developer servers.

### tabs justification

Opens the extension dashboard / preview UI in a tab and coordinates messaging with the content script for user-initiated preview. Not used for browsing-history analytics or cross-site tracking.

### Remote code

**Answer: No** — all JavaScript is bundled in the extension package. No remote executable scripts.

### Data use

- No user documents sent to developer servers
- History kept locally (IndexedDB)
- No ads, data sale, or credit scoring
