-- 023: User-scoped API keys for external integrations (e.g. worker-ai-bot).
--
-- Adds `scope` column ('site' | 'user') and makes site_id nullable.
-- 'user' scope keys aren't bound to a single site — they let an external
-- service list/operate across every site the owning user can access.
--
-- SQLite can't ALTER a NOT NULL constraint, so we recreate the table.
-- The existing site-scoped key set is empty (verified Apr 2026), so this
-- is a clean rebuild — no INSERT…SELECT preservation step.
--
-- New rows of either scope use the SHA-256(key) hashing scheme so the
-- middleware can do a deterministic key_hash lookup instead of scanning
-- every row with PBKDF2 verify.

DROP TABLE IF EXISTS api_keys;

CREATE TABLE api_keys (
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
