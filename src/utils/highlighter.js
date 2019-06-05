import path from 'path';
const isBrowser = true;
const classifyComponents = true;

function toUpper(_, c) {
  return c ? c.toUpperCase() : '';
}
function basename(filename, ext) {
  return path.basename(
    filename.replace(/^[a-zA-Z]:/, '').replace(/\\/g, '/'),
    ext
  );
}
function inDoc(node) {
  if (!node) return false;
  var doc = node.ownerDocument.documentElement;
  var parent = node.parentNode;
  return (
    doc === node ||
    doc === parent ||
    !!(parent && parent.nodeType === 1 && doc.contains(parent))
  );
}

function cached(fn) {
  const cache = Object.create(null);
  return function cachedFn(str) {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  };
}

var classifyRE = /(?:^|[-_/])(\w)/g;
const classify = cached(str => {
  return str && str.replace(classifyRE, toUpper);
});

function mapNodeRange(node, end, op) {
  var next;
  while (node !== end) {
    next = node.nextSibling;
    op(node);
    node = next;
  }
  op(end);
}
function getComponentName(options) {
  const name = options.name || options._componentTag;
  if (name) {
    return name;
  }
  const file = options.__file; // injected by vue-loader
  if (file) {
    return classify(basename(file, '.vue'));
  }
}

function getInstanceName(instance) {
  const name = getComponentName(instance.$options || instance.fnOptions || {});
  if (name) return name;
  return instance.$root === instance ? 'Root' : 'Anonymous Component';
}

let overlay;
let overlayContent;

function initOverlay() {
  if (overlay || !isBrowser) return;
  overlay = document.createElement('div');
  overlay.style.backgroundColor = 'rgba(104, 182, 255, 0.35)';
  overlay.style.position = 'fixed';
  overlay.style.zIndex = '99999999999999';
  overlay.style.pointerEvents = 'none';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.borderRadius = '3px';
  overlayContent = document.createElement('div');
  overlayContent.style.backgroundColor = 'rgba(104, 182, 255, 0.9)';
  overlayContent.style.fontFamily = 'monospace';
  overlayContent.style.fontSize = '11px';
  overlayContent.style.padding = '2px 3px';
  overlayContent.style.borderRadius = '3px';
  overlayContent.style.color = 'white';
  overlay.appendChild(overlayContent);
}

let selectedOverlay;
let selectedOverlayContent;
function initSelectedOverlay() {
  if (selectedOverlay || !isBrowser) return;
  selectedOverlay = document.createElement('div');
  selectedOverlay.style.backgroundColor = 'rgba(104, 182, 255, 0.35)';
  selectedOverlay.style.position = 'fixed';
  selectedOverlay.style.zIndex = '99999999999999';
  selectedOverlay.style.pointerEvents = 'none';
  selectedOverlay.style.display = 'flex';
  selectedOverlay.style.alignItems = 'center';
  selectedOverlay.style.justifyContent = 'center';
  selectedOverlay.style.borderRadius = '3px';
  selectedOverlayContent = document.createElement('div');
  selectedOverlayContent.style.backgroundColor = 'rgba(104, 182, 255, 0.9)';
  selectedOverlayContent.style.fontFamily = 'monospace';
  selectedOverlayContent.style.fontSize = '11px';
  selectedOverlayContent.style.padding = '2px 3px';
  selectedOverlayContent.style.borderRadius = '3px';
  selectedOverlayContent.style.color = 'white';
  selectedOverlay.appendChild(selectedOverlayContent);
}

/**
 * Highlight an instance.
 *
 * @param {Vue} instance
 */

export function highlight(instance) {
  if (!instance) return;
  const rect = getInstanceOrVnodeRect(instance);

  if (!isBrowser) {
    // TODO: Highlight rect area.
    return;
  }

  initOverlay();
  if (rect) {
    const content = [];
    let name = instance.fnContext
      ? getComponentName(instance.fnOptions)
      : getInstanceName(instance);
    if (classifyComponents) name = classify(name);
    if (name) {
      const pre = document.createElement('span');
      pre.style.opacity = '0.6';
      pre.innerText = '<';
      const text = document.createTextNode(name);
      const post = document.createElement('span');
      post.style.opacity = '0.6';
      post.innerText = '>';
      content.push(pre, text, post);
    }
    showOverlay(overlay, overlayContent, rect, content);
  }
}

export function highlightSelected(instance) {
  if (!instance) return;
  const rect = getInstanceOrVnodeRect(instance);

  if (!isBrowser) {
    return;
  }

  initSelectedOverlay();
  if (rect) {
    const content = [];
    let name = instance.fnContext
      ? getComponentName(instance.fnOptions)
      : getInstanceName(instance);
    console.log(name);
    if (classifyComponents) name = classify(name);
    if (name) {
      const pre = document.createElement('span');
      pre.style.opacity = '0.6';
      pre.innerText = '<';
      const text = document.createTextNode(name);
      const post = document.createElement('span');
      post.style.opacity = '0.6';
      post.innerText = '>';
      content.push(pre, text, post);
    }
    showOverlay(selectedOverlay, selectedOverlayContent, rect, content);
  }
}
/**
 * Remove highlight overlay.
 */

export function unHighlight() {
  if (overlay && overlay.parentNode) {
    document.body.removeChild(overlay);
  }
}

/**
 * Get the client rect for an instance.
 *
 * @param {Vue|Vnode} instance
 * @return {Object}
 */

export function getInstanceOrVnodeRect(instance) {
  const el = instance.$el || instance.elm;
  if (!isBrowser) {
    // TODO: Find position from instance or a vnode (for functional components).

    return;
  }
  if (!inDoc(el)) {
    return;
  }
  if (instance._isFragment) {
    return getFragmentRect(instance);
  } else if (el.nodeType === 1) {
    return el.getBoundingClientRect();
  }
}

/**
 * Highlight a fragment instance.
 * Loop over its node range and determine its bounding box.
 *
 * @param {Vue} instance
 * @return {Object}
 */

function getFragmentRect({ _fragmentStart, _fragmentEnd }) {
  let top, bottom, left, right;
  mapNodeRange(_fragmentStart, _fragmentEnd, function(node) {
    let rect;
    if (node.nodeType === 1 || node.getBoundingClientRect) {
      rect = node.getBoundingClientRect();
    } else if (node.nodeType === 3 && node.data.trim()) {
      rect = getTextRect(node);
    }
    if (rect) {
      if (!top || rect.top < top) {
        top = rect.top;
      }
      if (!bottom || rect.bottom > bottom) {
        bottom = rect.bottom;
      }
      if (!left || rect.left < left) {
        left = rect.left;
      }
      if (!right || rect.right > right) {
        right = rect.right;
      }
    }
  });
  return {
    top,
    left,
    width: right - left,
    height: bottom - top
  };
}

let range;
/**
 * Get the bounding rect for a text node using a Range.
 *
 * @param {Text} node
 * @return {Rect}
 */
function getTextRect(node) {
  if (!isBrowser) return;
  if (!range) range = document.createRange();

  range.selectNode(node);

  return range.getBoundingClientRect();
}

/**
 * Display the overlay with given rect.
 *
 * @param {Rect}
 */

function showOverlay(
  overlay,
  overlayContent,
  { width = 0, height = 0, top = 0, left = 0 },
  content = []
) {
  if (!isBrowser) return;

  overlay.style.width = ~~width + 'px';
  overlay.style.height = ~~height + 'px';
  overlay.style.top = ~~top + 'px';
  overlay.style.left = ~~left + 'px';

  overlayContent.innerHTML = '';
  content.forEach(child => overlayContent.appendChild(child));

  document.body.appendChild(overlay);
}
