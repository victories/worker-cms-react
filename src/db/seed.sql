-- Seed: İlk site, Super Admin, default-publisher teması, başlangıç ayarları.
-- Faz 5 sonrası: eski çok-şablonlu tema sistemi (8 theme preset) silindi,
-- yerine tek built-in `default-publisher` teması + 8 shadcn palette geldi.

-- ============================================================
-- 1. Site & user
-- ============================================================

-- İlk site
INSERT INTO sites (name, slug, description, status, default_language)
VALUES ('Ana Site', 'ana-site', 'Varsayılan site', 'active', 'tr');

-- İlk site domain (localhost geliştirme için)
INSERT INTO site_domains (site_id, domain, is_primary)
VALUES (1, 'localhost:8787', 1);

-- Super Admin kullanıcı
-- Şifre: admin123 (scrypt hash - seed için basit, üretimde değiştirilmeli)
-- Bu hash değeri runtime'da oluşturulacak, seed için placeholder
INSERT INTO users (email, password_hash, display_name, role, language)
VALUES ('admin@example.com', '$scrypt$n=16384,r=8,p=1$SEED_PLACEHOLDER$HASH_PLACEHOLDER', 'Super Admin', 'super_admin', 'tr');

-- ============================================================
-- 2. Theme system — default-publisher + neutral palette
-- ============================================================
--
-- Faz 5 yeniden yazımı: 016_seed_themes.sql + 022_seed_publisher_theme.sql
-- ile yüklenen eski 8 preset artık kullanılmıyor. Seed her çalıştığında
-- themes + site_themes boşaltılır ve temiz default-publisher kurulur.
--
-- `css_variables` bloğu shadcn'in "neutral" palette'inin LIGHT mode HSL
-- triple'larını içerir. Dark mode ve diğer palette varyantları
-- src/lib/themes/palettes.ts'de runtime'da uygulanır; DB'ye yazılmaz.
-- `layout_config` alanı ThemeManifest v2 (manifest_version: 2) tutar.

DELETE FROM site_themes;
DELETE FROM themes;

INSERT INTO themes (
  id, name, slug, description, version, author,
  css_variables, layout_config, google_fonts, is_system
) VALUES (
  'default-publisher',
  'Default Publisher',
  'default-publisher',
  'shadcn/ui tabanlı varsayılan tema — 8 palette varyantı (neutral, zinc, slate, stone, rose, blue, emerald, violet) ve built-in dark mode.',
  '2.0.0',
  'System',
  '{"--background":"0 0% 100%","--foreground":"0 0% 3.9%","--card":"0 0% 100%","--card-foreground":"0 0% 3.9%","--popover":"0 0% 100%","--popover-foreground":"0 0% 3.9%","--primary":"0 0% 9%","--primary-foreground":"0 0% 98%","--secondary":"0 0% 96.1%","--secondary-foreground":"0 0% 9%","--muted":"0 0% 96.1%","--muted-foreground":"0 0% 45.1%","--accent":"0 0% 96.1%","--accent-foreground":"0 0% 9%","--destructive":"0 84.2% 60.2%","--destructive-foreground":"0 0% 98%","--border":"0 0% 89.8%","--input":"0 0% 89.8%","--ring":"0 0% 3.9%","--radius":"0.5rem"}',
  '{"manifest_version":2,"entry":"publisher","palette_variants":["neutral","zinc","slate","stone","rose","blue","emerald","violet"],"features":{"darkMode":true,"search":true,"adSlots":{"top":true,"mid":true}}}',
  '["Inter:400,500,600,700"]',
  1
);

-- Varsayılan siteyi default-publisher'a neutral palette ile bağla.
INSERT INTO site_themes (id, site_id, theme_id, is_active, custom_overrides)
VALUES (
  lower(hex(randomblob(8))),
  1,
  'default-publisher',
  1,
  '{"palette":"neutral","mode":"light"}'
);

-- ============================================================
-- 3. Site settings
-- ============================================================

INSERT INTO settings (site_id, key, value) VALUES (1, 'site_title', 'Ana Site');
INSERT INTO settings (site_id, key, value) VALUES (1, 'site_description', 'WP-CMS ile oluşturulmuş site');
INSERT INTO settings (site_id, key, value) VALUES (1, 'posts_per_page', '10');
INSERT INTO settings (site_id, key, value) VALUES (1, 'date_format', 'DD.MM.YYYY');
INSERT INTO settings (site_id, key, value) VALUES (1, 'time_format', 'HH:mm');
INSERT INTO settings (site_id, key, value) VALUES (1, 'default_comment_status', 'open');
INSERT INTO settings (site_id, key, value) VALUES (1, 'amp_enabled', '1');
INSERT INTO settings (site_id, key, value) VALUES (1, 'amp_url_format', 'custom_domain');
INSERT INTO settings (site_id, key, value) VALUES (1, 'site_tagline', 'React SSR üzerine kurulu modern CMS');
INSERT INTO settings (site_id, key, value) VALUES (1, 'theme_footer_text', '© Ana Site — Tüm hakları saklıdır.');

-- Global ayarlar
INSERT INTO global_settings (key, value) VALUES ('version', '2.0.0');
INSERT INTO global_settings (key, value) VALUES ('setup_complete', '0');
INSERT INTO global_settings (key, value) VALUES ('default_language', 'tr');
INSERT INTO global_settings (key, value) VALUES ('available_languages', '["tr","en"]');

-- ============================================================
-- 4. Taxonomies & menu
-- ============================================================

-- Varsayılan kategoriler
INSERT INTO taxonomies (site_id, name, slug, type, language) VALUES (1, 'Genel', 'genel', 'category', 'tr');
INSERT INTO taxonomies (site_id, name, slug, type, language) VALUES (1, 'General', 'general', 'category', 'en');

-- Varsayılan menü
INSERT INTO menus (site_id, name, slug, location, language) VALUES (1, 'Ana Menü', 'ana-menu', 'primary', 'tr');
INSERT INTO menu_items (menu_id, title, url, item_type, position) VALUES (1, 'Ana Sayfa', '/', 'custom', 0);

-- ============================================================
-- 5. Bundled plugins
-- ============================================================
--
-- Plugin API v2 — hook names use the `ui.*` React-node namespace.

INSERT INTO plugins (slug, name, description, version, author, entry_point, hooks, settings_schema)
VALUES (
  'seo-optimizer',
  'SEO Optimizer',
  'Automatically optimizes posts for search engines with meta tags, Open Graph, and content analysis',
  '2.0.0',
  'WP-CMS',
  'plugins/seo-optimizer',
  '["post.beforeSave","ui.head","ui.slot.postHeader"]',
  '{"autoMetaDescription":{"type":"boolean","default":true,"label":"Auto Meta Description","description":"Automatically generate meta description from content"},"maxTitleLength":{"type":"number","default":60,"label":"Max Title Length","description":"Maximum recommended title length for SEO"},"addReadingTime":{"type":"boolean","default":true,"label":"Add Reading Time","description":"Add estimated reading time to posts"},"noindexDrafts":{"type":"boolean","default":true,"label":"Noindex Drafts","description":"Add noindex tag to draft posts"}}'
);

INSERT INTO plugins (slug, name, description, version, author, entry_point, hooks, settings_schema)
VALUES (
  'social-share',
  'Social Share',
  'Adds social media sharing buttons to posts',
  '2.0.0',
  'WP-CMS',
  'plugins/social-share',
  '["ui.slot.postFooter","ui.bodyEnd"]',
  '{"platforms":{"type":"string","default":"x,facebook,linkedin,whatsapp","label":"Platforms","description":"Comma-separated list of platforms"},"style":{"type":"string","default":"buttons","label":"Style","description":"Display style (buttons or icons)"}}'
);

INSERT INTO plugins (slug, name, description, version, author, entry_point, hooks, settings_schema)
VALUES (
  'contact-form',
  'Contact Form',
  'Adds a contact form shortcode [contact-form] to pages and posts',
  '2.0.0',
  'WP-CMS',
  'plugins/contact-form',
  '[]',
  '{"recipientEmail":{"type":"string","default":"","label":"Recipient Email","description":"Email address to receive contact form submissions"},"successMessage":{"type":"string","default":"Thank you for your message!","label":"Success Message","description":"Message shown after form submission"},"formTitle":{"type":"string","default":"Contact Us","label":"Form Title","description":"Title displayed above the contact form"},"enableCaptcha":{"type":"boolean","default":false,"label":"Enable Captcha","description":"Enable simple math captcha"}}'
);

-- Ana site için varsayılan eklenti aktivasyonları
INSERT INTO site_plugins (site_id, plugin_id, is_active, settings, activated_at)
VALUES (1, 1, 1, '{}', datetime('now'));

INSERT INTO site_plugins (site_id, plugin_id, is_active, settings, activated_at)
VALUES (1, 2, 0, '{}', NULL);

INSERT INTO site_plugins (site_id, plugin_id, is_active, settings, activated_at)
VALUES (1, 3, 0, '{}', NULL);
