<p align="center">
  <img src="logo.svg" width="160" alt="DirectPreview" />
</p>

<h1 align="center">DirectPreview</h1>

<p align="center">Preview Office / PDF documents in Chrome <strong>without downloading</strong></p>

<p align="center"><a href="README.md">简体中文</a></p>

## Features

- Eye icon beside document links — preview on click, original link still downloads
- Supports `xlsx` · `docx` · `doc` · `pdf`
- Local history (IndexedDB), rename, filter, batch download
- Excel search / filter / sort
- Eye-care themes with dot-grid canvas
- 10 UI languages

## Usage

1. Click the extension icon to open the dashboard
2. Click the **eye** on a web link, or drag / import a local file
3. Open **⚙** in the sidebar for language & theme

## Install

Download `chrome-mv3-prod.zip` from [Releases](https://github.com/shalom-lab/DirectPreview/releases), unzip, and load unpacked at `chrome://extensions`.

## Development

```bash
npm install
npm run dev      # load build/chrome-mv3-dev
npm run build    # output build/chrome-mv3-prod
```

## Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

Pushing a `v*` tag triggers GitHub Actions to build and publish a Release; `manifest` version syncs from the tag.
