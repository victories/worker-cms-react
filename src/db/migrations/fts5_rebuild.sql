-- Rebuild FTS5 index from existing posts
-- Clear existing index
DELETE FROM posts_fts;
DELETE FROM posts_fts_map;

-- Insert all posts into FTS5 with basic HTML stripping via replace chains
INSERT INTO posts_fts(rowid, title, content, excerpt)
SELECT id,
  COALESCE(title, ''),
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    COALESCE(content, ''),
    '<br>', ' '), '<br/>', ' '), '<br />', ' '), '<p>', ' '), '</p>', ' '),
    '<div>', ' '), '</div>', ' '), '<li>', ' '), '</li>', ' '), '<h1>', ' '),
  COALESCE(excerpt, '')
FROM posts;

-- Insert mapping records
INSERT INTO posts_fts_map(rowid, post_id, site_id, language, status)
SELECT id, id, site_id, COALESCE(language, 'tr'), COALESCE(status, 'draft')
FROM posts;
