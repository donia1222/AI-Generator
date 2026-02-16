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

  // Also clean any leftover __sora DOM artifacts from bad saves
  // Remove __sora-img-wrap divs (unwrap images)
  cleanedHTML = cleanedHTML.replace(/<div[^>]*class="[^"]*__sora-img-wrap[^"]*"[^>]*>([\s\S]*?)<div[^>]*class="[^"]*__sora-img-overlay[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi, function(_match, inner) {
    return inner.trim();
  });
  // Remove any remaining __sora overlay/pencil/button elements
  cleanedHTML = cleanedHTML.replace(/<div[^>]*class="[^"]*__sora-(?:img-overlay|bg-overlay|text-pencil)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
  cleanedHTML = cleanedHTML.replace(/<button[^>]*class="[^"]*__sora-section-edit-btn[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '');
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
<style>
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
.__sora-section-wrapper {
  position: relative !important;
}
.__sora-section-wrapper:hover > .__sora-section-edit-btn {
  opacity: 1 !important;
}
</style>
<script>
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

    // 4. Remove all __sora overlay elements (bg-overlay, img-overlay, text-pencil, section-edit-btn)
    var soraOverlays = docClone.querySelectorAll('.__sora-bg-overlay, .__sora-img-overlay, .__sora-text-pencil, .__sora-section-edit-btn');
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

    // 7. Remove the SORA_EDIT_START ... SORA_EDIT_END block from the serialized HTML
    var html = docClone.outerHTML;
    var startMarker = '<!-- SORA_EDIT_START -->';
    var endMarker = '<!-- SORA_EDIT_END -->';
    var sIdx = html.indexOf(startMarker);
    if (sIdx !== -1) {
      var eIdx = html.indexOf(endMarker, sIdx);
      if (eIdx !== -1) {
        html = html.substring(0, sIdx) + html.substring(eIdx + endMarker.length);
      }
    }

    // 8. Remove empty class="" attributes left over
    html = html.replace(/\\s*class="\\s*"/g, '');

    var result = '<!DOCTYPE html>' + html;
    console.log('Clean HTML length:', result.length);
    return result;
  }

  function sendUpdate() {
    window.parent.postMessage({ type: 'sora-edit', html: getCleanHTML() }, '*');
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
    var computedDisplay = window.getComputedStyle(img).display;
    var computedWidth = window.getComputedStyle(img).width;

    var wrap = document.createElement('div');
    wrap.className = '__sora-img-wrap';

    // Match the image layout
    if (computedDisplay === 'block' || parseInt(computedWidth) > 200) {
      wrap.style.display = 'block';
      wrap.style.width = '100%';
    } else {
      wrap.style.display = 'inline-block';
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
    editBtn.innerHTML = wandSVG + '<span>Editar ' + sectionName + '</span>';
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

    pencil.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isEditing) return;
      isEditing = true;
      el.contentEditable = 'true';
      el.classList.add('__sora-editing');
      el.focus();
      pencil.style.display = 'none';
    });

    el.addEventListener('blur', function() {
      if (!isEditing) return;
      isEditing = false;
      el.contentEditable = 'false';
      el.classList.remove('__sora-editing');
      pencil.style.display = '';
      sendUpdate();
    });

    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey && isEditing) {
        e.preventDefault();
        el.blur();
      }
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
