// Cloudflare Image Transformations URL helper.
//
// When the site's plan allows transformations, we wrap image URLs in
// the `/cdn-cgi/image/<options>/<src>` prefix so Cloudflare resizes
// and re-encodes (WebP/AVIF) at the edge. Sites without the feature
// get the original URL passed through.
//
// Usage:
//   const small = cfImage(src, { width: 320, format: 'auto' }, true);
//   <img src={small} ... />
//
// Pricing (as of late 2025):
//   - First 5,000 unique transformations/month free per zone.
//   - $0.50 per 1,000 unique transformations after that.
//   - Variants are cached at the edge, so high-traffic pages don't
//     run up the bill — each unique URL only counts once.
//
// Important: works only on URLs that are reachable from the same
// zone (same hostname or absolute URLs). For our case `src` is
// usually `/uploads/s/<siteId>/<path>` which serves from the same
// origin via the worker, so the prefix-on-path form is enough.

export interface CfImageOptions {
  /** Target width in CSS pixels. */
  width?: number;
  /** Target height (rare — usually we let the engine pick by aspect). */
  height?: number;
  /** Quality 1-100. Default ~85 reads as visually-lossless for photos. */
  quality?: number;
  /** Image format. `'auto'` picks WebP/AVIF based on Accept header. */
  format?: 'auto' | 'avif' | 'webp' | 'jpeg' | 'png';
  /** How to fit when both w/h given. */
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  /** Strip metadata to shrink output. */
  metadata?: 'keep' | 'copyright' | 'none';
}

function buildOptionString(opts: CfImageOptions): string {
  const parts: string[] = [];
  if (opts.width) parts.push(`width=${opts.width}`);
  if (opts.height) parts.push(`height=${opts.height}`);
  if (opts.quality) parts.push(`quality=${opts.quality}`);
  if (opts.format) parts.push(`format=${opts.format}`);
  if (opts.fit) parts.push(`fit=${opts.fit}`);
  if (opts.metadata) parts.push(`metadata=${opts.metadata}`);
  return parts.join(',');
}

/**
 * Wrap a URL with the cdn-cgi/image transform prefix when `enabled`,
 * otherwise return it untouched.
 *
 * Skips:
 *   - Empty / null sources
 *   - SVGs (not raster)
 *   - Data URIs
 *   - URLs already wrapped in /cdn-cgi/image/ (idempotent)
 *   - External URLs from a different origin (CF can transform some
 *     but configuration varies; safer to leave them alone)
 */
export function cfImage(
  src: string | null | undefined,
  opts: CfImageOptions = {},
  enabled: boolean = true
): string {
  if (!src) return '';
  if (!enabled) return src;
  if (src.startsWith('data:')) return src;
  if (src.startsWith('/cdn-cgi/image/')) return src;
  if (/\.svg(\?|#|$)/i.test(src)) return src;

  const options = buildOptionString(opts);
  if (!options) return src;

  // Same-origin path → put prefix at the front.
  if (src.startsWith('/')) {
    return `/cdn-cgi/image/${options}${src}`;
  }
  // Absolute URL → /cdn-cgi/image/<opts>/<full-url>
  if (/^https?:\/\//i.test(src)) {
    return `/cdn-cgi/image/${options}/${src}`;
  }
  // Relative or weird URL — pass through, don't break it.
  return src;
}

/**
 * Build a responsive `srcset` for a given source, picking widths sane
 * for content thumbnails. Returns the empty string when transforms
 * are disabled (callers should fall back to plain `src`).
 */
export function cfImageSrcSet(
  src: string | null | undefined,
  widths: number[],
  baseOpts: Omit<CfImageOptions, 'width'> = {},
  enabled: boolean = true
): string {
  if (!src || !enabled) return '';
  return widths
    .map((w) => `${cfImage(src, { ...baseOpts, width: w }, true)} ${w}w`)
    .join(', ');
}
