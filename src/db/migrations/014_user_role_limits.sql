-- Per-admin user creation limits by role
-- max_editors: how many editor accounts this admin can create
-- max_writers: how many writer accounts this admin can create
-- created_by: tracks which admin created this user (for counting limits)
ALTER TABLE users ADD COLUMN max_editors INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN max_writers INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN created_by INTEGER REFERENCES users(id);
