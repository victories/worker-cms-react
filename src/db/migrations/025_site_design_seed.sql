-- 025: Theme Studio — default `site_design` row for every existing site.
--
-- Faz 6 cutover step (1/2). After Faz 5 the public SSR renderer reads
-- from `site_design` when a row exists; until now the UI lazily wrote
-- one only when an admin saved. This migration backfills every existing
-- site so the "Tasarım" admin page loads with a fully populated layout
-- (header / body / footer) instead of an empty canvas.
--
-- The seed mirrors the snapshot used by `buildDefaultDesign()` in
-- `src/lib/themes/design.ts`:
--   - empty style_tokens '{}'  — loadActiveDesign synthesises light/dark
--     palette + fonts on the fly from the canonical neutral palette,
--     so we don't bake palette values into the DB at seed time.
--   - layout_config: the same three-region tree the React SSR layout
--     renders for the default Publisher experience (logo + menu +
--     search header; main + sidebar body; four-widget footer).
--   - custom_css: empty
--   - google_fonts: '[]'  — load defaults from code instead.
--   - preset_slug: 'default'  — admin UI shows "based on Default".
--
-- INSERT OR IGNORE keeps already-customised sites untouched. Safe to
-- re-run.

INSERT OR IGNORE INTO site_design (
  site_id,
  style_tokens,
  layout_config,
  custom_css,
  google_fonts,
  preset_slug
)
SELECT
  s.id,
  '{}',
  '{"header":{"type":"row","padding":"md","sticky":true,"columns":[{"width":25,"slots":[{"id":"logo","props":{}}]},{"width":50,"slots":[{"id":"menu","props":{}}]},{"width":25,"slots":[{"id":"search","props":{}},{"id":"user-actions","props":{}}]}]},"body":{"type":"row","padding":"lg","columns":[{"width":70,"slots":[{"id":"main-content","props":{}}]},{"width":30,"slots":[{"id":"widget:recent-posts","props":{"count":5}},{"id":"widget:categories","props":{}}]}]},"footer":{"type":"row","padding":"md","columns":[{"width":25,"slots":[{"id":"widget:about","props":{}}]},{"width":25,"slots":[{"id":"widget:categories","props":{}}]},{"width":25,"slots":[{"id":"widget:recent-posts","props":{"count":5}}]},{"width":25,"slots":[{"id":"widget:newsletter","props":{}}]}]}}',
  '',
  '[]',
  'default'
FROM sites s
WHERE NOT EXISTS (
  SELECT 1 FROM site_design d WHERE d.site_id = s.id
);
