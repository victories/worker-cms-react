-- 024: Theme Studio — site_design table.
--
-- Stores the user-editable design (style tokens + layout tree) for each
-- site. Replaces the old `themes` + `site_themes` model where users
-- could only pick a pre-made theme. New rows are seeded lazily by the
-- backend (`loadActiveDesign` returns built-in defaults until the
-- admin saves).
--
-- The legacy `themes` and `site_themes` tables are kept untouched here
-- so the existing PublisherLayout (Faz 5'e kadar) keeps rendering. They
-- get dropped in Faz 6 once the cutover is complete.

CREATE TABLE IF NOT EXISTS site_design (
  site_id INTEGER PRIMARY KEY,
  -- shadcn HSL token map + fonts (light + dark + fonts + google_fonts).
  style_tokens TEXT NOT NULL DEFAULT '{}',
  -- Region tree (header / body / footer / ...).
  layout_config TEXT NOT NULL DEFAULT '{}',
  -- Optional raw CSS injected after the generated <style> block.
  custom_css TEXT NOT NULL DEFAULT '',
  -- Google Fonts to preload, JSON array of "Family:weights" strings.
  google_fonts TEXT NOT NULL DEFAULT '[]',
  -- Slug of the preset the user started from (so the UI can show "based
  -- on Modern Blog"); plain text, validated by the API layer.
  preset_slug TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);
