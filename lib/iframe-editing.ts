export function injectEditingCapabilities(html: string): string {
  console.log('[iframe-editing] Injecting editing capabilities');
  console.log('[iframe-editing] Input HTML length:', html.length);

  // First, clean any existing injection code (in case HTML was saved with leftover markers)
  let cleanedHTML = html;

  // Remove SORA_EDIT block if present (handles corrupted saves)
  const startIdx = cleanedHTML.indexOf('<!-- SORA_EDIT_START -->');
  const endIdx = cleanedHTML.indexOf('<!-- SORA_EDIT_END -->');
  if (startIdx !== -1 && endIdx !== -1) {
    console.log('[iframe-editing] Cleaning existing injection code');
    cleanedHTML = cleanedHTML.substring(0, startIdx) + cleanedHTML.substring(endIdx + '<!-- SORA_EDIT_END -->'.length);
  }

  // Remove leftover editing style/script blocks by ID
  cleanedHTML = cleanedHTML.replace(/<style[^>]*id="__sora-editing-style"[^>]*>[\s\S]*?<\/style>/gi, '');
  cleanedHTML = cleanedHTML.replace(/<script[^>]*id="__sora-editing-script"[^>]*>[\s\S]*?<\/script>/gi, '');

  // Also clean any leftover __sora DOM artifacts from bad saves
  // Remove __sora-img-wrap divs (unwrap images)
  cleanedHTML = cleanedHTML.replace(/<div[^>]*class="[^"]*__sora-img-wrap[^"]*"[^>]*>([\s\S]*?)<div[^>]*class="[^"]*__sora-img-overlay[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi, function(_match, inner) {
    return inner.trim();
  });
  // Remove any remaining __sora overlay/pencil/button elements
  cleanedHTML = cleanedHTML.replace(/<div[^>]*class="[^"]*__sora-(?:img-overlay|bg-overlay|text-pencil)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  cleanedHTML = cleanedHTML.replace(/<button[^>]*class="[^"]*__sora-section-edit-btn[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '');
  cleanedHTML = cleanedHTML.replace(/<button[^>]*class="[^"]*__sora-section-delete-btn[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '');
  cleanedHTML = cleanedHTML.replace(/<button[^>]*class="[^"]*__sora-element-delete-btn[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '');
  cleanedHTML = cleanedHTML.replace(/<div[^>]*class="[^"]*__sora-link-edit-btn[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  cleanedHTML = cleanedHTML.replace(/<div[^>]*class="[^"]*__sora-link-popup[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  cleanedHTML = cleanedHTML.replace(/<div[^>]*class="[^"]*__sora-link-popup-backdrop[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  cleanedHTML = cleanedHTML.replace(/<div[^>]*class="[^"]*__sora-text-toolbar[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  cleanedHTML = cleanedHTML.replace(/<input[^>]*class="[^"]*__sora-file-input[^"]*"[^>]*\/?>/gi, '');
  cleanedHTML = cleanedHTML.replace(/<div[^>]*id="__sora-editing-active"[^>]*><\/div>/gi, '');
  // Remove __sora classes from class attributes
  cleanedHTML = cleanedHTML.replace(/class="([^"]*)"/g, function(_match, classes) {
    const cleaned = classes.split(/\s+/).filter(function(c: string) {
      return c.indexOf('__sora') === -1;
    }).join(' ');
    return cleaned ? 'class="' + cleaned + '"' : '';
  });
  // Remove contenteditable="false" attributes left by text editing
  cleanedHTML = cleanedHTML.replace(/\s*contenteditable="false"/gi, '');

  // Build the editing block.
  // IMPORTANT: We split the closing </script> tag to prevent the TypeScript/bundler
  // parser from misinterpreting it. The two halves join to form a valid tag in the output.
  const scriptClose = '</' + 'script>';

  const editingBlock = `
<!-- SORA_EDIT_START -->
<style id="__sora-editing-style">
.__sora-img-overlay {
  position: absolute !important;
  top: 0 !important; left: 0 !important;
  width: 100% !important; height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: rgba(0,0,0,0.45) !important;
  opacity: 0 !important;
  transition: opacity 0.18s !important;
  cursor: pointer !important;
  pointer-events: auto !important;
  z-index: 999999 !important;
}
.__sora-img-overlay:hover { opacity: 1 !important; }
.__sora-img-wrap {
  position: relative !important;
}
.__sora-bg-overlay {
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  width: 64px !important; height: 64px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: rgba(0,0,0,0.7) !important;
  border-radius: 16px !important;
  opacity: 0 !important;
  transition: opacity 0.2s, transform 0.2s !important;
  cursor: pointer !important;
  pointer-events: auto !important;
  z-index: 999999 !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
}
*:hover > .__sora-bg-overlay {
  opacity: 1 !important;
  transform: translate(-50%, -50%) scale(1.05) !important;
}
.__sora-text-pencil {
  position: absolute !important;
  top: -4px !important; right: -4px !important;
  width: 28px !important; height: 28px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #4d9fff !important;
  border-radius: 8px !important;
  opacity: 0 !important;
  transition: opacity 0.15s !important;
  cursor: pointer !important;
  pointer-events: auto !important;
  z-index: 999999 !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
}
.__sora-text-wrap {
  position: relative !important;
}
.__sora-text-wrap:hover > .__sora-text-pencil {
  opacity: 1 !important;
}
.__sora-editing {
  outline: 2px solid #4d9fff !important;
  outline-offset: 2px !important;
  pointer-events: auto !important;
  cursor: text !important;
}
.__sora-text-toolbar {
  position: absolute !important;
  bottom: 100% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  background: white !important;
  border-radius: 12px !important;
  padding: 8px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08) !important;
  z-index: 99999999 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  margin-bottom: 8px !important;
  min-width: 280px !important;
  pointer-events: auto !important;
  animation: __sora-toolbar-in 0.15s ease-out !important;
}
@keyframes __sora-toolbar-in {
  from { opacity: 0; transform: translateX(-50%) translateY(6px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.__sora-text-toolbar-row {
  display: flex !important;
  align-items: center !important;
  gap: 3px !important;
}
.__sora-text-toolbar-label {
  font-size: 9px !important;
  font-weight: 700 !important;
  color: #9ca3af !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  min-width: 32px !important;
  padding-right: 4px !important;
}
.__sora-text-toolbar-sep {
  width: 1px !important;
  height: 20px !important;
  background: #e5e7eb !important;
  margin: 0 4px !important;
}
.__sora-tt-color {
  width: 20px !important;
  height: 20px !important;
  border-radius: 50% !important;
  border: 2px solid transparent !important;
  cursor: pointer !important;
  transition: transform 0.1s, border-color 0.1s !important;
  padding: 0 !important;
  outline: none !important;
}
.__sora-tt-color:hover {
  transform: scale(1.2) !important;
}
.__sora-tt-color.active {
  border-color: #4d9fff !important;
  box-shadow: 0 0 0 2px rgba(77,159,255,0.3) !important;
}
.__sora-tt-btn {
  height: 26px !important;
  padding: 0 8px !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 6px !important;
  background: white !important;
  cursor: pointer !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #374151 !important;
  transition: all 0.1s !important;
  white-space: nowrap !important;
}
.__sora-tt-btn:hover {
  background: #f3f4f6 !important;
  border-color: #d1d5db !important;
}
.__sora-tt-btn.active {
  background: #4d9fff !important;
  color: white !important;
  border-color: #4d9fff !important;
}
.__sora-tt-done {
  height: 28px !important;
  padding: 0 14px !important;
  border: none !important;
  border-radius: 8px !important;
  background: #22c55e !important;
  color: white !important;
  cursor: pointer !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  transition: background 0.1s !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  margin-left: auto !important;
}
.__sora-tt-done:hover {
  background: #16a34a !important;
}
.__sora-file-input {
  position: fixed !important;
  top: -9999px !important;
  left: -9999px !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
.__sora-section-edit-btn {
  position: absolute !important;
  top: 12px !important;
  right: 12px !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 8px 14px !important;
  background: rgba(124, 58, 237, 0.95) !important;
  color: white !important;
  border: none !important;
  border-radius: 12px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  opacity: 0 !important;
  transition: opacity 0.2s, transform 0.2s !important;
  z-index: 999998 !important;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3) !important;
  pointer-events: auto !important;
}
.__sora-section-edit-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4) !important;
  background: rgba(124, 58, 237, 1) !important;
}
.__sora-section-delete-btn {
  position: absolute !important;
  top: 12px !important;
  right: 160px !important;
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 8px 12px !important;
  background: rgba(220, 38, 38, 0.9) !important;
  color: white !important;
  border: none !important;
  border-radius: 12px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  opacity: 0 !important;
  transition: opacity 0.2s, transform 0.2s !important;
  z-index: 999998 !important;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25) !important;
  pointer-events: auto !important;
}
.__sora-section-delete-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4) !important;
  background: rgba(220, 38, 38, 1) !important;
}
.__sora-section-wrapper {
  position: relative !important;
}
.__sora-section-wrapper:hover > .__sora-section-edit-btn,
.__sora-section-wrapper:hover > .__sora-section-delete-btn {
  opacity: 1 !important;
}
.__sora-link-wrap {
  position: relative !important;
}
.__sora-link-edit-btn {
  position: absolute !important;
  bottom: -28px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 4px 10px !important;
  background: rgba(14, 116, 144, 0.95) !important;
  color: white !important;
  border: none !important;
  border-radius: 8px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  opacity: 0 !important;
  transition: opacity 0.15s !important;
  z-index: 999999 !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
  pointer-events: auto !important;
  white-space: nowrap !important;
}
.__sora-link-wrap:hover > .__sora-link-edit-btn {
  opacity: 1 !important;
}
.__sora-link-popup {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  background: white !important;
  border-radius: 16px !important;
  padding: 20px !important;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
  z-index: 9999999 !important;
  width: 340px !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}
.__sora-link-popup-backdrop {
  position: fixed !important;
  inset: 0 !important;
  background: rgba(0,0,0,0.4) !important;
  z-index: 9999998 !important;
}
.__sora-link-popup label {
  display: block !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #6b7280 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  margin-bottom: 4px !important;
  margin-top: 12px !important;
}
.__sora-link-popup label:first-child {
  margin-top: 0 !important;
}
.__sora-link-popup input {
  width: 100% !important;
  height: 36px !important;
  padding: 0 10px !important;
  border: 1px solid #d1d5db !important;
  border-radius: 8px !important;
  font-size: 13px !important;
  outline: none !important;
  box-sizing: border-box !important;
}
.__sora-link-popup input:focus {
  border-color: #0e7490 !important;
  box-shadow: 0 0 0 3px rgba(14,116,144,0.1) !important;
}
.__sora-link-popup-colors {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 6px !important;
  margin-top: 6px !important;
}
.__sora-link-popup-colors button {
  width: 24px !important;
  height: 24px !important;
  border-radius: 6px !important;
  border: 1px solid #e5e7eb !important;
  cursor: pointer !important;
  transition: transform 0.1s !important;
}
.__sora-link-popup-colors button:hover {
  transform: scale(1.15) !important;
}
.__sora-link-popup-actions {
  display: flex !important;
  gap: 8px !important;
  margin-top: 16px !important;
}
.__sora-link-popup-actions button {
  flex: 1 !important;
  height: 36px !important;
  border: none !important;
  border-radius: 10px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
}
.__sora-element-delete-btn {
  position: absolute !important;
  top: -4px !important;
  left: -4px !important;
  width: 22px !important;
  height: 22px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: rgba(220, 38, 38, 0.9) !important;
  border-radius: 6px !important;
  opacity: 0 !important;
  transition: opacity 0.15s !important;
  cursor: pointer !important;
  pointer-events: auto !important;
  z-index: 999999 !important;
  border: none !important;
  box-shadow: 0 2px 6px rgba(220,38,38,0.3) !important;
}
.__sora-text-wrap:hover > .__sora-element-delete-btn {
  opacity: 1 !important;
}
.__sora-img-wrap:hover > .__sora-element-delete-btn {
  opacity: 1 !important;
}
</style>
<script id="__sora-editing-script">
(function() {
  if (document.getElementById('__sora-editing-active')) return;
  var sentinel = document.createElement('div');
  sentinel.id = '__sora-editing-active';
  sentinel.style.display = 'none';
  document.body.appendChild(sentinel);

  // File input
  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.className = '__sora-file-input';
  document.body.appendChild(fileInput);

  var targetImg = null;
  var targetBgEl = null;

  // Camera SVG
  var cameraSVG = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  var cameraSVGSmall = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';

  // Pencil SVG
  var pencilSVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';

  var wandSVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h0"/><path d="M17.8 6.2L19 5"/><path d="M3 21l9-9"/><path d="M12.2 6.2L11 5"/></svg>';

  var TEXT_SELECTORS = 'h1,h2,h3,h4,h5,h6,p,span,a,li,button,label,td,th,blockquote';

  function isSoraEl(el) {
    if (!el) return false;
    if (el.className && typeof el.className === 'string' && el.className.indexOf('__sora') !== -1) return true;
    if (el.id === '__sora-editing-active') return true;
    return false;
  }

  function hasDirectText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim().length > 0) return true;
    }
    return false;
  }

  function getCleanHTML() {
    console.log('getCleanHTML called');

    // Work on a clone of the DOM so we can manipulate it without affecting the live page
    var docClone = document.documentElement.cloneNode(true);

    // 1. Remove the sentinel element
    var sentinelClone = docClone.querySelector('#__sora-editing-active');
    if (sentinelClone) sentinelClone.parentNode.removeChild(sentinelClone);

    // 2. Remove the file input
    var fileInputClone = docClone.querySelector('.__sora-file-input');
    if (fileInputClone) fileInputClone.parentNode.removeChild(fileInputClone);

    // 2b. Remove the injected editing style and script by ID
    var editStyle = docClone.querySelector('#__sora-editing-style');
    if (editStyle) editStyle.parentNode.removeChild(editStyle);
    var editScript = docClone.querySelector('#__sora-editing-script');
    if (editScript) editScript.parentNode.removeChild(editScript);

    // 3. Unwrap __sora-img-wrap divs (move img back to parent, remove wrapper)
    var imgWraps = docClone.querySelectorAll('.__sora-img-wrap');
    for (var i = 0; i < imgWraps.length; i++) {
      var wrap = imgWraps[i];
      var img = wrap.querySelector('img');
      if (img && wrap.parentNode) {
        wrap.parentNode.insertBefore(img, wrap);
        wrap.parentNode.removeChild(wrap);
      }
    }

    // 4. Remove all __sora overlay elements (bg-overlay, img-overlay, text-pencil, section-edit-btn, delete btns, link btns, popups)
    var soraOverlays = docClone.querySelectorAll('.__sora-bg-overlay, .__sora-img-overlay, .__sora-text-pencil, .__sora-text-toolbar, .__sora-section-edit-btn, .__sora-section-delete-btn, .__sora-element-delete-btn, .__sora-link-edit-btn, .__sora-link-popup, .__sora-link-popup-backdrop');
    for (var j = 0; j < soraOverlays.length; j++) {
      if (soraOverlays[j].parentNode) {
        soraOverlays[j].parentNode.removeChild(soraOverlays[j]);
      }
    }

    // 5. Remove contenteditable and data-sora-idx attributes
    var editables = docClone.querySelectorAll('[contenteditable]');
    for (var k = 0; k < editables.length; k++) {
      editables[k].removeAttribute('contenteditable');
    }
    var idxEls = docClone.querySelectorAll('[data-sora-idx]');
    for (var ki = 0; ki < idxEls.length; ki++) {
      idxEls[ki].removeAttribute('data-sora-idx');
    }

    // 6. Remove __sora classes from all elements (but keep other classes)
    var allEls = docClone.querySelectorAll('*');
    for (var m = 0; m < allEls.length; m++) {
      var el = allEls[m];
      if (el.className && typeof el.className === 'string' && el.className.indexOf('__sora') !== -1) {
        var classes = el.className.split(/\\s+/).filter(function(c) {
          return c.indexOf('__sora') === -1;
        });
        if (classes.length > 0) {
          el.className = classes.join(' ');
        } else {
          el.removeAttribute('class');
        }
      }
    }

    // 7. Remove SORA_EDIT comment markers and any leftover editing artifacts from serialized HTML
    var html = docClone.outerHTML;
    // Remove the marker comments
    html = html.replace(/<!--\\s*SORA_EDIT_START\\s*-->/g, '');
    html = html.replace(/<!--\\s*SORA_EDIT_END\\s*-->/g, '');
    // Fallback: remove entire block if markers + content still present
    var startMarker = '<!-- SORA_EDIT_START -->';
    var endMarker = '<!-- SORA_EDIT_END -->';
    var sIdx = html.indexOf(startMarker);
    if (sIdx !== -1) {
      var eIdx = html.indexOf(endMarker, sIdx);
      if (eIdx !== -1) {
        html = html.substring(0, sIdx) + html.substring(eIdx + endMarker.length);
      }
    }
    // Fallback: remove style/script by ID if DOM removal failed (e.g. serialization quirks)
    html = html.replace(/<style[^>]*id="__sora-editing-style"[^>]*>[\\s\\S]*?<\\/style>/gi, '');
    html = html.replace(/<script[^>]*id="__sora-editing-script"[^>]*>[\\s\\S]*?<\\/script>/gi, '');

    // 8. Remove empty class="" attributes left over
    html = html.replace(/\\s*class="\\s*"/g, '');

    var result = '<!DOCTYPE html>' + html;
    console.log('Clean HTML length:', result.length);
    return result;
  }

  // Expose getCleanHTML globally so parent can call it directly
  window.__soraGetCleanHTML = getCleanHTML;

  function sendUpdate() {
    var html = getCleanHTML();
    window.parent.postMessage({ type: 'sora-edit', html: html }, '*');
  }

  // Clean up any pre-existing img wrappers (from previous injection)
  var oldWrps = document.querySelectorAll('.__sora-img-wrap');
  oldWrps.forEach(function(wrap) {
    var img = wrap.querySelector('img');
    if (img && wrap.parentNode) {
      wrap.parentNode.insertBefore(img, wrap);
      wrap.parentNode.removeChild(wrap);
    }
  });

  // Setup <img> elements
  var images = document.querySelectorAll('img');
  images.forEach(function(img) {
    if (img.closest('.__sora-img-wrap')) return;

    // Preserve the image display mode
    var parent = img.parentNode;
    var cs = window.getComputedStyle(img);
    var computedDisplay = cs.display;
    var computedWidth = cs.width;
    var computedHeight = cs.height;

    var wrap = document.createElement('div');
    wrap.className = '__sora-img-wrap';

    // Match the image layout - copy dimensions to prevent collapse
    if (computedDisplay === 'block' || parseInt(computedWidth) > 200) {
      wrap.style.display = 'block';
      wrap.style.width = '100%';
    } else {
      wrap.style.display = 'inline-block';
    }
    // Preserve height so object-fit images don't collapse
    if (computedHeight && parseInt(computedHeight) > 0) {
      wrap.style.height = computedHeight;
      wrap.style.overflow = 'hidden';
    }

    parent.insertBefore(wrap, img);
    wrap.appendChild(img);

    var overlay = document.createElement('div');
    overlay.className = '__sora-img-overlay';
    overlay.innerHTML = cameraSVG;
    wrap.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      targetImg = img;
      targetBgEl = null;
      fileInput.click();
    });
  });

  // Clean up any pre-existing overlays from previous injections
  var oldOverlays = document.querySelectorAll('.__sora-bg-overlay');
  oldOverlays.forEach(function(overlay) {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  });

  // Setup elements with background-image
  var allBgEls = document.querySelectorAll('*');
  allBgEls.forEach(function(el) {
    if (isSoraEl(el)) return;

    // Skip if already has overlay
    if (el.querySelector && el.querySelector('.__sora-bg-overlay')) return;

    var bg = window.getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none') return;
    // Check if there's a URL (even if there's also a gradient)
    if (bg.indexOf('url(') === -1) return;

    // Only target elements with significant size (likely hero/banner images)
    var rect = el.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 60) return;

    // Make sure element is positioned for the overlay
    var pos = window.getComputedStyle(el).position;
    if (pos === 'static') {
      el.style.position = 'relative';
    }

    var bgOverlay = document.createElement('div');
    bgOverlay.className = '__sora-bg-overlay';
    bgOverlay.innerHTML = cameraSVGSmall;
    el.appendChild(bgOverlay);

    bgOverlay.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      targetImg = null;
      targetBgEl = el;
      fileInput.click();
    });
  });

  fileInput.addEventListener('change', function() {
    if (!fileInput.files || !fileInput.files[0]) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      if (targetImg) {
        targetImg.src = e.target.result;
      } else if (targetBgEl) {
        targetBgEl.style.backgroundImage = 'url(' + e.target.result + ')';
      }
      sendUpdate();
      targetImg = null;
      targetBgEl = null;
    };
    reader.readAsDataURL(fileInput.files[0]);
    fileInput.value = '';
  });

  // Setup section edit buttons
  function getSectionName(el) {
    // Check for semantic tags
    if (el.tagName === 'HEADER') return 'Header';
    if (el.tagName === 'NAV') return 'Navigation';
    if (el.tagName === 'FOOTER') return 'Footer';

    // Check for common class names
    var className = el.className || '';
    if (typeof className !== 'string') className = '';

    if (className.match(/hero/i)) return 'Hero-Bereich';
    if (className.match(/feature/i)) return 'Features';
    if (className.match(/about/i)) return 'Über uns';
    if (className.match(/service/i)) return 'Dienstleistungen';
    if (className.match(/contact/i)) return 'Kontakt';
    if (className.match(/pricing/i)) return 'Preise';
    if (className.match(/testimonial/i)) return 'Testimonials';
    if (className.match(/team/i)) return 'Team';
    if (className.match(/gallery/i)) return 'Galerie';
    if (className.match(/cta|call-to-action/i)) return 'Call-to-Action';

    // Check for IDs
    var id = el.id || '';
    if (id.match(/hero/i)) return 'Hero-Bereich';
    if (id.match(/feature/i)) return 'Features';
    if (id.match(/about/i)) return 'Über uns';
    if (id.match(/service/i)) return 'Dienstleistungen';
    if (id.match(/contact/i)) return 'Kontakt';

    return null;
  }

  function isLargeSection(el) {
    // Always allow semantic elements (header, nav, footer) regardless of size
    var tag = el.tagName;
    if (tag === 'HEADER' || tag === 'NAV' || tag === 'FOOTER') return true;
    var rect = el.getBoundingClientRect();
    return rect.height > 100 && rect.width > 200;
  }

  // Remove old section buttons
  var oldSectionBtns = document.querySelectorAll('.__sora-section-edit-btn');
  oldSectionBtns.forEach(function(btn) {
    if (btn.parentNode) btn.parentNode.removeChild(btn);
  });

  // Find and setup sections
  var sectionSelectors = 'header, nav, footer, main > section, main > div, body > section, body > div';
  var potentialSections = document.querySelectorAll(sectionSelectors);
  var sectionIdx = 0;
  var sectionMap = {};

  potentialSections.forEach(function(section) {
    if (isSoraEl(section)) return;
    if (!isLargeSection(section)) return;

    var sectionName = getSectionName(section);
    if (!sectionName) return;

    // Make sure section is positioned for the button
    var pos = window.getComputedStyle(section).position;
    if (pos === 'static') {
      section.style.position = 'relative';
    }

    section.classList.add('__sora-section-wrapper');
    var idx = sectionIdx++;
    section.setAttribute('data-sora-idx', idx);
    sectionMap[idx] = section;

    var editBtn = document.createElement('button');
    editBtn.className = '__sora-section-edit-btn';
    editBtn.innerHTML = wandSVG + '<span>Bearbeiten: ' + sectionName + '</span>';
    section.appendChild(editBtn);

    editBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      // Extract current computed styles
      var cs = window.getComputedStyle(section);
      var currentStyles = {
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        padding: cs.padding,
        borderRadius: cs.borderRadius,
        backgroundImage: cs.backgroundImage
      };

      // Send message to parent with section info + styles
      window.parent.postMessage({
        type: 'sora-edit-section',
        sectionName: sectionName,
        sectionHTML: section.outerHTML,
        sectionIndex: idx,
        currentStyles: currentStyles
      }, '*');
    });

    // Delete button for section
    var trashSVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
    var deleteBtn = document.createElement('button');
    deleteBtn.className = '__sora-section-delete-btn';
    deleteBtn.innerHTML = trashSVG + '<span>Loschen</span>';
    section.appendChild(deleteBtn);

    deleteBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      // Animate out
      section.style.transition = 'opacity 0.3s, transform 0.3s';
      section.style.opacity = '0';
      section.style.transform = 'scale(0.95)';
      setTimeout(function() {
        if (section.parentNode) {
          section.parentNode.removeChild(section);
          delete sectionMap[idx];
          sendUpdate();
        }
      }, 300);
    });
  });

  // Listen for style changes from parent
  window.addEventListener('message', function(event) {
    if (!event.data || !event.data.type) return;

    if (event.data.type === 'sora-apply-style') {
      var target = sectionMap[event.data.sectionIndex];
      if (!target) return;
      var styles = event.data.styles;
      if (styles) {
        // If setting a gradient via 'background', clear conflicting properties first
        if (styles.background && styles.background.indexOf('gradient') !== -1) {
          target.style.backgroundColor = '';
          target.style.backgroundImage = '';
          target.style.background = styles.background;
        } else if (styles.backgroundColor) {
          // When setting solid bg color, clear background shorthand
          target.style.background = '';
          target.style.backgroundColor = styles.backgroundColor;
        } else {
          Object.keys(styles).forEach(function(prop) {
            target.style[prop] = styles[prop];
          });
        }
      }
      sendUpdate();
    }

    if (event.data.type === 'sora-apply-font') {
      var target = sectionMap[event.data.sectionIndex];
      if (!target) return;
      if (event.data.googleFontUrl) {
        var existing = document.querySelector('link[href="' + event.data.googleFontUrl + '"]');
        if (!existing) {
          var link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = event.data.googleFontUrl;
          document.head.appendChild(link);
        }
      }
      if (event.data.fontFamily) {
        target.style.fontFamily = event.data.fontFamily;
        var textChildren = target.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,li,button,label,blockquote,div');
        textChildren.forEach(function(child) {
          child.style.fontFamily = event.data.fontFamily;
        });
      }
      sendUpdate();
    }

    // Set background image on section
    if (event.data.type === 'sora-apply-bg-image') {
      var target = sectionMap[event.data.sectionIndex];
      if (!target) return;
      target.style.backgroundImage = 'url(' + event.data.dataUrl + ')';
      target.style.backgroundSize = 'cover';
      target.style.backgroundPosition = 'center';
      target.style.backgroundRepeat = 'no-repeat';
      sendUpdate();
    }

    // Apply color overlay on top of existing background image
    if (event.data.type === 'sora-apply-overlay') {
      var target = sectionMap[event.data.sectionIndex];
      if (!target) return;
      var cs = window.getComputedStyle(target);
      var currentBg = cs.backgroundImage;
      var overlayColor = event.data.overlayColor; // e.g. "rgba(0,0,0,0.5)"

      if (currentBg && currentBg !== 'none') {
        // Remove any existing gradient overlay (keep only url() parts)
        var urlParts = [];
        var urlMatch;
        var urlRegex = /url\\([^)]+\\)/g;
        while ((urlMatch = urlRegex.exec(currentBg)) !== null) {
          urlParts.push(urlMatch[0]);
        }
        if (urlParts.length > 0) {
          target.style.backgroundImage = 'linear-gradient(' + overlayColor + ',' + overlayColor + '),' + urlParts.join(',');
        } else {
          // No image URL found, just set as background color
          target.style.backgroundColor = overlayColor;
        }
      } else {
        target.style.backgroundColor = overlayColor;
      }
      sendUpdate();
    }
  });

  // Clean up any pre-existing text pencils
  var oldPencils = document.querySelectorAll('.__sora-text-pencil');
  oldPencils.forEach(function(pencil) {
    if (pencil.parentNode) pencil.parentNode.removeChild(pencil);
  });

  // Remove text-wrap classes from elements (fix: no leading dot in class names)
  var oldTextWraps = document.querySelectorAll('.__sora-text-wrap');
  oldTextWraps.forEach(function(el) {
    el.classList.remove('__sora-text-wrap', '__sora-editing');
  });

  // Setup text elements
  var textEls = document.querySelectorAll(TEXT_SELECTORS);
  textEls.forEach(function(el) {
    if (isSoraEl(el)) return;
    if (!hasDirectText(el)) return;
    if (el.classList.contains('__sora-text-wrap')) return;

    var origPos = window.getComputedStyle(el).position;
    if (origPos === 'static') {
      el.style.position = 'relative';
    }
    el.classList.add('__sora-text-wrap');

    var pencil = document.createElement('div');
    pencil.className = '__sora-text-pencil';
    pencil.innerHTML = pencilSVG;
    el.appendChild(pencil);

    var isEditing = false;
    var toolbar = null;

    var ttColorPresets = ['#000000','#374151','#6b7280','#ffffff','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#0e7490'];
    var ttSizeMap = {XS:'12px',S:'14px',M:'16px',L:'20px',XL:'28px',XXL:'36px'};
    var ttWeightMap = {Light:'300',Normal:'400',Semi:'600',Bold:'700'};

    function closeToolbar() {
      if (!isEditing) return;
      isEditing = false;
      el.contentEditable = 'false';
      el.classList.remove('__sora-editing');
      if (toolbar && toolbar.parentNode) toolbar.parentNode.removeChild(toolbar);
      toolbar = null;
      pencil.style.display = '';
      sendUpdate();
    }

    function createToolbar() {
      if (toolbar) return;
      toolbar = document.createElement('div');
      toolbar.className = '__sora-text-toolbar';

      var cs = window.getComputedStyle(el);

      // Row 1: Colors
      var row1 = document.createElement('div');
      row1.className = '__sora-text-toolbar-row';
      var lbl1 = document.createElement('span');
      lbl1.className = '__sora-text-toolbar-label';
      lbl1.textContent = 'Farbe';
      row1.appendChild(lbl1);
      ttColorPresets.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = '__sora-tt-color';
        btn.style.backgroundColor = c;
        if (c === '#ffffff') btn.style.border = '2px solid #d1d5db';
        btn.addEventListener('mousedown', function(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          el.style.color = c;
          // Update active state
          row1.querySelectorAll('.__sora-tt-color').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
        row1.appendChild(btn);
      });
      toolbar.appendChild(row1);

      // Row 2: Background colors
      var row2 = document.createElement('div');
      row2.className = '__sora-text-toolbar-row';
      var lbl2 = document.createElement('span');
      lbl2.className = '__sora-text-toolbar-label';
      lbl2.textContent = 'Hinter.';
      row2.appendChild(lbl2);
      var bgPresets = ['transparent','#000000','#374151','#ffffff','#fef3c7','#dcfce7','#dbeafe','#f3e8ff','#fce7f3','#e0f2fe','#fee2e2','#0e7490'];
      bgPresets.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = '__sora-tt-color';
        if (c === 'transparent') {
          btn.style.background = 'linear-gradient(45deg, #fff 40%, #ef4444 50%, #fff 60%)';
          btn.title = 'Kein Hintergrund';
        } else {
          btn.style.backgroundColor = c;
        }
        if (c === '#ffffff') btn.style.border = '2px solid #d1d5db';
        btn.addEventListener('mousedown', function(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (c === 'transparent') {
            el.style.backgroundColor = '';
            el.style.padding = '';
          } else {
            el.style.backgroundColor = c;
            if (!el.style.padding || el.style.padding === '') {
              el.style.padding = '2px 6px';
            }
          }
          row2.querySelectorAll('.__sora-tt-color').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
        row2.appendChild(btn);
      });
      toolbar.appendChild(row2);

      // Row 3: Size
      var row3 = document.createElement('div');
      row3.className = '__sora-text-toolbar-row';
      var lbl3 = document.createElement('span');
      lbl3.className = '__sora-text-toolbar-label';
      lbl3.textContent = 'Grosse';
      row3.appendChild(lbl3);
      Object.keys(ttSizeMap).forEach(function(label) {
        var btn = document.createElement('button');
        btn.className = '__sora-tt-btn';
        btn.textContent = label;
        btn.addEventListener('mousedown', function(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          el.style.fontSize = ttSizeMap[label];
          row3.querySelectorAll('.__sora-tt-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
        row3.appendChild(btn);
      });
      toolbar.appendChild(row3);

      // Row 4: Weight
      var row4 = document.createElement('div');
      row4.className = '__sora-text-toolbar-row';
      var lbl4 = document.createElement('span');
      lbl4.className = '__sora-text-toolbar-label';
      lbl4.textContent = 'Stil';
      row4.appendChild(lbl4);
      Object.keys(ttWeightMap).forEach(function(label) {
        var btn = document.createElement('button');
        btn.className = '__sora-tt-btn';
        btn.textContent = label;
        btn.addEventListener('mousedown', function(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          el.style.fontWeight = ttWeightMap[label];
          row4.querySelectorAll('.__sora-tt-btn:not(.__sora-tt-italic):not(.__sora-tt-underline)').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
        row4.appendChild(btn);
      });

      // Separator
      var sep1 = document.createElement('div');
      sep1.className = '__sora-text-toolbar-sep';
      row4.appendChild(sep1);

      // Italic toggle
      var italicBtn = document.createElement('button');
      italicBtn.className = '__sora-tt-btn __sora-tt-italic';
      italicBtn.innerHTML = '<i>I</i>';
      italicBtn.style.fontStyle = 'italic';
      if (cs.fontStyle === 'italic') italicBtn.classList.add('active');
      italicBtn.addEventListener('mousedown', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var isItalic = el.style.fontStyle === 'italic';
        el.style.fontStyle = isItalic ? 'normal' : 'italic';
        italicBtn.classList.toggle('active');
      });
      row4.appendChild(italicBtn);

      // Underline toggle
      var underBtn = document.createElement('button');
      underBtn.className = '__sora-tt-btn __sora-tt-underline';
      underBtn.innerHTML = '<u>U</u>';
      if (cs.textDecoration.indexOf('underline') !== -1) underBtn.classList.add('active');
      underBtn.addEventListener('mousedown', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var isUnder = el.style.textDecoration === 'underline';
        el.style.textDecoration = isUnder ? 'none' : 'underline';
        underBtn.classList.toggle('active');
      });
      row4.appendChild(underBtn);

      toolbar.appendChild(row4);

      // Row 5: Alignment
      var row5 = document.createElement('div');
      row5.className = '__sora-text-toolbar-row';
      var lbl5 = document.createElement('span');
      lbl5.className = '__sora-text-toolbar-label';
      lbl5.textContent = 'Align';
      row5.appendChild(lbl5);
      var aligns = [
        {val:'left', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 10H3"/><path d="M21 6H3"/><path d="M21 14H3"/><path d="M17 18H3"/></svg>'},
        {val:'center', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 10H6"/><path d="M21 6H3"/><path d="M21 14H3"/><path d="M18 18H6"/></svg>'},
        {val:'right', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10H7"/><path d="M21 6H3"/><path d="M21 14H3"/><path d="M21 18H7"/></svg>'}
      ];
      aligns.forEach(function(a) {
        var btn = document.createElement('button');
        btn.className = '__sora-tt-btn';
        btn.innerHTML = a.icon;
        btn.style.padding = '0 6px';
        if (cs.textAlign === a.val) btn.classList.add('active');
        btn.addEventListener('mousedown', function(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          el.style.textAlign = a.val;
          row5.querySelectorAll('.__sora-tt-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
        row5.appendChild(btn);
      });

      // Separator
      var sep2 = document.createElement('div');
      sep2.className = '__sora-text-toolbar-sep';
      row5.appendChild(sep2);

      // Line height
      var lhLabel = document.createElement('span');
      lhLabel.className = '__sora-text-toolbar-label';
      lhLabel.textContent = 'LH';
      lhLabel.style.minWidth = '16px';
      row5.appendChild(lhLabel);
      ['1','1.3','1.5','1.8','2'].forEach(function(lh) {
        var btn = document.createElement('button');
        btn.className = '__sora-tt-btn';
        btn.textContent = lh;
        btn.style.padding = '0 5px';
        btn.style.fontSize = '10px';
        btn.addEventListener('mousedown', function(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          el.style.lineHeight = lh;
        });
        row5.appendChild(btn);
      });

      // Done button at end
      var doneBtn = document.createElement('button');
      doneBtn.className = '__sora-tt-done';
      doneBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> OK';
      doneBtn.addEventListener('mousedown', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        closeToolbar();
      });
      row5.appendChild(doneBtn);

      toolbar.appendChild(row5);

      el.appendChild(toolbar);

      // Prevent clicks inside toolbar from blurring the element
      toolbar.addEventListener('mousedown', function(ev) {
        ev.stopPropagation();
      });
    }

    pencil.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isEditing) return;
      isEditing = true;
      el.contentEditable = 'true';
      el.classList.add('__sora-editing');
      el.focus();
      pencil.style.display = 'none';
      createToolbar();
    });

    // Close toolbar when clicking outside the element
    document.addEventListener('mousedown', function(e) {
      if (!isEditing) return;
      if (el.contains(e.target)) return;
      closeToolbar();
    });

    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey && isEditing) {
        e.preventDefault();
        closeToolbar();
      }
      if (e.key === 'Escape' && isEditing) {
        e.preventDefault();
        closeToolbar();
      }
    });

    // Delete button for text elements (except links/buttons - handled separately)
    if (el.tagName !== 'A' && el.tagName !== 'BUTTON') {
      var delBtn = document.createElement('button');
      delBtn.className = '__sora-element-delete-btn';
      delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
      el.appendChild(delBtn);

      delBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        el.style.transition = 'opacity 0.2s, transform 0.2s';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.95)';
        setTimeout(function() {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
            sendUpdate();
          }
        }, 200);
      });
    }
  });

  // ===== LINK EDITING =====
  var linkSVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>';

  var linkColorPresets = ['#0e7490','#1e88e5','#7c3aed','#e53935','#43a047','#fb8c00','#000000','#ffffff','#6c757d','#d4a574'];

  // Clean old link buttons
  var oldLinkBtns = document.querySelectorAll('.__sora-link-edit-btn');
  oldLinkBtns.forEach(function(btn) { if (btn.parentNode) btn.parentNode.removeChild(btn); });

  var allLinks = document.querySelectorAll('a, button');
  allLinks.forEach(function(link) {
    if (isSoraEl(link)) return;
    if (link.closest && link.closest('.__sora-section-edit-btn,.__sora-section-delete-btn,.__sora-element-delete-btn,.__sora-link-edit-btn')) return;
    // Skip if no text content
    if (!link.textContent || !link.textContent.trim()) return;

    var origPos = window.getComputedStyle(link).position;
    if (origPos === 'static') {
      link.style.position = 'relative';
    }
    // Ensure overflow visible so buttons show
    link.style.overflow = 'visible';
    link.classList.add('__sora-link-wrap');

    var linkBtn = document.createElement('div');
    linkBtn.className = '__sora-link-edit-btn';
    linkBtn.innerHTML = linkSVG + ' <span>Link</span>';
    link.appendChild(linkBtn);

    // Delete button for links
    var linkDelBtn = document.createElement('button');
    linkDelBtn.className = '__sora-element-delete-btn';
    linkDelBtn.style.top = '-4px';
    linkDelBtn.style.left = '-4px';
    linkDelBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
    link.appendChild(linkDelBtn);

    linkDelBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      link.style.transition = 'opacity 0.2s';
      link.style.opacity = '0';
      setTimeout(function() {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
          sendUpdate();
        }
      }, 200);
    });

    linkBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      // Remove any existing popup
      var old = document.querySelector('.__sora-link-popup');
      var oldBd = document.querySelector('.__sora-link-popup-backdrop');
      if (old) old.parentNode.removeChild(old);
      if (oldBd) oldBd.parentNode.removeChild(oldBd);

      // Create backdrop
      var backdrop = document.createElement('div');
      backdrop.className = '__sora-link-popup-backdrop';
      document.body.appendChild(backdrop);

      // Create popup
      var popup = document.createElement('div');
      popup.className = '__sora-link-popup';

      var isLink = link.tagName === 'A';
      var currentHref = isLink ? (link.getAttribute('href') || '') : '';
      var currentText = link.textContent || '';
      var cs = window.getComputedStyle(link);

      popup.innerHTML = '<div style="font-size:15px;font-weight:700;color:#111;margin-bottom:12px">' + (isLink ? 'Link bearbeiten' : 'Button bearbeiten') + '</div>'
        + '<label>URL / Link</label>'
        + '<input type="text" class="__sora-link-url" value="' + currentHref.replace(/"/g, '&quot;') + '" placeholder="https://...">'
        + '<label>Text</label>'
        + '<input type="text" class="__sora-link-text" value="' + currentText.replace(/"/g, '&quot;') + '" placeholder="Button-Text">'
        + '<label>Textfarbe</label>'
        + '<div class="__sora-link-popup-colors"></div>'
        + '<label>Hintergrundfarbe</label>'
        + '<div class="__sora-link-popup-bg-colors" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div>'
        + '<label>Schriftgrosse</label>'
        + '<div style="display:flex;gap:4px;margin-top:6px">'
        + '  <button class="__sora-link-size-btn" data-size="12px" style="flex:1;height:28px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;font-size:10px;font-weight:600;color:#374151">XS</button>'
        + '  <button class="__sora-link-size-btn" data-size="14px" style="flex:1;height:28px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;font-size:10px;font-weight:600;color:#374151">S</button>'
        + '  <button class="__sora-link-size-btn" data-size="16px" style="flex:1;height:28px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;font-size:10px;font-weight:600;color:#374151">M</button>'
        + '  <button class="__sora-link-size-btn" data-size="18px" style="flex:1;height:28px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;font-size:10px;font-weight:600;color:#374151">L</button>'
        + '  <button class="__sora-link-size-btn" data-size="22px" style="flex:1;height:28px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;font-size:10px;font-weight:600;color:#374151">XL</button>'
        + '</div>'
        + '<label>Ecken</label>'
        + '<div style="display:flex;gap:4px;margin-top:6px">'
        + '  <button class="__sora-link-radius-btn" data-radius="0px" style="flex:1;height:28px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;font-size:10px;font-weight:600;color:#374151">Eckig</button>'
        + '  <button class="__sora-link-radius-btn" data-radius="8px" style="flex:1;height:28px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;font-size:10px;font-weight:600;color:#374151">Rund S</button>'
        + '  <button class="__sora-link-radius-btn" data-radius="16px" style="flex:1;height:28px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;font-size:10px;font-weight:600;color:#374151">Rund M</button>'
        + '  <button class="__sora-link-radius-btn" data-radius="50px" style="flex:1;height:28px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;font-size:10px;font-weight:600;color:#374151">Pill</button>'
        + '</div>'
        + '<label>Stil</label>'
        + '<div style="display:flex;gap:6px;margin-top:6px">'
        + '  <button class="__sora-link-style-btn" data-style="underline" style="flex:1;height:30px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:11px;font-weight:600;color:#374151">Unterstrichen</button>'
        + '  <button class="__sora-link-style-btn" data-style="none" style="flex:1;height:30px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:11px;font-weight:600;color:#374151">Kein Unterstrich</button>'
        + '  <button class="__sora-link-style-btn" data-style="button" style="flex:1;height:30px;border:1px solid #d1d5db;border-radius:8px;background:white;cursor:pointer;font-size:11px;font-weight:600;color:#374151">Button</button>'
        + '</div>'
        + '<div class="__sora-link-popup-actions">'
        + '  <button class="__sora-link-cancel" style="background:#f3f4f6;color:#374151">Abbrechen</button>'
        + '  <button class="__sora-link-save" style="background:#0e7490;color:white">Speichern</button>'
        + '</div>';

      document.body.appendChild(popup);

      // Populate color buttons
      var colorsDiv = popup.querySelector('.__sora-link-popup-colors');
      var bgColorsDiv = popup.querySelector('.__sora-link-popup-bg-colors');
      linkColorPresets.forEach(function(c) {
        var btn = document.createElement('button');
        btn.style.backgroundColor = c;
        btn.addEventListener('click', function() {
          link.style.color = c;
        });
        colorsDiv.appendChild(btn);

        var bgBtn = document.createElement('button');
        bgBtn.style.backgroundColor = c;
        bgBtn.addEventListener('click', function() {
          link.style.backgroundColor = c;
          link.style.padding = link.style.padding || '4px 8px';
          link.style.borderRadius = link.style.borderRadius || '6px';
        });
        bgColorsDiv.appendChild(bgBtn);
      });
      // Transparent bg option
      var clearBgBtn = document.createElement('button');
      clearBgBtn.style.background = 'linear-gradient(45deg, #fff 45%, #ef4444 50%, #fff 55%)';
      clearBgBtn.title = 'Sin fondo';
      clearBgBtn.addEventListener('click', function() {
        link.style.backgroundColor = '';
        link.style.padding = '';
        link.style.borderRadius = '';
      });
      bgColorsDiv.appendChild(clearBgBtn);

      // Font size buttons
      var sizeBtns = popup.querySelectorAll('.__sora-link-size-btn');
      sizeBtns.forEach(function(sb) {
        sb.addEventListener('click', function() {
          link.style.fontSize = sb.getAttribute('data-size');
        });
      });

      // Border radius buttons
      var radiusBtns = popup.querySelectorAll('.__sora-link-radius-btn');
      radiusBtns.forEach(function(rb) {
        rb.addEventListener('click', function() {
          link.style.borderRadius = rb.getAttribute('data-radius');
        });
      });

      // Style buttons
      var styleBtns = popup.querySelectorAll('.__sora-link-style-btn');
      styleBtns.forEach(function(sb) {
        sb.addEventListener('click', function() {
          var style = sb.getAttribute('data-style');
          if (style === 'underline') {
            link.style.textDecoration = 'underline';
          } else if (style === 'none') {
            link.style.textDecoration = 'none';
          } else if (style === 'button') {
            link.style.textDecoration = 'none';
            link.style.padding = link.style.padding || '10px 24px';
            link.style.borderRadius = link.style.borderRadius || '8px';
            link.style.display = 'inline-block';
            if (!link.style.backgroundColor || link.style.backgroundColor === '') {
              link.style.backgroundColor = '#0e7490';
              link.style.color = '#ffffff';
            }
          }
        });
      });

      function closePopup() {
        if (popup.parentNode) popup.parentNode.removeChild(popup);
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      }

      backdrop.addEventListener('click', closePopup);
      popup.querySelector('.__sora-link-cancel').addEventListener('click', closePopup);
      popup.querySelector('.__sora-link-save').addEventListener('click', function() {
        var urlInput = popup.querySelector('.__sora-link-url');
        var newUrl = urlInput ? urlInput.value.trim() : '';
        var newText = popup.querySelector('.__sora-link-text').value;

        // If it's a <button> and user entered a URL, convert to <a>
        if (!isLink && newUrl) {
          var newA = document.createElement('a');
          newA.href = newUrl;
          newA.textContent = newText || link.textContent;
          // Copy styles from button
          newA.style.cssText = link.style.cssText;
          // Copy classes (except sora ones)
          var origClasses = (link.getAttribute('class') || '').split(/\s+/).filter(function(c) { return c.indexOf('__sora') === -1; });
          if (origClasses.length) newA.className = origClasses.join(' ');
          newA.style.position = 'relative';
          newA.style.overflow = 'visible';
          if (link.parentNode) {
            link.parentNode.insertBefore(newA, link);
            link.parentNode.removeChild(link);
          }
          closePopup();
          sendUpdate();
          return;
        }

        if (newUrl && isLink) link.setAttribute('href', newUrl);
        if (newText) {
          // Preserve child elements (like icons), only update text nodes
          var textNodes = [];
          for (var i = 0; i < link.childNodes.length; i++) {
            if (link.childNodes[i].nodeType === 3 && link.childNodes[i].textContent.trim()) {
              textNodes.push(link.childNodes[i]);
            }
          }
          if (textNodes.length > 0) {
            textNodes[0].textContent = newText;
          } else {
            link.textContent = newText;
            // Re-add the link edit button and delete button since textContent wipes children
            link.appendChild(linkBtn);
            link.appendChild(linkDelBtn);
          }
        }
        closePopup();
        sendUpdate();
      });
    });
  });
})();
${scriptClose}
<!-- SORA_EDIT_END -->`;

  let result: string;
  if (cleanedHTML.includes('</body>')) {
    result = cleanedHTML.replace('</body>', editingBlock + '\n</body>');
  } else {
    result = cleanedHTML + editingBlock;
  }

  console.log('[iframe-editing] Output HTML length:', result.length);
  console.log('[iframe-editing] Contains SORA_EDIT markers:', result.includes('SORA_EDIT_START') && result.includes('SORA_EDIT_END'));

  return result;
}
