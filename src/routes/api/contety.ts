import { Hono } from 'hono';
import type { Bindings, Variables, ContetyConfig, GlobalContetyConfig, ContetyContent, ContetyLog } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import {
  testContetyConnection, getAccount, getSubscription, getLanguages,
  getToneOfVoices, getTemplates, getContentList, getContentDetail,
  createWordPressBlogPost, createWpRecipe, createGoogleAdsDescription,
  createFacebookAdsHeadline, createFacebookAdsPrimaryText,
  importContentAsPost, getContetyApiKey,
  type ContetyContentDetail,
} from '../../lib/contety';

function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 4) return '****';
  return '****' + key.slice(-4);
}

// Helper: get API key with global fallback
async function getApiKeyWithFallback(db: D1Database, siteId: number): Promise<{ apiKey: string; source: 'site' | 'global' } | null> {
  // Try site-level config first
  const siteConfig = await db.prepare(
    'SELECT api_key, is_enabled FROM contety_configs WHERE site_id = ?'
  ).bind(siteId).first<{ api_key: string | null; is_enabled: number }>();

  if (siteConfig?.api_key && siteConfig.is_enabled === 1) {
    return { apiKey: siteConfig.api_key, source: 'site' };
  }

  // Fallback to global config
  const globalConfig = await db.prepare(
    'SELECT api_key, is_enabled FROM global_contety_config WHERE is_enabled = 1 LIMIT 1'
  ).first<{ api_key: string; is_enabled: number }>();

  if (globalConfig?.api_key) {
    return { apiKey: globalConfig.api_key, source: 'global' };
  }

  return null;
}

// Helper: get API key ignoring is_enabled (for test/proxy endpoints in settings page)
async function getApiKeyForProxy(db: D1Database, siteId: number): Promise<{ apiKey: string; source: 'site' | 'global' } | null> {
  const siteConfig = await db.prepare(
    'SELECT api_key FROM contety_configs WHERE site_id = ?'
  ).bind(siteId).first<{ api_key: string | null }>();

  if (siteConfig?.api_key) {
    return { apiKey: siteConfig.api_key, source: 'site' };
  }

  const globalConfig = await db.prepare(
    'SELECT api_key FROM global_contety_config WHERE is_enabled = 1 LIMIT 1'
  ).first<{ api_key: string }>();

  if (globalConfig?.api_key) {
    return { apiKey: globalConfig.api_key, source: 'global' };
  }

  return null;
}

const contety = new Hono<{ Bindings: Bindings; Variables: Variables }>();
contety.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// ══════════════════════════════════════════════════
// Config Management (admin only)
// ══════════════════════════════════════════════════

// GET /api/contety/config — Get site's Contety config
contety.get('/config', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  const config = await c.env.DB.prepare(
    'SELECT * FROM contety_configs WHERE site_id = ?'
  ).bind(siteId).first<ContetyConfig>();

  // Check if global fallback exists
  const globalConfig = await c.env.DB.prepare(
    'SELECT id, is_enabled FROM global_contety_config WHERE is_enabled = 1 LIMIT 1'
  ).first<{ id: number; is_enabled: number }>();

  const data = config
    ? {
        ...config,
        api_key: config.api_key ? maskApiKey(config.api_key) : null,
        has_global_fallback: !!globalConfig,
      }
    : {
        site_id: siteId,
        api_key: null,
        is_enabled: 0,
        auto_import: 0,
        default_status: 'draft',
        default_category_id: null,
        default_author_id: null,
        default_language_id: 1,
        default_model: 'gpt4_1',
        has_global_fallback: !!globalConfig,
      };

  return c.json({ success: true, data });
});

// PUT /api/contety/config — Update site's Contety config
contety.put('/config', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  const body = await c.req.json<{
    api_key?: string;
    is_enabled?: number;
    auto_import?: number;
    default_status?: string;
    default_category_id?: number;
    default_author_id?: number;
    default_language_id?: number;
    default_model?: string;
  }>();

  const result = await c.env.DB.prepare(
    `INSERT INTO contety_configs (site_id, api_key, is_enabled, auto_import, default_status, default_category_id, default_author_id, default_language_id, default_model)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(site_id) DO UPDATE SET
       api_key = COALESCE(excluded.api_key, contety_configs.api_key),
       is_enabled = COALESCE(excluded.is_enabled, contety_configs.is_enabled),
       auto_import = COALESCE(excluded.auto_import, contety_configs.auto_import),
       default_status = COALESCE(excluded.default_status, contety_configs.default_status),
       default_category_id = COALESCE(excluded.default_category_id, contety_configs.default_category_id),
       default_author_id = COALESCE(excluded.default_author_id, contety_configs.default_author_id),
       default_language_id = COALESCE(excluded.default_language_id, contety_configs.default_language_id),
       default_model = COALESCE(excluded.default_model, contety_configs.default_model),
       updated_at = datetime('now')
     RETURNING *`
  ).bind(
    siteId,
    body.api_key || null,
    body.is_enabled ?? 1,
    body.auto_import ?? 0,
    body.default_status || 'draft',
    body.default_category_id || null,
    body.default_author_id || null,
    body.default_language_id ?? 1,
    body.default_model || 'gpt4_1'
  ).first<ContetyConfig>();

  return c.json({ success: true, data: result });
});

// POST /api/contety/test — Test API connection (does not require is_enabled)
contety.post('/test', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  const keyResult = await getApiKeyForProxy(c.env.DB, siteId);
  if (!keyResult) {
    return c.json({ success: false, error: 'API key not configured' }, 400);
  }

  try {
    const [accountResult, subscriptionResult] = await Promise.all([
      getAccount(keyResult.apiKey),
      getSubscription(keyResult.apiKey),
    ]);

    return c.json({
      success: true,
      data: {
        connected: true,
        source: keyResult.source,
        account: accountResult,
        subscription: subscriptionResult,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 400);
  }
});

// ══════════════════════════════════════════════════
// Contety Data Proxy (admin only)
// ══════════════════════════════════════════════════

// GET /api/contety/languages — Proxy to Contety languages (does not require is_enabled)
contety.get('/languages', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  // For data proxy endpoints used in settings page, allow even if not enabled
  const keyResult = await getApiKeyForProxy(c.env.DB, siteId);
  if (!keyResult) {
    return c.json({ success: false, error: 'API key not configured' }, 400);
  }

  try {
    const data = await getLanguages(keyResult.apiKey);
    return c.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

// GET /api/contety/templates — Proxy to Contety templates
contety.get('/templates', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  const keyResult = await getApiKeyForProxy(c.env.DB, siteId);
  if (!keyResult) {
    return c.json({ success: false, error: 'API key not configured' }, 400);
  }

  try {
    const data = await getTemplates(keyResult.apiKey);
    console.log('[contety] templates raw:', JSON.stringify(data?.slice?.(0, 2)));
    return c.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[contety] templates error:', message);
    return c.json({ success: false, error: message }, 500);
  }
});

// GET /api/contety/tone-of-voices — Proxy to Contety tone of voices
contety.get('/tone-of-voices', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  const keyResult = await getApiKeyForProxy(c.env.DB, siteId);
  if (!keyResult) {
    return c.json({ success: false, error: 'API key not configured' }, 400);
  }

  try {
    const data = await getToneOfVoices(keyResult.apiKey);
    return c.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

// GET /api/contety/contents — Proxy to Contety content list
contety.get('/contents', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  const keyResult = await getApiKeyWithFallback(c.env.DB, siteId);
  if (!keyResult) {
    return c.json({ success: false, error: 'API key not configured' }, 400);
  }

  try {
    // Pass through all query params as filters
    const url = new URL(c.req.url);
    const filters: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      filters[key] = value;
    });

    const data = await getContentList(keyResult.apiKey, filters as any);
    return c.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

// GET /api/contety/contents/:id — Proxy to Contety content detail
contety.get('/contents/:id', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const contentId = c.req.param('id');

  const keyResult = await getApiKeyWithFallback(c.env.DB, siteId);
  if (!keyResult) {
    return c.json({ success: false, error: 'API key not configured' }, 400);
  }

  try {
    const data = await getContentDetail(keyResult.apiKey, parseInt(contentId));
    return c.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

// ══════════════════════════════════════════════════
// Content Generation (admin only)
// ══════════════════════════════════════════════════

// POST /api/contety/generate — Create new content on Contety
contety.post('/generate', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;

  const body = await c.req.json<{
    template_code: string;
    chatgpt_version?: string;
    language_id?: number;
    [key: string]: unknown;
  }>();

  if (!body.template_code) {
    return c.json({ success: false, error: 'template_code is required' }, 400);
  }

  const keyResult = await getApiKeyWithFallback(c.env.DB, siteId);
  if (!keyResult) {
    return c.json({ success: false, error: 'API key not configured' }, 400);
  }

  // Get site config for defaults
  const siteConfig = await c.env.DB.prepare(
    'SELECT * FROM contety_configs WHERE site_id = ?'
  ).bind(siteId).first<ContetyConfig>();

  // Build params, applying site defaults for missing fields
  const templateCode = body.template_code;
  const params: Record<string, unknown> = { ...body };
  delete params.template_code;

  if (!params.chatgpt_version && siteConfig?.default_model) {
    params.chatgpt_version = siteConfig.default_model;
  }
  if (!params.language_id && siteConfig?.default_language_id) {
    params.language_id = siteConfig.default_language_id;
  }

  try {
    // Route to the correct Contety API based on template code
    let result: ContetyContentDetail;
    if (templateCode === 'wordpress-blog-post') {
      result = await createWordPressBlogPost(keyResult.apiKey, params as any);
    } else if (templateCode === 'wp-recipe') {
      result = await createWpRecipe(keyResult.apiKey, params as any);
    } else if (templateCode === 'google-ads-description') {
      result = await createGoogleAdsDescription(keyResult.apiKey, params as any);
    } else if (templateCode === 'facebook-ads-headline') {
      result = await createFacebookAdsHeadline(keyResult.apiKey, params as any);
    } else if (templateCode === 'facebook-ads-primary-text') {
      result = await createFacebookAdsPrimaryText(keyResult.apiKey, params as any);
    } else {
      // Generic: try POST /content/{template_code}
      const { contetyFetch } = await import('../../lib/contety');
      result = await contetyFetch(keyResult.apiKey, `/content/${templateCode}`, {
        method: 'POST',
        body: JSON.stringify(params),
      }) as ContetyContentDetail;
    }

    // If response includes content_id, save to contety_contents
    const contentId = (result as any)?.content_id || (result as any)?.id;
    if (contentId) {
      await c.env.DB.prepare(
        `INSERT INTO contety_contents (site_id, contety_content_id, status, template_code)
         VALUES (?, ?, 'processing', ?)`
      ).bind(siteId, contentId, templateCode).run();
    }

    // Log the action
    await c.env.DB.prepare(
      `INSERT INTO contety_logs (site_id, action, contety_content_id, status)
       VALUES (?, 'generate', ?, 'success')`
    ).bind(siteId, contentId || null).run();

    return c.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Log error
    await c.env.DB.prepare(
      `INSERT INTO contety_logs (site_id, action, status, error_message)
       VALUES (?, 'generate', 'error', ?)`
    ).bind(siteId, message).run();

    return c.json({ success: false, error: message }, 500);
  }
});

// ══════════════════════════════════════════════════
// Import (admin only)
// ══════════════════════════════════════════════════

// POST /api/contety/import/:contentId — Import completed Contety content as WP post
contety.post('/import/:contentId', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;
  const contentId = c.req.param('contentId');

  // Read optional post_type from body (default: 'post')
  let postType: 'post' | 'page' = 'post';
  try {
    const body = await c.req.json<{ post_type?: string }>();
    if (body.post_type === 'page') postType = 'page';
  } catch {
    // No body or invalid JSON — use default
  }

  const keyResult = await getApiKeyWithFallback(c.env.DB, siteId);
  if (!keyResult) {
    return c.json({ success: false, error: 'API key not configured' }, 400);
  }

  try {
    // Fetch content detail from Contety API
    const contentData = await getContentDetail(keyResult.apiKey, parseInt(contentId));

    // Verify content is completed
    const status = (contentData as any)?.status;
    if (status !== 'completed') {
      return c.json({ success: false, error: `Content is not completed (status: ${status})` }, 400);
    }

    // Get site config for import defaults
    const siteConfig = await c.env.DB.prepare(
      'SELECT * FROM contety_configs WHERE site_id = ?'
    ).bind(siteId).first<ContetyConfig>();

    // Import as post or page
    const postId = await importContentAsPost(c.env.DB, c.env.R2, siteId, contentData as ContetyContentDetail, {
      default_status: siteConfig?.default_status || 'draft',
      default_category_id: siteConfig?.default_category_id || null,
      default_author_id: siteConfig?.default_author_id || user.sub,
      default_language: 'tr',
      post_type: postType,
    });

    // Update contety_contents record with post_id
    await c.env.DB.prepare(
      `UPDATE contety_contents SET status = 'imported', post_id = ?, updated_at = datetime('now')
       WHERE site_id = ? AND contety_content_id = ?`
    ).bind(postId, siteId, parseInt(contentId)).run();

    // Log success
    await c.env.DB.prepare(
      `INSERT INTO contety_logs (site_id, action, contety_content_id, post_id, status)
       VALUES (?, 'import', ?, ?, 'success')`
    ).bind(siteId, parseInt(contentId), postId).run();

    return c.json({ success: true, data: { post_id: postId, contety_content_id: contentId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Log error
    await c.env.DB.prepare(
      `INSERT INTO contety_logs (site_id, action, contety_content_id, status, error_message)
       VALUES (?, 'import', ?, 'error', ?)`
    ).bind(siteId, parseInt(contentId), message).run();

    return c.json({ success: false, error: message }, 500);
  }
});

// ══════════════════════════════════════════════════
// Debug: Content Detail (admin only)
// ══════════════════════════════════════════════════

contety.get('/debug/content/:contentId', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const contentId = c.req.param('contentId');

  const keyResult = await getApiKeyWithFallback(c.env.DB, siteId);
  if (!keyResult) {
    return c.json({ success: false, error: 'API key not configured' }, 400);
  }

  try {
    const contentData = await getContentDetail(keyResult.apiKey, parseInt(contentId));
    return c.json({ success: true, data: contentData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

// ══════════════════════════════════════════════════
// Status & Logs (admin only)
// ══════════════════════════════════════════════════

// GET /api/contety/pending — List processing/pending contents
contety.get('/pending', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  const result = await c.env.DB.prepare(
    `SELECT * FROM contety_contents
     WHERE site_id = ? AND status IN ('processing', 'pending')
     ORDER BY created_at DESC`
  ).bind(siteId).all<ContetyContent>();

  return c.json({ success: true, data: result.results });
});

// GET /api/contety/logs — List logs with pagination
contety.get('/logs', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const url = new URL(c.req.url);

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '20')));
  const offset = (page - 1) * perPage;

  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM contety_logs WHERE site_id = ?'
  ).bind(siteId).first<{ count: number }>();
  const total = countResult?.count || 0;

  const result = await c.env.DB.prepare(
    `SELECT * FROM contety_logs
     WHERE site_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(siteId, perPage, offset).all<ContetyLog>();

  return c.json({
    success: true,
    data: result.results,
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    },
  });
});

// ══════════════════════════════════════════════════
// Global Config (super_admin only)
// ══════════════════════════════════════════════════

// GET /api/contety/global/config — Get global Contety config
contety.get('/global/config', requireRole('super_admin'), async (c) => {
  const config = await c.env.DB.prepare(
    'SELECT * FROM global_contety_config LIMIT 1'
  ).first<GlobalContetyConfig>();

  const data = config
    ? {
        ...config,
        api_key: config.api_key ? maskApiKey(config.api_key) : null,
      }
    : {
        api_key: null,
        is_enabled: 0,
      };

  return c.json({ success: true, data });
});

// PUT /api/contety/global/config — Update global API key
contety.put('/global/config', requireRole('super_admin'), async (c) => {
  const body = await c.req.json<{
    api_key?: string;
    is_enabled?: number;
  }>();

  if (!body.api_key) {
    return c.json({ success: false, error: 'api_key is required' }, 400);
  }

  // Check if global config exists
  const existing = await c.env.DB.prepare(
    'SELECT id FROM global_contety_config LIMIT 1'
  ).first<{ id: number }>();

  let result;
  if (existing) {
    result = await c.env.DB.prepare(
      `UPDATE global_contety_config SET
        api_key = ?, is_enabled = ?, updated_at = datetime('now')
       WHERE id = ?
       RETURNING *`
    ).bind(body.api_key, body.is_enabled ?? 1, existing.id).first<GlobalContetyConfig>();
  } else {
    result = await c.env.DB.prepare(
      `INSERT INTO global_contety_config (api_key, is_enabled) VALUES (?, ?)
       RETURNING *`
    ).bind(body.api_key, body.is_enabled ?? 1).first<GlobalContetyConfig>();
  }

  return c.json({ success: true, data: result });
});

export default contety;
