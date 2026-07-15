# DirectPreview

<div align="center">

<img src="logo.svg" width="96" alt="DirectPreview" />

**网页 Office / PDF 免下载即时预览**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-2563EB?logo=google-chrome&logoColor=white)](https://github.com/shalom-lab/DirectPreview/releases)
[![Release](https://img.shields.io/github/v/release/shalom-lab/DirectPreview?style=flat&label=Release&color=2563EB)](https://github.com/shalom-lab/DirectPreview/releases)
[![Stars](https://img.shields.io/github/stars/shalom-lab/DirectPreview?style=flat&logo=github&color=2563EB)](https://github.com/shalom-lab/DirectPreview)
[![English](https://img.shields.io/badge/English-README-2563EB?style=flat)](README.en.md)

</div>

## ✨ 功能特性

### 👁 旁注预览
- **眼睛按钮**：自动识别文档下载链接并注入预览按钮
- **不拦截下载**：原链接照常下载，预览与下载互不影响

### 📄 多格式支持
- **四类文档**：`xlsx` · `docx` · `doc` · `pdf`
- **自动识别**：`.doc` / `.docx` 按真实格式分流预览

### 🗂 本地归档
- **IndexedDB 历史**：最多保存 200 条，支持筛选、重命名、删除
- **批量导出**：内存直出下载，或从原网址重新下载

### 📊 Excel 增强
- **搜索与筛选**：全局搜索、列筛选、排序
- **表头 A/B/C**：固定列标，贴近表格阅读习惯

### 📄 PDF 阅读
- **分页翻页**：上一页 / 下一页快速跳转
- **连续滚动**：可切换为一页接一页往下浏览

### 🎨 护眼与语言
- **护眼主题**：默认 / 护眼绿 / 暖黄 / 淡蓝 + 点阵画布
- **10 种语言**：中 · 英 · 日 · 西 · 法 · 德 · 韩 · 葡 · 俄 · 意

## 🚀 快速开始

### 安装扩展

1. 从 [**Releases**](https://github.com/shalom-lab/DirectPreview/releases) 下载 `chrome-mv3-prod.zip`
2. 解压后打开 `chrome://extensions/`
3. 开启 **开发者模式** → **加载已解压的扩展程序**
4. 选择解压后的 `chrome-mv3-prod` 目录

### 开始使用

1. 点击工具栏扩展图标 → 打开**主控台**
2. 在网页链接旁点眼睛 → **即时预览**；或拖拽 / `+` 导入本地文件
3. 侧边栏齿轮 → 切换**语言**与**主题**

## 📖 使用指南

### 网页旁注预览

1. 打开包含文档下载链接的页面
2. 链接旁出现眼睛按钮时点击它
3. 在主控台中查看预览，文件会写入本地历史

### 本地文件预览

1. 打开主控台
2. 拖拽文件到预览区，或点 `+` 选择文件
3. 支持 `xlsx` / `docx` / `doc` / `pdf`

### 历史与导出

1. 在左侧历史列表中搜索、选中或重命名
2. 可单文件下载，也可批量导出已选文件
3. 设置页可切换语言与护眼主题

## 🛠️ 开发

详见 [**DEVELOP.md**](DEVELOP.md)（版本号规则、发布流程、Workflow 说明）。

```bash
npm install
npm run dev      # 加载 build/chrome-mv3-dev
npm run build    # 产物 build/chrome-mv3-prod
npm run package  # 生成 chrome-mv3-prod.zip
```

## 🔧 技术栈

- **Manifest V3** + **Plasmo**
- **React** + **Tailwind CSS**
- **Dexie**（IndexedDB）
- **pdf.js** / **docx-preview** / **xlsx** / **word-extractor**

## 🏷 发版

```bash
git tag v1.0.0
git push origin v1.0.0
```

推送 `v*` 标签后，GitHub Actions 自动构建 Release，并将 `manifest` 版本与 tag 同步；同时可触发商店发布流程（需配置 Secrets）。

## ⚠️ 注意事项

1. **仅本地存储**：预览文件与历史保存在本机 IndexedDB，不会上传到开发者服务器
2. **链接识别**：仅对识别为文档下载的链接注入眼睛按钮；复杂跳转页可能需本地导入
3. **大型 PDF**：连续滚动模式会按可见区域懒渲染，超大文档首次滑动可能短暂加载

## 🤝 贡献

欢迎提交 Issue 与 Pull Request：  
https://github.com/shalom-lab/DirectPreview

## 🙏 致谢

感谢所有使用者与反馈者。

---

<div align="center">

**如果这个项目对您有帮助，请给个 ⭐ Star！**

Made with ❤️ by Shaolong Ren

</div>
