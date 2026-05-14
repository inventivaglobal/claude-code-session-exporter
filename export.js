/**
 * claude-code-session-exporter
 * Export any Claude Code shared session transcript to a self-contained HTML file.
 *
 * HOW TO USE:
 * 1. Open a Claude Code shared session: https://claude.ai/code/session_[ID]
 * 2. Open DevTools console (F12)
 * 3. Paste and run this entire script
 * 4. Click the green "Save HTML" button that appears at the bottom-right
 *
 * The exported HTML is fully self-contained (all CSS inlined) and works offline.
 *
 * @author  inventivaglobal
 * @version 1.0.0
 * @see     https://github.com/inventivaglobal/claude-code-session-exporter
 */

(async function claudeCodeExporter() {
  'use strict';

  // Step 1: Collect all CSS
  console.log('[Exporter] Collecting CSS...');
  let allCSS = '';
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) allCSS += rule.cssText + '\n';
    } catch (e) {}
  }

  const rootStyles = window.getComputedStyle(document.documentElement);
  let rootVars = ':root {\n';
  for (const prop of rootStyles) {
    if (prop.startsWith('--')) rootVars += '  ' + prop + ': ' + rootStyles.getPropertyValue(prop) + ';\n';
  }
  rootVars += '}\n';
  console.log('[Exporter] CSS: ' + Math.round(allCSS.length / 1024) + 'KB');

  // Step 2: Item capture helper
  window._capturedItems = {};
  function captureCurrentItems() {
    const absDiv = document.querySelector('.relative.epitaxy-chat-column > div.absolute');
    if (!absDiv) return 0;
    let n = 0;
    for (const kid of absDiv.children) {
      const idx = kid.getAttribute('data-index');
      if (idx !== null && !window._capturedItems[idx]) {
        const clone = kid.cloneNode(true);
        clone.removeAttribute('style');
        window._capturedItems[idx] = clone.outerHTML;
        n++;
      }
    }
    return n;
  }

  // Step 3: Scroll and capture all items
  const mainScroll = document.querySelector('.h-full.overflow-y-auto.overflow-x-hidden');
  if (!mainScroll) {
    alert('[Exporter] ERROR: Not a Claude Code session page?');
    return;
  }

  const totalDist = mainScroll.scrollHeight - mainScroll.clientHeight;
  const STEP = 8000;
  const WAIT = 250;

  console.log('[Exporter] Scrolling ' + Math.round(totalDist / 1000) + 'k px...');
  mainScroll.scrollTop = 0;
  mainScroll.dispatchEvent(new Event('scroll'));
  await new Promise(r => setTimeout(r, 600));
  captureCurrentItems();

  for (let pos = STEP; pos <= totalDist + STEP; pos += STEP) {
    const actualPos = Math.min(pos, totalDist);
    mainScroll.scrollTop = actualPos;
    mainScroll.dispatchEvent(new Event('scroll'));
    await new Promise(r => setTimeout(r, WAIT));
    captureCurrentItems();
    if (actualPos >= totalDist) break;
  }

  let capturedKeys = Object.keys(window._capturedItems).map(Number).sort((a, b) => a - b);
  const maxIdx = capturedKeys.length > 0 ? capturedKeys[capturedKeys.length - 1] : 0;

  // Step 4: Fill any gaps
  const missing = Array.from({ length: maxIdx + 1 }, (_, i) => i).filter(n => !capturedKeys.includes(n));
  if (missing.length > 0) {
    console.warn('[Exporter] Filling ' + missing.length + ' gaps...');
    const avgH = totalDist / (maxIdx + 1);
    for (const idx of missing) {
      mainScroll.scrollTop = Math.min(idx * avgH, totalDist);
      mainScroll.dispatchEvent(new Event('scroll'));
      await new Promise(r => setTimeout(r, 400));
      captureCurrentItems();
    }
    capturedKeys = Object.keys(window._capturedItems).map(Number).sort((a, b) => a - b);
  }
  console.log('[Exporter] Captured ' + capturedKeys.length + ' items');

  // Step 5: Build HTML
  const bodyBg = window.getComputedStyle(document.body).backgroundColor || 'rgb(31,31,30)';
  const bodyColor = window.getComputedStyle(document.body).color || 'rgb(248,248,246)';

  const staticOverrides = [
    '/* ===== CLAUDE CODE SESSION EXPORTER OVERRIDES ===== */',
    'html { height: auto !important; overflow: visible !important; }',
    'body { background: ' + bodyBg + ' !important; color: ' + bodyColor + ' !important; height: auto !important; min-height: 100vh; overflow-x: hidden; padding: 16px; }',
    '* { contain: none !important; max-height: none !important; }',
    '[data-index] { position: static !important; transform: none !important; height: auto !important; width: 100% !important; max-width: 860px !important; margin: 0 auto !important; display: block !important; }',
    '.epitaxy-chat-size { width: 100% !important; height: auto !important; overflow: visible !important; }',
    '.h-full, .h-screen, .h-dvh, [class*="h-full"] { height: auto !important; }',
    '.flex-1 { flex: none !important; }',
    '.min-h-0 { min-height: auto !important; }',
    '.overflow-y-auto, .overflow-x-auto, .overflow-scroll, .overflow-y-hidden, .overflow-x-hidden, .overflow-hidden { overflow: visible !important; }',
    'pre { overflow-x: auto !important; white-space: pre !important; }',
    '.exporter-header { max-width:860px; margin:0 auto 24px auto; padding:16px; background:rgba(255,255,255,0.05); border-radius:8px; border:1px solid rgba(255,255,255,0.1); }'
  ].join('\n');

  let contentHTML = '';
  for (const idx of capturedKeys) contentHTML += window._capturedItems[idx] + '\n';

  const fullHTML = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>Claude Code Export — ' + document.title + '</title>',
    '<style>',
    rootVars, allCSS, staticOverrides,
    '</style>',
    '</head>',
    '<body>',
    '<div class="exporter-header"><strong>Claude Code Session</strong> — ' + document.title + '<br><small style="opacity:0.4">Exported ' + new Date().toLocaleString() + ' · ' + capturedKeys.length + ' items · claude-code-session-exporter</small></div>',
    '<div id="content">',
    contentHTML,
    '</div>',
    '</body>',
    '</html>'
  ].join('\n');

  window._exportHTML = fullHTML;
  console.log('[Exporter] Built: ' + Math.round(fullHTML.length / 1024 / 1024 * 10) / 10 + 'MB');

  // Step 6: Save to IndexedDB (avoids 5MB localStorage limit)
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('claudeCodeExport', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('html');
    req.onsuccess = e => {
      const tx = e.target.result.transaction('html', 'readwrite');
      tx.objectStore('html').put(fullHTML, 'export');
      tx.oncomplete = resolve;
      tx.onerror = reject;
    };
    req.onerror = reject;
  });

  // Step 7: Inject download button
  const old = document.getElementById('_cce_btn');
  if (old) old.remove();
  const btn = document.createElement('a');
  btn.id = '_cce_btn';
  const blob = new Blob([fullHTML], { type: 'text/html' });
  btn.href = URL.createObjectURL(blob);
  btn.download = 'claude-code-session-export.html';
  btn.textContent = String.fromCodePoint(0x2705) + ' Save HTML (' + Math.round(fullHTML.length / 1024 / 1024 * 10) / 10 + 'MB)';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:#4caf50;color:#fff;padding:14px 22px;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;box-shadow:0 4px 20px rgba(0,0,0,0.4);cursor:pointer;font-family:system-ui,sans-serif';
  document.body.appendChild(btn);
  console.log('[Exporter] Done! Click the green button to save.');
  alert('Export ready! ' + capturedKeys.length + ' items (' + Math.round(fullHTML.length / 1024 / 1024 * 10) / 10 + 'MB)\nClick the green button at the bottom-right to save.');
})();
