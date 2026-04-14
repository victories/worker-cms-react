// AMP (Accelerated Mobile Pages) HTML converter for Cloudflare Workers
// Converts standard HTML content into AMP-valid HTML using regex-based transformations

import type { Post, Site } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AMP_CUSTOM_CSS_MAX_BYTES = 75_000; // 75 KB limit for <style amp-custom>

const DEFAULT_IMG_WIDTH = 800;
const DEFAULT_IMG_HEIGHT = 450;

/** Event handler attribute names to strip (on*) */
const EVENT_HANDLER_RE = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;

/** Inline style attribute */
const INLINE_STYLE_ATTR_RE = /\s+style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

/** <script ...>...</script> including self-closing */
const SCRIPT_TAG_RE = /<script[\s\S]*?<\/script\s*>/gi;

/** AMP component script URLs keyed by component name */
const AMP_COMPONENT_SCRIPTS: Record<string, string> = {
  'amp-img': '', // amp-img is built-in, no extra script needed
  'amp-video': 'https://cdn.ampproject.org/v0/amp-video-0.1.js',
  'amp-iframe': 'https://cdn.ampproject.org/v0/amp-iframe-0.1.js',
  'amp-youtube': 'https://cdn.ampproject.org/v0/amp-youtube-0.1.js',
  'amp-twitter': 'https://cdn.ampproject.org/v0/amp-twitter-0.1.js',
  'amp-instagram': 'https://cdn.ampproject.org/v0/amp-instagram-0.1.js',
  'amp-fit-text': 'https://cdn.ampproject.org/v0/amp-fit-text-0.1.js',
  'amp-accordion': 'https://cdn.ampproject.org/v0/amp-accordion-0.1.js',
  'amp-sidebar': 'https://cdn.ampproject.org/v0/amp-sidebar-0.1.js',
  'amp-carousel': 'https://cdn.ampproject.org/v0/amp-carousel-0.2.js',
  'amp-lightbox': 'https://cdn.ampproject.org/v0/amp-lightbox-0.1.js',
  'amp-social-share': 'https://cdn.ampproject.org/v0/amp-social-share-0.1.js',
  'amp-form': 'https://cdn.ampproject.org/v0/amp-form-0.1.js',
  'amp-analytics': 'https://cdn.ampproject.org/v0/amp-analytics-0.1.js',
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a potentially relative URL to an absolute URL.
 */
function resolveUrl(src: string, siteUrl: string): string {
  if (!src) return src;
  // Already absolute
  if (/^https?:\/\//i.test(src) || src.startsWith('//')) {
    return src;
  }
  // Ensure siteUrl has no trailing slash
  const base = siteUrl.replace(/\/+$/, '');
  // Ensure src has a leading slash
  const path = src.startsWith('/') ? src : `/${src}`;
  return `${base}${path}`;
}

/**
 * Extract a named attribute value from an HTML tag string.
 * Returns `null` when the attribute is not present.
 */
function getAttr(tag: string, name: string): string | null {
  // Matches: name="value", name='value', or name=value (unquoted)
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = tag.match(re);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? null;
}

/**
 * Build an attribute string like ` key="value"` — omits if value is null/undefined.
 */
function attr(name: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return ` ${name}="${String(value).replace(/"/g, '&quot;')}"`;
}

// ---------------------------------------------------------------------------
// convertToAMP
// ---------------------------------------------------------------------------

/**
 * Convert standard HTML content into AMP-valid HTML.
 *
 * Transformations:
 * - `<img>` -> `<amp-img>` with responsive layout
 * - `<video>` -> `<amp-video>` with responsive layout
 * - `<iframe>` -> `<amp-iframe>` with responsive layout + sandbox
 * - Removes all `<script>` tags
 * - Removes inline `style` attributes
 * - Removes event handler attributes (onclick, onload, etc.)
 * - Resolves relative `<img>` src URLs to absolute
 * - Wraps `<table>` in a responsive container
 */
export function convertToAMP(html: string, siteUrl: string): string {
  if (!html) return '';

  let out = html;

  // 1. Remove <script> tags
  out = out.replace(SCRIPT_TAG_RE, '');

  // 2. Remove event handler attributes (onclick, onload, onerror, etc.)
  out = out.replace(EVENT_HANDLER_RE, '');

  // 3. Remove inline style attributes
  out = out.replace(INLINE_STYLE_ATTR_RE, '');

  // 4. Convert <img> to <amp-img>
  out = out.replace(/<img\b([^>]*?)\s*\/?>/gi, (_match, attrs: string) => {
    let src = getAttr(attrs, 'src') || '';
    src = resolveUrl(src, siteUrl);
    const alt = getAttr(attrs, 'alt') || '';
    const width = getAttr(attrs, 'width') || String(DEFAULT_IMG_WIDTH);
    const height = getAttr(attrs, 'height') || String(DEFAULT_IMG_HEIGHT);
    const className = getAttr(attrs, 'class');
    const srcset = getAttr(attrs, 'srcset');
    const sizes = getAttr(attrs, 'sizes');

    return `<amp-img layout="responsive"${attr('src', src)}${attr('alt', alt)}${attr('width', width)}${attr('height', height)}${attr('class', className)}${attr('srcset', srcset)}${attr('sizes', sizes)}></amp-img>`;
  });

  // 5. Convert <video> to <amp-video>
  //    Handle both self-closing and paired tags
  out = out.replace(
    /<video\b([^>]*)>([\s\S]*?)<\/video\s*>/gi,
    (_match, attrs: string, inner: string) => {
      const src = getAttr(attrs, 'src');
      const poster = getAttr(attrs, 'poster');
      const width = getAttr(attrs, 'width') || String(DEFAULT_IMG_WIDTH);
      const height = getAttr(attrs, 'height') || String(DEFAULT_IMG_HEIGHT);
      const className = getAttr(attrs, 'class');

      // Preserve inner <source> tags
      return `<amp-video layout="responsive"${attr('src', src)}${attr('poster', poster)}${attr('width', width)}${attr('height', height)}${attr('class', className)} controls>${inner}</amp-video>`;
    },
  );

  // 6. Convert <iframe> to <amp-iframe>
  out = out.replace(
    /<iframe\b([^>]*?)\s*(?:\/>|>([\s\S]*?)<\/iframe\s*>)/gi,
    (_match, attrs: string, inner?: string) => {
      const src = getAttr(attrs, 'src') || '';
      const width = getAttr(attrs, 'width') || String(DEFAULT_IMG_WIDTH);
      const height = getAttr(attrs, 'height') || String(DEFAULT_IMG_HEIGHT);
      const className = getAttr(attrs, 'class');
      const sandbox = getAttr(attrs, 'sandbox') || 'allow-scripts allow-same-origin';
      const allowfullscreen = /\ballowfullscreen\b/i.test(attrs) ? ' allowfullscreen' : '';

      return `<amp-iframe layout="responsive"${attr('src', src)}${attr('width', width)}${attr('height', height)}${attr('sandbox', sandbox)}${allowfullscreen}${attr('class', className)}>${inner || ''}</amp-iframe>`;
    },
  );

  // 7. Wrap <table> in responsive container
  out = out.replace(
    /(<table\b[\s\S]*?<\/table\s*>)/gi,
    '<div class="amp-table-responsive" style="overflow-x:auto">$1</div>',
  );

  return out;
}

// ---------------------------------------------------------------------------
// extractAMPStyles
// ---------------------------------------------------------------------------

/**
 * Extract inline styles from the original (pre-conversion) HTML.
 * Returns combined CSS suitable for inclusion inside `<style amp-custom>`.
 *
 * Each unique inline style is turned into a utility class and the rules are
 * de-duplicated. The output is truncated to the AMP 75 KB limit.
 */
export function extractAMPStyles(html: string): string {
  if (!html) return '';

  const styleMap = new Map<string, string>();
  let classIndex = 0;

  // Collect all inline style="..." values
  const styleValueRe = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m: RegExpExecArray | null;
  while ((m = styleValueRe.exec(html)) !== null) {
    const value = (m[1] ?? m[2] ?? '').trim();
    if (!value) continue;
    if (!styleMap.has(value)) {
      styleMap.set(value, `amp-style-${classIndex++}`);
    }
  }

  if (styleMap.size === 0) return '';

  // Build CSS
  const lines: string[] = [];
  for (const [style, className] of styleMap) {
    lines.push(`.${className}{${style}}`);
  }

  let css = lines.join('\n');

  // Enforce AMP 75 KB limit
  const encoder = new TextEncoder();
  if (encoder.encode(css).byteLength > AMP_CUSTOM_CSS_MAX_BYTES) {
    // Truncate line-by-line until it fits
    while (encoder.encode(css).byteLength > AMP_CUSTOM_CSS_MAX_BYTES && lines.length > 0) {
      lines.pop();
      css = lines.join('\n');
    }
  }

  return css;
}

// ---------------------------------------------------------------------------
// getRequiredAMPComponents
// ---------------------------------------------------------------------------

/**
 * Scan the **converted** AMP HTML and return a list of required AMP component
 * script URLs that must be included in the document `<head>`.
 *
 * Built-in components (like `amp-img`) are excluded since they don't need an
 * extra script tag.
 */
export function getRequiredAMPComponents(html: string): string[] {
  if (!html) return [];

  const found = new Set<string>();

  for (const [component, scriptUrl] of Object.entries(AMP_COMPONENT_SCRIPTS)) {
    // Skip built-in components with empty script URL
    if (!scriptUrl) continue;

    // Check if the component tag exists in the HTML
    const tagRe = new RegExp(`<${component}[\\s>]`, 'i');
    if (tagRe.test(html)) {
      found.add(scriptUrl);
    }
  }

  // Also detect <form> which needs amp-form
  if (/<form[\s>]/i.test(html) && AMP_COMPONENT_SCRIPTS['amp-form']) {
    found.add(AMP_COMPONENT_SCRIPTS['amp-form']);
  }

  return Array.from(found);
}

// ---------------------------------------------------------------------------
// generateStructuredData
// ---------------------------------------------------------------------------

export interface StructuredDataPost {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  published_at?: string | null;
  updated_at?: string;
  created_at?: string;
}

export interface StructuredDataSite {
  name: string;
  description?: string | null;
}

export interface StructuredDataAuthor {
  display_name: string;
}

export interface StructuredDataOptions {
  /** Author info — if omitted the site name is used */
  author?: StructuredDataAuthor;
  /** Featured image absolute URL */
  image?: string | null;
  /** Publisher logo absolute URL */
  logoUrl?: string | null;
}

/**
 * Generate JSON-LD structured data for an Article following schema.org.
 *
 * Returns a JSON string ready to be placed inside a
 * `<script type="application/ld+json">` tag.
 */
export function generateStructuredData(
  post: StructuredDataPost,
  site: StructuredDataSite,
  canonicalUrl: string,
  options: StructuredDataOptions = {},
): string {
  const datePublished = post.published_at || post.created_at || new Date().toISOString();
  const dateModified = post.updated_at || datePublished;

  const authorName = options.author?.display_name || site.name;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title.length > 110 ? post.title.slice(0, 110) : post.title,
    datePublished,
    dateModified,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      ...(options.logoUrl
        ? {
            logo: {
              '@type': 'ImageObject',
              url: options.logoUrl,
            },
          }
        : {}),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };

  if (options.image) {
    schema.image = options.image;
  }

  if (post.excerpt) {
    schema.description = post.excerpt;
  }

  return JSON.stringify(schema);
}

// ---------------------------------------------------------------------------
// Full AMP page builder (convenience)
// ---------------------------------------------------------------------------

export interface AMPPageOptions {
  title: string;
  canonicalUrl: string;
  siteUrl: string;
  lang?: string;
  /** CSS to inject into <style amp-custom> */
  customCss?: string;
  /** The AMP body HTML (already converted via convertToAMP) */
  bodyHtml: string;
  /** JSON-LD string from generateStructuredData */
  structuredData?: string;
  /** Additional component scripts from getRequiredAMPComponents */
  componentScripts?: string[];
  /** Meta description for the page */
  metaDescription?: string;
}

/**
 * Build a complete AMP HTML page shell.
 *
 * This is a convenience function that combines all the pieces into a valid
 * AMP document. The caller should have already converted the body content via
 * `convertToAMP` and gathered the required data from the other helpers.
 */
export function buildAMPPage(options: AMPPageOptions): string {
  const {
    title,
    canonicalUrl,
    siteUrl: _siteUrl,
    lang = 'en',
    customCss = '',
    bodyHtml,
    structuredData,
    componentScripts = [],
    metaDescription,
  } = options;

  const componentTags = componentScripts
    .map((src) => {
      // Derive component name from URL: amp-iframe-0.1.js -> amp-iframe
      const nameMatch = src.match(/\/v0\/(amp-[a-z-]+)-/);
      const name = nameMatch ? nameMatch[1] : 'amp-component';
      return `  <script async custom-element="${name}" src="${src}"></script>`;
    })
    .join('\n');

  const metaDesc = metaDescription
    ? `  <meta name="description" content="${metaDescription.replace(/"/g, '&quot;')}">`
    : '';

  const ldJson = structuredData
    ? `  <script type="application/ld+json">${structuredData}</script>`
    : '';

  return `<!doctype html>
<html amp lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,minimum-scale=1">
  <link rel="canonical" href="${canonicalUrl}">
${metaDesc}
  <title>${title}</title>
  <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
  <script async src="https://cdn.ampproject.org/v0.js"></script>
${componentTags}
${customCss ? `  <style amp-custom>${customCss}</style>` : ''}
${ldJson}
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
