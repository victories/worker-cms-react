-- Per-user permission fields for package-style access control
-- max_sites: maximum number of sites a user can create (0 = cannot create)
-- ai_enabled: whether user can access AI content bot (0 = disabled, 1 = enabled)
-- ai_use_global: whether user can use global AI providers or must use own API keys (0 = own keys only, 1 = can use global)
ALTER TABLE users ADD COLUMN max_sites INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN ai_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN ai_use_global INTEGER DEFAULT 0;
