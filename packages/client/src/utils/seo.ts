/**
 * SEO & Open Graph Dynamic Metadata Manager for NAVIGATE
 * Maintains unified title & description formatting across Rotaract South Asia MDIO web properties.
 */

export const DEFAULT_PAGE_TITLE = 'NAVIGATE - Interactive Walkthroughs | Rotaract South Asia MDIO';
export const DEFAULT_DESCRIPTION =
  'Step-by-step interactive walkthroughs and reference resources for Rotaractors to navigate with confidence.';

export interface PageMetadataOptions {
  walkthroughTitle?: string;
  description?: string;
  url?: string;
  ogImage?: string;
}

function setMetaTag(selector: string, attributeName: string, attributeValue: string, content: string) {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonical(url: string) {
  let element = document.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', url);
}

/**
 * Dynamically updates document title and all Open Graph / Twitter / Search meta tags
 */
export function updatePageMetadata(options: PageMetadataOptions = {}) {
  const { walkthroughTitle, description, url, ogImage } = options;

  // Format: "(Walkthrough Title) | NAVIGATE | Rotaract South Asia MDIO"
  const title = walkthroughTitle?.trim()
    ? `${walkthroughTitle.trim()} | NAVIGATE | Rotaract South Asia MDIO`
    : DEFAULT_PAGE_TITLE;

  const desc = description?.trim() ? description.trim() : DEFAULT_DESCRIPTION;
  const canonicalUrl = url || window.location.href;

  // 1. Document Title
  document.title = title;

  // 2. Search Engine Meta Tags
  setMetaTag('meta[name="title"]', 'name', 'title', title);
  setMetaTag('meta[name="description"]', 'name', 'description', desc);

  // 3. Open Graph Tags (Facebook, LinkedIn, Discord, WhatsApp)
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', desc);
  setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  if (ogImage) {
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', ogImage);
    setMetaTag('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', ogImage);
  }

  // 4. Twitter / X Card Tags
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
  setMetaTag('meta[name="twitter:url"]', 'name', 'twitter:url', canonicalUrl);
  if (ogImage) {
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);
  }

  // 5. Canonical Link
  setCanonical(canonicalUrl);
}

/**
 * Resets document title and meta tags back to default portal values
 */
export function resetToDefaultMetadata() {
  updatePageMetadata({
    walkthroughTitle: undefined,
    description: DEFAULT_DESCRIPTION,
    url: 'https://navigate.rsamdio.org/'
  });
}
