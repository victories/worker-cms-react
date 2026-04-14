-- Visual Schema Builder - Custom Content Types

CREATE TABLE IF NOT EXISTS content_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  name_singular TEXT,
  name_plural TEXT,
  description TEXT,
  icon TEXT DEFAULT 'file-text',
  fields TEXT NOT NULL DEFAULT '[]',
  supports TEXT DEFAULT '["title","editor","excerpt","thumbnail"]',
  taxonomies TEXT DEFAULT '["category","tag"]',
  has_archive INTEGER DEFAULT 1,
  is_hierarchical INTEGER DEFAULT 0,
  menu_position INTEGER DEFAULT 20,
  status TEXT DEFAULT 'active',
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(site_id, slug),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_content_types_site ON content_types(site_id, status);
