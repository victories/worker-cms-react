-- ACME HTTP-01 challenge tokens served on /.well-known/acme-challenge/<token>.
-- Used when an apex domain CNAMEs into Cloudflare and Cloudflare's Custom
-- Hostname feature asks the origin to host validation tokens. Each row is
-- a token+response pair the worker should return as text/plain when the
-- matching path is requested on `domain`.

CREATE TABLE IF NOT EXISTS domain_acme_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  domain TEXT NOT NULL,
  token TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- One pair per token across all domains (Cloudflare regenerates tokens per
-- validation cycle, so reusing a token across domains would be unusual; if
-- it does happen the latest insert wins via INSERT OR REPLACE in the API).
CREATE UNIQUE INDEX IF NOT EXISTS idx_acme_challenge_token ON domain_acme_challenges(token);
CREATE INDEX IF NOT EXISTS idx_acme_challenge_domain ON domain_acme_challenges(domain);
CREATE INDEX IF NOT EXISTS idx_acme_challenge_site ON domain_acme_challenges(site_id);
