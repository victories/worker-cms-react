-- FTS5 Full-Text Search for Posts
-- Uses porter stemming for better Turkish/English word matching

-- FTS5 virtual table for searchable post content
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title,
  content,
  excerpt,
  tokenize='porter unicode61'
);

-- Mapping table to link FTS rowids to actual post records
-- Needed because FTS5 virtual tables can't store arbitrary columns like site_id
CREATE TABLE IF NOT EXISTS posts_fts_map (
  rowid INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL,
  site_id INTEGER NOT NULL,
  language TEXT NOT NULL DEFAULT 'tr',
  status TEXT NOT NULL DEFAULT 'draft'
);
CREATE INDEX IF NOT EXISTS idx_fts_map_site ON posts_fts_map(site_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fts_map_post ON posts_fts_map(post_id);

-- Search analytics
CREATE TABLE IF NOT EXISTS search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  language TEXT DEFAULT 'tr',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_search_logs_site ON search_logs(site_id, created_at);
