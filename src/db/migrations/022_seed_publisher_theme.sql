-- ============================================================
-- SEED: Publisher theme (9th system theme)
--
-- Premium editorial layout with a dashboard sidebar, top + mid
-- ad slots, a 4-column footer, and 4 swappable pastel palettes
-- (Lavender / Blush / Cream / Periwinkle) each with light + dark
-- variants. Palette selection + color mode is stored in
-- site_themes.custom_overrides, so NO schema changes are needed.
--
-- Idempotent via INSERT OR IGNORE + deterministic id.
-- ============================================================

INSERT OR IGNORE INTO themes (
  id,
  name,
  slug,
  description,
  version,
  author,
  css_variables,
  layout_config,
  google_fonts,
  is_system
)
VALUES (
  'theme-publisher',
  'Publisher',
  'publisher',
  'A premium editorial theme with a dashboard sidebar, ad slots, 4 swappable pastel palettes, and built-in dark mode.',
  '1.0.0',
  'System',
  '{"primary_color":"#8B7AB5","secondary_color":"#B9A7DB","bg_color":"#F0EBF5","surface_color":"#FFFFFF","text_color":"#2C2533","text_secondary_color":"#6B6378","border_color":"#E5DEF0","header_bg_color":"#FFFFFF","header_text_color":"#2C2533","footer_bg_color":"#F5F2F8","footer_text_color":"#6B6378","link_color":"#8B7AB5","link_hover_color":"#6D5C94","font_family":"Plus Jakarta Sans","heading_font_family":"Playfair Display"}',
  '{"header_style":"standard","sidebar_position":"right","sidebar_enabled":true,"footer_style":"four-column","post_card_style":"card","post_card_columns":1,"show_featured_image":true,"show_author":true,"show_date":true,"show_excerpt":true,"content_max_width":"1400px","nav_style":"default","posts_per_page":10}',
  '["Plus Jakarta Sans:400,500,600,700","Playfair Display:400,500,600,700"]',
  1
);
