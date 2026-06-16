-- Scheduled cancellation flag for recurring subscriptions and add-ons.
-- Set when a user cancels via Creem with mode=scheduled: the row stays
-- 'active' (access continues) until the period ends, when the
-- subscription.canceled/expired webhook flips status and recomputes
-- entitlements. The flag drives the "cancels on <date>" UI.
ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end INTEGER DEFAULT 0;
ALTER TABLE user_addons ADD COLUMN cancel_at_period_end INTEGER DEFAULT 0;
