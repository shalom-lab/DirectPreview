<div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
  <img src="logo.svg" width="72" height="72" alt="DirectPreview" />
  <div>
    <h1 style="margin: 0; border: none; font-size: 2em;">DirectPreview</h1>
    <p style="margin: 6px 0 0 0;">
      网页 Office / PDF <strong>免下载即时预览</strong> · Chrome 扩展 · <a href="README.en.md">English</a>
    </p>
  </div>
</div>

在下载链接旁点 **眼睛** 就能预览，原链接照常下载。文件自动归档到本地，随时回看、重命名、批量导出。

---

## ✨ 核心功能

| | |
|---|---|
| 👁 **旁注预览** | 自动识别文档下载链接，注入眼睛按钮，不拦截正常下载 |
| 📄 **多格式** | `xlsx` · `docx` · `doc` · `pdf`，`.doc` / `.docx` 自动识别 |
| 🗂 **本地归档** | IndexedDB 保存历史（最多 200 条），支持筛选、重命名、删除 |
| 📊 **Excel 增强** | 全局搜索、列筛选、排序，表头显示 A / B / C… |
| ⬇ **灵活导出** | 内存直出下载，或从原网址重新下载 |
| 🎨 **护眼主题** | 默认 / 护眼绿 / 暖黄 / 淡蓝 + 点阵画布 |
| 🌍 **10 种语言** | 中 · 英 · 日 · 西 · 法 · 德 · 韩 · 葡 · 俄 · 意 |

---

## 🚀 快速上手

1. 🧭 点击工具栏扩展图标 → 打开**主控台**
2. 👁 网页链接旁点眼睛 → **即时预览**；或拖拽 / `+` 导入本地文件
3. ⚙️ 侧边栏齿轮 → 切换**语言**与**主题**

---

## 📦 安装

从 [**Releases**](https://github.com/shalom-lab/DirectPreview/releases) 下载 `chrome-mv3-prod.zip`  
→ 解压 → `chrome://extensions` → **加载已解压的扩展程序**

---

## 🛠 开发

```bash
npm install
npm run dev      # 加载 build/chrome-mv3-dev
npm run build    # 产物 build/chrome-mv3-prod
```

---

## 🏷 发版

```bash
git tag v1.0.0
git push origin v1.0.0
```

推送 `v*` 标签后，GitHub Actions 自动构建 Release，`manifest` 版本与 tag 同步。
