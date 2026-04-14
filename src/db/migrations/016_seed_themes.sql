-- ============================================================
-- SEED: 8 System Theme Presets
-- Deterministic IDs so the migration is idempotent (INSERT OR IGNORE).
-- ============================================================

-- 1. Starter
INSERT OR IGNORE INTO themes (id, name, slug, description, version, author, css_variables, layout_config, google_fonts, is_system)
VALUES (
  'theme-starter',
  'Starter',
  'starter',
  'A clean, versatile theme with a white background and blue accent, perfect for getting started quickly.',
  '1.0.0',
  'System',
  '{"primary_color":"#2563eb","secondary_color":"#10b981","bg_color":"#f8fafc","surface_color":"#ffffff","text_color":"#1e293b","text_secondary_color":"#64748b","border_color":"#e2e8f0","header_bg_color":"#ffffff","header_text_color":"#0f172a","footer_bg_color":"#0f172a","footer_text_color":"#94a3b8","link_color":"#2563eb","link_hover_color":"#1d4ed8","font_family":"Inter","heading_font_family":"Inter"}',
  '{"header_style":"standard","sidebar_position":"right","sidebar_enabled":true,"footer_style":"three-column","post_card_style":"card","post_card_columns":1,"show_featured_image":true,"show_author":true,"show_date":true,"show_excerpt":true,"content_max_width":"1200px","nav_style":"default","posts_per_page":10}',
  '["Inter:400,500,600,700"]',
  1
);

-- 2. Modern
INSERT OR IGNORE INTO themes (id, name, slug, description, version, author, css_variables, layout_config, google_fonts, is_system)
VALUES (
  'theme-modern',
  'Modern',
  'modern',
  'A sophisticated theme with stone tones, teal accents, and elegant serif headings.',
  '1.0.0',
  'System',
  '{"primary_color":"#0d9488","secondary_color":"#f59e0b","bg_color":"#fafaf9","surface_color":"#ffffff","text_color":"#292524","text_secondary_color":"#78716c","border_color":"#e7e5e4","header_bg_color":"#1c1917","header_text_color":"#fafaf9","footer_bg_color":"#1c1917","footer_text_color":"#a8a29e","link_color":"#0d9488","link_hover_color":"#0f766e","font_family":"DM Sans","heading_font_family":"Playfair Display"}',
  '{"header_style":"standard","sidebar_position":"right","sidebar_enabled":true,"footer_style":"three-column","post_card_style":"card","post_card_columns":1,"show_featured_image":true,"show_author":true,"show_date":true,"show_excerpt":true,"content_max_width":"1200px","nav_style":"underline","posts_per_page":10}',
  '["DM Sans:400,500,700","Playfair Display:400,700"]',
  1
);

-- 3. Velvet
INSERT OR IGNORE INTO themes (id, name, slug, description, version, author, css_variables, layout_config, google_fonts, is_system)
VALUES (
  'theme-velvet',
  'Velvet',
  'velvet',
  'A dark, luxurious theme with purple and pink accents for a bold editorial look.',
  '1.0.0',
  'System',
  '{"primary_color":"#b9a9f5","secondary_color":"#f5a9c7","bg_color":"#13111a","surface_color":"#1d1b26","text_color":"#e8e4f0","text_secondary_color":"#9892b3","border_color":"#2e2b40","header_bg_color":"#0e0c17","header_text_color":"#e8e4f0","footer_bg_color":"#0e0c17","footer_text_color":"#9892b3","link_color":"#b9a9f5","link_hover_color":"#d4c8fa","font_family":"Plus Jakarta Sans","heading_font_family":"Outfit"}',
  '{"header_style":"standard","sidebar_position":"right","sidebar_enabled":true,"footer_style":"three-column","post_card_style":"card","post_card_columns":1,"show_featured_image":true,"show_author":true,"show_date":true,"show_excerpt":true,"content_max_width":"1200px","nav_style":"underline","posts_per_page":10}',
  '["Plus Jakarta Sans:400,500,600,700","Outfit:400,500,600,700"]',
  1
);

-- 4. Developer
INSERT OR IGNORE INTO themes (id, name, slug, description, version, author, css_variables, layout_config, google_fonts, is_system)
VALUES (
  'theme-developer',
  'Developer',
  'developer',
  'A dark, code-inspired theme with monospace fonts and a green accent for technical blogs.',
  '1.0.0',
  'System',
  '{"primary_color":"#39d353","secondary_color":"#f0883e","bg_color":"#0d1117","surface_color":"#161b22","text_color":"#c9d1d9","text_secondary_color":"#8b949e","border_color":"#30363d","header_bg_color":"#010409","header_text_color":"#f0f6fc","footer_bg_color":"#010409","footer_text_color":"#8b949e","link_color":"#58a6ff","link_hover_color":"#79c0ff","font_family":"JetBrains Mono","heading_font_family":"Fira Code"}',
  '{"header_style":"minimal","sidebar_position":"right","sidebar_enabled":false,"footer_style":"simple","post_card_style":"card","post_card_columns":1,"show_featured_image":true,"show_author":true,"show_date":true,"show_excerpt":true,"content_max_width":"1200px","nav_style":"default","posts_per_page":10}',
  '["JetBrains Mono:400,500,700","Fira Code:400,500"]',
  1
);

-- 5. Magazine
INSERT OR IGNORE INTO themes (id, name, slug, description, version, author, css_variables, layout_config, google_fonts, is_system)
VALUES (
  'theme-magazine',
  'Magazine',
  'magazine',
  'A warm, editorial theme with serif typography and a two-column card layout for news and magazine sites.',
  '1.0.0',
  'System',
  '{"primary_color":"#991b1b","secondary_color":"#b91c1c","bg_color":"#fef9f3","surface_color":"#ffffff","text_color":"#1c1917","text_secondary_color":"#57534e","border_color":"#d6d3d1","header_bg_color":"#fef9f3","header_text_color":"#1c1917","footer_bg_color":"#292524","footer_text_color":"#a8a29e","link_color":"#991b1b","link_hover_color":"#7f1d1d","font_family":"Source Serif Pro","heading_font_family":"Cormorant Garamond"}',
  '{"header_style":"centered","sidebar_position":"right","sidebar_enabled":true,"footer_style":"three-column","post_card_style":"card","post_card_columns":2,"show_featured_image":true,"show_author":true,"show_date":true,"show_excerpt":true,"content_max_width":"1200px","nav_style":"default","posts_per_page":10}',
  '["Cormorant Garamond:400,500,600,700","Source Serif Pro:400,600"]',
  1
);

-- 6. Minimal
INSERT OR IGNORE INTO themes (id, name, slug, description, version, author, css_variables, layout_config, google_fonts, is_system)
VALUES (
  'theme-minimal',
  'Minimal',
  'minimal',
  'A distraction-free theme with generous whitespace and understated gray accents.',
  '1.0.0',
  'System',
  '{"primary_color":"#6b7280","secondary_color":"#9ca3af","bg_color":"#ffffff","surface_color":"#f9fafb","text_color":"#111827","text_secondary_color":"#6b7280","border_color":"#e5e7eb","header_bg_color":"#ffffff","header_text_color":"#111827","footer_bg_color":"#f9fafb","footer_text_color":"#6b7280","link_color":"#4b5563","link_hover_color":"#1f2937","font_family":"Inter","heading_font_family":"Lora"}',
  '{"header_style":"minimal","sidebar_position":"right","sidebar_enabled":false,"footer_style":"simple","post_card_style":"card","post_card_columns":1,"show_featured_image":true,"show_author":true,"show_date":true,"show_excerpt":true,"content_max_width":"960px","nav_style":"default","posts_per_page":10}',
  '["Lora:400,500,600,700","Inter:400,500,600"]',
  1
);

-- 7. Corporate
INSERT OR IGNORE INTO themes (id, name, slug, description, version, author, css_variables, layout_config, google_fonts, is_system)
VALUES (
  'theme-corporate',
  'Corporate',
  'corporate',
  'A professional theme with a navy palette and clean Roboto typography for business websites.',
  '1.0.0',
  'System',
  '{"primary_color":"#1e3a5f","secondary_color":"#3b82f6","bg_color":"#f1f5f9","surface_color":"#ffffff","text_color":"#0f172a","text_secondary_color":"#475569","border_color":"#cbd5e1","header_bg_color":"#1e3a5f","header_text_color":"#f8fafc","footer_bg_color":"#0f172a","footer_text_color":"#94a3b8","link_color":"#1e3a5f","link_hover_color":"#1e40af","font_family":"Roboto","heading_font_family":"Roboto"}',
  '{"header_style":"standard","sidebar_position":"right","sidebar_enabled":true,"footer_style":"three-column","post_card_style":"card","post_card_columns":1,"show_featured_image":true,"show_author":true,"show_date":true,"show_excerpt":true,"content_max_width":"1200px","nav_style":"default","posts_per_page":10}',
  '["Roboto:400,500,700"]',
  1
);

-- 8. Creative
INSERT OR IGNORE INTO themes (id, name, slug, description, version, author, css_variables, layout_config, google_fonts, is_system)
VALUES (
  'theme-creative',
  'Creative',
  'creative',
  'A vibrant theme with orange accents and a three-column card grid for portfolios and creative agencies.',
  '1.0.0',
  'System',
  '{"primary_color":"#f97316","secondary_color":"#fb923c","bg_color":"#ffffff","surface_color":"#fff7ed","text_color":"#1c1917","text_secondary_color":"#78716c","border_color":"#fed7aa","header_bg_color":"#ffffff","header_text_color":"#1c1917","footer_bg_color":"#431407","footer_text_color":"#fdba74","link_color":"#f97316","link_hover_color":"#ea580c","font_family":"Montserrat","heading_font_family":"Poppins"}',
  '{"header_style":"centered","sidebar_position":"right","sidebar_enabled":false,"footer_style":"simple","post_card_style":"card","post_card_columns":3,"show_featured_image":true,"show_author":true,"show_date":true,"show_excerpt":true,"content_max_width":"1400px","nav_style":"default","posts_per_page":10}',
  '["Poppins:400,500,600,700,800","Montserrat:400,500,600"]',
  1
);
