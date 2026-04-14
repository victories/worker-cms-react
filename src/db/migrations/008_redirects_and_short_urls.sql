-- URL Redirects (site-scoped)
CREATE TABLE IF NOT EXISTS redirects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  source_path TEXT NOT NULL,
  target_url TEXT,
  status_code INTEGER NOT NULL DEFAULT 301,
  is_active INTEGER DEFAULT 1,
  hit_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, source_path)
);
CREATE INDEX IF NOT EXISTS idx_redirects_lookup ON redirects(site_id, source_path, is_active);

-- Short URLs (global)
CREATE TABLE IF NOT EXISTS short_urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  slug TEXT UNIQUE,
  target_url TEXT NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_short_urls_slug ON short_urls(slug);
