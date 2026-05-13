// CSV Import — bulk-import posts from a comma-separated values file.
//
// Designed to mirror the WordPress WXR importer for the simpler case
// where the source is a flat spreadsheet rather than a WP export. The
// canonical column set is Worker CMS's own dump format (Name,
// Description, Content, Is Featured, Format Type, Image, Views, Slug,
// URL, Status, Categories, Tags) but the parser is permissive — any
// CSV with `title`/`Name`/`Başlık` and `content`/`Content`/`İçerik`
// columns is accepted.

// D1Database, R2Bucket, D1PreparedStatement are global ambient types
// from @cloudflare/workers-types — same convention as wp-import.ts.

// ── Parser ───────────────────────────────────────────────────────────

/**
 * RFC 4180-style CSV parser. Handles:
 * - BOM at the start of the file
 * - Quoted fields with embedded `""` (escaped quote)
 * - Multiline cells (newlines inside quotes)
 * - LF or CRLF line endings
 * - Trailing newline at EOF
 *
 * Returns rows of arrays of strings, including the header row at index 0.
 */
export function parseCSV(text: string): string[][] {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < n && text[i + 1] === '"') {
          // Escaped quote
          field += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    // Not in quotes
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      // Treat \r\n and bare \r the same way as \n
      if (i + 1 < n && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // Flush last field/row if there's content
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop a trailing empty row that comes from a final newline
  if (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }
  return rows;
}

// ── Header normalization ─────────────────────────────────────────────

/**
 * Map of recognised column aliases to canonical post fields.
 * Lowercase comparison; both EN and TR labels are accepted.
 */
const COLUMN_ALIASES: Record<string, string> = {
  // Title
  name: 'title',
  title: 'title',
  başlık: 'title',
  baslik: 'title',
  // Description / excerpt
  description: 'excerpt',
  excerpt: 'excerpt',
  özet: 'excerpt',
  ozet: 'excerpt',
  açıklama: 'excerpt',
  aciklama: 'excerpt',
  // Content
  content: 'content',
  body: 'content',
  içerik: 'content',
  icerik: 'content',
  // Slug
  slug: 'slug',
  // URL (original)
  url: 'url',
  link: 'url',
  // Image
  image: 'image',
  featured_image: 'image',
  öne_çıkan_görsel: 'image',
  // Status
  status: 'status',
  durum: 'status',
  // Categories
  categories: 'categories',
  category: 'categories',
  kategoriler: 'categories',
  kategori: 'categories',
  // Tags
  tags: 'tags',
  tag: 'tags',
  etiketler: 'tags',
  etiket: 'tags',
  // Misc
  views: 'views',
  görüntülenme: 'views',
  goruntulenme: 'views',
  is_featured: 'is_featured',
  featured: 'is_featured',
  format_type: 'format_type',
  format: 'format_type',
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export interface CsvHeaderInfo {
  /** canonical field → 0-based column index (or -1 when missing). */
  indexes: Record<string, number>;
  /** original header row, useful for displaying unknown columns. */
  raw: string[];
  /** unrecognised columns (kept for transparency, not imported). */
  unknown: string[];
}

export function inspectHeaders(headers: string[]): CsvHeaderInfo {
  const indexes: Record<string, number> = {};
  const unknown: string[] = [];
  for (let i = 0; i < headers.length; i++) {
    const norm = normalizeHeader(headers[i]);
    const canonical = COLUMN_ALIASES[norm];
    if (canonical) {
      // First occurrence wins.
      if (indexes[canonical] === undefined) indexes[canonical] = i;
    } else {
      unknown.push(headers[i]);
    }
  }
  return { indexes, raw: headers, unknown };
}

// ── Row → Item ───────────────────────────────────────────────────────

export interface CsvPostItem {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: 'publish' | 'draft' | 'pending' | 'private';
  categories: string[];
  tags: string[];
  image_url: string | null;
  source_url: string | null;
  views: number | null;
  is_featured: boolean;
  format_type: string | null;
  /** Row index (1-based, excluding header) — for error reporting. */
  row_number: number;
}

export interface CsvParseResult {
  headers: CsvHeaderInfo;
  items: CsvPostItem[];
  errors: string[];
}

const STATUS_MAP: Record<string, CsvPostItem['status']> = {
  publish: 'publish',
  published: 'publish',
  yayında: 'publish',
  yayinda: 'publish',
  yayinlandi: 'publish',
  draft: 'draft',
  taslak: 'draft',
  pending: 'pending',
  beklemede: 'pending',
  private: 'private',
  özel: 'private',
  ozel: 'private',
};

function slugify(text: string): string {
  // Turkish-friendly lower + diacritic strip + dash collapse.
  const map: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
  };
  return text
    .split('')
    .map((ch) => map[ch] || ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || 'post';
}

function splitList(value: string): string[] {
  if (!value) return [];
  return value
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse a CSV string into post items. Returns the raw header info,
 * the list of importable items, and a list of per-row warnings (rows
 * with empty title or content are dropped — those go into `errors`).
 */
export function parseCsvPosts(text: string): CsvParseResult {
  const rows = parseCSV(text);
  if (rows.length === 0) {
    return { headers: { indexes: {}, raw: [], unknown: [] }, items: [], errors: ['Empty file'] };
  }
  const headers = inspectHeaders(rows[0]);
  const items: CsvPostItem[] = [];
  const errors: string[] = [];

  if (headers.indexes.title === undefined) {
    errors.push('CSV must include a "Title" / "Name" / "Başlık" column.');
    return { headers, items, errors };
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((c) => !c || !c.trim())) continue; // blank line
    const get = (key: string): string => {
      const idx = headers.indexes[key];
      if (idx === undefined || idx >= row.length) return '';
      return row[idx] ?? '';
    };
    const title = get('title').trim();
    if (!title) {
      errors.push(`Row ${r + 1}: missing title — skipped`);
      continue;
    }
    const rawSlug = get('slug').trim();
    const slug = rawSlug || slugify(title);
    const content = get('content');
    const excerpt = get('excerpt').trim();
    const statusRaw = get('status').trim().toLowerCase();
    const status = STATUS_MAP[statusRaw] || 'publish';
    const categories = splitList(get('categories'));
    const tags = splitList(get('tags'));
    const image = get('image').trim() || null;
    const url = get('url').trim() || null;
    const viewsRaw = get('views').trim();
    const views = viewsRaw && /^\d+$/.test(viewsRaw) ? Number(viewsRaw) : null;
    const isFeaturedRaw = get('is_featured').trim().toLowerCase();
    const isFeatured =
      isFeaturedRaw === 'true' ||
      isFeaturedRaw === '1' ||
      isFeaturedRaw === 'yes' ||
      isFeaturedRaw === 'evet';
    const formatType = get('format_type').trim() || null;

    items.push({
      title,
      slug,
      content,
      excerpt,
      status,
      categories,
      tags,
      image_url: image,
      source_url: url,
      views,
      is_featured: isFeatured,
      format_type: formatType,
      row_number: r + 1,
    });
  }

  return { headers, items, errors };
}

// ── Importer ─────────────────────────────────────────────────────────

export interface CsvImportOptions {
  /** Default language for new posts. */
  defaultLanguage?: string;
  /** When true, replace existing posts that match by slug+language. */
  overwriteExisting?: boolean;
  /** When true, fetch each `image_url` and upload to R2. */
  importImages?: boolean;
}

export interface CsvImportResult {
  posts: { imported: number; updated: number; skipped: number; failed: number };
  taxonomies: { categories: number; tags: number };
  media: { imported: number; failed: number };
  errors: string[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    avif: 'image/avif', bmp: 'image/bmp',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * Run a parsed CSV import against D1. Reuses the same taxonomy/posts
 * tables as the WP importer so imported content is indistinguishable
 * from manually-authored posts.
 */
export async function importCsvPosts(
  db: D1Database,
  r2: R2Bucket,
  siteId: number,
  authorId: number,
  items: CsvPostItem[],
  options: CsvImportOptions = {}
): Promise<CsvImportResult> {
  const lang = options.defaultLanguage || 'tr';
  const result: CsvImportResult = {
    posts: { imported: 0, updated: 0, skipped: 0, failed: 0 },
    taxonomies: { categories: 0, tags: 0 },
    media: { imported: 0, failed: 0 },
    errors: [],
  };

  // ── Phase 1: collect unique categories + tags ──────────────────────
  const catSet = new Set<string>();
  const tagSet = new Set<string>();
  for (const item of items) {
    for (const c of item.categories) catSet.add(c);
    for (const t of item.tags) tagSet.add(t);
  }

  // Resolve / create categories. taxonomies.slug is unique per
  // (site_id, type, slug) — match by slug to avoid duplicates.
  const categoryMap = new Map<string, number>();
  const tagMap = new Map<string, number>();

  if (catSet.size > 0 || tagSet.size > 0) {
    const allTaxos = await db
      .prepare(`SELECT id, name, slug, type FROM taxonomies WHERE site_id = ? AND type IN ('category','tag')`)
      .bind(siteId)
      .all<{ id: number; name: string; slug: string; type: string }>();
    const existingByKey = new Map<string, number>();
    for (const row of allTaxos.results) {
      existingByKey.set(`${row.type}:${row.slug}`, row.id);
      // Also key by lower-case name for a forgiving match.
      existingByKey.set(`${row.type}:${row.name.toLowerCase()}`, row.id);
    }

    const newCatStmts: D1PreparedStatement[] = [];
    const newCatNames: string[] = [];
    for (const name of catSet) {
      const slug = slugify(name);
      const existing = existingByKey.get(`category:${slug}`) || existingByKey.get(`category:${name.toLowerCase()}`);
      if (existing) {
        categoryMap.set(name, existing);
      } else {
        newCatStmts.push(
          db.prepare(
            'INSERT INTO taxonomies (site_id, name, slug, type, language) VALUES (?, ?, ?, ?, ?)'
          ).bind(siteId, name, slug, 'category', lang)
        );
        newCatNames.push(name);
      }
    }
    const newTagStmts: D1PreparedStatement[] = [];
    const newTagNames: string[] = [];
    for (const name of tagSet) {
      const slug = slugify(name);
      const existing = existingByKey.get(`tag:${slug}`) || existingByKey.get(`tag:${name.toLowerCase()}`);
      if (existing) {
        tagMap.set(name, existing);
      } else {
        newTagStmts.push(
          db.prepare(
            'INSERT INTO taxonomies (site_id, name, slug, type, language) VALUES (?, ?, ?, ?, ?)'
          ).bind(siteId, name, slug, 'tag', lang)
        );
        newTagNames.push(name);
      }
    }

    // Run in chunks of 50.
    if (newCatStmts.length > 0) {
      const chunks = chunk(newCatStmts, 50);
      const nameChunks = chunk(newCatNames, 50);
      for (let ci = 0; ci < chunks.length; ci++) {
        try {
          const res = await db.batch(chunks[ci]);
          for (let i = 0; i < res.length; i++) {
            const id = res[i].meta.last_row_id;
            if (id) {
              categoryMap.set(nameChunks[ci][i], id);
              result.taxonomies.categories++;
            }
          }
        } catch (err) {
          result.errors.push(`Category insert: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
    if (newTagStmts.length > 0) {
      const chunks = chunk(newTagStmts, 50);
      const nameChunks = chunk(newTagNames, 50);
      for (let ci = 0; ci < chunks.length; ci++) {
        try {
          const res = await db.batch(chunks[ci]);
          for (let i = 0; i < res.length; i++) {
            const id = res[i].meta.last_row_id;
            if (id) {
              tagMap.set(nameChunks[ci][i], id);
              result.taxonomies.tags++;
            }
          }
        } catch (err) {
          result.errors.push(`Tag insert: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  // ── Phase 2: import posts ─────────────────────────────────────────
  // Pre-fetch existing post slugs for overwrite/skip decisions.
  const existingSlugs = new Map<string, number>();
  if (items.length > 0) {
    const slugList = items.map((i) => i.slug);
    // SQLite IN list batched in groups of 100.
    for (const slugChunk of chunk(slugList, 100)) {
      const placeholders = slugChunk.map(() => '?').join(',');
      const rows = await db
        .prepare(
          `SELECT id, slug FROM posts WHERE site_id = ? AND language = ? AND slug IN (${placeholders})`
        )
        .bind(siteId, lang, ...slugChunk)
        .all<{ id: number; slug: string }>();
      for (const row of rows.results) existingSlugs.set(row.slug, row.id);
    }
  }

  // Optionally download images to R2 and create media rows. We do this
  // sequentially because external HTTP can't go through D1.batch.
  const imageMediaIdByItemRow = new Map<number, number>();
  if (options.importImages) {
    for (const item of items) {
      if (!item.image_url) continue;
      try {
        const res = await fetch(item.image_url);
        if (!res.ok || !res.body) {
          result.media.failed++;
          continue;
        }
        const buf = await res.arrayBuffer();
        const urlObj = new URL(item.image_url);
        const filename = (urlObj.pathname.split('/').pop() || 'image').replace(/[^A-Za-z0-9._-]/g, '_');
        const now = new Date();
        const yr = now.getFullYear();
        const mo = String(now.getMonth() + 1).padStart(2, '0');
        const r2Key = `sites/${siteId}/uploads/${yr}/${mo}/${filename}`;
        const contentType = res.headers.get('content-type') || guessMimeType(filename);
        await r2.put(r2Key, buf, { httpMetadata: { contentType } });
        const ins = await db
          .prepare(
            'INSERT INTO media (site_id, r2_key, filename, mime_type, size, alt_text, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(siteId, r2Key, filename, contentType, buf.byteLength, item.title, authorId)
          .run();
        const mediaId = ins.meta.last_row_id;
        if (mediaId) {
          imageMediaIdByItemRow.set(item.row_number, mediaId);
          result.media.imported++;
        }
      } catch (err) {
        result.media.failed++;
        result.errors.push(`Media fetch (row ${item.row_number}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // Insert/update each post. Sequential so we can capture each new id
  // and immediately attach taxonomies; D1 is fast enough at ~99 rows.
  for (const item of items) {
    const featuredImageId = imageMediaIdByItemRow.get(item.row_number) ?? null;
    const existingId = existingSlugs.get(item.slug);

    try {
      let postId: number;
      if (existingId) {
        if (!options.overwriteExisting) {
          result.posts.skipped++;
          continue;
        }
        await db
          .prepare(
            `UPDATE posts SET title = ?, content = ?, excerpt = ?, status = ?,
             featured_image_id = COALESCE(?, featured_image_id), updated_at = datetime('now')
             WHERE id = ?`
          )
          .bind(item.title, item.content, item.excerpt || null, item.status, featuredImageId, existingId)
          .run();
        postId = existingId;
        result.posts.updated++;
        // Reset taxonomy links so we don't accumulate duplicates.
        await db.prepare('DELETE FROM post_taxonomies WHERE post_id = ?').bind(postId).run();
      } else {
        const ins = await db
          .prepare(
            `INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, featured_image_id, language, published_at)
             VALUES (?, ?, ?, ?, ?, ?, 'post', ?, ?, ?, CASE WHEN ? = 'publish' THEN datetime('now') ELSE NULL END)`
          )
          .bind(
            siteId, item.title, item.slug, item.content, item.excerpt || null,
            item.status, authorId, featuredImageId, lang, item.status
          )
          .run();
        const newId = ins.meta.last_row_id;
        if (!newId) {
          result.posts.failed++;
          result.errors.push(`Row ${item.row_number}: insert returned no id`);
          continue;
        }
        postId = newId;
        result.posts.imported++;
      }

      // Attach categories + tags (skip if name didn't resolve to an id).
      const taxoIds = new Set<number>();
      for (const c of item.categories) {
        const id = categoryMap.get(c);
        if (id) taxoIds.add(id);
      }
      for (const t of item.tags) {
        const id = tagMap.get(t);
        if (id) taxoIds.add(id);
      }
      if (taxoIds.size > 0) {
        const stmts = Array.from(taxoIds).map((tid) =>
          db
            .prepare('INSERT OR IGNORE INTO post_taxonomies (post_id, taxonomy_id) VALUES (?, ?)')
            .bind(postId, tid)
        );
        try {
          await db.batch(stmts);
        } catch (err) {
          result.errors.push(`Taxonomy link (row ${item.row_number}): ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      result.posts.failed++;
      result.errors.push(`Row ${item.row_number}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
