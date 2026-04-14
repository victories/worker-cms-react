/**
 * FTS5 Full-Text Search library for posts
 * Uses BM25 ranking with weighted columns: title=10, content=1, excerpt=5
 */

/** Strip HTML tags from content for indexing */
function stripHtmlForIndex(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sanitize FTS5 query - escape special characters unless intentional quotes */
function sanitizeQuery(query: string): string {
  // Allow quoted phrases as-is
  if (query.includes('"')) return query;
  // Escape FTS5 special chars: * ^ ~ : AND OR NOT
  return query
    .replace(/[*^~:]/g, ' ')
    .replace(/\bAND\b/gi, '')
    .replace(/\bOR\b/gi, '')
    .replace(/\bNOT\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Index a post into FTS5 tables */
export async function indexPost(
  db: D1Database,
  post: { id: number; site_id: number; title: string; content: string | null; excerpt: string | null; language: string; status: string }
): Promise<void> {
  const cleanContent = stripHtmlForIndex(post.content || '');
  const cleanExcerpt = stripHtmlForIndex(post.excerpt || '');

  // Check if mapping exists
  const existing = await db.prepare(
    'SELECT rowid FROM posts_fts_map WHERE post_id = ?'
  ).bind(post.id).first<{ rowid: number }>();

  if (existing) {
    // Update: delete old FTS entry and re-insert
    await db.batch([
      db.prepare('DELETE FROM posts_fts WHERE rowid = ?').bind(existing.rowid),
      db.prepare('INSERT INTO posts_fts(rowid, title, content, excerpt) VALUES (?, ?, ?, ?)')
        .bind(existing.rowid, post.title || '', cleanContent, cleanExcerpt),
      db.prepare('UPDATE posts_fts_map SET site_id = ?, language = ?, status = ? WHERE rowid = ?')
        .bind(post.site_id, post.language, post.status, existing.rowid),
    ]);
  } else {
    // Insert new
    const ftsResult = await db.prepare(
      'INSERT INTO posts_fts(title, content, excerpt) VALUES (?, ?, ?) RETURNING rowid'
    ).bind(post.title || '', cleanContent, cleanExcerpt).first<{ rowid: number }>();

    if (ftsResult) {
      await db.prepare(
        'INSERT INTO posts_fts_map (rowid, post_id, site_id, language, status) VALUES (?, ?, ?, ?, ?)'
      ).bind(ftsResult.rowid, post.id, post.site_id, post.language, post.status).run();
    }
  }
}

/** Remove a post from FTS5 index */
export async function deindexPost(db: D1Database, postId: number): Promise<void> {
  const existing = await db.prepare(
    'SELECT rowid FROM posts_fts_map WHERE post_id = ?'
  ).bind(postId).first<{ rowid: number }>();

  if (existing) {
    await db.batch([
      db.prepare('DELETE FROM posts_fts WHERE rowid = ?').bind(existing.rowid),
      db.prepare('DELETE FROM posts_fts_map WHERE rowid = ?').bind(existing.rowid),
    ]);
  }
}

/** Search posts using FTS5 with BM25 relevance ranking */
export async function searchPostsFTS(
  db: D1Database,
  siteId: number,
  query: string,
  lang: string,
  page: number = 1,
  perPage: number = 10
): Promise<{ posts: any[]; total: number }> {
  const offset = (page - 1) * perPage;
  const sanitized = sanitizeQuery(query);

  if (!sanitized) {
    return { posts: [], total: 0 };
  }

  // Count matching results
  const countResult = await db.prepare(
    `SELECT COUNT(*) as total
     FROM posts_fts f
     JOIN posts_fts_map fm ON f.rowid = fm.rowid
     WHERE fm.site_id = ? AND fm.status = 'publish' AND fm.language = ?
     AND posts_fts MATCH ?`
  ).bind(siteId, lang, sanitized).first<{ total: number }>();

  // Fetch with BM25 ranking: title weight=10, content=1, excerpt=5
  const posts = await db.prepare(
    `SELECT p.*, u.display_name as author_name, u.email as author_email,
     m.r2_key as featured_image_url,
     bm25(posts_fts, 10.0, 1.0, 5.0) as relevance
     FROM posts_fts f
     JOIN posts_fts_map fm ON f.rowid = fm.rowid
     JOIN posts p ON fm.post_id = p.id
     LEFT JOIN users u ON p.author_id = u.id
     LEFT JOIN media m ON p.featured_image_id = m.id
     WHERE fm.site_id = ? AND fm.status = 'publish' AND fm.language = ?
     AND posts_fts MATCH ?
     ORDER BY bm25(posts_fts, 10.0, 1.0, 5.0)
     LIMIT ? OFFSET ?`
  ).bind(siteId, lang, sanitized, perPage, offset).all();

  return {
    posts: posts.results as any[],
    total: countResult?.total || 0,
  };
}

/** Rebuild FTS5 index for a site (or all sites if siteId is null) */
export async function rebuildIndex(
  db: D1Database,
  siteId?: number
): Promise<number> {
  // Clear existing index
  if (siteId) {
    const maps = await db.prepare('SELECT rowid FROM posts_fts_map WHERE site_id = ?').bind(siteId).all();
    for (const m of maps.results as any[]) {
      await db.prepare('DELETE FROM posts_fts WHERE rowid = ?').bind(m.rowid).run();
    }
    await db.prepare('DELETE FROM posts_fts_map WHERE site_id = ?').bind(siteId).run();
  } else {
    await db.prepare('DELETE FROM posts_fts').run();
    await db.prepare('DELETE FROM posts_fts_map').run();
  }

  // Re-index all posts in batches
  const where = siteId ? 'WHERE site_id = ?' : '';
  const binds = siteId ? [siteId] : [];

  const countResult = await db.prepare(`SELECT COUNT(*) as total FROM posts ${where}`).bind(...binds).first<{ total: number }>();
  const total = countResult?.total || 0;

  const BATCH = 100;
  let indexed = 0;

  for (let offset = 0; offset < total; offset += BATCH) {
    const batch = await db.prepare(
      `SELECT id, site_id, title, content, excerpt, language, status FROM posts ${where} LIMIT ? OFFSET ?`
    ).bind(...binds, BATCH, offset).all();

    for (const post of batch.results as any[]) {
      await indexPost(db, post);
      indexed++;
    }
  }

  return indexed;
}

/** Log a search query for analytics */
export async function logSearch(
  db: D1Database,
  siteId: number,
  query: string,
  resultsCount: number,
  lang: string
): Promise<void> {
  await db.prepare(
    'INSERT INTO search_logs (site_id, query, results_count, language) VALUES (?, ?, ?, ?)'
  ).bind(siteId, query, resultsCount, lang).run();
}
