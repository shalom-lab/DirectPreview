<p align="center">
  <img src="logo.svg" width="160" alt="DirectPreview" />
</p>

<h1 align="center">DirectPreview</h1>

<p align="center">网页 Office / PDF <strong>免下载预览</strong> Chrome 扩展</p>

<p align="center"><a href="README.en.md">English</a></p>

## 功能

- 文档链接旁显示眼睛图标，点图标预览，原链接照常下载
- 支持 `xlsx` · `docx` · `doc` · `pdf`
- 本地历史归档（IndexedDB）、重命名、筛选、批量下载
- Excel 支持搜索 / 筛选 / 排序
- 护眼主题 + 点阵画布
- 10 种界面语言

## 使用

1. 点击扩展图标打开主控台
2. 网页链接旁点 **眼睛** 预览，或拖拽 / 导入本地文件
3. 侧边栏 **⚙** 可切换语言与主题

## 安装

从 [Releases](https://github.com/shalom-lab/DirectPreview/releases) 下载 `chrome-mv3-prod.zip`，解压后在 `chrome://extensions` 加载已解压的扩展程序。

## 开发

```bash
npm install
npm run dev      # 加载 build/chrome-mv3-dev
npm run build    # 产物 build/chrome-mv3-prod
```

## 发版

```bash
git tag v1.0.0
git push origin v1.0.0
```

推送 `v*` 标签后，GitHub Actions 会自动构建并发布 Release，`manifest` 版本与 tag 同步。
