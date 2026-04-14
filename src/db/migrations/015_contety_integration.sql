-- Contety İçerik Botu Entegrasyonu
-- Site bazlı Contety ayarları
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

-- Global Contety ayarları (super_admin, site fallback)
CREATE TABLE IF NOT EXISTS global_contety_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key TEXT NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Contety içerik takip tablosu (callback ve polling için)
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

-- Contety işlem logları
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
