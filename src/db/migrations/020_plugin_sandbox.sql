-- 020_plugin_sandbox.sql
-- Plugin sandbox: permissions, allowed_domains, execution logging

-- Add permissions column to plugins table
ALTER TABLE plugins ADD COLUMN permissions TEXT;

-- Add allowed_domains for outbound control (Workers for Platforms)
ALTER TABLE plugins ADD COLUMN allowed_domains TEXT;

-- Update existing built-in plugins with their required permissions
UPDATE plugins SET permissions = '["posts:read","posts:write","page:inject"]' WHERE slug = 'seo-optimizer';
UPDATE plugins SET permissions = '["posts:read","page:inject"]' WHERE slug = 'social-share';
UPDATE plugins SET permissions = '["posts:read","page:inject","http:fetch"]' WHERE slug = 'contact-form';
UPDATE plugins SET permissions = '["page:inject"]' WHERE slug = 'hero-slider';

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
