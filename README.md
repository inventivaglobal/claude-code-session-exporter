# claude-code-session-exporter

> Export any Claude Code shared session transcript to a self-contained, offline HTML file — bypasses virtualized rendering to capture the complete session.

## The Problem

Claude Code session pages use a **virtualized scroller** with `contain:strict`. Only ~7–13 turn groups are rendered in the DOM at any time, so a naive DOM clone or Ctrl+S captures almost nothing. Sessions can span 1.8 million pixels with 100+ turn groups.

## Solution

This script scrolls through the entire session from top to bottom in 8,000 px steps, capturing each turn group as it renders, then assembles a fully self-contained HTML file with all CSS inlined.

## Usage

1. Open a Claude Code shared session in Chrome:
   ```
   https://claude.ai/code/session_[SESSION_ID]
   ```

2. Open DevTools (**F12** → **Console** tab)

3. Paste the contents of [`export.js`](./export.js) and press **Enter**

4. Wait ~60–90 seconds while the script scrolls and captures all content

5. Click the **green "Save HTML" button** that appears at the bottom-right of the page

The saved `.html` file works completely offline — no internet required.

---

## How It Works

### 1. Collect CSS
All stylesheets are extracted from `document.styleSheets` and all CSS custom properties (theme variables) are captured from `window.getComputedStyle(documentElement)`.

### 2. Scroll & Capture
```
Main scroll container: .h-full.overflow-y-auto.overflow-x-hidden
Virtual list items:   .relative.epitaxy-chat-column > div.absolute > [data-index]
```
Each scroll step waits 250ms for the virtualiser to render new items, then clones and stores them by `data-index`.

### 3. Gap Fill
After the main scroll pass, any missing `data-index` values are targeted individually by jumping to `index × avgItemHeight` pixels.

### 4. Build HTML
All captured items are reassembled in order, wrapped with:
- Inlined CSS (900KB+)
- Static layout overrides (removes `contain:strict`, `height:100%`, `position:absolute`, `overflow:hidden`, etc.)
- A small header card showing export metadata

### 5. Download
The HTML is saved to **IndexedDB** (bypasses the 5MB localStorage limit), then a Blob URL is created and an `<a download>` button is injected for you to click.

---

## Key CSS Selectors (as of May 2026)

| Element | Selector |
|---------|----------|
| Main scroll container | `.h-full.overflow-y-auto.overflow-x-hidden` |
| Virtual list wrapper | `.relative.epitaxy-chat-column > div.absolute` |
| Turn group items | `[data-index]` |
| Chat content size | `.epitaxy-chat-size` |

---

## Static Overrides Applied

The exported HTML includes these critical overrides to convert the virtualised layout to normal document flow:

```css
* { contain: none !important; }
[data-index] { position: static !important; transform: none !important; height: auto !important; max-width: 860px; margin: 0 auto; }
.h-full, .h-screen { height: auto !important; }
.overflow-y-auto, .overflow-x-hidden { overflow: visible !important; }
.flex-1 { flex: none !important; }
.min-h-0 { min-height: auto !important; }
```

---

## Notes

- **File size**: Exported files are typically 15–20MB for long sessions (900KB CSS + content HTML)
- **Download**: Chrome may silently save to your default Downloads folder without opening the file — check there if the tab doesn't auto-open
- **Gaps**: If items are missing after the main scroll pass, the script automatically retries at estimated scroll positions
- **Selectors**: If Anthropic updates the Claude Code DOM structure, the selectors above may need updating

---

## License

MIT
# claude-code-session-exporter
Export any Claude Code shared session transcript to a self-contained, offline HTML file — bypasses virtualized rendering to capture all content
