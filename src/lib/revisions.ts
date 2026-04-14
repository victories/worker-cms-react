export interface Revision {
  id: number;
  post_id: number;
  site_id: number;
  title: string | null;
  content: string | null;
  excerpt: string | null;
  meta: string | null;
  revision_type: string;
  created_by: number | null;
  created_at: string;
}

export async function createRevision(
  db: D1Database,
  post: { id: number; site_id: number; title?: string; content?: string; excerpt?: string; post_meta?: string },
  userId: number,
  type: 'manual' | 'autosave' = 'manual'
): Promise<number> {
  const result = await db.prepare(
    `INSERT INTO post_revisions (post_id, site_id, title, content, excerpt, meta, revision_type, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    post.id, post.site_id,
    post.title || null, post.content || null, post.excerpt || null,
    post.post_meta || null,
    type, userId
  ).first<{ id: number }>();

  return result?.id || 0;
}

export async function getRevisions(
  db: D1Database,
  postId: number,
  limit = 20
): Promise<Revision[]> {
  const result = await db.prepare(
    `SELECT r.*, u.display_name as author_name
     FROM post_revisions r
     LEFT JOIN users u ON r.created_by = u.id
     WHERE r.post_id = ?
     ORDER BY r.created_at DESC
     LIMIT ?`
  ).bind(postId, limit).all();

  return result.results as any[];
}

export async function getRevision(
  db: D1Database,
  revisionId: number
): Promise<Revision | null> {
  return db.prepare(
    'SELECT * FROM post_revisions WHERE id = ?'
  ).bind(revisionId).first<Revision>();
}

export async function restoreRevision(
  db: D1Database,
  revisionId: number,
  postId: number,
  userId: number
): Promise<void> {
  const revision = await getRevision(db, revisionId);
  if (!revision || revision.post_id !== postId) {
    throw new Error('Revision not found or does not belong to this post');
  }

  // Save current state as a new revision before restoring
  const current = await db.prepare(
    'SELECT id, site_id, title, content, excerpt FROM posts WHERE id = ?'
  ).bind(postId).first<any>();

  if (current) {
    await createRevision(db, current, userId, 'manual');
  }

  // Restore the selected revision
  await db.prepare(
    `UPDATE posts SET title = ?, content = ?, excerpt = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    revision.title, revision.content, revision.excerpt,
    postId
  ).run();
}

export async function cleanupRevisions(
  db: D1Database,
  postId: number,
  keepCount = 50
): Promise<void> {
  await db.prepare(
    `DELETE FROM post_revisions
     WHERE post_id = ? AND id NOT IN (
       SELECT id FROM post_revisions WHERE post_id = ? ORDER BY created_at DESC LIMIT ?
     )`
  ).bind(postId, postId, keepCount).run();
}
