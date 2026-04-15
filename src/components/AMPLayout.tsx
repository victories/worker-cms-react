/** @jsxImportSource hono/jsx */
import { raw } from 'hono/html';

export interface AMPLayoutProps {
  title: string;
  description?: string;
  canonicalUrl: string;
  lang: string;
  siteName: string;
  ogImage?: string;
  ampComponents?: string[]; // script URLs from getRequiredAMPComponents
  structuredData?: string; // JSON-LD string
  headerAdCss?: string;  // inline ad CSS to merge into amp-custom
  headerAdHtml?: string; // inline ad HTML body to inject above header
  children: string; // pre-built AMP body HTML
}

// ---------------------------------------------------------------------------
// AMP boilerplate CSS (required verbatim by the AMP spec)
// ---------------------------------------------------------------------------

const AMP_BOILERPLATE = `body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}`;

const AMP_BOILERPLATE_NOSCRIPT = `body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}`;

// ---------------------------------------------------------------------------
// Theme CSS for AMP pages
// Uses CSS variables matching the regular Layout. Kept minimal to stay under
// the AMP 75 KB custom CSS limit.
// ---------------------------------------------------------------------------

const AMP_THEME_CSS = `:root{--primary:#2563eb;--font:'Inter',system-ui,-apple-system,sans-serif}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font);background:#f8fafc;color:#1e293b;line-height:1.7}
a{color:var(--primary);text-decoration:none}
a:hover{text-decoration:underline}
.amp-header{background:#fff;border-bottom:1px solid #e2e8f0;padding:1rem 0}
.amp-header .container{display:flex;align-items:center;justify-content:space-between}
.amp-site-title{font-size:1.5rem;font-weight:700;color:#0f172a}
.amp-site-title a{color:inherit;text-decoration:none}
.container{max-width:700px;margin:0 auto;padding:0 1.5rem}
.amp-article{background:#fff;border-radius:0.75rem;padding:2rem;margin:2rem auto;box-shadow:0 1px 3px rgb(0 0 0/0.05)}
.amp-article h1{font-size:1.75rem;margin-bottom:0.75rem;line-height:1.3}
.amp-meta{color:#94a3b8;font-size:0.85rem;margin-bottom:1rem;display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center}
.amp-meta .tag{background:#2563eb22;color:var(--primary);padding:0.125rem 0.5rem;border-radius:0.25rem;font-size:0.75rem;font-weight:500}
.amp-content{line-height:1.8;font-size:1.05rem}
.amp-content h2{font-size:1.5rem;margin:1.5rem 0 0.75rem}
.amp-content h3{font-size:1.25rem;margin:1.25rem 0 0.5rem}
.amp-content p{margin-bottom:1rem}
.amp-content ul,.amp-content ol{margin:1rem 0;padding-left:2rem}
.amp-content blockquote{border-left:3px solid var(--primary);padding:0.75rem 1.25rem;margin:1rem 0;background:#f1f5f9;border-radius:0 0.5rem 0.5rem 0}
.amp-content pre{background:#1e293b;color:#e2e8f0;padding:1rem;border-radius:0.5rem;overflow-x:auto;margin:1rem 0}
.amp-content code{background:#f1f5f9;padding:0.125rem 0.375rem;border-radius:0.25rem;font-size:0.9em}
.amp-content pre code{background:none;padding:0}
.amp-content amp-img{border-radius:0.5rem;margin:1rem 0}
.amp-tags{margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e2e8f0;font-size:0.85rem}
.amp-tags-label{color:#64748b;margin-right:0.5rem}
.amp-footer{text-align:center;padding:2rem 0;color:#94a3b8;font-size:0.875rem;border-top:1px solid #e2e8f0;margin-top:2rem}
.amp-canonical{display:block;text-align:center;margin:1.5rem 0;font-size:0.9rem}
.amp-home-header{text-align:center;padding:2rem 0 1rem}
.amp-home-header h1{font-size:2rem;margin-bottom:0.5rem}
.amp-home-header p{color:#64748b;font-size:1rem}
.amp-post-list{display:flex;flex-direction:column;gap:1.25rem;margin:1.5rem 0}
.amp-card{background:#fff;border-radius:0.75rem;overflow:hidden;box-shadow:0 1px 3px rgb(0 0 0/0.05)}
.amp-card-img{display:block}
.amp-card-body{padding:1.25rem}
.amp-card-body h2{font-size:1.25rem;margin-bottom:0.5rem;line-height:1.3}
.amp-card-body h2 a{color:#0f172a;text-decoration:none}
.amp-excerpt{color:#64748b;font-size:0.9rem;margin:0.5rem 0;line-height:1.5}
.amp-read-more{font-size:0.85rem;font-weight:600;color:var(--primary)}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Derive the AMP component name from its CDN script URL.
 * e.g. "https://cdn.ampproject.org/v0/amp-iframe-0.1.js" -> "amp-iframe"
 */
function componentNameFromUrl(url: string): string {
  const m = url.match(/\/v0\/(amp-[a-z-]+)-/);
  return m ? m[1] : 'amp-component';
}

// ---------------------------------------------------------------------------
// AMPLayout — builds a complete, valid AMP HTML document
// ---------------------------------------------------------------------------

/**
 * Build a complete AMP HTML page.
 *
 * Returns a `HtmlEscapedString` compatible with Hono's `c.html()`.
 *
 * Includes:
 * - `<!doctype html>` with `<html amp lang="...">`
 * - Required charset and viewport meta tags
 * - AMP boilerplate CSS
 * - AMP runtime script
 * - Dynamic AMP component extension scripts
 * - Canonical link to the non-AMP version
 * - `<style amp-custom>` with site theme CSS
 * - Open Graph + Twitter Card meta tags
 * - Optional JSON-LD structured data
 * - Header with site name, body content, footer
 */
export function renderAMPLayout(props: AMPLayoutProps) {
  const {
    title,
    description,
    canonicalUrl,
    lang,
    siteName,
    ogImage,
    ampComponents = [],
    structuredData,
    headerAdCss,
    headerAdHtml,
    children: bodyHtml,
  } = props;

  // Sanitize description: strip shortcodes, HTML, collapse whitespace, trim
  const rawDesc = description || '';
  const desc = rawDesc
    .replace(/\[[^\]]*\]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 160);
  const ogLocale = lang === 'tr' ? 'tr_TR' : 'en_US';

  // Build AMP component script tags
  const componentScripts = ampComponents
    .map((url) => `<script async custom-element="${componentNameFromUrl(url)}" src="${url}"></script>`)
    .join('\n  ');

  // Merge ad CSS into amp-custom (if present)
  const combinedCss = headerAdCss ? `${AMP_THEME_CSS}\n${headerAdCss}` : AMP_THEME_CSS;

  const html = `<!doctype html>
<html amp lang="${esc(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,minimum-scale=1">
  <link rel="canonical" href="${esc(canonicalUrl)}">
  <title>${esc(title)} | ${esc(siteName)}</title>
  ${desc ? `<meta name="description" content="${esc(desc)}">` : ''}

  <meta property="og:title" content="${esc(title)}">
  ${desc ? `<meta property="og:description" content="${esc(desc)}">` : ''}
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${esc(siteName)}">
  <meta property="og:url" content="${esc(canonicalUrl)}">
  ${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
  <meta property="og:locale" content="${ogLocale}">

  <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${esc(title)}">
  ${desc ? `<meta name="twitter:description" content="${esc(desc)}">` : ''}
  ${ogImage ? `<meta name="twitter:image" content="${esc(ogImage)}">` : ''}

  <style amp-boilerplate>${AMP_BOILERPLATE}</style>
  <noscript><style amp-boilerplate>${AMP_BOILERPLATE_NOSCRIPT}</style></noscript>
  <script async src="https://cdn.ampproject.org/v0.js"></script>
  ${componentScripts}
  <style amp-custom>${combinedCss}</style>
  ${structuredData ? `<script type="application/ld+json">${structuredData}</script>` : ''}
</head>
<body>
  ${headerAdHtml || ''}
  <header class="amp-header">
    <div class="container">
      <div class="amp-site-title"><a href="/">${esc(siteName)}</a></div>
    </div>
  </header>

  ${bodyHtml}

  <footer class="amp-footer">
    <div class="container">Powered by Worker CMS</div>
  </footer>
</body>
</html>`;

  return raw(html);
}
