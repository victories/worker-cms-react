import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Backup requires super_admin
app.use('*', authMiddleware, requireSite, siteAccessMiddleware);
app.use('*', requireRole('super_admin'));

// Format-to-sections mapping
const FORMAT_SECTIONS: Record<string, string[]> = {
  full: ['site', 'posts', 'taxonomies', 'media', 'comments', 'menus', 'settings', 'widgets', 'revisions'],
  content: ['posts', 'taxonomies'],
  all: ['site', 'posts', 'taxonomies', 'media', 'comments', 'menus', 'settings', 'widgets', 'revisions'],
};

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCdata(str: string): string {
  if (!str) return '';
  return str.replace(/]]>/g, ']]]]><![CDATA[>');
}

// GET /api/backup/export - Export site data as JSON or WXR
app.get('/export', async (c) => {
  const siteId = c.get('siteId');
  const db = c.env.DB;

  const url = new URL(c.req.url);
  const formatParam = url.searchParams.get('sections') || url.searchParams.get('format') || 'all';

  // Handle WordPress WXR export
  if (formatParam === 'wordpress') {
    return await exportWxr(c, db, siteId);
  }

  // Handle SQL dump export
  if (formatParam === 'sql') {
    const dialect = url.searchParams.get('dialect') || 'sqlite';
    return await exportSql(c, db, siteId, dialect);
  }

  // Resolve format to sections
  const sections = FORMAT_SECTIONS[formatParam] || formatParam.split(',');
  const includeSection = (name: string) => sections.includes(name);

  const exportData: Record<string, unknown> = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    site_id: siteId,
  };

  // Site info
  if (includeSection('site')) {
    const site = await db.prepare('SELECT * FROM sites WHERE id = ?').bind(siteId).first();
    const domains = await db.prepare('SELECT * FROM site_domains WHERE site_id = ?').bind(siteId).all();
    exportData.site = site;
    exportData.domains = domains.results;
  }

  // Posts
  if (includeSection('posts')) {
    const posts = await db.prepare('SELECT * FROM posts WHERE site_id = ?').bind(siteId).all();
    exportData.posts = posts.results;

    // Post meta for all posts
    const postIds = posts.results.map((p: Record<string, unknown>) => p.id);
    if (postIds.length > 0) {
      const placeholders = postIds.map(() => '?').join(',');
      const meta = await db.prepare(
        `SELECT * FROM post_meta WHERE post_id IN (${placeholders})`
      ).bind(...postIds).all();
      exportData.post_meta = meta.results;

      // Post taxonomies
      const ptax = await db.prepare(
        `SELECT * FROM post_taxonomies WHERE post_id IN (${placeholders})`
      ).bind(...postIds).all();
      exportData.post_taxonomies = ptax.results;
    }
  }

  // Taxonomies
  if (includeSection('taxonomies')) {
    const taxonomies = await db.prepare('SELECT * FROM taxonomies WHERE site_id = ?').bind(siteId).all();
    exportData.taxonomies = taxonomies.results;
  }

  // Media (metadata only, not files)
  if (includeSection('media')) {
    const media = await db.prepare('SELECT * FROM media WHERE site_id = ?').bind(siteId).all();
    exportData.media = media.results;
  }

  // Comments
  if (includeSection('comments')) {
    const comments = await db.prepare(
      `SELECT c.* FROM comments c JOIN posts p ON c.post_id = p.id WHERE p.site_id = ?`
    ).bind(siteId).all();
    exportData.comments = comments.results;
  }

  // Menus
  if (includeSection('menus')) {
    const menus = await db.prepare('SELECT * FROM menus WHERE site_id = ?').bind(siteId).all();
    exportData.menus = menus.results;

    const menuIds = menus.results.map((m: Record<string, unknown>) => m.id);
    if (menuIds.length > 0) {
      const placeholders = menuIds.map(() => '?').join(',');
      const items = await db.prepare(
        `SELECT * FROM menu_items WHERE menu_id IN (${placeholders})`
      ).bind(...menuIds).all();
      exportData.menu_items = items.results;
    }
  }

  // Settings
  if (includeSection('settings')) {
    const settings = await db.prepare('SELECT * FROM settings WHERE site_id = ?').bind(siteId).all();
    exportData.settings = settings.results;
  }

  // Widgets
  if (includeSection('widgets')) {
    const widgets = await db.prepare('SELECT * FROM widgets WHERE site_id = ?').bind(siteId).all();
    exportData.widgets = widgets.results;
  }

  // Revisions
  if (includeSection('revisions')) {
    const revisions = await db.prepare(
      `SELECT r.* FROM revisions r JOIN posts p ON r.post_id = p.id WHERE p.site_id = ?`
    ).bind(siteId).all();
    exportData.revisions = revisions.results;
  }

  const dateStr = new Date().toISOString().split('T')[0];
  c.header('Content-Type', 'application/json');
  c.header('Content-Disposition', `attachment; filename="site-${siteId}-backup-${dateStr}.json"`);
  return c.json({ success: true, data: exportData });
});

// Generate WordPress WXR XML export
async function exportWxr(c: any, db: any, siteId: number) {
  const site = await db.prepare('SELECT * FROM sites WHERE id = ?').bind(siteId).first();
  const posts = await db.prepare('SELECT * FROM posts WHERE site_id = ?').bind(siteId).all();
  const taxonomies = await db.prepare('SELECT * FROM taxonomies WHERE site_id = ?').bind(siteId).all();
  const media = await db.prepare('SELECT * FROM media WHERE site_id = ?').bind(siteId).all();

  // Get comments and post meta
  const postIds = posts.results.map((p: any) => p.id);
  let comments: any[] = [];
  let postMeta: any[] = [];
  let postTaxonomies: any[] = [];
  if (postIds.length > 0) {
    const ph = postIds.map(() => '?').join(',');
    const commentsRes = await db.prepare(
      `SELECT c.* FROM comments c WHERE c.post_id IN (${ph})`
    ).bind(...postIds).all();
    comments = commentsRes.results;

    const metaRes = await db.prepare(
      `SELECT * FROM post_meta WHERE post_id IN (${ph})`
    ).bind(...postIds).all();
    postMeta = metaRes.results;

    const ptaxRes = await db.prepare(
      `SELECT pt.*, t.name, t.slug, t.type FROM post_taxonomies pt JOIN taxonomies t ON pt.taxonomy_id = t.id WHERE pt.post_id IN (${ph})`
    ).bind(...postIds).all();
    postTaxonomies = ptaxRes.results;
  }

  const siteUrl = site?.domain ? `https://${site.domain}` : `https://site-${siteId}.example.com`;
  const siteTitle = site?.name || `Site ${siteId}`;
  const dateStr = new Date().toISOString().split('T')[0];

  // Build categories and tags
  const categories = taxonomies.results.filter((t: any) => t.type === 'category');
  const tags = taxonomies.results.filter((t: any) => t.type === 'tag');

  // Group comments and meta by post
  const commentsByPost: Record<number, any[]> = {};
  for (const cm of comments) {
    if (!commentsByPost[cm.post_id]) commentsByPost[cm.post_id] = [];
    commentsByPost[cm.post_id].push(cm);
  }
  const metaByPost: Record<number, any[]> = {};
  for (const m of postMeta) {
    if (!metaByPost[m.post_id]) metaByPost[m.post_id] = [];
    metaByPost[m.post_id].push(m);
  }
  const taxByPost: Record<number, any[]> = {};
  for (const pt of postTaxonomies) {
    if (!taxByPost[pt.post_id]) taxByPost[pt.post_id] = [];
    taxByPost[pt.post_id].push(pt);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/"
>
<channel>
  <title>${escapeXml(siteTitle)}</title>
  <link>${escapeXml(siteUrl)}</link>
  <description></description>
  <pubDate>${new Date().toUTCString()}</pubDate>
  <language>tr</language>
  <wp:wxr_version>1.2</wp:wxr_version>
  <wp:base_site_url>${escapeXml(siteUrl)}</wp:base_site_url>
  <wp:base_blog_url>${escapeXml(siteUrl)}</wp:base_blog_url>
`;

  // Categories
  for (const cat of categories) {
    xml += `  <wp:category>
    <wp:term_id>${cat.id}</wp:term_id>
    <wp:category_nicename><![CDATA[${escapeCdata(cat.slug)}]]></wp:category_nicename>
    <wp:category_parent>${cat.parent_id ? escapeXml(String(cat.parent_id)) : ''}</wp:category_parent>
    <wp:cat_name><![CDATA[${escapeCdata(cat.name)}]]></wp:cat_name>
    <wp:category_description><![CDATA[${escapeCdata(cat.description || '')}]]></wp:category_description>
  </wp:category>
`;
  }

  // Tags
  for (const tag of tags) {
    xml += `  <wp:tag>
    <wp:term_id>${tag.id}</wp:term_id>
    <wp:tag_slug><![CDATA[${escapeCdata(tag.slug)}]]></wp:tag_slug>
    <wp:tag_name><![CDATA[${escapeCdata(tag.name)}]]></wp:tag_name>
    <wp:tag_description><![CDATA[${escapeCdata(tag.description || '')}]]></wp:tag_description>
  </wp:tag>
`;
  }

  // Media as attachment items
  for (const m of media.results) {
    const mediaUrl = m.url || m.r2_key || '';
    xml += `  <item>
    <title><![CDATA[${escapeCdata(m.alt_text || m.filename || '')}]]></title>
    <link>${escapeXml(mediaUrl)}</link>
    <pubDate>${m.created_at ? new Date(m.created_at).toUTCString() : ''}</pubDate>
    <dc:creator><![CDATA[admin]]></dc:creator>
    <description></description>
    <content:encoded><![CDATA[]]></content:encoded>
    <wp:post_id>${m.id}</wp:post_id>
    <wp:post_date><![CDATA[${m.created_at || ''}]]></wp:post_date>
    <wp:post_type><![CDATA[attachment]]></wp:post_type>
    <wp:status><![CDATA[inherit]]></wp:status>
    <wp:attachment_url><![CDATA[${escapeCdata(mediaUrl)}]]></wp:attachment_url>
    <wp:post_meta>
      <wp:meta_key><![CDATA[_wp_attached_file]]></wp:meta_key>
      <wp:meta_value><![CDATA[${escapeCdata(m.r2_key || m.filename || '')}]]></wp:meta_value>
    </wp:post_meta>
  </item>
`;
  }

  // Posts and pages
  for (const post of posts.results) {
    const postComments = commentsByPost[post.id as number] || [];
    const postMetaItems = metaByPost[post.id as number] || [];
    const postTaxItems = taxByPost[post.id as number] || [];
    const postType = (post as any).type || 'post';
    const postStatus = (post as any).status || 'publish';

    xml += `  <item>
    <title><![CDATA[${escapeCdata((post as any).title || '')}]]></title>
    <link>${escapeXml(siteUrl)}/${escapeXml((post as any).slug || '')}</link>
    <pubDate>${(post as any).published_at ? new Date((post as any).published_at).toUTCString() : ''}</pubDate>
    <dc:creator><![CDATA[admin]]></dc:creator>
    <description></description>
    <content:encoded><![CDATA[${escapeCdata((post as any).content || '')}]]></content:encoded>
    <excerpt:encoded><![CDATA[${escapeCdata((post as any).excerpt || '')}]]></excerpt:encoded>
    <wp:post_id>${post.id}</wp:post_id>
    <wp:post_date><![CDATA[${(post as any).created_at || ''}]]></wp:post_date>
    <wp:post_date_gmt><![CDATA[${(post as any).created_at || ''}]]></wp:post_date_gmt>
    <wp:post_modified><![CDATA[${(post as any).updated_at || ''}]]></wp:post_modified>
    <wp:post_type><![CDATA[${postType}]]></wp:post_type>
    <wp:status><![CDATA[${postStatus}]]></wp:status>
    <wp:post_name><![CDATA[${escapeCdata((post as any).slug || '')}]]></wp:post_name>
`;

    // Post taxonomies (categories and tags)
    for (const pt of postTaxItems) {
      if (pt.type === 'category') {
        xml += `    <category domain="category" nicename="${escapeXml(pt.slug)}"><![CDATA[${escapeCdata(pt.name)}]]></category>
`;
      } else if (pt.type === 'tag') {
        xml += `    <category domain="post_tag" nicename="${escapeXml(pt.slug)}"><![CDATA[${escapeCdata(pt.name)}]]></category>
`;
      }
    }

    // Post meta
    for (const meta of postMetaItems) {
      xml += `    <wp:post_meta>
      <wp:meta_key><![CDATA[${escapeCdata(meta.meta_key || meta.key || '')}]]></wp:meta_key>
      <wp:meta_value><![CDATA[${escapeCdata(meta.meta_value || meta.value || '')}]]></wp:meta_value>
    </wp:post_meta>
`;
    }

    // Comments
    for (const cm of postComments) {
      xml += `    <wp:comment>
      <wp:comment_id>${cm.id}</wp:comment_id>
      <wp:comment_author><![CDATA[${escapeCdata(cm.author_name || '')}]]></wp:comment_author>
      <wp:comment_author_email><![CDATA[${escapeCdata(cm.author_email || '')}]]></wp:comment_author_email>
      <wp:comment_author_url>${escapeXml(cm.author_url || '')}</wp:comment_author_url>
      <wp:comment_date><![CDATA[${cm.created_at || ''}]]></wp:comment_date>
      <wp:comment_content><![CDATA[${escapeCdata(cm.content || '')}]]></wp:comment_content>
      <wp:comment_approved><![CDATA[${cm.status === 'approved' ? '1' : '0'}]]></wp:comment_approved>
      <wp:comment_parent>${cm.parent_id || 0}</wp:comment_parent>
    </wp:comment>
`;
    }

    xml += `  </item>
`;
  }

  xml += `</channel>
</rss>`;

  c.header('Content-Type', 'application/xml; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="site-${siteId}-wxr-${dateStr}.xml"`);
  return c.body(xml);
}

// MySQL-compatible Schema DDL
const MYSQL_SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS sites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  default_language VARCHAR(10) DEFAULT 'tr',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_domains (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  domain VARCHAR(255) NOT NULL UNIQUE,
  is_primary TINYINT DEFAULT 0,
  ssl_status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'writer',
  avatar_r2_key VARCHAR(500),
  totp_secret VARCHAR(255),
  totp_enabled TINYINT DEFAULT 0,
  language VARCHAR(10) DEFAULT 'tr',
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sites (
  user_id INT NOT NULL,
  site_id INT NOT NULL,
  role_override VARCHAR(50),
  PRIMARY KEY (user_id, site_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) NOT NULL,
  content LONGTEXT,
  excerpt TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  post_type VARCHAR(50) DEFAULT 'post',
  author_id INT NOT NULL,
  featured_image_id INT,
  language VARCHAR(10) DEFAULT 'tr',
  translation_group VARCHAR(255),
  parent_id INT,
  menu_order INT DEFAULT 0,
  comment_status VARCHAR(50) DEFAULT 'open',
  password VARCHAR(255),
  is_sticky TINYINT DEFAULT 0,
  amp_enabled TINYINT DEFAULT 1,
  seo_title VARCHAR(500),
  seo_description TEXT,
  seo_keywords TEXT,
  og_image_r2_key VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at DATETIME,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id),
  UNIQUE KEY idx_post_slug (site_id, slug(191), language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_meta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  meta_key VARCHAR(255) NOT NULL,
  meta_value LONGTEXT,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS taxonomies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  parent_id INT,
  language VARCHAR(10) DEFAULT 'tr',
  translation_group VARCHAR(255),
  count INT DEFAULT 0,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE KEY idx_tax_slug (site_id, slug(191), type, language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_taxonomies (
  post_id INT NOT NULL,
  taxonomy_id INT NOT NULL,
  PRIMARY KEY (post_id, taxonomy_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (taxonomy_id) REFERENCES taxonomies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  r2_key VARCHAR(500) NOT NULL UNIQUE,
  filename VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INT NOT NULL,
  width INT,
  height INT,
  alt_text TEXT,
  caption TEXT,
  author_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  parent_id INT,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255),
  author_url VARCHAR(500),
  author_ip VARCHAR(50),
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  language VARCHAR(10) DEFAULT 'tr',
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE KEY idx_menu_slug (site_id, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  menu_id INT NOT NULL,
  parent_id INT,
  title VARCHAR(255) NOT NULL,
  url VARCHAR(500),
  target VARCHAR(50) DEFAULT '_self',
  item_type VARCHAR(50) NOT NULL,
  item_object_id INT,
  position INT DEFAULT 0,
  css_class VARCHAR(255),
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS widgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  area VARCHAR(255) NOT NULL,
  widget_type VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  config TEXT,
  position INT DEFAULT 0,
  is_active TINYINT DEFAULT 1,
  language VARCHAR(10) DEFAULT 'tr',
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  site_id INT NOT NULL,
  \`key\` VARCHAR(255) NOT NULL,
  value LONGTEXT,
  autoload TINYINT DEFAULT 1,
  PRIMARY KEY (site_id, \`key\`),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS global_settings (
  \`key\` VARCHAR(255) PRIMARY KEY,
  value LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS revisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  content LONGTEXT,
  author_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS redirects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  source_path VARCHAR(500) NOT NULL,
  target_url VARCHAR(1000),
  status_code INT NOT NULL DEFAULT 301,
  is_active TINYINT DEFAULT 1,
  hit_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE KEY idx_redirect_path (site_id, source_path(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  provider_slug VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  api_key TEXT,
  default_model VARCHAR(255),
  endpoint_url VARCHAR(500),
  extra_config TEXT,
  is_enabled TINYINT DEFAULT 0,
  max_tokens INT DEFAULT 4096,
  temperature FLOAT DEFAULT 0.7,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE KEY idx_ai_provider (site_id, provider_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_prompts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  system_prompt LONGTEXT,
  user_prompt LONGTEXT NOT NULL,
  variables TEXT,
  default_provider_slug VARCHAR(100),
  default_word_count INT DEFAULT 1000,
  default_language VARCHAR(10) DEFAULT 'tr',
  default_tone VARCHAR(50) DEFAULT 'professional',
  is_active TINYINT DEFAULT 1,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  prompt_id INT,
  provider_slug VARCHAR(100) NOT NULL,
  model VARCHAR(255),
  prompt_text LONGTEXT NOT NULL,
  system_prompt LONGTEXT,
  scheduled_at DATETIME NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  target_category_id INT,
  target_language VARCHAR(10) DEFAULT 'tr',
  target_word_count INT DEFAULT 1000,
  target_status VARCHAR(50) DEFAULT 'draft',
  result_post_id INT,
  error_message TEXT,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (prompt_id) REFERENCES ai_prompts(id) ON DELETE SET NULL,
  FOREIGN KEY (result_post_id) REFERENCES posts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  job_id INT,
  provider_slug VARCHAR(100) NOT NULL,
  model VARCHAR(255) NOT NULL,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  estimated_cost FLOAT DEFAULT 0.0,
  duration_ms INT DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  request_type VARCHAR(50) DEFAULT 'generate',
  result_post_id INT,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES ai_jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (result_post_id) REFERENCES posts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seo_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  endpoint_url VARCHAR(500),
  api_key_encrypted TEXT,
  config TEXT,
  is_active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seo_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  service_id INT NOT NULL,
  overall_score INT,
  details TEXT,
  analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES seo_services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS short_urls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  slug VARCHAR(255) UNIQUE,
  target_url VARCHAR(1000) NOT NULL,
  click_count INT DEFAULT 0,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// MySQL reserved words that need backtick quoting
const MYSQL_RESERVED = new Set(['key', 'value', 'order', 'group', 'index', 'status', 'type', 'name', 'password', 'language', 'position', 'count', 'comment', 'description', 'content', 'role', 'location', 'area', 'size', 'config']);

// Schema DDL for portable SQL dumps
const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'active',
  default_language TEXT DEFAULT 'tr',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  is_primary INTEGER DEFAULT 0,
  ssl_status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'writer',
  avatar_r2_key TEXT,
  totp_secret TEXT,
  totp_enabled INTEGER DEFAULT 0,
  language TEXT DEFAULT 'tr',
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_sites (
  user_id INTEGER NOT NULL,
  site_id INTEGER NOT NULL,
  role_override TEXT,
  PRIMARY KEY (user_id, site_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  status TEXT DEFAULT 'draft',
  post_type TEXT DEFAULT 'post',
  author_id INTEGER NOT NULL,
  featured_image_id INTEGER,
  language TEXT DEFAULT 'tr',
  translation_group TEXT,
  parent_id INTEGER,
  menu_order INTEGER DEFAULT 0,
  comment_status TEXT DEFAULT 'open',
  password TEXT,
  is_sticky INTEGER DEFAULT 0,
  amp_enabled INTEGER DEFAULT 1,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  og_image_r2_key TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  published_at TEXT,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id),
  UNIQUE(site_id, slug, language)
);

CREATE TABLE IF NOT EXISTS post_meta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  meta_key TEXT NOT NULL,
  meta_value TEXT,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS taxonomies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  parent_id INTEGER,
  language TEXT DEFAULT 'tr',
  translation_group TEXT,
  count INTEGER DEFAULT 0,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, slug, type, language)
);

CREATE TABLE IF NOT EXISTS post_taxonomies (
  post_id INTEGER NOT NULL,
  taxonomy_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, taxonomy_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (taxonomy_id) REFERENCES taxonomies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  caption TEXT,
  author_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  parent_id INTEGER,
  author_name TEXT NOT NULL,
  author_email TEXT,
  author_url TEXT,
  author_ip TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  location TEXT,
  language TEXT DEFAULT 'tr',
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, slug)
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id INTEGER NOT NULL,
  parent_id INTEGER,
  title TEXT NOT NULL,
  url TEXT,
  target TEXT DEFAULT '_self',
  item_type TEXT NOT NULL,
  item_object_id INTEGER,
  position INTEGER DEFAULT 0,
  css_class TEXT,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS widgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  area TEXT NOT NULL,
  widget_type TEXT NOT NULL,
  title TEXT,
  config TEXT,
  position INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  language TEXT DEFAULT 'tr',
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  site_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  autoload INTEGER DEFAULT 1,
  PRIMARY KEY (site_id, key),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS global_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  author_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS redirects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  source_path TEXT NOT NULL,
  target_url TEXT,
  status_code INTEGER NOT NULL DEFAULT 301,
  is_active INTEGER DEFAULT 1,
  hit_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, source_path)
);

CREATE TABLE IF NOT EXISTS ai_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  provider_slug TEXT NOT NULL,
  display_name TEXT NOT NULL,
  api_key TEXT,
  default_model TEXT,
  endpoint_url TEXT,
  extra_config TEXT,
  is_enabled INTEGER DEFAULT 0,
  max_tokens INTEGER DEFAULT 4096,
  temperature REAL DEFAULT 0.7,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  UNIQUE(site_id, provider_slug)
);

CREATE TABLE IF NOT EXISTS ai_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  variables TEXT,
  default_provider_slug TEXT,
  default_word_count INTEGER DEFAULT 1000,
  default_language TEXT DEFAULT 'tr',
  default_tone TEXT DEFAULT 'professional',
  is_active INTEGER DEFAULT 1,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ai_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  prompt_id INTEGER,
  provider_slug TEXT NOT NULL,
  model TEXT,
  prompt_text TEXT NOT NULL,
  system_prompt TEXT,
  scheduled_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  target_category_id INTEGER,
  target_language TEXT DEFAULT 'tr',
  target_word_count INTEGER DEFAULT 1000,
  target_status TEXT DEFAULT 'draft',
  result_post_id INTEGER,
  error_message TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (prompt_id) REFERENCES ai_prompts(id) ON DELETE SET NULL,
  FOREIGN KEY (result_post_id) REFERENCES posts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ai_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  job_id INTEGER,
  provider_slug TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0.0,
  duration_ms INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT,
  request_type TEXT DEFAULT 'generate',
  result_post_id INTEGER,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES ai_jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (result_post_id) REFERENCES posts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS seo_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  endpoint_url TEXT,
  api_key_encrypted TEXT,
  config TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seo_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  overall_score INTEGER,
  details TEXT,
  analyzed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES seo_services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS short_urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  slug TEXT UNIQUE,
  target_url TEXT NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
`;

// Generate SQL dump export
async function exportSql(c: any, db: any, siteId: number, dialect: string = 'sqlite') {
  const isMySQL = dialect === 'mysql';
  const dateStr = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();

  function sqlEscape(val: unknown): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    if (isMySQL) {
      const str = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `'${str}'`;
    }
    const str = String(val).replace(/'/g, "''");
    return `'${str}'`;
  }

  function quoteCol(col: string): string {
    if (isMySQL && MYSQL_RESERVED.has(col.toLowerCase())) return `\`${col}\``;
    return col;
  }

  async function dumpTable(tableName: string, query: string, binds: unknown[]): Promise<string> {
    const rows = await db.prepare(query).bind(...binds).all();
    if (!rows.results || rows.results.length === 0) return '';

    const tblName = isMySQL ? `\`${tableName}\`` : tableName;
    let sql = `-- ${tableName} (${rows.results.length} rows)\n`;
    for (const row of rows.results as Record<string, unknown>[]) {
      const cols = Object.keys(row);
      const quotedCols = cols.map(quoteCol);
      const vals = cols.map((col) => sqlEscape(row[col]));
      sql += `INSERT INTO ${tblName} (${quotedCols.join(', ')}) VALUES (${vals.join(', ')});\n`;
    }
    sql += '\n';
    return sql;
  }

  const compatLabel = isMySQL ? 'MySQL / MariaDB' : 'SQLite / Cloudflare D1';
  let sql = `-- WP-CMS SQL Dump\n`;
  sql += `-- Site ID: ${siteId}\n`;
  sql += `-- Exported at: ${timestamp}\n`;
  sql += `-- Compatible with: ${compatLabel}\n`;
  sql += `-- -----------------------------------------------\n\n`;

  if (isMySQL) {
    sql += `SET NAMES utf8mb4;\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;
  } else {
    sql += `PRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;\n\n`;
  }

  sql += `-- =============================================\n`;
  sql += `-- TABLE STRUCTURE (CREATE TABLE IF NOT EXISTS)\n`;
  sql += `-- =============================================\n`;
  sql += isMySQL ? MYSQL_SCHEMA_DDL : SCHEMA_DDL;
  sql += `\n-- =============================================\n`;
  sql += `-- DATA\n`;
  sql += `-- =============================================\n\n`;

  // Site
  sql += await dumpTable('sites', 'SELECT * FROM sites WHERE id = ?', [siteId]);
  sql += await dumpTable('site_domains', 'SELECT * FROM site_domains WHERE site_id = ?', [siteId]);

  // Posts & related
  const posts = await db.prepare('SELECT * FROM posts WHERE site_id = ?').bind(siteId).all();
  sql += await dumpTable('posts', 'SELECT * FROM posts WHERE site_id = ?', [siteId]);

  const postIds = posts.results.map((p: any) => p.id);
  if (postIds.length > 0) {
    const ph = postIds.map(() => '?').join(',');
    sql += await dumpTable('post_meta', `SELECT * FROM post_meta WHERE post_id IN (${ph})`, postIds);
    sql += await dumpTable('post_taxonomies', `SELECT * FROM post_taxonomies WHERE post_id IN (${ph})`, postIds);
    sql += await dumpTable('comments', `SELECT * FROM comments WHERE post_id IN (${ph})`, postIds);
    sql += await dumpTable('revisions', `SELECT * FROM revisions WHERE post_id IN (${ph})`, postIds);
  }

  // Taxonomies
  sql += await dumpTable('taxonomies', 'SELECT * FROM taxonomies WHERE site_id = ?', [siteId]);

  // Media
  sql += await dumpTable('media', 'SELECT * FROM media WHERE site_id = ?', [siteId]);

  // Menus & items
  const menus = await db.prepare('SELECT * FROM menus WHERE site_id = ?').bind(siteId).all();
  sql += await dumpTable('menus', 'SELECT * FROM menus WHERE site_id = ?', [siteId]);
  const menuIds = menus.results.map((m: any) => m.id);
  if (menuIds.length > 0) {
    const mph = menuIds.map(() => '?').join(',');
    sql += await dumpTable('menu_items', `SELECT * FROM menu_items WHERE menu_id IN (${mph})`, menuIds);
  }

  // Settings & widgets
  sql += await dumpTable('settings', 'SELECT * FROM settings WHERE site_id = ?', [siteId]);
  sql += await dumpTable('widgets', 'SELECT * FROM widgets WHERE site_id = ?', [siteId]);

  // Redirects
  sql += await dumpTable('redirects', 'SELECT * FROM redirects WHERE site_id = ?', [siteId]);

  // AI related
  sql += await dumpTable('ai_providers', 'SELECT * FROM ai_providers WHERE site_id = ?', [siteId]);
  sql += await dumpTable('ai_prompts', 'SELECT * FROM ai_prompts WHERE site_id = ?', [siteId]);
  sql += await dumpTable('ai_jobs', 'SELECT * FROM ai_jobs WHERE site_id = ?', [siteId]);
  sql += await dumpTable('ai_logs', 'SELECT * FROM ai_logs WHERE site_id = ?', [siteId]);

  // SEO
  sql += await dumpTable('seo_services', 'SELECT * FROM seo_services WHERE site_id = ?', [siteId]);

  if (isMySQL) {
    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  } else {
    sql += `COMMIT;\nPRAGMA foreign_keys = ON;\n`;
  }

  const dialectLabel = isMySQL ? 'mysql' : 'sqlite';
  c.header('Content-Type', 'application/sql; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="site-${siteId}-${dialectLabel}-${dateStr}.sql"`);
  return c.body(sql);
}

// POST /api/backup/import - Import site data from JSON backup
app.post('/import', async (c) => {
  const siteId = c.get('siteId');
  const db = c.env.DB;

  const body = await c.req.json<{ data: Record<string, unknown[]> }>();
  const data = body.data;
  if (!data) {
    return c.json({ success: false, error: 'No data provided' }, 400);
  }

  const results: Record<string, number> = {};

  try {
    // Import settings
    if (data.settings && Array.isArray(data.settings)) {
      let count = 0;
      for (const setting of data.settings as Array<{ key: string; value: string; autoload?: number }>) {
        await db.prepare(
          'INSERT INTO settings (site_id, key, value, autoload) VALUES (?, ?, ?, ?) ON CONFLICT(site_id, key) DO UPDATE SET value = excluded.value'
        ).bind(siteId, setting.key, setting.value, setting.autoload ?? 1).run();
        count++;
      }
      results.settings = count;
    }

    // Import taxonomies
    if (data.taxonomies && Array.isArray(data.taxonomies)) {
      let count = 0;
      for (const tax of data.taxonomies as Array<Record<string, unknown>>) {
        try {
          await db.prepare(
            `INSERT OR IGNORE INTO taxonomies (site_id, name, slug, type, description, parent_id, language, translation_group, count)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(siteId, tax.name, tax.slug, tax.type, tax.description || null,
            tax.parent_id || null, tax.language || 'tr', tax.translation_group || null, tax.count || 0).run();
          count++;
        } catch { /* skip duplicates */ }
      }
      results.taxonomies = count;
    }

    return c.json({ success: true, data: { results } });
  } catch (err: unknown) {
    return c.json({
      success: false,
      error: 'Import failed: ' + (err instanceof Error ? err.message : String(err)),
    }, 500);
  }
});

export default app;
