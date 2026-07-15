# Chrome Web Store assets — DirectPreview

1. Double-click `index.html` in Chrome (`file://` OK)
2. Open each asset page → click **⬇ Download PNG**
3. Paste text from `copy-paste/en-US.md` into the Developer Dashboard
4. Upload PNGs to the matching size slots

| Slot | Size | How |
|------|------|-----|
| Store icon | 128×128 | `icons/icon128.png` |
| Screenshots | 1280×800 | `screenshots/*.html` |
| Small promo | 440×280 | `promo/small-tile.html` |
| Marquee promo | 1400×560 | `promo/marquee-tile.html` |

After changing the icon, regenerate:

```bash
python chrome-web-store/scripts/gen-icon-data.py
```

No local server. No batch ZIP. Skill: `chrome-web-store-assets`.
