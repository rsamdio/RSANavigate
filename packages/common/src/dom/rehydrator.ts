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
        if (!iframe.srcdoc) {
          iframe.srcdoc = '<!DOCTYPE html><html><head></head><body></body></html>';
        }
        return;
      }

      populateIframe(doc, snapshot, options);
      resolve(doc);
    } catch (err) {
      reject(err);
    }
  });
}

function sanitizeSnapshotHtml(rawHtml: string, snapshotUrl?: string): string {
  if (!rawHtml) return '';
  let clean = rawHtml;

  // 1. Strip all scripts and noscript tags completely (multi-line, any attributes)
  clean = clean.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<script\b[^>]*\/?>/gi, '');
  clean = clean.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
  clean = clean.replace(/<noscript\b[^>]*\/?>/gi, '');

  // 1b. Strip all nested iframes, frames, objects, embeds before document.write to prevent sandboxed execution blocks
  clean = clean.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  clean = clean.replace(/<iframe\b[^>]*\/?>/gi, '');
  clean = clean.replace(/<frame\b[^>]*>[\s\S]*?<\/frame>/gi, '');
  clean = clean.replace(/<frame\b[^>]*\/?>/gi, '');
  clean = clean.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
  clean = clean.replace(/<object\b[^>]*\/?>/gi, '');
  clean = clean.replace(/<embed\b[^>]*\/?>/gi, '');

  // 1c. Strip SVG script elements
  clean = clean.replace(/<svg\b[^>]*>[\s\S]*?<script\b[\s\S]*?<\/script>[\s\S]*?<\/svg>/gi, (svgMatch) => {
    return svgMatch.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  });

  // 2. Strip modulepreload, preload, prefetch, prerender, dns-prefetch, and manifest links
  clean = clean.replace(/<link\b[^>]*\brel=["'](?:manifest|modulepreload|preload|prefetch|prerender|dns-prefetch|apple-touch-icon)["'][^>]*>/gi, '');

  // 3. Strip tracking & ad pixel images (e.g. Twitter adsct, t.co, Google Analytics, Facebook pixels)
  clean = clean.replace(/<img\b[^>]*\bsrc=["'][^"']*(?:adsct|analytics\.twitter|t\.co\/i|facebook\.com\/tr|google-analytics|doubleclick|clarity\.ms|hotjar)[^"']*["'][^>]*\/?>/gi, '');

  // 4. Strip all inline DOM event handlers (onload, onerror, onclick, onmouseover, onfocus, onunload, etc.)
  clean = clean.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 4b. Strip javascript: pseudo-protocol in href or src
  clean = clean.replace(/(?:href|src)\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');

  // 5. Strip non-CDN external stylesheet links (since rules are inlined via snapshot.styles)
  clean = clean.replace(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi, (match) => {
    if (match.includes('fonts.googleapis.com') || match.includes('cdnjs.cloudflare.com')) {
      return match;
    }
    return '';
  });

  // 6. Pre-inject <base> tag immediately inside <head> before document.write()
  // This guarantees that relative @font-face, image, and asset URLs resolve to the original
  // website origin instantly during HTML parsing, eliminating Netlify SPA index.html fallbacks
  // and Chromium OTS font parsing errors (invalid sfntVersion: 1008813135).
  if (snapshotUrl && (snapshotUrl.startsWith('http://') || snapshotUrl.startsWith('https://')) && !clean.includes('<base ') && !clean.includes('<base>')) {
    try {
      const baseUrl = new URL('/', snapshotUrl).href;
      const baseTag = `<base href="${baseUrl}">`;
      if (/<head\b[^>]*>/i.test(clean)) {
        clean = clean.replace(/(<head\b[^>]*>)/i, `$1${baseTag}`);
      } else if (/<html\b[^>]*>/i.test(clean)) {
        clean = clean.replace(/(<html\b[^>]*>)/i, `$1<head>${baseTag}</head>`);
      } else {
        clean = `<head>${baseTag}</head>${clean}`;
      }
    } catch {
      // Gracefully ignore unparseable URL
    }
  }

  return clean;
}

function populateIframe(doc: Document, snapshot: DOMSnapshot, options: RehydrationOptions) {
  const sanitizedHtml = sanitizeSnapshotHtml(snapshot.html, snapshot.url);
  doc.open();
  doc.write(sanitizedHtml);
  doc.close();

  // 0. Remove any NAVIGATE recorder widget artifacts, scripts, external iframes, and tracking pixels
  try {
    const unwanted = doc.querySelectorAll(
      '#navigate-tour-recorder-widget, [id^="navigate-tour-recorder"], [id^="navigate-recorder"], #navigate-step-badge, #navigate-capture-now-btn, #navigate-finish-btn, .navigate-recorder-ui, script, noscript, link[rel="manifest"]'
    );
    unwanted.forEach((el) => el.remove());

    // Strip external iframes, frames, objects and embeds — these load trackers/analytics (e.g. sdiapi.com)
    // and get blocked by the sandbox. Remove them cleanly to eliminate console noise.
    const externalFrames = doc.querySelectorAll('iframe, frame, object, embed');
    externalFrames.forEach((el) => {
      const src = el.getAttribute('src') || el.getAttribute('data') || '';
      // Only remove frames with external src (allow blank/navigational frames to be stripped too)
      if (!src || src.startsWith('http') || src.startsWith('//') || src.includes('://')) {
        el.remove();
      }
    });

    // Clean any remaining on* event handlers and strip legacy recorder outline artifacts from all elements
    const allEls = doc.querySelectorAll('*');
    allEls.forEach((el) => {
      const attrs = el.getAttributeNames();
      for (const attr of attrs) {
        if (attr.toLowerCase().startsWith('on')) {
          el.removeAttribute(attr);
        }
      }

      // Retroactive cleanup: strip baked-in recorder outline artifacts from legacy snapshots
      const htmlEl = el as HTMLElement;
      if (htmlEl.style) {
        const outlineVal = htmlEl.style.outline || '';
        if (outlineVal.includes('#3b82f6') || outlineVal.includes('rgb(59, 130, 246)')) {
          htmlEl.style.removeProperty('outline');
          htmlEl.style.removeProperty('outline-offset');
        }
      }
      htmlEl.classList?.remove('tour-element-hovered', 'tour-element-active-target');
    });

    const pulseEl = doc.getElementById('navigate-click-pulse');
    if (pulseEl) pulseEl.remove();
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
  if (snapshot.url && (snapshot.url.startsWith('http://') || snapshot.url.startsWith('https://'))) {
    try {
      const head = doc.head || doc.getElementsByTagName('head')[0] || doc.documentElement;
      // Check if base tag already exists, otherwise add it
      if (!doc.querySelector('base')) {
        const baseEl = doc.createElement('base');
        baseEl.href = new URL('/', snapshot.url).href; // Root of the captured URL
        head.insertBefore(baseEl, head.firstChild);
      }
    } catch {}
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
    html {
      overflow-x: auto !important;
      overflow-y: auto !important;
      scroll-behavior: smooth;
    }
    body {
      overflow: visible !important;
    }
    .tour-element-hovered {
      outline: 2px dashed #0c3c60 !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
    }
    .tour-element-active-target {
      outline: 3px solid #0c3c60 !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 0 6px rgba(12, 60, 96, 0.25) !important;
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
      // Build CSS rules for blur and hide (skip invalid XPath or invalid CSS selector syntax)
      if (!mod.selector.startsWith('xpath:')) {
        try {
          doc.querySelector(mod.selector);
          if (mod.type === 'blur') {
            cssRules += `\n${mod.selector} { filter: blur(8px) !important; -webkit-filter: blur(8px) !important; user-select: none !important; opacity: 0.75 !important; pointer-events: none !important; }`;
          } else if (mod.type === 'hide') {
            cssRules += `\n${mod.selector} { display: none !important; visibility: hidden !important; }`;
          }
        } catch {
          // Invalid CSS selector syntax for stylesheet rule - handled via inline DOM styles below
        }
      }

      // --- HARDENED MULTI-STRATEGY ELEMENT FINDER ---
      let elements: Element[] = [];
      if (mod.selector.startsWith('xpath:')) {
        const xpath = mod.selector.substring(6);
        try {
          const result = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (let i = 0; i < result.snapshotLength; i++) {
            const el = result.snapshotItem(i) as Element;
            if (el) elements.push(el);
          }
        } catch (e) {
          console.warn('[NAVIGATE] Invalid XPath in modification:', mod.selector, e);
        }
      } else {
        try {
          elements = Array.from(doc.querySelectorAll(mod.selector));
        } catch (e) {
          // Invalid selector syntax — skip
        }
      }

      // Strategy 2: Progressive sub-path (handles stale hierarchical selectors)
      if (elements.length === 0 && mod.selector.includes(' > ')) {
        const parts = mod.selector.split(' > ');
        for (let i = 1; i < parts.length && elements.length === 0; i++) {
          const sub = parts.slice(i).join(' > ');
          try {
            const found = doc.querySelectorAll(sub);
            if (found.length > 0) elements = Array.from(found);
          } catch {}
        }
      }

      // Strategy 3: data-navigate-uid attribute (element was tagged at record time)
      if (elements.length === 0 && mod.selector.includes('data-navigate-uid')) {
        const uidMatch = mod.selector.match(/data-navigate-uid="([^"]+)"/);
        if (uidMatch) {
          try {
            const found = doc.querySelectorAll(`[data-navigate-uid="${uidMatch[1]}"]`);
            if (found.length > 0) elements = Array.from(found);
          } catch {}
        }
      }

      // Strategy 4: Partial tag+class match (last resort for volatile class names)
      if (elements.length === 0) {
        const tagMatch = mod.selector.match(/^([a-z][a-z0-9]*)[\.\[#]/i);
        const tag = tagMatch ? tagMatch[1] : null;
        if (tag && tag !== 'body' && tag !== 'html') {
          try {
            const candidates = doc.querySelectorAll(tag);
            // Find the one that has the most matching attributes/classes from the original selector
            const classMatches = mod.selector.match(/\.([a-zA-Z0-9_-]+)/g) || [];
            const bestCandidates = Array.from(candidates).filter((el) => {
              if (classMatches.length === 0) return false;
              return classMatches.some((cls) => el.classList.contains(cls.replace('.', '')));
            });
            if (bestCandidates.length === 1) {
              elements = bestCandidates;
            }
          } catch {}
        }
      }
      // --- END HARDENED FINDER ---

      (Array.from(elements) as HTMLElement[]).forEach((htmlEl) => {
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
      console.warn('[NAVIGATE] Privacy modification notice for selector:', mod.selector, e);
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

  const disambiguateByCoordinates = (elements: Element[]): Element | null => {
    const validEls = elements.filter(el => el !== iframeDoc.body && el !== iframeDoc.documentElement);
    if (validEls.length === 0) return null;
    if (validEls.length === 1) return validEls[0];

    if (coordinates && coordinates.x !== undefined && coordinates.y !== undefined) {
      const win = iframeDoc.defaultView || window;
      const scrollX = win.scrollX || iframeDoc.documentElement?.scrollLeft || iframeDoc.body?.scrollLeft || 0;
      const scrollY = win.scrollY || iframeDoc.documentElement?.scrollTop || iframeDoc.body?.scrollTop || 0;

      let closestEl: Element | null = null;
      let minDistance = Infinity;

      for (const el of validEls) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        const pageX = rect.left + scrollX;
        const pageY = rect.top + scrollY;
        const dist = Math.hypot(pageX - coordinates.x, pageY - coordinates.y);
        if (dist < minDistance) {
          minDistance = dist;
          closestEl = el;
        }
      }
      if (closestEl) return closestEl;
    }

    return validEls.find(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) || validEls[0];
  };

  // 1. Try CSS Selector (exact match)
  if (selector && selector.trim() && selector !== 'body' && selector !== 'html') {
    try {
      const els = Array.from(iframeDoc.querySelectorAll(selector));
      const best = disambiguateByCoordinates(els);
      if (best) return best;
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
          const els = Array.from(iframeDoc.querySelectorAll(sub));
          const best = disambiguateByCoordinates(els);
          if (best) return best;
        } catch {}
      }
    }

    // Fallback B: If it's an XPath selector
    if (selector.startsWith('xpath:')) {
      const xpath = selector.substring(6);
      try {
        const result = iframeDoc.evaluate(xpath, iframeDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        let node = result.iterateNext();
        const xpathEls: Element[] = [];
        
        while (node) {
          xpathEls.push(node as Element);
          node = result.iterateNext();
        }
        const best = disambiguateByCoordinates(xpathEls);
        if (best) return best;
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

export function computeBeaconPosition(
  targetRect: { top: number; left: number; width: number; height: number; right: number; bottom: number },
  alignment: 'left' | 'center' | 'right' = 'center'
) {
  let x = targetRect.left + targetRect.width / 2;
  const y = targetRect.top + targetRect.height / 2;
  if (alignment === 'left') x = targetRect.left;
  if (alignment === 'right') x = targetRect.right;
  return { x, y };
}

export interface ObstacleRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function computeTooltipPosition(
  targetRect: { top: number; left: number; width: number; height: number; right: number; bottom: number },
  containerRect: { width: number; height: number },
  preferredPlacement: HotspotPlacement = 'bottom',
  tooltipSize = { width: 340, height: 190 },
  offset = 26,
  beaconAlignment: 'left' | 'center' | 'right' = 'center',
  obstacles: ObstacleRect[] = []
): TooltipPosition {
  let top = 0;
  let left = 0;
  let placement = preferredPlacement;

  const beaconPos = computeBeaconPosition(targetRect, beaconAlignment);
  const targetCenterX = beaconPos.x;
  const targetCenterY = beaconPos.y;

  if (placement === 'center') {
    return {
      top: Math.max(10, (containerRect.height - tooltipSize.height) / 2),
      left: Math.max(10, (containerRect.width - tooltipSize.width) / 2),
      arrowPlacement: 'center'
    };
  }

  // Smart Adaptive Placement: flip to the opposite side if preferred side overflows
  // AND the opposite side has sufficient clearance. Hard clamping (below) remains
  // as the final safety net for impossible-to-fit scenarios.
  const padding = 16;

  if (placement === 'bottom' && targetRect.bottom + tooltipSize.height + offset > containerRect.height - padding) {
    if (targetRect.top - tooltipSize.height - offset >= padding) {
      placement = 'top';
    }
  } else if (placement === 'top' && targetRect.top - tooltipSize.height - offset < padding) {
    if (targetRect.bottom + tooltipSize.height + offset <= containerRect.height - padding) {
      placement = 'bottom';
    }
  } else if (placement === 'left' && targetRect.left - tooltipSize.width - offset < padding) {
    if (targetRect.right + tooltipSize.width + offset <= containerRect.width - padding) {
      placement = 'right';
    }
  } else if (placement === 'right' && targetRect.right + tooltipSize.width + offset > containerRect.width - padding) {
    if (targetRect.left - tooltipSize.width - offset >= padding) {
      placement = 'left';
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

  // Hard clamping — last resort to ensure tooltip stays fully visible
  const maxLeft = Math.max(8, containerRect.width - tooltipSize.width - padding);
  if (left < padding) {
    left = Math.min(padding, maxLeft);
  } else if (left > maxLeft) {
    left = maxLeft;
  }

  const maxTop = Math.max(8, containerRect.height - tooltipSize.height - padding);
  if (top < padding) {
    top = Math.min(padding, maxTop);
  } else if (top > maxTop) {
    top = maxTop;
  }

  // Obstacle avoidance (e.g. floating title card, top-bar, persistent controls)
  if (obstacles && obstacles.length > 0) {
    for (const obs of obstacles) {
      const obsRight = obs.left + obs.width;
      const obsBottom = obs.top + obs.height;
      const ttRight = left + tooltipSize.width;
      const ttBottom = top + tooltipSize.height;

      const isColliding = !(ttRight < obs.left || left > obsRight || ttBottom < obs.top || top > obsBottom);
      if (isColliding) {
        // Try pushing down below the obstacle first
        const shiftedTop = obsBottom + 12;
        if (shiftedTop + tooltipSize.height <= containerRect.height - padding) {
          top = shiftedTop;
        } else {
          // If pushing down exceeds viewport, push away horizontally
          if (obs.left > containerRect.width / 2) {
            // Obstacle is on right side -> push to the left of obstacle
            const shiftedLeft = obs.left - tooltipSize.width - 16;
            if (shiftedLeft >= padding) {
              left = shiftedLeft;
            }
          } else {
            // Obstacle is on left side -> push to the right of obstacle
            const shiftedLeft = obsRight + 16;
            if (shiftedLeft + tooltipSize.width <= containerRect.width - padding) {
              left = shiftedLeft;
            }
          }
        }
      }
    }
  }

  return {
    top: Math.round(top),
    left: Math.round(left),
    arrowPlacement: placement
  };
}

/**
 * Calculates the exact boundary point on a tooltip/modal card's perimeter
 * where a connector line from a target point should attach.
 * Guarantees that the line touches the perimeter cleanly and NEVER penetrates inside or over the card.
 */
export function computeCardEdgePoint(
  cardRect: { left: number; top: number; width: number; height: number },
  targetPoint: { x: number; y: number }
): { x: number; y: number } {
  const cardCenterX = cardRect.left + cardRect.width / 2;
  const cardCenterY = cardRect.top + cardRect.height / 2;

  const dx = targetPoint.x - cardCenterX;
  const dy = targetPoint.y - cardCenterY;

  // If target point is essentially at center, attach to top edge
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
    return { x: Math.round(cardCenterX), y: Math.round(cardRect.top) };
  }

  const halfWidth = cardRect.width / 2;
  const halfHeight = cardRect.height / 2;

  // Compare slope against card aspect ratio to determine which edge is intercepted
  if (Math.abs(dy) * halfWidth >= Math.abs(dx) * halfHeight) {
    // Top or Bottom edge intersection
    const isAbove = dy < 0;
    const edgeY = isAbove ? cardRect.top : cardRect.top + cardRect.height;
    const ratio = halfHeight / Math.abs(dy);
    const edgeX = cardCenterX + dx * ratio;
    return {
      x: Math.round(Math.max(cardRect.left + 16, Math.min(cardRect.left + cardRect.width - 16, edgeX))),
      y: Math.round(edgeY)
    };
  } else {
    // Left or Right edge intersection
    const isLeft = dx < 0;
    const edgeX = isLeft ? cardRect.left : cardRect.left + cardRect.width;
    const ratio = halfWidth / Math.abs(dx);
    const edgeY = cardCenterY + dy * ratio;
    return {
      x: Math.round(edgeX),
      y: Math.round(Math.max(cardRect.top + 16, Math.min(cardRect.top + cardRect.height - 16, edgeY)))
    };
  }
}

