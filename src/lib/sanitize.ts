// HTML sanitization for content - removes dangerous tags/attributes

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

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  '*': new Set(['class', 'id', 'style', 'title', 'lang', 'dir', 'data-*']),
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

const DANGEROUS_PATTERNS = [
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:(?!image\/(png|jpeg|gif|webp|svg\+xml))/gi,
  /on\w+\s*=/gi,
];

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Remove script and style tags entirely
  let clean = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Remove event handlers
  clean = clean.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // Remove javascript: and vbscript: URLs
  clean = clean.replace(/href\s*=\s*["']?\s*javascript\s*:[^"'>\s]*/gi, 'href="#"');
  clean = clean.replace(/src\s*=\s*["']?\s*javascript\s*:[^"'>\s]*/gi, 'src=""');

  // Remove any remaining dangerous patterns from attributes
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, '');
  }

  return clean;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function truncateText(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
}
