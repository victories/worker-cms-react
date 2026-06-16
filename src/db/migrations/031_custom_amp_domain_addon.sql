-- src/db/migrations/031_custom_amp_domain_addon.sql
-- "Custom AMP Domain" feature add-on. Buying it grants the
-- custom_amp_domain entitlement account-wide, unlocking the custom AMP
-- domain field on every site the buyer owns. Creem product ids are
-- provisioned after deploy (or on first admin save). Recurring only —
-- the add-on model is subscription-based; $50/mo, $500/yr defaults
-- (editable in the admin Add-ons catalog).
INSERT OR IGNORE INTO addons (key, name, description, type, unit_label, feature_key, price_monthly, price_yearly, max_units, sort_order)
VALUES
 ('custom-amp-domain', 'Custom AMP Domain', 'Serve AMP pages from your own domain (e.g. amp.yoursite.com) on all your sites.', 'feature', NULL, 'custom_amp_domain', 50.00, 500.00, NULL, 3);
