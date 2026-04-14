-- ============================================================
-- THEME SYSTEM TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  version TEXT DEFAULT '1.0.0',
  author TEXT DEFAULT 'System',
  css_variables TEXT NOT NULL DEFAULT '{}',
  layout_config TEXT NOT NULL DEFAULT '{}',
  google_fonts TEXT DEFAULT '[]',
  custom_css TEXT DEFAULT '',
  custom_head_html TEXT DEFAULT '',
  thumbnail_r2_key TEXT,
  is_system INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_themes_slug ON themes(slug);

CREATE TABLE IF NOT EXISTS site_themes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  site_id INTEGER NOT NULL,
  theme_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  custom_overrides TEXT DEFAULT '{}',
  installed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE,
  UNIQUE(site_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_site_themes_site ON site_themes(site_id);
CREATE INDEX IF NOT EXISTS idx_site_themes_active ON site_themes(site_id, is_active);
