import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware } from '../../middleware/auth';

const mcp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const MCP_VERSION = '2025-03-26';
const SERVER_INFO = {
  name: 'workercms-mcp-server',
  version: '1.0.0',
};

// Tool definitions - all CMS tools
function getTools() {
  return [
    // Sites
    {
      name: 'cms_list_sites',
      description: 'List all sites managed by this CMS. Returns site IDs, names, domains.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'cms_get_site',
      description: 'Get details of a specific site.',
      inputSchema: {
        type: 'object',
        properties: { site_id: { type: 'number', description: 'Site ID' } },
        required: ['site_id'],
      },
      annotations: { readOnlyHint: true },
    },
    // Posts
    {
      name: 'cms_list_posts',
      description: 'List posts/pages. Filter by status, type, language.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number', description: 'Site ID (required)' },
          status: { type: 'string', enum: ['publish', 'draft', 'pending', 'trash', 'scheduled'] },
          post_type: { type: 'string', enum: ['post', 'page'] },
          language: { type: 'string', description: 'Language code (tr, en)' },
          search: { type: 'string', description: 'Search in title/content' },
          page: { type: 'number', default: 1 },
          per_page: { type: 'number', default: 20 },
        },
        required: ['site_id'],
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'cms_get_post',
      description: 'Get a single post by ID with full content.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number' },
          id: { type: 'number', description: 'Post ID' },
        },
        required: ['site_id', 'id'],
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'cms_create_post',
      description: 'Create a new post or page.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number' },
          title: { type: 'string' },
          content: { type: 'string', description: 'HTML content' },
          status: { type: 'string', enum: ['publish', 'draft', 'pending', 'scheduled'], default: 'draft' },
          post_type: { type: 'string', enum: ['post', 'page'], default: 'post' },
          excerpt: { type: 'string' },
          slug: { type: 'string' },
          language: { type: 'string' },
          featured_image: { type: 'string' },
          category_ids: { type: 'array', items: { type: 'number' } },
          tag_ids: { type: 'array', items: { type: 'number' } },
          seo_title: { type: 'string' },
          seo_description: { type: 'string' },
        },
        required: ['site_id', 'title', 'content'],
      },
      annotations: { readOnlyHint: false },
    },
    {
      name: 'cms_update_post',
      description: 'Update an existing post. Only provide fields to change.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number' },
          id: { type: 'number' },
          title: { type: 'string' },
          content: { type: 'string' },
          status: { type: 'string', enum: ['publish', 'draft', 'pending', 'trash', 'scheduled'] },
          excerpt: { type: 'string' },
          slug: { type: 'string' },
          featured_image: { type: 'string' },
          seo_title: { type: 'string' },
          seo_description: { type: 'string' },
        },
        required: ['site_id', 'id'],
      },
      annotations: { readOnlyHint: false },
    },
    {
      name: 'cms_delete_post',
      description: 'Move a post to trash.',
      inputSchema: {
        type: 'object',
        properties: { site_id: { type: 'number' }, id: { type: 'number' } },
        required: ['site_id', 'id'],
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    // Media
    {
      name: 'cms_list_media',
      description: 'List media files from the library.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number' },
          page: { type: 'number', default: 1 },
          per_page: { type: 'number', default: 20 },
          search: { type: 'string' },
        },
        required: ['site_id'],
      },
      annotations: { readOnlyHint: true },
    },
    // Taxonomies
    {
      name: 'cms_list_taxonomies',
      description: 'List categories and tags.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number' },
          type: { type: 'string', enum: ['category', 'tag'] },
          language: { type: 'string' },
        },
        required: ['site_id'],
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'cms_create_taxonomy',
      description: 'Create a new category or tag.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number' },
          name: { type: 'string' },
          slug: { type: 'string' },
          type: { type: 'string', enum: ['category', 'tag'], default: 'category' },
          description: { type: 'string' },
          parent_id: { type: 'number' },
          language: { type: 'string' },
        },
        required: ['site_id', 'name'],
      },
      annotations: { readOnlyHint: false },
    },
    // Comments
    {
      name: 'cms_list_comments',
      description: 'List comments with optional status filter.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number' },
          status: { type: 'string', enum: ['pending', 'approved', 'spam', 'trash'] },
          post_id: { type: 'number' },
          page: { type: 'number', default: 1 },
        },
        required: ['site_id'],
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'cms_moderate_comment',
      description: 'Approve, spam, or trash a comment.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number' },
          id: { type: 'number' },
          status: { type: 'string', enum: ['approved', 'spam', 'trash'] },
        },
        required: ['site_id', 'id', 'status'],
      },
      annotations: { readOnlyHint: false },
    },
    // Analytics
    {
      name: 'cms_analytics_overview',
      description: 'Get site analytics: total views, today views, post/page/comment/media counts.',
      inputSchema: {
        type: 'object',
        properties: { site_id: { type: 'number' } },
        required: ['site_id'],
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'cms_analytics_popular',
      description: 'Get most visited pages.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number' },
          days: { type: 'number', default: 30 },
        },
        required: ['site_id'],
      },
      annotations: { readOnlyHint: true },
    },
    // Settings
    {
      name: 'cms_get_settings',
      description: 'Get all site settings.',
      inputSchema: {
        type: 'object',
        properties: { site_id: { type: 'number' } },
        required: ['site_id'],
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'cms_update_settings',
      description: 'Update site settings with key-value pairs.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number' },
          settings: { type: 'object', description: 'Key-value pairs to update' },
        },
        required: ['site_id', 'settings'],
      },
      annotations: { readOnlyHint: false },
    },
    // Plugins
    {
      name: 'cms_list_plugins',
      description: 'List all plugins with activation status.',
      inputSchema: {
        type: 'object',
        properties: { site_id: { type: 'number' } },
        required: ['site_id'],
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'cms_toggle_plugin',
      description: 'Activate or deactivate a plugin for a site.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number' },
          id: { type: 'number', description: 'Plugin ID' },
          action: { type: 'string', enum: ['activate', 'deactivate'] },
        },
        required: ['site_id', 'id', 'action'],
      },
      annotations: { readOnlyHint: false },
    },
    // Search
    {
      name: 'cms_search',
      description: 'Full-text search across posts using FTS5 with BM25 ranking.',
      inputSchema: {
        type: 'object',
        properties: {
          site_id: { type: 'number' },
          query: { type: 'string', description: 'Search query' },
          language: { type: 'string' },
          page: { type: 'number', default: 1 },
          per_page: { type: 'number', default: 10 },
        },
        required: ['site_id', 'query'],
      },
      annotations: { readOnlyHint: true },
    },
  ];
}

// JSON-RPC helpers
function jsonrpc(id: string | number | null, result: any) {
  return { jsonrpc: '2.0', id, result };
}

function jsonrpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

// Allowed fields for post update (whitelist to prevent SQL injection)
const ALLOWED_POST_UPDATE_FIELDS = new Set([
  'title', 'content', 'status', 'excerpt', 'slug',
  'featured_image', 'seo_title', 'seo_description',
]);

// Internal API caller - calls our own API routes internally via DB
async function callTool(name: string, args: any, env: Bindings, siteId?: number): Promise<any> {
  const db = env.DB;

  // Helper to run DB queries with site context
  async function query(sql: string, ...params: any[]) {
    const stmt = db.prepare(sql);
    return params.length > 0 ? stmt.bind(...params).all() : stmt.all();
  }
  async function queryFirst(sql: string, ...params: any[]) {
    const stmt = db.prepare(sql);
    return params.length > 0 ? stmt.bind(...params).first() : stmt.first();
  }

  switch (name) {
    // SITES
    case 'cms_list_sites': {
      const result = await query('SELECT id, name, slug, description, status, default_language, created_at FROM sites ORDER BY id');
      return result.results;
    }
    case 'cms_get_site': {
      const site = await queryFirst('SELECT * FROM sites WHERE id = ?', args.site_id);
      if (!site) throw new Error('Site not found');
      const domains = await query('SELECT * FROM site_domains WHERE site_id = ?', args.site_id);
      return { ...site, domains: domains.results };
    }

    // POSTS
    case 'cms_list_posts': {
      let sql = `SELECT id, title, slug, status, post_type, language, excerpt, featured_image, created_at, updated_at FROM posts WHERE site_id = ?`;
      const params: any[] = [siteId];
      if (args.status) { sql += ' AND status = ?'; params.push(args.status); }
      if (args.post_type) { sql += ' AND post_type = ?'; params.push(args.post_type); }
      if (args.language) { sql += ' AND language = ?'; params.push(args.language); }
      if (args.search) { sql += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${args.search}%`, `%${args.search}%`); }
      sql += ' ORDER BY created_at DESC';
      const page = args.page || 1;
      const perPage = args.per_page || 20;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(perPage, (page - 1) * perPage);
      const result = await db.prepare(sql).bind(...params).all();
      return result.results;
    }
    case 'cms_get_post': {
      const post = await queryFirst('SELECT * FROM posts WHERE id = ? AND site_id = ?', args.id, siteId);
      if (!post) throw new Error('Post not found');
      return post;
    }
    case 'cms_create_post': {
      const { title, content, status, post_type, excerpt, slug, language, featured_image, seo_title, seo_description, category_ids, tag_ids } = args;
      const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const result = await db.prepare(
        `INSERT INTO posts (site_id, title, content, status, post_type, excerpt, slug, language, featured_image, seo_title, seo_description, author_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1) RETURNING *`
      ).bind(
        siteId, title, content, status || 'draft', post_type || 'post',
        excerpt || null, finalSlug, language || 'tr', featured_image || null,
        seo_title || null, seo_description || null
      ).first();
      // Handle category/tag assignments if provided
      if (result && category_ids?.length) {
        for (const catId of category_ids) {
          await db.prepare('INSERT OR IGNORE INTO post_taxonomies (post_id, taxonomy_id) VALUES (?, ?)').bind((result as any).id, catId).run();
        }
      }
      if (result && tag_ids?.length) {
        for (const tagId of tag_ids) {
          await db.prepare('INSERT OR IGNORE INTO post_taxonomies (post_id, taxonomy_id) VALUES (?, ?)').bind((result as any).id, tagId).run();
        }
      }
      return result;
    }
    case 'cms_update_post': {
      const { id, ...fields } = args;
      const setClauses: string[] = [];
      const setParams: any[] = [];
      for (const [key, val] of Object.entries(fields)) {
        if (val !== undefined && key !== 'site_id' && ALLOWED_POST_UPDATE_FIELDS.has(key)) {
          setClauses.push(`${key} = ?`);
          setParams.push(val);
        }
      }
      if (setClauses.length === 0) throw new Error('No fields to update');
      setClauses.push("updated_at = datetime('now')");
      setParams.push(id, siteId);
      const result = await db.prepare(
        `UPDATE posts SET ${setClauses.join(', ')} WHERE id = ? AND site_id = ? RETURNING *`
      ).bind(...setParams).first();
      return result;
    }
    case 'cms_delete_post': {
      await db.prepare("UPDATE posts SET status = 'trash', updated_at = datetime('now') WHERE id = ? AND site_id = ?").bind(args.id, siteId).run();
      return { message: 'Post moved to trash' };
    }

    // MEDIA
    case 'cms_list_media': {
      const page = args.page || 1;
      const perPage = args.per_page || 20;
      let sql = 'SELECT id, filename, original_name, mime_type, size, alt_text, r2_key, created_at FROM media WHERE site_id = ?';
      const params: any[] = [siteId];
      if (args.search) { sql += ' AND (original_name LIKE ? OR filename LIKE ?)'; params.push(`%${args.search}%`, `%${args.search}%`); }
      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(perPage, (page - 1) * perPage);
      const result = await db.prepare(sql).bind(...params).all();
      return result.results;
    }

    // TAXONOMIES
    case 'cms_list_taxonomies': {
      let sql = 'SELECT * FROM taxonomies WHERE site_id = ?';
      const params: any[] = [siteId];
      if (args.type) { sql += ' AND type = ?'; params.push(args.type); }
      if (args.language) { sql += ' AND language = ?'; params.push(args.language); }
      sql += ' ORDER BY name';
      const result = await db.prepare(sql).bind(...params).all();
      return result.results;
    }
    case 'cms_create_taxonomy': {
      const { name, slug, type, description, parent_id, language } = args;
      const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const result = await db.prepare(
        'INSERT INTO taxonomies (site_id, name, slug, type, description, parent_id, language) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *'
      ).bind(siteId, name, finalSlug, type || 'category', description || null, parent_id || null, language || 'tr').first();
      return result;
    }

    // COMMENTS
    case 'cms_list_comments': {
      let sql = 'SELECT c.*, p.title as post_title FROM comments c LEFT JOIN posts p ON c.post_id = p.id WHERE p.site_id = ?';
      const params: any[] = [siteId];
      if (args.status) { sql += ' AND c.status = ?'; params.push(args.status); }
      if (args.post_id) { sql += ' AND c.post_id = ?'; params.push(args.post_id); }
      sql += ' ORDER BY c.created_at DESC LIMIT 50';
      const result = await db.prepare(sql).bind(...params).all();
      return result.results;
    }
    case 'cms_moderate_comment': {
      await db.prepare('UPDATE comments SET status = ? WHERE id = ?').bind(args.status, args.id).run();
      return { message: `Comment ${args.status}` };
    }

    // ANALYTICS
    case 'cms_analytics_overview': {
      const [totalViews, todayViews, totalPosts, totalPages, totalComments] = await Promise.all([
        queryFirst('SELECT COUNT(*) as count FROM page_views WHERE site_id = ?', siteId),
        queryFirst("SELECT COUNT(*) as count FROM page_views WHERE site_id = ? AND viewed_at >= date('now')", siteId),
        queryFirst("SELECT COUNT(*) as count FROM posts WHERE site_id = ? AND post_type = 'post' AND status = 'publish'", siteId),
        queryFirst("SELECT COUNT(*) as count FROM posts WHERE site_id = ? AND post_type = 'page' AND status = 'publish'", siteId),
        queryFirst('SELECT COUNT(*) as count FROM comments WHERE post_id IN (SELECT id FROM posts WHERE site_id = ?)', siteId),
      ]);
      return {
        total_views: (totalViews as any)?.count || 0,
        today_views: (todayViews as any)?.count || 0,
        total_posts: (totalPosts as any)?.count || 0,
        total_pages: (totalPages as any)?.count || 0,
        total_comments: (totalComments as any)?.count || 0,
      };
    }
    case 'cms_analytics_popular': {
      const days = args.days || 30;
      const result = await db.prepare(
        `SELECT path, COUNT(*) as views FROM page_views
         WHERE site_id = ? AND viewed_at >= date('now', '-' || ? || ' days')
         GROUP BY path ORDER BY views DESC LIMIT 20`
      ).bind(siteId, days).all();
      return result.results;
    }

    // SETTINGS
    case 'cms_get_settings': {
      const result = await query('SELECT key, value FROM settings WHERE site_id = ?', siteId);
      const settings: Record<string, string> = {};
      for (const row of result.results as any[]) {
        settings[row.key] = row.value;
      }
      return settings;
    }
    case 'cms_update_settings': {
      for (const [key, value] of Object.entries(args.settings)) {
        await db.prepare(
          "INSERT INTO settings (site_id, key, value) VALUES (?, ?, ?) ON CONFLICT(site_id, key) DO UPDATE SET value = ?, updated_at = datetime('now')"
        ).bind(siteId, key, String(value), String(value)).run();
      }
      return { message: 'Settings updated' };
    }

    // PLUGINS
    case 'cms_list_plugins': {
      const result = await db.prepare(
        `SELECT p.*, sp.is_active, sp.activated_at
         FROM plugins p LEFT JOIN site_plugins sp ON p.id = sp.plugin_id AND sp.site_id = ?
         ORDER BY p.name`
      ).bind(siteId).all();
      return result.results;
    }
    case 'cms_toggle_plugin': {
      if (args.action === 'activate') {
        await db.prepare(
          "INSERT INTO site_plugins (site_id, plugin_id, is_active, activated_at) VALUES (?, ?, 1, datetime('now')) ON CONFLICT(site_id, plugin_id) DO UPDATE SET is_active = 1, activated_at = datetime('now')"
        ).bind(siteId, args.id).run();
      } else {
        await db.prepare('UPDATE site_plugins SET is_active = 0 WHERE site_id = ? AND plugin_id = ?').bind(siteId, args.id).run();
      }
      return { message: `Plugin ${args.action}d` };
    }

    // SEARCH
    case 'cms_search': {
      const page = args.page || 1;
      const perPage = args.per_page || 10;
      // Try FTS5 first, fallback to LIKE
      try {
        const result = await db.prepare(
          `SELECT p.id, p.title, p.slug, p.excerpt, p.status, p.post_type, p.language, p.created_at,
            highlight(posts_fts, 0, '<mark>', '</mark>') as title_highlight
           FROM posts_fts
           JOIN posts_fts_map m ON posts_fts.rowid = m.rowid
           JOIN posts p ON m.post_id = p.id
           WHERE posts_fts MATCH ? AND m.site_id = ? AND m.status = 'publish'
           ORDER BY rank
           LIMIT ? OFFSET ?`
        ).bind(args.query, siteId, perPage, (page - 1) * perPage).all();
        return result.results;
      } catch {
        // FTS5 not available, fallback to LIKE
        const result = await db.prepare(
          `SELECT id, title, slug, excerpt, status, post_type, language, created_at
           FROM posts WHERE site_id = ? AND status = 'publish' AND (title LIKE ? OR content LIKE ?)
           ORDER BY created_at DESC LIMIT ? OFFSET ?`
        ).bind(siteId, `%${args.query}%`, `%${args.query}%`, perPage, (page - 1) * perPage).all();
        return result.results;
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Auth: require JWT Bearer token with super_admin role
mcp.use('*', authMiddleware);

// POST /mcp - Handle MCP JSON-RPC requests
mcp.post('/', async (c) => {
  const user = c.get('user');
  if (!user || user.role !== 'super_admin') {
    return c.json(jsonrpcError(null, -32600, 'super_admin role required'), 403);
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json(jsonrpcError(null, -32700, 'Parse error'), 400);
  }

  const { jsonrpc: version, id, method, params } = body;
  if (version !== '2.0') {
    return c.json(jsonrpcError(id, -32600, 'Invalid JSON-RPC version'), 400);
  }

  try {
    switch (method) {
      case 'initialize':
        return c.json(jsonrpc(id, {
          protocolVersion: MCP_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        }));

      case 'notifications/initialized':
        return new Response(null, { status: 202 });

      case 'tools/list':
        return c.json(jsonrpc(id, { tools: getTools() }));

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (!toolName) {
          return c.json(jsonrpcError(id, -32602, 'Missing tool name'), 400);
        }

        const siteId = toolArgs.site_id;

        try {
          const result = await callTool(toolName, toolArgs, c.env, siteId);
          return c.json(jsonrpc(id, {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          }));
        } catch (err: any) {
          return c.json(jsonrpc(id, {
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true,
          }));
        }
      }

      case 'ping':
        return c.json(jsonrpc(id, {}));

      default:
        return c.json(jsonrpcError(id, -32601, `Method not found: ${method}`), 400);
    }
  } catch (err: any) {
    return c.json(jsonrpcError(id, -32603, err.message), 500);
  }
});

// GET /mcp - SSE not supported in stateless mode
mcp.get('/', (c) => {
  return c.text('', 405, { Allow: 'POST' });
});

// DELETE /mcp - No sessions
mcp.delete('/', (c) => {
  return c.text('', 405, { Allow: 'POST' });
});

export default mcp;
