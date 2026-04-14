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

-- Reusable Prompt Templates (site-scoped)
CREATE TABLE IF NOT EXISTS ai_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  variables TEXT,
  default_provider_slug TEXT,
  default_model TEXT,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_providers_site ON ai_providers(site_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_site ON ai_prompts(site_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_site_status ON ai_jobs(site_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_scheduled ON ai_jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ai_logs_site ON ai_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_logs(created_at);
