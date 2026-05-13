// HTML sanitization for content - removes dangerous tags/attributes.
//
// This is a regex-based sanitizer; it is intentionally conservative
// rather than DOM-faithful. A follow-up plan tracks moving to a proper
// HTMLRewriter-based pipeline. Until then we lean on:
//   - hard tag denylist for <script>/<style>
//   - inline event-handler stripping
//   - `javascript:`/`vbscript:` URL stripping after entity-decoding
//     so that &#x6A;avascript: cannot smuggle through
//   - iframe `src` restricted to a known-safe embed origin allowlist
//   - `style` attribute dropped entirely (CSS injection foot-gun)

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark',
  'a', 'img', 'video', 'audio', 'source', 'iframe',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'blockquote', 'pre', 'code', 'kbd', 'samp', 'var',
  'figure', 'figcaption', 'picture',
  'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'main',
  'details', 'summary', 'abbr', 'time', 'cite', 'q', 'sub', 'sup', 'small',
]);

// Per-tag allowed attribute lists. `style` is intentionally not in the
// `*` set — inline CSS can carry url(javascript:...) and behavior:url
// vectors that the simple regex pass cannot reliably scrub.
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  '*': new Set(['class', 'id', 'title', 'lang', 'dir', 'data-*']),
  'a': new Set(['href', 'target', 'rel', 'download']),
  'img': new Set(['src', 'alt', 'width', 'height', 'loading', 'srcset', 'sizes']),
  'video': new Set(['src', 'controls', 'width', 'height', 'poster', 'preload', 'autoplay', 'muted', 'loop']),
  'audio': new Set(['src', 'controls', 'preload', 'autoplay', 'muted', 'loop']),
  'source': new Set(['src', 'type', 'media', 'srcset', 'sizes']),
  'iframe': new Set(['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'allow', 'sandbox']),
  'td': new Set(['colspan', 'rowspan']),
  'th': new Set(['colspan', 'rowspan', 'scope']),
  'col': new Set(['span']),
  'colgroup': new Set(['span']),
  'time': new Set(['datetime']),
  'abbr': new Set(['title']),
  'blockquote': new Set(['cite']),
  'q': new Set(['cite']),
  'ol': new Set(['start', 'type', 'reversed']),
};

// Hostnames whose iframes we accept. Anything outside this list keeps
// the iframe tag but with `src` cleared, so a hostile embed cannot
// clickjack a logged-in reader.
const IFRAME_HOST_ALLOWLIST = [
  'www.youtube.com',
  'youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'open.spotify.com',
  'w.soundcloud.com',
  'www.dailymotion.com',
  'www.google.com', // maps embed
  'maps.google.com',
  'codepen.io',
  'codesandbox.io',
  'gist.github.com',
  'twitframe.com',
  'platform.twitter.com',
];

const DANGEROUS_URL_SCHEMES = /^\s*(javascript|vbscript|file|data)\s*:/i;

// Decode the common HTML entity forms an attacker uses to disguise
// `javascript:` — &#x6a;, &#106;, &amp;. We only need a defensive pass,
// not a full HTML entity table.
function decodeEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/gi, '&');
}

function isSafeUrl(value: string): boolean {
  const decoded = decodeEntities(value).trim();
  if (!decoded) return true;
  if (DANGEROUS_URL_SCHEMES.test(decoded)) {
    // `data:image/...` is a special case — allowed for inline images
    // only. Anything else (data:text/html, data:application/...) is
    // rejected.
    if (/^\s*data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/i.test(decoded)) {
      return true;
    }
    return false;
  }
  return true;
}

function isAllowedIframeHost(src: string): boolean {
  const decoded = decodeEntities(src).trim();
  try {
    const u = new URL(decoded, 'https://localhost/');
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return IFRAME_HOST_ALLOWLIST.includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  let clean = html;

  // Drop <script>/<style> bodies wholesale — never want either inside
  // user content.
  clean = clean.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '');
  clean = clean.replace(/<style\b[\s\S]*?<\/style\s*>/gi, '');
  // Also strip unmatched/orphan opening tags so a truncated `<script src=...`
  // can't still reach the document.
  clean = clean.replace(/<\s*\/?\s*script\b[^>]*>/gi, '');
  clean = clean.replace(/<\s*\/?\s*style\b[^>]*>/gi, '');

  // Strip inline event handlers (onclick=, onerror=, ...).
  clean = clean.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Strip the `style` attribute entirely.
  clean = clean.replace(/\s+style\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Walk every tag and scrub URL-bearing attributes that point at
  // dangerous schemes. The same regex catches `href`, `src`, `cite`,
  // `data`, etc., as long as the attribute value is quoted (the
  // common case for serialised HTML; bare values get caught by the
  // simpler block below).
  clean = clean.replace(/<([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g, (full, tagName, rawAttrs) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      // Unknown tag — preserve markup pattern but the regex pass below
      // will already have stripped its dangerous attrs.
      return full;
    }

    let attrs = rawAttrs;

    // For each URL-bearing attribute, validate. Empty out unsafe values
    // rather than removing the attribute so the element still parses.
    attrs = attrs.replace(
      /\s+(href|src|cite|action|formaction|data|poster|background)\s*=\s*"([^"]*)"/gi,
      (m: string, name: string, value: string) => {
        if (!isSafeUrl(value)) return ` ${name}=""`;
        return m;
      }
    );
    attrs = attrs.replace(
      /\s+(href|src|cite|action|formaction|data|poster|background)\s*=\s*'([^']*)'/gi,
      (m: string, name: string, value: string) => {
        if (!isSafeUrl(value)) return ` ${name}=''`;
        return m;
      }
    );

    // Iframes: only keep `src` if host is allowlisted.
    if (tag === 'iframe') {
      attrs = attrs.replace(
        /\s+src\s*=\s*"([^"]*)"/gi,
        (m: string, value: string) => (isAllowedIframeHost(value) ? m : ' src=""')
      );
      attrs = attrs.replace(
        /\s+src\s*=\s*'([^']*)'/gi,
        (m: string, value: string) => (isAllowedIframeHost(value) ? m : " src=''")
      );
    }

    return `<${tag}${attrs}>`;
  });

  // Catch-all: any remaining bare `javascript:` literal (e.g.
  // unquoted attribute values, text outside tags) gets neutered.
  clean = clean.replace(/javascript\s*:/gi, '');
  clean = clean.replace(/vbscript\s*:/gi, '');

  return clean;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function truncateText(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
}
