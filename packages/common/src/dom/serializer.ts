import { DOMSnapshot, ClickedElementInfo, CaptureOptions } from '../types/snapshot';
import { TargetCoordinates } from '../types/demo';

/**
 * Generate a unique and clean CSS selector for a DOM element.
 * GUARANTEES: Never returns 'body' or 'html' for elements that are children
 * of body. Uses a data-attribute last-resort to ensure uniqueness.
 */
export function generateCssSelector(element: Element): string {
  if (!(element instanceof Element)) return '';

  const doc = element.ownerDocument || document;

  if (element === doc.body) return 'body';
  if (element === doc.documentElement) return 'html';

  // Helper: validate a candidate selector resolves back to the original element
  const validates = (sel: string): boolean => {
    try {
      const matches = doc.querySelectorAll(sel);
      return matches.length === 1 && matches[0] === element;
    } catch {
      return false;
    }
  };

  // Helper: check if selector is syntactically valid and matches exactly 1 element
  const isUnique = (sel: string): boolean => {
    try {
      return doc.querySelectorAll(sel).length === 1;
    } catch {
      return false;
    }
  };

  // --- Strategy 1: Unique ID ---
  if (
    element.id &&
    !element.id.match(/^\d/) &&
    !element.id.includes(':') &&
    !element.id.includes(' ') &&
    !element.id.includes('/')
  ) {
    const idSelector = `#${CSS.escape(element.id)}`;
    if (validates(idSelector)) return idSelector;
  }

  // --- Strategy 2: Check for existing data-navigate-uid (previously tagged) ---
  const existingUid = element.getAttribute('data-navigate-uid');
  if (existingUid) {
    const uidSelector = `[data-navigate-uid="${CSS.escape(existingUid)}"]`;
    if (validates(uidSelector)) return uidSelector;
  }

  // --- Strategy 3: Unique semantic / test attributes ---
  const testAttrs = [
    'data-testid', 'data-test', 'data-cy', 'data-qa',
    'aria-label', 'name', 'role', 'placeholder', 'type', 'href'
  ];
  for (const attr of testAttrs) {
    const val = element.getAttribute(attr);
    if (val && val.length < 60) {
      const tag = element.tagName.toLowerCase();
      const attrSelector = `${tag}[${attr}="${CSS.escape(val)}"]`;
      if (validates(attrSelector)) return attrSelector;
      const generalAttrSelector = `[${attr}="${CSS.escape(val)}"]`;
      if (validates(generalAttrSelector)) return generalAttrSelector;
    }
  }

  // --- Strategy 4: Class combinations ---
  const tagName = element.tagName.toLowerCase();
  if (element.classList.length > 0) {
    const validClasses = Array.from(element.classList).filter(
      (c) =>
        !c.match(/^(active|focus|hover|selected|is-|has-|_|tour-|navigate-)/i) &&
        !c.includes(':') &&
        !c.includes('/') &&
        !c.includes('[') &&
        c.length < 35
    );
    if (validClasses.length > 0) {
      // Try single class
      for (const c of validClasses) {
        const singleClass = `${tagName}.${CSS.escape(c)}`;
        if (validates(singleClass)) return singleClass;
      }
      // Try combination of all valid classes
      const classSelector = `${tagName}.${validClasses.map((c) => CSS.escape(c)).join('.')}`;
      if (validates(classSelector)) return classSelector;
    }
  }

  // --- Strategy 5: Build hierarchical path stopping at doc.body ---
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE && current !== doc.body && current !== doc.documentElement) {
    let selector = current.tagName.toLowerCase();

    // If this ancestor has a unique ID, anchor from here
    if (current.id && !current.id.match(/^\d/) && !current.id.includes(':') && !current.id.includes(' ')) {
      const idSel = `#${CSS.escape(current.id)}`;
      if (isUnique(idSel)) {
        path.unshift(idSel);
        break;
      }
    }

    // Try using primary class if present
    const validClasses = Array.from(current.classList).filter(
      (c) => !c.match(/^(active|focus|hover|selected|is-|has-|_|tour-|navigate-)/i) && !c.includes(':') && c.length < 30
    );
    if (validClasses.length > 0) {
      selector += `.${CSS.escape(validClasses[0])}`;
    }

    // Determine nth-of-type sibling index
    let siblingIndex = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName.toLowerCase() === current.tagName.toLowerCase()) {
        siblingIndex++;
      }
      sibling = sibling.previousElementSibling;
    }

    // Check if there are other siblings with the same tag
    let nextSibling = current.nextElementSibling;
    let hasSiblings = siblingIndex > 1;
    while (nextSibling && !hasSiblings) {
      if (nextSibling.tagName.toLowerCase() === current.tagName.toLowerCase()) {
        hasSiblings = true;
      }
      nextSibling = nextSibling.nextElementSibling;
    }

    if (hasSiblings) {
      selector += `:nth-of-type(${siblingIndex})`;
    }

    path.unshift(selector);

    // Test if current partial path is already unique and resolves to original element
    const candidatePath = path.join(' > ');
    if (validates(candidatePath)) return candidatePath;

    current = current.parentElement;
  }

  // If hierarchical path found something, validate it
  if (path.length > 0) {
    const hierarchical = path.join(' > ');
    if (validates(hierarchical)) return hierarchical;
  }

  // --- Strategy 6 (LAST RESORT): Tag element with a unique data attribute ---
  // This guarantees we ALWAYS have a unique selector, even for deeply nested
  // elements in complex React apps with no IDs, classes, or unique attributes.
  const uid = `nv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  (element as HTMLElement).setAttribute('data-navigate-uid', uid);
  return `[data-navigate-uid="${uid}"]`;
}

/**
 * Generate XPath for an element as a fallback locator
 */
export function generateXPath(element: Element): string {
  if (element.id !== '') {
    return `//*[@id="${element.id}"]`;
  }
  if (element === document.body) {
    return '/html/body';
  }

  let index = 0;
  const siblings = element.parentNode ? Array.from(element.parentNode.children) : [];
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === element) {
      const parentXPath = element.parentNode && element.parentNode.nodeType === Node.ELEMENT_NODE
        ? generateXPath(element.parentNode as Element)
        : '';
      return `${parentXPath}/${element.tagName.toLowerCase()}[${index + 1}]`;
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      index++;
    }
  }
  return '';
}

/**
 * Extract element bounding box relative to page document
 */
export function getElementCoordinates(element: Element): TargetCoordinates {
  const rect = element.getBoundingClientRect();
  const doc = element.ownerDocument || document;
  const win = doc.defaultView || window;
  const scrollX = win.scrollX || win.pageXOffset || 0;
  const scrollY = win.scrollY || win.pageYOffset || 0;

  return {
    x: Math.round(rect.left + scrollX),
    y: Math.round(rect.top + scrollY),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    scrollX: Math.round(scrollX),
    scrollY: Math.round(scrollY)
  };
}

/**
 * Collect all active stylesheets and CSS rules from the document.
 * Cross-origin stylesheets that throw CORS errors are recorded as external URLs
 * so the rehydrator can proxy-fetch and inline them in sandboxed iframes.
 */
export function collectDocumentStyles(): { styles: string[]; externalStylesheetUrls: string[] } {
  const styles: string[] = [];
  const externalStylesheetUrls: string[] = [];

  // Collect style tags
  const styleElements = document.querySelectorAll('style');
  styleElements.forEach((style) => {
    if (style.textContent) {
      styles.push(style.textContent);
    }
  });

  // Collect CSSStyleSheets
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        if (sheet.cssRules) {
          const rules: string[] = [];
          for (let j = 0; j < sheet.cssRules.length; j++) {
            rules.push(sheet.cssRules[j].cssText);
          }
          styles.push(rules.join('\n'));
        }
      } catch {
        // Cross-origin stylesheet — record the URL for proxy-fetch during rehydration
        if (sheet.href) {
          externalStylesheetUrls.push(sheet.href);
        }
      }
    }
  } catch {
    // Style parsing fallback
  }

  // Also scan <link rel="stylesheet"> tags in case they weren't in document.styleSheets
  const linkEls = document.querySelectorAll('link[rel="stylesheet"]');
  linkEls.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('http') && !externalStylesheetUrls.includes(href)) {
      // Check if we already captured its rules
      const alreadyCaptured = Array.from(document.styleSheets).some((sheet) => {
        if (sheet.href === href) {
          try { return sheet.cssRules && sheet.cssRules.length > 0; } catch { return false; }
        }
        return false;
      });
      if (!alreadyCaptured) {
        externalStylesheetUrls.push(href);
      }
    }
  });

  return { styles, externalStylesheetUrls };
}

/**
 * Serialize the active DOM into a clean, rehydratable snapshot string
 */
export function serializeDOM(options: CaptureOptions = {}): { html: string; styles: string[]; externalStylesheetUrls: string[] } {
  const docClone = document.documentElement.cloneNode(true) as HTMLElement;

  // 0. Remove NAVIGATE extension recording widgets & floating overlays
  const recorderWidgets = docClone.querySelectorAll(
    '#navigate-tour-recorder-widget, [id^="navigate-tour"], [id^="navigate-recorder"], #navigate-step-badge, #navigate-capture-now-btn, #navigate-finish-btn'
  );
  recorderWidgets.forEach((el) => el.remove());

  // 1. Remove all script tags, modulepreloads, preloads, and prefetches
  if (options.cleanScripts !== false) {
    const scriptsAndPreloads = docClone.querySelectorAll(
      'script, noscript, link[rel="modulepreload"], link[rel="preload"], link[rel="prefetch"], link[rel="prerender"], link[rel="dns-prefetch"]'
    );
    scriptsAndPreloads.forEach((el) => el.remove());
  }

  // 2. Preserve form control values in attributes
  const originalInputs = document.querySelectorAll('input, textarea, select');
  const clonedInputs = docClone.querySelectorAll('input, textarea, select');

  originalInputs.forEach((orig, idx) => {
    const clone = clonedInputs[idx];
    if (!clone) return;

    if (orig instanceof HTMLInputElement) {
      if (orig.type === 'checkbox' || orig.type === 'radio') {
        if (orig.checked) clone.setAttribute('checked', 'checked');
        else clone.removeAttribute('checked');
      } else {
        clone.setAttribute('value', orig.value);
      }
    } else if (orig instanceof HTMLTextAreaElement) {
      clone.textContent = orig.value;
    } else if (orig instanceof HTMLSelectElement) {
      clone.setAttribute('value', orig.value);
    }
  });

  // 3. Inline images as data URLs with intelligent downscaling and 500KB per-snapshot budget
  let totalInlinedImageBytes = 0;
  const MAX_INLINED_IMAGE_BUDGET = 500 * 1024; // 500 KB aggregate limit per snapshot
  const originalImages = document.querySelectorAll('img');
  const clonedImages = docClone.querySelectorAll('img');

  originalImages.forEach((orig, idx) => {
    const clone = clonedImages[idx];
    if (!clone) return;

    if (
      orig.src &&
      orig.naturalWidth > 0 &&
      orig.naturalHeight > 0 &&
      totalInlinedImageBytes < MAX_INLINED_IMAGE_BUDGET
    ) {
      try {
        // Limit max dimensions to 800px maintaining aspect ratio
        const maxDim = 800;
        let w = orig.naturalWidth;
        let h = orig.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(orig, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/webp', 0.82) || canvas.toDataURL('image/png');
          if (dataUrl && dataUrl.startsWith('data:image') && dataUrl.length < 150 * 1024) {
            clone.setAttribute('src', dataUrl);
            clone.removeAttribute('srcset');
            clone.removeAttribute('loading');
            totalInlinedImageBytes += dataUrl.length;
          }
        }
      } catch {
        // Cross-origin tainted canvas fallback: preserve absolute URL
      }
    }
  });

  // 4. Inline canvas elements as image data URLs
  if (options.captureCanvas !== false) {
    const originalCanvases = document.querySelectorAll('canvas');
    const clonedCanvases = docClone.querySelectorAll('canvas');
    originalCanvases.forEach((canvas, idx) => {
      const clone = clonedCanvases[idx];
      if (!clone) return;
      try {
        const dataUrl = canvas.toDataURL();
        const img = document.createElement('img');
        img.src = dataUrl;
        img.className = canvas.className;
        img.setAttribute('style', canvas.getAttribute('style') || '');
        clone.replaceWith(img);
      } catch {
        // Tainted canvas fallback
      }
    });
  }

  // 5. Strip aggressive Content-Security-Policy meta tags from original doc
  const metaCSPs = docClone.querySelectorAll('meta[http-equiv="Content-Security-Policy"], meta[http-equiv="content-security-policy"]');
  metaCSPs.forEach((el) => el.remove());

  // 6. Resolve any remaining relative URLs (images, links, svgs) to absolute URLs
  const baseHref = window.location.origin;
  const elementsWithSrc = docClone.querySelectorAll('[src]');
  elementsWithSrc.forEach((el) => {
    const src = el.getAttribute('src');
    if (src && !src.startsWith('data:') && !src.startsWith('http') && !src.startsWith('//')) {
      try {
        el.setAttribute('src', new URL(src, baseHref).href);
      } catch {}
    }
  });

  const elementsWithSrcset = docClone.querySelectorAll('[srcset]');
  elementsWithSrcset.forEach((el) => {
    const srcset = el.getAttribute('srcset');
    if (srcset) {
      try {
        const absoluteSrcset = srcset.split(',').map(part => {
          const [url, descriptor] = part.trim().split(/\s+/);
          if (url && !url.startsWith('data:') && !url.startsWith('http') && !url.startsWith('//')) {
            return `${new URL(url, baseHref).href} ${descriptor || ''}`.trim();
          }
          return part;
        }).join(', ');
        el.setAttribute('srcset', absoluteSrcset);
      } catch {}
    }
  });

  // Capture standard hrefs as well as SVG <use href> and <use xlink:href>
  const elementsWithHref = docClone.querySelectorAll('a[href], use[href], use[*|href]');
  elementsWithHref.forEach((el) => {
    const href = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (href && !href.startsWith('data:') && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#')) {
      try {
        const absUrl = new URL(href, baseHref).href;
        if (el.hasAttribute('href')) el.setAttribute('href', absUrl);
        if (el.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
          el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', absUrl);
        }
      } catch {}
    }
  });

  // 7. Collect all stylesheet rules into snapshot.styles
  const { styles, externalStylesheetUrls } = collectDocumentStyles();

  // 8. Remove remote stylesheet link tags from cloned HTML since they are already fully inlined
  // This prevents CORS network errors in the sandboxed iframe and makes the clone truly offline.
  const remoteCssLinks = docClone.querySelectorAll('link[rel="stylesheet"]');
  remoteCssLinks.forEach((link) => {
    const href = link.getAttribute('href') || '';
    // Preserve only standard Google Fonts / Material Icons if present
    if (!href.includes('fonts.googleapis.com') && !href.includes('cdnjs.cloudflare.com')) {
      link.remove();
    }
  });

  const html = '<!DOCTYPE html>\n' + docClone.outerHTML;

  return { html, styles, externalStylesheetUrls };
}

/**
 * Capture full DOM snapshot along with optional target element metadata
 */
export function captureDOMSnapshot(
  targetElement?: Element | null,
  clickCoordinates?: { x: number; y: number },
  options: CaptureOptions = {}
): DOMSnapshot {
  const { html, styles, externalStylesheetUrls } = serializeDOM(options);

  let clickedElement: ClickedElementInfo | undefined = undefined;

  if (targetElement && targetElement instanceof Element) {
    const selector = generateCssSelector(targetElement);
    const xpath = generateXPath(targetElement);
    const rect = getElementCoordinates(targetElement);

    const attributes: Record<string, string> = {};
    for (let i = 0; i < targetElement.attributes.length; i++) {
      const attr = targetElement.attributes[i];
      attributes[attr.name] = attr.value;
    }

    clickedElement = {
      tagName: targetElement.tagName.toLowerCase(),
      id: targetElement.id || undefined,
      className: targetElement.className || undefined,
      selector,
      xpath,
      text: (targetElement.textContent || '').trim().substring(0, 100),
      rect,
      attributes
    };
  }

  return {
    id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    url: window.location.href,
    title: document.title || 'Captured Step',
    html,
    styles,
    externalStylesheets: externalStylesheetUrls.length > 0 ? externalStylesheetUrls : undefined,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX || 0,
      scrollY: window.scrollY || 0
    },
    capturedAt: Date.now(),
    clickCoordinates,
    clickedElement
  };
}
