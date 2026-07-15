# DirectPreview

<div align="center">

<img src="logo.svg" width="96" alt="DirectPreview" />

**Preview Office / PDF on the web without downloading**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-2563EB?logo=google-chrome&logoColor=white)](https://github.com/shalom-lab/DirectPreview/releases)
[![Release](https://img.shields.io/github/v/release/shalom-lab/DirectPreview?style=flat&label=Release&color=2563EB)](https://github.com/shalom-lab/DirectPreview/releases)
[![Stars](https://img.shields.io/github/stars/shalom-lab/DirectPreview?style=flat&logo=github&color=2563EB)](https://github.com/shalom-lab/DirectPreview)
[![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-README-2563EB?style=flat)](README.md)

</div>

## ✨ Features

### 👁 Inline preview
- **Eye button**: Detects document download links and injects a preview control
- **Downloads untouched**: The original link still downloads normally

### 📄 Multi-format
- **Four types**: `xlsx` · `docx` · `doc` · `pdf`
- **Auto-detect**: Routes legacy `.doc` vs modern `.docx` correctly

### 🗂 Local archive
- **IndexedDB history**: Up to 200 items — filter, rename, delete
- **Batch export**: Instant blob download or re-fetch from the source URL

### 📊 Excel power
- **Search & filters**: Global search, column filter, and sort
- **A/B/C headers**: Fixed column letters for a spreadsheet feel

### 📄 PDF reading
- **Paged navigation**: Previous / next page controls
- **Continuous scroll**: Optional vertical scroll through all pages

### 🎨 Themes & languages
- **Eye-care themes**: Default · green · warm · soft blue + dot-grid canvas
- **10 languages**: zh · en · ja · es · fr · de · ko · pt-BR · ru · it

## 🚀 Quick start

### Install

1. Download `chrome-mv3-prod.zip` from [**Releases**](https://github.com/shalom-lab/DirectPreview/releases)
2. Unzip, then open `chrome://extensions/`
3. Enable **Developer mode** → **Load unpacked**
4. Select the unzipped `chrome-mv3-prod` folder

### First use

1. Click the toolbar icon → open the **dashboard**
2. Click the **eye** beside a web link → instant preview; or drag / `+` to import a file
3. Sidebar gear → switch **language** & **theme**

## 📖 Usage

### Preview from a web page

1. Open a page with document download links
2. Click the eye button next to a link
3. Review in the dashboard; the file is saved to local history

### Preview a local file

1. Open the dashboard
2. Drag a file onto the preview area, or click `+`
3. Supported: `xlsx` / `docx` / `doc` / `pdf`

### History & export

1. Search, select, or rename items in the left history list
2. Download one file or batch-export selected items
3. Settings page for language and eye-care themes

## 🛠️ Development

See [**DEVELOP.md**](DEVELOP.md) for versioning, release process, and workflows.

```bash
npm install
npm run dev      # load build/chrome-mv3-dev
npm run build    # output build/chrome-mv3-prod
npm run package  # produce chrome-mv3-prod.zip
```

## 🔧 Stack

- **Manifest V3** + **Plasmo**
- **React** + **Tailwind CSS**
- **Dexie** (IndexedDB)
- **pdf.js** / **docx-preview** / **xlsx** / **word-extractor**

## 🏷 Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

Pushing a `v*` tag triggers GitHub Actions to build a Release and sync `manifest` version from the tag; store publish can run when secrets are configured.

## ⚠️ Notes

1. **Local only**: Documents and history stay in IndexedDB on your device — nothing is sent to developer servers
2. **Link detection**: The eye appears only on recognized document links; redirect-heavy pages may need local import
3. **Large PDFs**: Continuous mode renders near the viewport lazily; the first scroll may briefly load pages

## 🤝 Contributing

Issues and PRs welcome:  
https://github.com/shalom-lab/DirectPreview

## 🙏 Credits

Thanks to everyone who tries DirectPreview and shares feedback.

---

<div align="center">

**If this project helps you, please give it a ⭐!**

Made with ❤️ by Shaolong Ren

</div>
