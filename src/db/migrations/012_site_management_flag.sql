-- Add is_management flag to sites table
-- When set to 1, the site cannot be deleted or paused
ALTER TABLE sites ADD COLUMN is_management INTEGER DEFAULT 0;
