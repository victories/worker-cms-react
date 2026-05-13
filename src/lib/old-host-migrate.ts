// Migrate posts' images from an old host into this site's R2 bucket.
//
// Use case: a site was rebuilt and the post HTML is already in our DB,
// but the original images still live at `eski.example.com/<slug>` (or
// similar). For each post we fetch the old page, scan it for image
// URLs, download each unique image into R2, then either set the post's
// `featured_image_id` (when it's the page's hero) or rewrite the
// post's content to point at the R2 copy.
//
// Designed to be safe to re-run: each image is keyed by its filename
// + checksum so duplicates skip the upload step. A post that already
// has a `featured_image_id` is left alone unless `force = true`.

interface PostRow {
  id: number;
  slug: string;
  title: string;
  content: string | null;
  featured_image_id: number | null;
}

export interface MigrateOptions {
  /** Hostname (no scheme) where the original images live, e.g. `eski.hasangul.com`. */
  oldHost: string;
  /** Use https:// instead of http:// when fetching from oldHost. */
  https?: boolean;
  /** Pull featured image from the old page's og:image / first <img>. */
  setFeaturedImage?: boolean;
  /** Rewrite every <img src> in the saved post.content to a R2 URL. */
  rewriteContentImages?: boolean;
  /**
   * Replace post.content with the body extracted from the old page.
   * Useful when the local content was imported as plain text (e.g.
   * from a CSV without HTML images) but the original page contains
   * the full editor output. Combine with `rewriteContentImages` to
   * also pull in the inline image URLs.
   */
  replaceBodyFromOldPage?: boolean;
  /** When true, replace existing featured_image_id; otherwise leave it. */
  forceFeatured?: boolean;
  /** Limit the number of posts processed (handy for dry runs). */
  limit?: number;
}

export interface MigrateResult {
  scanned: number;
  pages_fetched: number;
  pages_failed: number;
  images_downloaded: number;
  images_reused: number;
  images_failed: number;
  featured_set: number;
  contents_rewritten: number;
  bodies_replaced: number;
  errors: string[];
}

const IMG_EXT_RE = /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i;

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml',
};

function safeFilename(name: string): string {
  return name
    .replace(/[?#].*$/, '')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .slice(0, 200);
}

function basenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop() || 'image';
    return safeFilename(last);
  } catch {
    return safeFilename(url.split('/').pop() || 'image');
  }
}

function guessMime(name: string, fallback?: string): string {
  if (fallback && fallback.startsWith('image/')) return fallback;
  const ext = (name.toLowerCase().match(/\.([a-z]+)(?:\?.*)?$/) || [])[1];
  return (ext && MIME_BY_EXT[ext]) || 'application/octet-stream';
}

function extractOgImage(html: string): string | null {
  const m =
    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  return m ? m[1] : null;
}

/**
 * Pull every <img src=...> URL out of an HTML blob, accepting both
 * quoted (`src="..."` / `src='...'`) and unquoted (`src=foo.jpg`)
 * attribute forms — old WordPress/PageSpeed output often emits the
 * latter to save bytes.
 */
function extractContentImageSrcs(html: string): string[] {
  const out: string[] = [];
  const re = /<img[^>]*?\ssrc=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push(m[1] || m[2] || m[3]);
  }
  return out;
}

/**
 * Try to isolate the article body from a fetched HTML page. We look
 * for the most common content containers in order of preference; the
 * first match wins. Falls back to the `<body>...</body>` blob when
 * nothing matches so callers always get *something*.
 */
function extractBody(html: string): string | null {
  const candidates = [
    /<div\s[^>]*class=["'][^"']*\bck-content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div\s[^>]*class=["'][^"']*toc-container/i,
    /<div\s[^>]*class=["'][^"']*\bck-content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<aside|<footer)/i,
    /<div\s[^>]*class=["'][^"']*\bck-content\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/i,
    /<div\s[^>]*class=["'][^"']*\bpost__content\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/i,
    /<div\s[^>]*class=["'][^"']*\bentry-content\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/i,
    /<article\s[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];
  for (const re of candidates) {
    const m = html.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

/**
 * Find every <img src> in the HTML and replace it with the rewritten
 * URL provided by `mapper`. Mapper returns null to leave the original
 * untouched. Handles both quoted and unquoted src attributes.
 */
function rewriteImgSrc(html: string, mapper: (src: string) => string | null): string {
  return html.replace(
    /(<img[^>]*?\ssrc=)(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi,
    (full, prefix, dq, sq, bare) => {
      const original = dq || sq || bare;
      const next = mapper(original);
      if (next === null || next === original) return full;
      // Always emit double-quoted form when we rewrite (cleaner output).
      return `${prefix}"${next}"`;
    }
  );
}

function resolveUrl(src: string, base: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

/**
 * Pull every domain registered for a site (apex + www variants) so we
 * can detect "self-referencing" URLs in the old content. Old WordPress
 * posts often hardcode `https://hasangul.com/storage/foo.png` even
 * though the file lives on `eski.hasangul.com`; we rewrite those at
 * fetch time.
 */
async function getCurrentSiteHosts(db: D1Database, siteId: number): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const rows = await db
      .prepare('SELECT domain FROM site_domains WHERE site_id = ?')
      .bind(siteId)
      .all<{ domain: string }>();
    for (const r of rows.results || []) {
      const d = (r.domain || '').toLowerCase().replace(/:\d+$/, '');
      if (!d) continue;
      out.add(d);
      // Add the matching www / non-www variant.
      if (d.startsWith('www.')) out.add(d.slice(4));
      else out.add('www.' + d);
    }
  } catch {
    // If lookup fails we just skip the rewrite — the migration still
    // works for absolute oldHost references.
  }
  return out;
}

/**
 * Swap an absolute URL's hostname to `oldHost` when its current host
 * is one of the site's registered domains. Returns the URL unchanged
 * otherwise. Idempotent — calling twice is a no-op.
 */
function rewriteSelfRef(absUrl: string, currentHosts: Set<string>, oldHost: string, scheme: 'http' | 'https'): string {
  try {
    const u = new URL(absUrl);
    if (currentHosts.has(u.hostname.toLowerCase())) {
      u.hostname = oldHost;
      u.protocol = scheme + ':';
      return u.toString();
    }
    return absUrl;
  } catch {
    return absUrl;
  }
}

function isImageUrl(url: string): boolean {
  return IMG_EXT_RE.test(url);
}

/**
 * Fetch + upload one remote image into R2 if we haven't seen it yet.
 *
 * Returns the existing media row's id when it's already imported (keyed
 * by `source_url` written into the alt_text JSON blob — yes, it's a hack;
 * see `MIGRATION_SOURCE_PREFIX` for why). On success it inserts a media
 * row and returns its id.
 */
async function fetchAndStoreImage(
  db: D1Database,
  r2: R2Bucket,
  siteId: number,
  authorId: number,
  remoteUrl: string,
  result: MigrateResult,
  cache: Map<string, number | null>
): Promise<number | null> {
  // De-dupe within a single migration run.
  if (cache.has(remoteUrl)) {
    const cached = cache.get(remoteUrl)!;
    if (cached !== null) result.images_reused++;
    return cached;
  }

  // Check whether we've imported this exact URL before. We store the
  // remote URL in `caption` so the lookup is straightforward.
  const existing = await db
    .prepare(
      `SELECT id FROM media WHERE site_id = ? AND caption = ? LIMIT 1`
    )
    .bind(siteId, MIGRATION_SOURCE_PREFIX + remoteUrl)
    .first<{ id: number }>();
  if (existing?.id) {
    cache.set(remoteUrl, existing.id);
    result.images_reused++;
    return existing.id;
  }

  // Fetch.
  let res: Response;
  try {
    res = await fetch(remoteUrl, {
      headers: { 'user-agent': 'WorkerCMS-Migration/1.0' },
    });
  } catch (err) {
    cache.set(remoteUrl, null);
    result.images_failed++;
    result.errors.push(`fetch ${remoteUrl}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
  if (!res.ok || !res.body) {
    cache.set(remoteUrl, null);
    result.images_failed++;
    result.errors.push(`fetch ${remoteUrl}: HTTP ${res.status}`);
    return null;
  }
  const contentType = res.headers.get('content-type') || '';
  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0) {
    cache.set(remoteUrl, null);
    result.images_failed++;
    return null;
  }

  const filename = basenameFromUrl(remoteUrl);
  const mime = guessMime(filename, contentType);
  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const r2Key = `sites/${siteId}/uploads/${yr}/${mo}/${filename}`;

  try {
    await r2.put(r2Key, buf, { httpMetadata: { contentType: mime } });
  } catch (err) {
    cache.set(remoteUrl, null);
    result.images_failed++;
    result.errors.push(`R2 put ${r2Key}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  // Insert media row. caption holds the remote-source URL so re-runs
  // can dedupe; alt_text gets the filename for accessibility.
  let mediaId: number | null = null;
  try {
    const ins = await db
      .prepare(
        `INSERT INTO media (site_id, r2_key, filename, mime_type, size, alt_text, caption, author_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        siteId,
        r2Key,
        filename,
        mime,
        buf.byteLength,
        filename,
        MIGRATION_SOURCE_PREFIX + remoteUrl,
        authorId
      )
      .run();
    mediaId = ins.meta.last_row_id ?? null;
  } catch (err) {
    // UNIQUE on r2_key — fall back to the existing row.
    const existing = await db
      .prepare('SELECT id FROM media WHERE site_id = ? AND r2_key = ? LIMIT 1')
      .bind(siteId, r2Key)
      .first<{ id: number }>();
    if (existing?.id) {
      mediaId = existing.id;
      result.images_reused++;
    } else {
      result.images_failed++;
      result.errors.push(`insert media ${r2Key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  cache.set(remoteUrl, mediaId);
  if (mediaId) result.images_downloaded++;
  return mediaId;
}

export const MIGRATION_SOURCE_PREFIX = 'migrated:';

/**
 * Build the in-site public URL for a media row given its r2_key.
 * Mirrors the rewrite that the existing /uploads route does so the
 * <img> srcs the rewrite emits resolve correctly.
 */
function mediaPublicUrl(siteId: number, r2Key: string): string {
  return `/uploads/${r2Key.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}`;
}

export async function migrateFromOldHost(
  db: D1Database,
  r2: R2Bucket,
  siteId: number,
  authorId: number,
  options: MigrateOptions
): Promise<MigrateResult> {
  const result: MigrateResult = {
    scanned: 0,
    pages_fetched: 0,
    pages_failed: 0,
    images_downloaded: 0,
    images_reused: 0,
    images_failed: 0,
    featured_set: 0,
    contents_rewritten: 0,
    bodies_replaced: 0,
    errors: [],
  };

  const setFeatured = options.setFeaturedImage !== false; // default on
  const rewriteContent = options.rewriteContentImages !== false; // default on
  const replaceBody = options.replaceBodyFromOldPage === true;
  const force = options.forceFeatured === true;
  const scheme: 'http' | 'https' = options.https === false ? 'http' : 'https';

  // Hosts that are 'us' — anything pointing at these in the old
  // content is really meant to live on `oldHost`. We swap the host
  // before fetching so the request actually finds the file.
  const currentSiteHosts = await getCurrentSiteHosts(db, siteId);

  let q = `SELECT id, slug, title, content, featured_image_id
           FROM posts WHERE site_id = ? AND post_type = 'post'
           ORDER BY published_at DESC, id ASC`;
  if (options.limit && options.limit > 0) q += ` LIMIT ${Math.floor(options.limit)}`;
  const posts = await db.prepare(q).bind(siteId).all<PostRow>();

  // Per-run de-dupe so the same image referenced from multiple posts
  // is only fetched once.
  const cache = new Map<string, number | null>();

  for (const post of posts.results || []) {
    result.scanned++;

    const pageUrl = `${scheme}://${options.oldHost}/${encodeURIComponent(post.slug)}`;
    let html = '';
    try {
      const res = await fetch(pageUrl, {
        headers: { 'user-agent': 'WorkerCMS-Migration/1.0' },
      });
      if (!res.ok) {
        result.pages_failed++;
        result.errors.push(`page ${pageUrl}: HTTP ${res.status}`);
        continue;
      }
      html = await res.text();
      result.pages_fetched++;
    } catch (err) {
      result.pages_failed++;
      result.errors.push(`page ${pageUrl}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    // ── Featured image ─────────────────────────────────────────────
    if (setFeatured && (force || post.featured_image_id == null)) {
      const og = extractOgImage(html);
      const firstContentImg = extractContentImageSrcs(html)[0];
      const candidate = og || firstContentImg;
      if (candidate) {
        const resolved = resolveUrl(candidate, pageUrl);
        // Self-referencing URLs (https://hasangul.com/storage/...) get
        // their host swapped to oldHost; everything else passes through.
        const abs = resolved
          ? rewriteSelfRef(resolved, currentSiteHosts, options.oldHost, scheme)
          : null;
        if (abs && isImageUrl(abs)) {
          const mediaId = await fetchAndStoreImage(
            db, r2, siteId, authorId, abs, result, cache
          );
          if (mediaId) {
            await db
              .prepare('UPDATE posts SET featured_image_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
              .bind(mediaId, post.id)
              .run();
            result.featured_set++;
          }
        }
      }
    }

    // ── Optionally swap in the old page's body ────────────────────
    // When the saved content was imported from a CSV / WP export and
    // doesn't contain the full HTML output, we can pull the editor
    // body straight off the old page and use that instead.
    let workingContent = post.content || '';
    if (replaceBody) {
      const extracted = extractBody(html);
      if (extracted && extracted.trim().length > 0) {
        workingContent = extracted.trim();
        await db
          .prepare('UPDATE posts SET content = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .bind(workingContent, post.id)
          .run();
        result.bodies_replaced++;
      }
    }

    // ── Content image rewrite ─────────────────────────────────────
    // Pull every unique <img src> from the working content (which may
    // be the freshly-replaced body, or the original DB content). For
    // each external URL, fetch + push to R2 and rewrite the saved
    // post.content to the local URL.
    if (rewriteContent && /<img[^>]*?\ssrc=/i.test(workingContent)) {
      const srcs = extractContentImageSrcs(workingContent);
      const mapping = new Map<string, string>();
      for (const original of srcs) {
        if (mapping.has(original)) continue;
        // Skip URLs that already point to our R2 layout.
        if (original.startsWith('/uploads/') || original.includes(`/s/${siteId}/`)) continue;
        const resolved =
          resolveUrl(original, pageUrl) ||
          resolveUrl(original, `${scheme}://${options.oldHost}/`);
        // Old content often hardcodes `https://hasangul.com/...` even
        // though the file lives on `eski.hasangul.com`. Swap the host
        // before fetching so the request actually finds the file.
        const abs = resolved
          ? rewriteSelfRef(resolved, currentSiteHosts, options.oldHost, scheme)
          : null;
        if (!abs || !isImageUrl(abs)) continue;
        const mediaId = await fetchAndStoreImage(
          db, r2, siteId, authorId, abs, result, cache
        );
        if (!mediaId) continue;
        const row = await db
          .prepare('SELECT r2_key FROM media WHERE id = ?')
          .bind(mediaId)
          .first<{ r2_key: string }>();
        if (row?.r2_key) {
          mapping.set(original, mediaPublicUrl(siteId, row.r2_key));
        }
      }
      if (mapping.size > 0) {
        const next = rewriteImgSrc(workingContent, (src) => mapping.get(src) ?? null);
        if (next !== workingContent) {
          await db
            .prepare('UPDATE posts SET content = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .bind(next, post.id)
            .run();
          result.contents_rewritten++;
        }
      }
    }
  }

  return result;
}
