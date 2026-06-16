-- Creem.io credit-card payment integration.
-- Mirrors the existing Stripe columns: per-package Creem product IDs and
-- per-subscription Creem identifiers. Creem config (api key, webhook
-- secret, test mode) lives in global_settings as plain key/value rows
-- (creem_api_key, creem_webhook_secret, creem_test_mode) — no schema
-- change needed for those.

ALTER TABLE packages ADD COLUMN creem_product_monthly_id TEXT;
ALTER TABLE packages ADD COLUMN creem_product_yearly_id TEXT;

ALTER TABLE subscriptions ADD COLUMN creem_checkout_id TEXT;
ALTER TABLE subscriptions ADD COLUMN creem_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN creem_customer_id TEXT;
