export function injectEditingCapabilities(html: string): string {
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
  border-radius: 4px !important;
}
.__sora-img-overlay:hover { opacity: 1 !important; }
.__sora-img-wrap {
  position: relative !important;
  display: inline-block !important;
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
.__sora-img-wrap:hover > .__sora-img-overlay {
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

  // Camera SVG
  var cameraSVG = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';

  // Pencil SVG
  var pencilSVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';

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
    var clone = document.documentElement.cloneNode(true);
    var html = clone.outerHTML;
    html = html.replace(/<!-- SORA_EDIT_START -->[\\s\\S]*?<!-- SORA_EDIT_END -->/, '');
    return '<!DOCTYPE html>' + html;
  }

  function sendUpdate() {
    window.parent.postMessage({ type: 'sora-edit', html: getCleanHTML() }, '*');
  }

  // Setup images
  var images = document.querySelectorAll('img');
  images.forEach(function(img) {
    if (img.closest('.__sora-img-wrap')) return;

    var wrap = document.createElement('div');
    wrap.className = '__sora-img-wrap';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);

    var overlay = document.createElement('div');
    overlay.className = '__sora-img-overlay';
    overlay.innerHTML = cameraSVG;
    wrap.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      targetImg = img;
      fileInput.click();
    });
  });

  fileInput.addEventListener('change', function() {
    if (!fileInput.files || !fileInput.files[0] || !targetImg) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      targetImg.src = e.target.result;
      sendUpdate();
      targetImg = null;
    };
    reader.readAsDataURL(fileInput.files[0]);
    fileInput.value = '';
  });

  // Setup text elements
  var textEls = document.querySelectorAll(TEXT_SELECTORS);
  textEls.forEach(function(el) {
    if (isSoraEl(el)) return;
    if (!hasDirectText(el)) return;
    if (el.closest('.__sora-text-wrap')) return;

    // Make wrapper
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
</script>
<!-- SORA_EDIT_END -->`;

  if (html.includes('</body>')) {
    return html.replace('</body>', editingBlock + '\n</body>');
  }
  return html + editingBlock;
}
