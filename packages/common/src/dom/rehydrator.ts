import { DOMSnapshot, RehydrationOptions } from '../types/snapshot';
import { TargetCoordinates, HotspotPlacement, DOMModification, InputAction } from '../types/demo';

/**
 * Rehydrate a captured DOM snapshot inside a sandboxed iframe
 */
export function rehydrateIframeSnapshot(
  iframe: HTMLIFrameElement,
  snapshot: DOMSnapshot,
  options: RehydrationOptions = {}
): Promise<Document> {
  return new Promise((resolve, reject) => {
    try {
      let doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        iframe.onload = () => {
          doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc) {
            populateIframe(doc, snapshot, options);
            resolve(doc);
          } else {
            reject(new Error('Unable to access iframe document.'));
          }
        };
        iframe.src = 'about:blank';
        return;
      }

      populateIframe(doc, snapshot, options);
      resolve(doc);
    } catch (err) {
      reject(err);
    }
  });
}

function sanitizeSnapshotHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  let clean = rawHtml;

  // 1. Strip all scripts and noscript tags completely (multi-line, any attributes)
  clean = clean.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<script\b[^>]*\/?>/gi, '');
  clean = clean.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
  clean = clean.replace(/<noscript\b[^>]*\/?>/gi, '');

  // 2. Strip modulepreload, preload, prefetch, prerender, dns-prefetch, and manifest links
  clean = clean.replace(/<link\b[^>]*\brel=["'](?:manifest|modulepreload|preload|prefetch|prerender|dns-prefetch|apple-touch-icon)["'][^>]*>/gi, '');

  // 3. Strip tracking & ad pixel images (e.g. Twitter adsct, t.co, Google Analytics, Facebook pixels)
  clean = clean.replace(/<img\b[^>]*\bsrc=["'][^"']*(?:adsct|analytics\.twitter|t\.co\/i|facebook\.com\/tr|google-analytics|doubleclick|clarity\.ms|hotjar)[^"']*["'][^>]*\/?>/gi, '');

  // 4. Strip all inline DOM event handlers (onload, onerror, onclick, onmouseover, onfocus, etc.)
  clean = clean.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 5. Strip non-CDN external stylesheet links (since rules are inlined via snapshot.styles)
  clean = clean.replace(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi, (match) => {
    if (match.includes('fonts.googleapis.com') || match.includes('cdnjs.cloudflare.com')) {
      return match;
    }
    return '';
  });

  return clean;
}

function populateIframe(doc: Document, snapshot: DOMSnapshot, options: RehydrationOptions) {
  const sanitizedHtml = sanitizeSnapshotHtml(snapshot.html);
  doc.open();
  doc.write(sanitizedHtml);
  doc.close();

  // 0. Remove any NAVIGATE recorder widget artifacts or lingering scripts/pixels
  try {
    const unwanted = doc.querySelectorAll(
      '#navigate-tour-recorder-widget, [id^="navigate-tour-recorder"], [id^="navigate-recorder"], #navigate-step-badge, #navigate-capture-now-btn, #navigate-finish-btn, .navigate-recorder-ui, script, noscript, link[rel="manifest"]'
    );
    unwanted.forEach((el) => el.remove());

    // Clean any remaining on* event handlers from all elements in the rehydrated document
    const allEls = doc.querySelectorAll('*');
    allEls.forEach((el) => {
      const attrs = el.getAttributeNames();
      for (const attr of attrs) {
        if (attr.toLowerCase().startsWith('on')) {
          el.removeAttribute(attr);
        }
      }
    });
  } catch {}

  // Inject styles collected during capture if not already inside HTML
  if (snapshot.styles && snapshot.styles.length > 0) {
    const head = doc.head || doc.getElementsByTagName('head')[0] || doc.documentElement;
    const styleEl = doc.createElement('style');
    styleEl.setAttribute('data-tour-injected', 'true');
    styleEl.textContent = snapshot.styles.join('\n');
    head.appendChild(styleEl);
  }

  // Inject <base> tag to ensure any un-serialized relative URLs (like CSS background-images)
  // correctly resolve to the original site instead of the studio/player origin.
  if (snapshot.url) {
    const head = doc.head || doc.getElementsByTagName('head')[0] || doc.documentElement;
    // Check if base tag already exists, otherwise add it
    if (!doc.querySelector('base')) {
      const baseEl = doc.createElement('base');
      baseEl.href = new URL('/', snapshot.url).href; // Root of the captured URL
      head.insertBefore(baseEl, head.firstChild);
    }
  }

  // Proxy-fetch and inject external stylesheets (Google Fonts, Material Icons, Font Awesome, etc.)
  // The parent page has network access; the sandboxed iframe does not.
  injectExternalStylesheets(doc, snapshot.externalStylesheets || []);

  // Inject sandbox helper stylesheet (disables cursor pointers for native links if needed, prevents navigation)
  const helperStyle = doc.createElement('style');
  helperStyle.setAttribute('data-tour-sandbox-helper', 'true');
  helperStyle.textContent = `
    /* Prevent iframe link navigation and form submission */
    a, button, input, select, textarea {
      -webkit-user-drag: none;
    }
    html, body {
      overflow: auto !important;
      scroll-behavior: smooth;
    }
    .tour-element-hovered {
      outline: 2px dashed #3b82f6 !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
    }
    .tour-element-active-target {
      outline: 3px solid #6366f1 !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.25) !important;
    }
    .navigate-blurred, [data-navigate-blurred="true"], .tour-element-blurred {
      filter: blur(8px) !important;
      -webkit-filter: blur(8px) !important;
      user-select: none !important;
      pointer-events: none !important;
      opacity: 0.75 !important;
    }
    .navigate-hidden, [data-navigate-hidden="true"], .tour-element-hidden {
      display: none !important;
      visibility: hidden !important;
    }
  `;
  (doc.head || doc.documentElement).appendChild(helperStyle);

  // Apply DOM Modifications (Privacy Blurring, Hiding, and Live Text Rewriting)
  if (options.modifications && options.modifications.length > 0) {
    applyDOMModifications(doc, options.modifications);
  }

  // Disable all native link navigations, button actions, and form submissions inside the iframe
  // Note: We use preventDefault() to stop navigation, but do NOT stopPropagation()
  // so that studio inspector click listeners and player step handlers can still receive the event.
  if (options.disableNavigation !== false) {
    doc.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement;
        const interactiveEl = target?.closest ? target.closest('a, button, input[type="submit"], input[type="button"]') : null;
        if (interactiveEl) {
          e.preventDefault();
        }
      },
      true
    );

    doc.addEventListener(
      'submit',
      (e) => {
        e.preventDefault();
      },
      true
    );
  }

  // Scroll to recorded position
  if (snapshot.viewport) {
    doc.defaultView?.scrollTo(
      snapshot.viewport.scrollX || 0,
      snapshot.viewport.scrollY || 0
    );
  }
}

/**
 * Proxy-fetch external stylesheets from the parent window and inject them as inline
 * <style> blocks in the sandboxed iframe document. This resolves CORS-blocked CDN fonts
 * (Google Material Icons, Google Fonts, Font Awesome) that fail to load in sandboxed iframes.
 */
function injectExternalStylesheets(doc: Document, urls: string[]) {
  const head = doc.head || doc.documentElement;

  // 1. Unconditionally inject official Google Font stylesheets and CDN icons
  const cdnFontLinks = [
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block',
    'https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined|Material+Icons+Round|Material+Icons+Sharp&display=block',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
  ];

  cdnFontLinks.forEach((href) => {
    if (!doc.querySelector(`link[href="${href}"]`)) {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.crossOrigin = 'anonymous';
      head.appendChild(link);
    }
  });

  // 2. Inject global high-specificity CSS rules to ensure ligatures convert text -> icon
  const materialIconsStyle = doc.createElement('style');
  materialIconsStyle.setAttribute('data-tour-material-symbols-fix', 'true');
  materialIconsStyle.textContent = `
    .material-symbols-outlined,
    .material-symbols-outline,
    [class*="material-symbols-outlined"],
    [class*="material-symbols-outline"] {
      font-family: 'Material Symbols Outlined', 'Material Icons', sans-serif !important;
      font-weight: normal !important;
      font-style: normal !important;
      font-size: inherit;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      font-feature-settings: 'liga';
    }
    .material-symbols-rounded,
    [class*="material-symbols-rounded"] {
      font-family: 'Material Symbols Rounded', 'Material Icons', sans-serif !important;
      font-weight: normal !important;
      font-style: normal !important;
      font-size: inherit;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      font-feature-settings: 'liga';
    }
    .material-icons,
    .material-icons-outlined,
    .material-icons-round,
    .material-icons-sharp,
    [class*="material-icons"] {
      font-family: 'Material Icons', 'Material Symbols Outlined', sans-serif !important;
      font-weight: normal !important;
      font-style: normal !important;
      font-size: inherit;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      font-feature-settings: 'liga';
    }
  `;
  head.appendChild(materialIconsStyle);

  // 3. Proxy-fetch standard public CDN icon/font stylesheet URLs
  const cdnUrls = urls.filter(
    (url) =>
      url.includes('fonts.googleapis.com') ||
      url.includes('cdnjs.cloudflare.com') ||
      url.includes('cdn.jsdelivr.net') ||
      url.includes('unpkg.com')
  );

  for (const url of cdnUrls) {
    if (doc.querySelector(`link[href="${url}"], style[data-tour-external-proxy="${url}"]`)) {
      continue;
    }
    fetch(url, { mode: 'cors' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((cssText) => {
        const styleEl = doc.createElement('style');
        styleEl.setAttribute('data-tour-external-proxy', url);
        styleEl.textContent = cssText;
        head.appendChild(styleEl);
      })
      .catch(() => {
        // Fallback for public CDN links
        const linkEl = doc.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = url;
        linkEl.crossOrigin = 'anonymous';
        linkEl.setAttribute('data-tour-external-fallback', 'true');
        head.appendChild(linkEl);
      });
  }
}

/**
 * Apply privacy blurring, hiding, and text rewrites to the live iframe document
 */
export function applyDOMModifications(doc: Document, modifications: DOMModification[]) {
  if (!doc) return;

  // 0. Clean up any previously applied inline styles so the DOM returns to normal
  doc.querySelectorAll('.navigate-blurred').forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.classList.remove('navigate-blurred');
    htmlEl.removeAttribute('data-navigate-blurred');
    htmlEl.style.removeProperty('filter');
    htmlEl.style.removeProperty('-webkit-filter');
    htmlEl.style.removeProperty('user-select');
    htmlEl.style.removeProperty('pointer-events');
    htmlEl.style.removeProperty('opacity');
    htmlEl.style.removeProperty('display'); // inline-block fix removal
  });

  doc.querySelectorAll('.navigate-hidden').forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.classList.remove('navigate-hidden');
    htmlEl.removeAttribute('data-navigate-hidden');
    htmlEl.style.removeProperty('display');
    htmlEl.style.removeProperty('visibility');
  });

  doc.querySelectorAll('.navigate-text-replaced').forEach((el) => {
    const htmlEl = el as HTMLElement;
    const originalText = htmlEl.getAttribute('data-original-text');
    if (originalText !== null) {
      htmlEl.textContent = originalText;
      if ('value' in htmlEl) {
        (htmlEl as HTMLInputElement).value = originalText;
      }
    }
    htmlEl.classList.remove('navigate-text-replaced');
    htmlEl.removeAttribute('data-original-text');
  });

  if (!modifications || modifications.length === 0) {
    const styleEl = doc.getElementById('navigate-privacy-modifications');
    if (styleEl) styleEl.textContent = '';
    return;
  }

  // 1. Inject or update dedicated style tag for high-specificity CSS rules
  let styleEl = doc.getElementById('navigate-privacy-modifications') as HTMLStyleElement;
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = 'navigate-privacy-modifications';
    (doc.head || doc.documentElement).appendChild(styleEl);
  }

  let cssRules = `
    .navigate-blurred, [data-navigate-blurred="true"] {
      filter: blur(8px) !important;
      -webkit-filter: blur(8px) !important;
      user-select: none !important;
      pointer-events: none !important;
      opacity: 0.75 !important;
    }
    .navigate-hidden, [data-navigate-hidden="true"] {
      display: none !important;
      visibility: hidden !important;
    }
  `;

  // 2. Apply modifications to matching elements
  for (const mod of modifications) {
    if (!mod.selector) continue;
    // GUARD: Never apply privacy rules to body/html — this would blur/hide the entire page
    if (mod.selector === 'body' || mod.selector === 'html') continue;

    try {
      // Build CSS rules for blur and hide
      if (mod.type === 'blur') {
        // Escape the selector for CSS injection safety
        cssRules += `\n${mod.selector} { filter: blur(8px) !important; -webkit-filter: blur(8px) !important; user-select: none !important; opacity: 0.75 !important; pointer-events: none !important; }`;
      } else if (mod.type === 'hide') {
        cssRules += `\n${mod.selector} { display: none !important; visibility: hidden !important; }`;
      }

      let elements = doc.querySelectorAll(mod.selector);

      // If direct selector didn't find elements, try progressive sub-path fallback
      if (elements.length === 0 && mod.selector.includes(' > ')) {
        const parts = mod.selector.split(' > ');
        // Try progressively shorter suffixes (deepest first)
        for (let i = 1; i < parts.length && elements.length === 0; i++) {
          const sub = parts.slice(i).join(' > ');
          try {
            const found = doc.querySelectorAll(sub);
            if (found.length > 0) elements = found;
          } catch {}
        }
      }

      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        // Skip body/html even if selector somehow matched them
        if (htmlEl === doc.body || htmlEl === doc.documentElement) return;

        if (mod.type === 'blur') {
          htmlEl.classList.add('navigate-blurred');
          htmlEl.setAttribute('data-navigate-blurred', 'true');
          htmlEl.style.setProperty('filter', 'blur(8px)', 'important');
          htmlEl.style.setProperty('-webkit-filter', 'blur(8px)', 'important');
          htmlEl.style.setProperty('user-select', 'none', 'important');
          htmlEl.style.setProperty('pointer-events', 'none', 'important');
          htmlEl.style.setProperty('opacity', '0.7', 'important');

          const computedDisplay = doc.defaultView?.getComputedStyle(htmlEl).display;
          if (computedDisplay === 'inline') {
            htmlEl.style.setProperty('display', 'inline-block', 'important');
          }
        } else if (mod.type === 'hide') {
          htmlEl.classList.add('navigate-hidden');
          htmlEl.setAttribute('data-navigate-hidden', 'true');
          htmlEl.style.setProperty('display', 'none', 'important');
          htmlEl.style.setProperty('visibility', 'hidden', 'important');
        } else if (mod.type === 'replaceText' && mod.value !== undefined) {
          htmlEl.classList.add('navigate-text-replaced');
          if (!htmlEl.hasAttribute('data-original-text')) {
            htmlEl.setAttribute('data-original-text', htmlEl.textContent || ('value' in htmlEl ? (htmlEl as HTMLInputElement).value : ''));
          }
          htmlEl.textContent = mod.value;
          if ('value' in htmlEl) {
            (htmlEl as HTMLInputElement).value = mod.value;
          }
        }
      });
    } catch (e) {
      console.warn('Selector evaluation notice for modification:', mod.selector, e);
    }
  }

  styleEl.textContent = cssRules;
}

/**
 * Realistically simulate animated character-by-character typing into an input/textarea element
 */
export function simulateTypingInElement(
  inputEl: HTMLInputElement | HTMLTextAreaElement,
  textToType: string,
  speedMs = 45,
  onComplete?: () => void
): () => void {
  if (!inputEl) return () => {};

  inputEl.focus();

  // Obtain native prototype setter so React/Vue controlled components catch value changes
  const win = inputEl.ownerDocument?.defaultView || window;
  const proto = inputEl instanceof (win.HTMLTextAreaElement || HTMLTextAreaElement)
    ? (win.HTMLTextAreaElement || HTMLTextAreaElement).prototype
    : (win.HTMLInputElement || HTMLInputElement).prototype;
  const nativeValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

  const setInputValue = (val: string) => {
    if (nativeValueSetter) {
      nativeValueSetter.call(inputEl, val);
    } else {
      inputEl.value = val;
    }
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  };

  setInputValue('');
  let currentIndex = 0;
  let isCancelled = false;

  const interval = setInterval(() => {
    if (isCancelled) {
      clearInterval(interval);
      return;
    }

    if (currentIndex < textToType.length) {
      const nextText = textToType.slice(0, currentIndex + 1);
      setInputValue(nextText);
      currentIndex++;
    } else {
      clearInterval(interval);
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      if (onComplete) onComplete();
    }
  }, speedMs);

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
}

/**
 * Locate target element inside iframe document via CSS selector, XPath, or Coordinates
 */
export function findElementInSnapshot(
  iframeDoc: Document,
  selector?: string,
  coordinates?: TargetCoordinates
): Element | null {
  if (!iframeDoc) return null;

  // 1. Try CSS Selector (exact match)
  if (selector && selector.trim() && selector !== 'body' && selector !== 'html') {
    try {
      const el = iframeDoc.querySelector(selector);
      if (el && el !== iframeDoc.body && el !== iframeDoc.documentElement) return el;
    } catch {
      // Invalid selector syntax — fall through
    }

    // Fallback A: If selector is hierarchical, try progressively shorter sub-paths
    if (selector.includes(' > ')) {
      const parts = selector.split(' > ');
      // Try from the deepest element upward
      for (let i = 1; i < parts.length; i++) {
        const sub = parts.slice(i).join(' > ');
        try {
          const el = iframeDoc.querySelector(sub);
          if (el && el !== iframeDoc.body && el !== iframeDoc.documentElement) return el;
        } catch {}
      }
    }

    // Fallback B: If it's a data-navigate-uid selector, the attribute may be present
    if (selector.startsWith('[data-navigate-uid=')) {
      try {
        const el = iframeDoc.querySelector(selector);
        if (el) return el;
      } catch {}
    }
  }

  // 2. Try Coordinates — use the element's saved position, NOT center-of-body
  if (coordinates && coordinates.x !== undefined && coordinates.y !== undefined) {
    try {
      const win = iframeDoc.defaultView || window;
      const scrollX = win.scrollX || 0;
      const scrollY = win.scrollY || 0;

      // The coordinates store the element's page-absolute position.
      // Convert to viewport-relative for elementFromPoint.
      // Try multiple points within the bounding box for reliability.
      const halfW = (coordinates.width || 0) / 2;
      const halfH = (coordinates.height || 0) / 2;

      const probePoints = [
        // Center of saved bounding box
        { cx: coordinates.x + halfW - scrollX, cy: coordinates.y + halfH - scrollY },
        // Top-left quadrant
        { cx: coordinates.x + halfW * 0.25 - scrollX, cy: coordinates.y + halfH * 0.25 - scrollY },
        // Bottom-right quadrant
        { cx: coordinates.x + halfW * 1.5 - scrollX, cy: coordinates.y + halfH * 1.5 - scrollY },
      ];

      for (const { cx, cy } of probePoints) {
        if (cx < 0 || cy < 0) continue;
        const el = iframeDoc.elementFromPoint(cx, cy);
        if (el && el !== iframeDoc.documentElement && el !== iframeDoc.body) {
          return el;
        }
      }
    } catch {
      // Coordinate fallback failed
    }
  }

  return null;
}

/**
 * Calculate tooltip placement position relative to container
 */
export interface TooltipPosition {
  top: number;
  left: number;
  arrowPlacement: HotspotPlacement;
  arrowOffset?: number;
}

export function computeTooltipPosition(
  targetRect: { top: number; left: number; width: number; height: number; right: number; bottom: number },
  containerRect: { width: number; height: number },
  preferredPlacement: HotspotPlacement = 'bottom',
  tooltipSize = { width: 340, height: 190 },
  offset = 14
): TooltipPosition {
  let top = 0;
  let left = 0;
  let placement = preferredPlacement;

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  if (placement === 'center') {
    return {
      top: Math.max(10, (containerRect.height - tooltipSize.height) / 2),
      left: Math.max(10, (containerRect.width - tooltipSize.width) / 2),
      arrowPlacement: 'center'
    };
  }

  // Auto flip if overflowing container
  if (placement === 'bottom' && targetRect.bottom + tooltipSize.height + offset > containerRect.height) {
    if (targetRect.top - tooltipSize.height - offset > 0) {
      placement = 'top';
    }
  } else if (placement === 'top' && targetRect.top - tooltipSize.height - offset < 0) {
    if (targetRect.bottom + tooltipSize.height + offset < containerRect.height) {
      placement = 'bottom';
    }
  } else if (placement === 'right' && targetRect.right + tooltipSize.width + offset > containerRect.width) {
    if (targetRect.left - tooltipSize.width - offset > 0) {
      placement = 'left';
    }
  } else if (placement === 'left' && targetRect.left - tooltipSize.width - offset < 0) {
    if (targetRect.right + tooltipSize.width + offset < containerRect.width) {
      placement = 'right';
    }
  }

  switch (placement) {
    case 'top':
      top = targetRect.top - tooltipSize.height - offset;
      left = targetCenterX - tooltipSize.width / 2;
      break;
    case 'bottom':
      top = targetRect.bottom + offset;
      left = targetCenterX - tooltipSize.width / 2;
      break;
    case 'left':
      top = targetCenterY - tooltipSize.height / 2;
      left = targetRect.left - tooltipSize.width - offset;
      break;
    case 'right':
      top = targetCenterY - tooltipSize.height / 2;
      left = targetRect.right + offset;
      break;
  }

  // Keep within container bounds and safe areas (top nav bar, bottom global pill)
  const padding = 16;
  const safeAreaTop = 80; // Top navigation bar height + padding
  const safeAreaBottom = 100; // Bottom global pill height + padding

  left = Math.max(padding, Math.min(left, containerRect.width - tooltipSize.width - padding));
  top = Math.max(safeAreaTop, Math.min(top, containerRect.height - tooltipSize.height - safeAreaBottom));

  return {
    top: Math.round(top),
    left: Math.round(left),
    arrowPlacement: placement
  };
}
