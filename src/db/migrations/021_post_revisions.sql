-- Post revision history
CREATE TABLE IF NOT EXISTS post_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  site_id INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  meta TEXT,
  revision_type TEXT DEFAULT 'manual',
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_revisions_post ON post_revisions(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revisions_site ON post_revisions(site_id, post_id);
