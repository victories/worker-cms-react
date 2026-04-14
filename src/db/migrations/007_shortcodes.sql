-- Shortcodes (İçerik Enjektörü)
-- site_id NULL = global (all sites), site_id set = site-specific
CREATE TABLE IF NOT EXISTS shortcodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shortcodes_site ON shortcodes(site_id);
CREATE INDEX IF NOT EXISTS idx_shortcodes_name ON shortcodes(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shortcodes_site_name ON shortcodes(site_id, name);
