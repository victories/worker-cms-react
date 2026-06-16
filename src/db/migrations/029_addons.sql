-- src/db/migrations/029_addons.sql
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

-- Seed the two launch add-ons (Creem product IDs filled later).
INSERT INTO addons (key, name, description, type, unit_label, feature_key, price_monthly, price_yearly, max_units, sort_order)
VALUES
 ('extra-site', 'Extra Site', 'Add more sites to your account, billed per site.', 'unit', 'site', 'extra_site', 2.50, 25.00, 100, 1),
 ('white-label', 'White Label', 'Remove the "Powered by" footer on all your sites.', 'feature', NULL, 'white_label', 9.99, 99.00, NULL, 2);
