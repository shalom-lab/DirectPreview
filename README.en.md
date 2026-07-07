<p align="left">
  <img src="logo.svg" width="88" align="left" alt="DirectPreview" />
</p>

# DirectPreview

**Preview Office / PDF without downloading** · Chrome Extension · [简体中文](README.md)

<p>
  <a href="https://github.com/shalom-lab/DirectPreview">
    <img src="https://img.shields.io/github/stars/shalom-lab/DirectPreview?style=flat-square&logo=github&label=Star&color=2563EB" alt="GitHub Stars" />
  </a>
  &nbsp;
  <a href="https://github.com/shalom-lab/DirectPreview/releases">
    <img src="https://img.shields.io/github/v/release/shalom-lab/DirectPreview?style=flat-square&label=Release&color=2563EB" alt="Release" />
  </a>
</p>

<br clear="both" />

> 👁 Click the **eye** beside a download link to preview instantly — the original link still downloads. Files are archived locally for history, rename, and batch export.

---

## ✨ Core Features

| | |
|---|---|
| 👁 **Inline preview** | Detects document links, injects an eye button, never blocks normal downloads |
| 📄 **Multi-format** | `xlsx` · `docx` · `doc` · `pdf`, auto-detects `.doc` vs `.docx` |
| 🗂 **Local archive** | IndexedDB history (up to 200), filter, rename, delete |
| 📊 **Excel power** | Global search, column filter & sort, headers as A / B / C… |
| ⬇ **Flexible export** | Instant blob download or re-download from source URL |
| 🎨 **Eye-care themes** | Default · green · warm · blue + dot-grid canvas |
| 🌍 **10 languages** | zh · en · ja · es · fr · de · ko · pt-BR · ru · it |

---

## 🚀 Quick Start

1. 🧭 Click the toolbar icon → open the **dashboard**
2. 👁 Click the **eye** on a web link → **instant preview**; or drag / `+` to import files
3. ⚙️ Sidebar gear → switch **language** & **theme**

---

## 📦 Install

Download `chrome-mv3-prod.zip` from [**Releases**](https://github.com/shalom-lab/DirectPreview/releases)  
→ Unzip → `chrome://extensions` → **Load unpacked**

---

## 🛠 Development

See [**DEVELOP.md**](DEVELOP.md) for versioning, release process, and Release workflow details.

```bash
npm install
npm run dev      # load build/chrome-mv3-dev
npm run build    # output build/chrome-mv3-prod
```

---

## 🏷 Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

Pushing a `v*` tag triggers GitHub Actions to build a Release; `manifest` version syncs from the tag.

---

<p align="center">
  <a href="https://github.com/shalom-lab/DirectPreview">
    <img src="https://img.shields.io/github/stars/shalom-lab/DirectPreview?style=for-the-badge&logo=github&label=Star%20DirectPreview&color=2563EB" alt="Star on GitHub" />
  </a>
</p>
