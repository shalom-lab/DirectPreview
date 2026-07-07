<div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
  <img src="logo.svg" width="72" height="72" alt="DirectPreview" />
  <div>
    <h1 style="margin: 0; border: none; font-size: 2em;">DirectPreview</h1>
    <p style="margin: 6px 0 0 0;">
      Preview Office / PDF <strong>without downloading</strong> · Chrome Extension · <a href="README.md">简体中文</a>
    </p>
  </div>
</div>

Click the **eye** beside a download link to preview instantly — the original link still downloads normally. Files are archived locally for history, rename, and batch export.

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
