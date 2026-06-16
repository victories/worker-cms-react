-- src/db/migrations/032_package_i18n.sql
-- English name/description for packages. The existing name/description
-- columns stay as the default (Turkish); these are shown when the UI
-- language is English, falling back to the default when empty. Edited
-- from the admin Package Manager; consumed by the register and upgrade
-- screens.
ALTER TABLE packages ADD COLUMN name_en TEXT;
ALTER TABLE packages ADD COLUMN description_en TEXT;
