-- WP-CMS Multi-Site Database Schema

-- Siteler
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'active',
  default_language TEXT DEFAULT 'tr',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Site domain'leri
CREATE TABLE IF NOT EXISTS site_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  is_primary INTEGER DEFAULT 0,
  ssl_status TEXT DEFAULT 'active',
  setup_method TEXT DEFAULT 'ns',
  cf_custom_hostname_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Kullanıcılar (global)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'writer',
  avatar_r2_key TEXT,
  avatar_url TEXT,
  totp_secret TEXT,
  totp_enabled INTEGER DEFAULT 0,
  language TEXT DEFAULT 'tr',
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Kullanıcı-Site ataması
CREATE TABLE IF NOT EXISTS user_sites (
  user_id INTEGER NOT NULL,
  site_id INTEGER NOT NULL,
  role_override TEXT,
  PRIMARY KEY (user_id, site_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Yazılar & Sayfalar
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  status TEXT DEFAULT 'draft',
  post_type TEXT DEFAULT 'post',
  author_id INTEGER NOT NULL,
  featured_image_id INTEGER,
  language TEXT DEFAULT 'tr',
  translation_group TEXT,
  parent_id INTEGER,
  menu_order INTEGER DEFAULT 0,
  comment_status TEXT DEFAULT 'open',
  password TEXT,
  is_sticky INTEGER DEFAULT 0,
  amp_enabled INTEGER DEFAULT 1,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  og_image_r2_key TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  published_at TEXT,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id),
  UNIQUE(site_id, slug, language)
);

-- Post Meta
CREATE TABLE IF NOT EXISTS post_meta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  meta_key TEXT NOT NULL,
  meta_value TEXT,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Taksonomiler
CREATE TABLE IF NOT EXISTS taxonomies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  parent_id INTEGER,
  language TEXT DEFAULT 'tr',
  translation_group TEXT,
  count INTEGER DEFAULT 0,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, slug, type, language)
);

-- Yazı-Taksonomi ilişkisi
CREATE TABLE IF NOT EXISTS post_taxonomies (
  post_id INTEGER NOT NULL,
  taxonomy_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, taxonomy_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (taxonomy_id) REFERENCES taxonomies(id) ON DELETE CASCADE
);

-- Medya
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  caption TEXT,
  author_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Yorumlar
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  parent_id INTEGER,
  author_name TEXT NOT NULL,
  author_email TEXT,
  author_url TEXT,
  author_ip TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Menüler
CREATE TABLE IF NOT EXISTS menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  location TEXT,
  language TEXT DEFAULT 'tr',
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, slug)
);

-- Menü öğeleri
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id INTEGER NOT NULL,
  parent_id INTEGER,
  title TEXT NOT NULL,
  url TEXT,
  target TEXT DEFAULT '_self',
  item_type TEXT NOT NULL,
  item_object_id INTEGER,
  position INTEGER DEFAULT 0,
  css_class TEXT,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
);

-- Widget'lar
CREATE TABLE IF NOT EXISTS widgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  area TEXT NOT NULL,
  widget_type TEXT NOT NULL,
  title TEXT,
  config TEXT,
  position INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  language TEXT DEFAULT 'tr',
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Site ayarları
CREATE TABLE IF NOT EXISTS settings (
  site_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  autoload INTEGER DEFAULT 1,
  PRIMARY KEY (site_id, key),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Global ayarlar
CREATE TABLE IF NOT EXISTS global_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

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

-- Theme Studio: per-site design (style tokens + region/slot layout tree).
-- Replaces the user-facing surface of `themes` + `site_themes`. Those
-- legacy tables stay until Faz 6 cutover.
CREATE TABLE IF NOT EXISTS site_design (
  site_id INTEGER PRIMARY KEY,
  style_tokens TEXT NOT NULL DEFAULT '{}',
  layout_config TEXT NOT NULL DEFAULT '{}',
  custom_css TEXT NOT NULL DEFAULT '',
  google_fonts TEXT NOT NULL DEFAULT '[]',
  preset_slug TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- API keys: scope='site' bound to one site (X-Site-Id resolved), scope='user'
-- spans every site the owner can access (used by external integrations
-- like worker-ai-bot for cross-site discovery + dispatch).
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL DEFAULT 'site' CHECK (scope IN ('site', 'user')),
  site_id INTEGER,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions TEXT NOT NULL,
  last_used TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  CHECK ((scope = 'site' AND site_id IS NOT NULL) OR (scope = 'user' AND site_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_site ON api_keys(site_id) WHERE site_id IS NOT NULL;

-- Analitik
CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  post_id INTEGER,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  viewed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Revizyon geçmişi (legacy)
CREATE TABLE IF NOT EXISTS revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  author_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Post revision history (enhanced)
CREATE TABLE IF NOT EXISTS post_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  site_id INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  meta TEXT,
  revision_type TEXT DEFAULT 'manual',
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Eklentiler
CREATE TABLE IF NOT EXISTS plugins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  author TEXT,
  entry_point TEXT NOT NULL,
  hooks TEXT,
  settings_schema TEXT,
  permissions TEXT,
  allowed_domains TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Eklenti-Site aktivasyonu
CREATE TABLE IF NOT EXISTS site_plugins (
  site_id INTEGER NOT NULL,
  plugin_id INTEGER NOT NULL,
  is_active INTEGER DEFAULT 0,
  settings TEXT,
  activated_at TEXT,
  PRIMARY KEY (site_id, plugin_id),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);

-- SEO Analyzer servisleri
CREATE TABLE IF NOT EXISTS seo_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  endpoint_url TEXT,
  api_key_encrypted TEXT,
  config TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- SEO skorları
CREATE TABLE IF NOT EXISTS seo_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  overall_score INTEGER,
  details TEXT,
  analyzed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES seo_services(id) ON DELETE CASCADE
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_site_domains_domain ON site_domains(domain);
CREATE INDEX IF NOT EXISTS idx_site_domains_site ON site_domains(site_id);
CREATE INDEX IF NOT EXISTS idx_user_sites_user ON user_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sites_site ON user_sites(site_id);
CREATE INDEX IF NOT EXISTS idx_posts_site ON posts(site_id);
CREATE INDEX IF NOT EXISTS idx_posts_site_slug ON posts(site_id, slug, language);
CREATE INDEX IF NOT EXISTS idx_posts_site_status ON posts(site_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_site_type ON posts(site_id, post_type, status);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_translation ON posts(translation_group);
CREATE INDEX IF NOT EXISTS idx_postmeta_post ON post_meta(post_id);
CREATE INDEX IF NOT EXISTS idx_taxonomies_site ON taxonomies(site_id, type, language);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_media_site ON media(site_id);
CREATE INDEX IF NOT EXISTS idx_settings_site ON settings(site_id);
CREATE INDEX IF NOT EXISTS idx_pageviews_site ON page_views(site_id);
CREATE INDEX IF NOT EXISTS idx_pageviews_date ON page_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_revisions_post ON revisions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_revisions_post ON post_revisions(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_revisions_site ON post_revisions(site_id, post_id);
CREATE INDEX IF NOT EXISTS idx_site_plugins_site ON site_plugins(site_id);

-- Plugin execution logs
CREATE TABLE IF NOT EXISTS plugin_execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  plugin_slug TEXT NOT NULL,
  hook TEXT NOT NULL,
  duration_ms INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plugin_logs_lookup ON plugin_execution_logs(site_id, plugin_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_logs_cleanup ON plugin_execution_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_seo_services_site ON seo_services(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_scores_post ON seo_scores(post_id);

-- URL Redirects (site-scoped)
CREATE TABLE IF NOT EXISTS redirects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  source_path TEXT NOT NULL,
  target_url TEXT,
  status_code INTEGER NOT NULL DEFAULT 301,
  is_active INTEGER DEFAULT 1,
  hit_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, source_path)
);
CREATE INDEX IF NOT EXISTS idx_redirects_lookup ON redirects(site_id, source_path, is_active);

-- Short URLs (global)
CREATE TABLE IF NOT EXISTS short_urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  slug TEXT UNIQUE,
  target_url TEXT NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_short_urls_slug ON short_urls(slug);

-- AI Provider Configurations (site-scoped)
CREATE TABLE IF NOT EXISTS ai_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  provider_slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  api_key TEXT,
  default_model TEXT,
  endpoint_url TEXT,
  extra_config TEXT,
  is_enabled INTEGER DEFAULT 0,
  max_tokens INTEGER DEFAULT 4096,
  temperature REAL DEFAULT 0.7,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, provider_slug)
);

-- Reusable AI Prompt Templates (site-scoped)
CREATE TABLE IF NOT EXISTS ai_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  variables TEXT,
  default_provider_slug TEXT,
  default_word_count INTEGER DEFAULT 1000,
  default_language TEXT DEFAULT 'tr',
  default_tone TEXT DEFAULT 'professional',
  is_active INTEGER DEFAULT 1,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Scheduled AI Generation Jobs (site-scoped)
CREATE TABLE IF NOT EXISTS ai_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  prompt_id INTEGER,
  provider_slug TEXT NOT NULL,
  model TEXT,
  prompt_text TEXT NOT NULL,
  system_prompt TEXT,
  scheduled_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  target_category_id INTEGER,
  target_language TEXT DEFAULT 'tr',
  target_word_count INTEGER DEFAULT 1000,
  target_status TEXT DEFAULT 'draft',
  result_post_id INTEGER,
  error_message TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (prompt_id) REFERENCES ai_prompts(id) ON DELETE SET NULL,
  FOREIGN KEY (result_post_id) REFERENCES posts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- AI Generation Logs (site-scoped)
CREATE TABLE IF NOT EXISTS ai_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  job_id INTEGER,
  provider_slug TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0.0,
  duration_ms INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT,
  request_type TEXT DEFAULT 'generate',
  result_post_id INTEGER,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES ai_jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (result_post_id) REFERENCES posts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_providers_site ON ai_providers(site_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_site ON ai_prompts(site_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_site_status ON ai_jobs(site_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_scheduled ON ai_jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ai_logs_site ON ai_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_logs(created_at);

-- Paketler (Plans)
CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly REAL DEFAULT 0,
  price_yearly REAL DEFAULT 0,
  max_sites INTEGER DEFAULT 1,
  max_storage_mb INTEGER DEFAULT 500,
  max_posts_per_site INTEGER DEFAULT 0,
  features TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  stripe_price_monthly_id TEXT,
  stripe_price_yearly_id TEXT,
  creem_product_monthly_id TEXT,
  creem_product_yearly_id TEXT,
  crypto_enabled INTEGER DEFAULT 1,
  white_label INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Abonelikler (Subscriptions)
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  package_id INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  billing_period TEXT DEFAULT 'monthly',
  payment_method TEXT DEFAULT 'manual',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  creem_checkout_id TEXT,
  creem_subscription_id TEXT,
  creem_customer_id TEXT,
  crypto_tx_hash TEXT,
  crypto_chain TEXT,
  crypto_amount TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  assigned_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(is_active, sort_order);

-- General add-on catalog + per-user add-on subscriptions. See
-- docs/plans/2026-06-16-addons-cart-design.md.
CREATE TABLE IF NOT EXISTS addons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'feature',        -- 'unit' | 'feature'
  unit_label TEXT,                              -- for 'unit' (e.g. 'site')
  feature_key TEXT,                             -- entitlement granted (e.g. 'white_label', 'extra_site')
  price_monthly REAL DEFAULT 0,
  price_yearly REAL DEFAULT 0,
  creem_product_monthly_id TEXT,
  creem_product_yearly_id TEXT,
  max_units INTEGER,                            -- optional cap for 'unit'
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_addons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  addon_id INTEGER NOT NULL,
  units INTEGER DEFAULT 1,
  billing_period TEXT DEFAULT 'monthly',
  status TEXT DEFAULT 'active',                 -- 'active' | 'cancelled' | 'expired'
  creem_checkout_id TEXT,
  creem_subscription_id TEXT,
  creem_customer_id TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (addon_id) REFERENCES addons(id)
);
CREATE INDEX IF NOT EXISTS idx_user_addons_user ON user_addons(user_id, status);

-- Contety İçerik Botu
CREATE TABLE IF NOT EXISTS contety_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  api_key TEXT,
  is_enabled INTEGER DEFAULT 1,
  auto_import INTEGER DEFAULT 0,
  default_status TEXT DEFAULT 'draft',
  default_category_id INTEGER,
  default_author_id INTEGER,
  default_language_id INTEGER DEFAULT 1,
  default_model TEXT DEFAULT 'gpt4_1',
  last_pull_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id)
);

CREATE TABLE IF NOT EXISTS global_contety_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key TEXT NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contety_contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  contety_content_id INTEGER NOT NULL,
  status TEXT DEFAULT 'processing',
  template_code TEXT,
  title TEXT,
  post_id INTEGER,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contety_contents_site ON contety_contents(site_id);
CREATE INDEX IF NOT EXISTS idx_contety_contents_status ON contety_contents(status);
CREATE INDEX IF NOT EXISTS idx_contety_contents_contety_id ON contety_contents(contety_content_id);

CREATE TABLE IF NOT EXISTS contety_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  contety_content_id INTEGER,
  post_id INTEGER,
  credits_used INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contety_logs_site ON contety_logs(site_id);

-- FTS5 Full-Text Search
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title,
  content,
  excerpt,
  tokenize='porter unicode61'
);

CREATE TABLE IF NOT EXISTS posts_fts_map (
  rowid INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL,
  site_id INTEGER NOT NULL,
  language TEXT NOT NULL DEFAULT 'tr',
  status TEXT NOT NULL DEFAULT 'draft'
);
CREATE INDEX IF NOT EXISTS idx_fts_map_site ON posts_fts_map(site_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fts_map_post ON posts_fts_map(post_id);

-- Search Analytics
CREATE TABLE IF NOT EXISTS search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  language TEXT DEFAULT 'tr',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_search_logs_site ON search_logs(site_id, created_at);

-- Custom Content Types (Visual Schema Builder)
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
