-- Seed: İlk site ve Super Admin oluştur

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

-- Super Admin tüm sitelere erişir (user_sites kaydına gerek yok)

-- Varsayılan site ayarları
INSERT INTO settings (site_id, key, value) VALUES (1, 'site_title', 'Ana Site');
INSERT INTO settings (site_id, key, value) VALUES (1, 'site_description', 'WP-CMS ile oluşturulmuş site');
INSERT INTO settings (site_id, key, value) VALUES (1, 'posts_per_page', '10');
INSERT INTO settings (site_id, key, value) VALUES (1, 'date_format', 'DD.MM.YYYY');
INSERT INTO settings (site_id, key, value) VALUES (1, 'time_format', 'HH:mm');
INSERT INTO settings (site_id, key, value) VALUES (1, 'default_comment_status', 'open');
INSERT INTO settings (site_id, key, value) VALUES (1, 'amp_enabled', '1');
INSERT INTO settings (site_id, key, value) VALUES (1, 'amp_url_format', 'custom_domain');
INSERT INTO settings (site_id, key, value) VALUES (1, 'theme_primary_color', '#2563eb');
INSERT INTO settings (site_id, key, value) VALUES (1, 'theme_font_family', 'Inter');

-- Global ayarlar
INSERT INTO global_settings (key, value) VALUES ('version', '1.0.0');
INSERT INTO global_settings (key, value) VALUES ('setup_complete', '0');
INSERT INTO global_settings (key, value) VALUES ('default_language', 'tr');
INSERT INTO global_settings (key, value) VALUES ('available_languages', '["tr","en"]');

-- Varsayılan kategoriler
INSERT INTO taxonomies (site_id, name, slug, type, language) VALUES (1, 'Genel', 'genel', 'category', 'tr');
INSERT INTO taxonomies (site_id, name, slug, type, language) VALUES (1, 'General', 'general', 'category', 'en');

-- Varsayılan menü
INSERT INTO menus (site_id, name, slug, location, language) VALUES (1, 'Ana Menü', 'ana-menu', 'primary', 'tr');
INSERT INTO menu_items (menu_id, title, url, item_type, position) VALUES (1, 'Ana Sayfa', '/', 'custom', 0);

-- Dahili eklentiler (built-in plugins)
INSERT INTO plugins (slug, name, description, version, author, entry_point, hooks, settings_schema)
VALUES (
  'seo-optimizer',
  'SEO Optimizer',
  'Automatically optimizes posts for search engines with meta tags, Open Graph, and content analysis',
  '1.0.0',
  'WP-CMS',
  'plugins/seo-optimizer',
  '["post.beforeSave","page.head","post.beforeRender"]',
  '{"autoMetaDescription":{"type":"boolean","default":true,"label":"Auto Meta Description","description":"Automatically generate meta description from content"},"maxTitleLength":{"type":"number","default":60,"label":"Max Title Length","description":"Maximum recommended title length for SEO"},"addReadingTime":{"type":"boolean","default":true,"label":"Add Reading Time","description":"Add estimated reading time to posts"},"noindexDrafts":{"type":"boolean","default":true,"label":"Noindex Drafts","description":"Add noindex tag to draft posts"}}'
);

INSERT INTO plugins (slug, name, description, version, author, entry_point, hooks, settings_schema)
VALUES (
  'social-share',
  'Social Share',
  'Adds social media sharing buttons to posts',
  '1.0.0',
  'WP-CMS',
  'plugins/social-share',
  '["post.beforeRender","page.head"]',
  '{"platforms":{"type":"string","default":"twitter,facebook,linkedin,whatsapp","label":"Platforms","description":"Comma-separated list of platforms"},"position":{"type":"string","default":"bottom","label":"Position","description":"Position of share buttons (top, bottom, both)"},"style":{"type":"string","default":"buttons","label":"Style","description":"Display style (buttons, icons, text)"}}'
);

INSERT INTO plugins (slug, name, description, version, author, entry_point, hooks, settings_schema)
VALUES (
  'contact-form',
  'Contact Form',
  'Adds a contact form shortcode [contact-form] to pages and posts',
  '1.0.0',
  'WP-CMS',
  'plugins/contact-form',
  '["post.beforeRender","page.bodyEnd"]',
  '{"recipientEmail":{"type":"string","default":"","label":"Recipient Email","description":"Email address to receive contact form submissions"},"successMessage":{"type":"string","default":"Thank you for your message!","label":"Success Message","description":"Message shown after form submission"},"formTitle":{"type":"string","default":"Contact Us","label":"Form Title","description":"Title displayed above the contact form"},"enableCaptcha":{"type":"boolean","default":false,"label":"Enable Captcha","description":"Enable simple math captcha"}}'
);

-- Ana site için varsayılan eklenti aktivasyonları
INSERT INTO site_plugins (site_id, plugin_id, is_active, settings, activated_at)
VALUES (1, 1, 1, '{}', datetime('now'));

INSERT INTO site_plugins (site_id, plugin_id, is_active, settings, activated_at)
VALUES (1, 2, 0, '{}', NULL);

INSERT INTO site_plugins (site_id, plugin_id, is_active, settings, activated_at)
VALUES (1, 3, 0, '{}', NULL);
