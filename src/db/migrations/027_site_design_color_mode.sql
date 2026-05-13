-- Persist the admin's "Light / Dark" mode toggle from the Theme Studio.
-- Before this column existed the toggle was UI-only — picking dark in
-- the editor previewed the dark palette but the saved row carried no
-- mode info, so the public site always rendered in light. The new
-- column is consumed by the SSR layer to set `<html class="dark">`
-- when the saved value is 'dark'.
--
-- 'auto' is reserved for a future "follow visitor preference" mode;
-- treat it the same as no mode set (existing localStorage / OS pref
-- behaviour from the boot script).

ALTER TABLE site_design
  ADD COLUMN default_color_mode TEXT NOT NULL DEFAULT 'light';
