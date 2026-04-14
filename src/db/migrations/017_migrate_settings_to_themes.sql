-- Migration: Auto-activate the correct system theme for each existing site
-- based on their theme_template setting.
--
-- For each site that doesn't have an active theme yet,
-- create a site_themes row linking to the matching system theme.

-- Step 1: Sites with theme_template = 'modern'
INSERT OR IGNORE INTO site_themes (id, site_id, theme_id, is_active, custom_overrides)
SELECT
  lower(hex(randomblob(8))),
  s.id,
  t.id,
  1,
  '{}'
FROM sites s
JOIN settings st ON st.site_id = s.id AND st.key = 'theme_template' AND st.value = 'modern'
JOIN themes t ON t.slug = 'modern'
WHERE NOT EXISTS (SELECT 1 FROM site_themes WHERE site_id = s.id AND is_active = 1);

-- Step 2: Sites with theme_template = 'velvet'
INSERT OR IGNORE INTO site_themes (id, site_id, theme_id, is_active, custom_overrides)
SELECT
  lower(hex(randomblob(8))),
  s.id,
  t.id,
  1,
  '{}'
FROM sites s
JOIN settings st ON st.site_id = s.id AND st.key = 'theme_template' AND st.value = 'velvet'
JOIN themes t ON t.slug = 'velvet'
WHERE NOT EXISTS (SELECT 1 FROM site_themes WHERE site_id = s.id AND is_active = 1);

-- Step 3: All remaining sites (no template set, or template = 'starter') → default to starter
INSERT OR IGNORE INTO site_themes (id, site_id, theme_id, is_active, custom_overrides)
SELECT
  lower(hex(randomblob(8))),
  s.id,
  t.id,
  1,
  '{}'
FROM sites s
JOIN themes t ON t.slug = 'starter'
WHERE NOT EXISTS (SELECT 1 FROM site_themes WHERE site_id = s.id AND is_active = 1);
