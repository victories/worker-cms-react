import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Bindings, Variables } from '../../types';
import { userApiKeyAuth } from '../../middleware/auth';
import { hashApiKey } from '../../lib/auth';
import { sanitizeHtml, stripHtml, truncateText } from '../../lib/sanitize';
import { createSlug, ensureUniqueSlug } from '../../lib/slug';
import { uploadFile } from '../../lib/storage';

// Public URL for an R2-hosted media file. The CMS serves /uploads/s/:siteId/...
// from the worker's R2; we prepend the site's primary domain so external
// integrations get a fully-qualified URL they can hotlink.
function buildMediaUrl(siteId: number, r2Key: string, primaryDomain: string | null): string {
  const path = `/uploads/s/${siteId}/${r2Key.replace(`sites/${siteId}/uploads/`, '')}`;
  return primaryDomain ? `https://${primaryDomain}${path}` : path;
}

type Ctx = Context<{ Bindings: Bindings; Variables: Variables }>;

const external = new Hono<{ Bindings: Bindings; Variables: Variables }>();

external.use('*', userApiKeyAuth);

// Helper: confirm the authed user (and the API key) can act on the given
// site_id. For site-scoped keys, the only allowed site is the bound one —
// even if the owning user has access to other sites.
async function requireSiteAccess(c: Ctx, siteId: number): Promise<{ ok: true } | { ok: false; res: Response }> {
  const user = c.get('user')!;
  const scope = c.get('apiKeyScope');
  const boundSite = c.get('apiKeySiteId');

  if (scope === 'site') {
    if (boundSite !== siteId) {
      return { ok: false, res: c.json({ success: false, error: 'Bu API anahtarı yalnızca tek site için yetkili' }, 403) };
    }
    return { ok: true };
  }

  if (user.role === 'super_admin') return { ok: true };
  const row = await c.env.DB.prepare(
    'SELECT 1 AS ok FROM user_sites WHERE user_id = ? AND site_id = ?'
  ).bind(user.sub, siteId).first<{ ok: number }>();
  if (!row) {
    return { ok: false, res: c.json({ success: false, error: 'Bu siteye erişiminiz yok' }, 403) };
  }
  return { ok: true };
}

// GET /api/external/me — auth probe + identity for the connecting integration
external.get('/me', (c) => {
  const user = c.get('user')!;
  return c.json({
    success: true,
    data: {
      user: {
        id: user.sub,
        email: (user as any).email,
        display_name: (user as any).display_name,
        role: user.role,
      },
    },
  });
});

// GET /api/external/sites — discovery endpoint worker-ai-bot calls right
// after the user pastes their wcms_ key.
//   - scope='user': every site the owning user can reach
//   - scope='site': just the one bound site (so a per-editor key only
//     surfaces their own site to the bot)
external.get('/sites', async (c) => {
  const user = c.get('user')!;
  const scope = c.get('apiKeyScope');
  const boundSite = c.get('apiKeySiteId');

  let rows;
  if (scope === 'site' && boundSite != null) {
    rows = await c.env.DB.prepare(
      `SELECT s.id, s.name, s.default_language AS language,
              (SELECT domain FROM site_domains d WHERE d.site_id = s.id AND d.is_primary = 1 LIMIT 1) AS primary_domain
       FROM sites s WHERE s.id = ?`
    ).bind(boundSite).all();
  } else if (user.role === 'super_admin') {
    rows = await c.env.DB.prepare(
      `SELECT s.id, s.name, s.default_language AS language,
              (SELECT domain FROM site_domains d WHERE d.site_id = s.id AND d.is_primary = 1 LIMIT 1) AS primary_domain
       FROM sites s ORDER BY s.id ASC`
    ).all();
  } else {
    rows = await c.env.DB.prepare(
      `SELECT s.id, s.name, s.default_language AS language,
              (SELECT domain FROM site_domains d WHERE d.site_id = s.id AND d.is_primary = 1 LIMIT 1) AS primary_domain
       FROM sites s
       INNER JOIN user_sites us ON us.site_id = s.id
       WHERE us.user_id = ?
       ORDER BY s.id ASC`
    ).bind(user.sub).all();
  }

  return c.json({ success: true, data: { sites: rows.results ?? [] } });
});

// GET /api/external/sites/:id/categories — for content placement UI
external.get('/sites/:id/categories', async (c) => {
  const id = parseInt(c.req.param('id'));
  const access = await requireSiteAccess(c, id);
  if (!access.ok) return access.res;
  const rows = await c.env.DB.prepare(
    "SELECT id, name, slug FROM taxonomies WHERE site_id = ? AND type = 'category' ORDER BY name ASC"
  ).bind(id).all();
  return c.json({ success: true, data: { categories: rows.results ?? [] } });
});

// GET /api/external/sites/:id/tags
external.get('/sites/:id/tags', async (c) => {
  const id = parseInt(c.req.param('id'));
  const access = await requireSiteAccess(c, id);
  if (!access.ok) return access.res;
  const rows = await c.env.DB.prepare(
    "SELECT id, name, slug FROM taxonomies WHERE site_id = ? AND type = 'tag' ORDER BY name ASC"
  ).bind(id).all();
  return c.json({ success: true, data: { tags: rows.results ?? [] } });
});

// POST /api/external/sites/:id/media — upload a single image/file from an
// external integration (worker-ai-bot uses this to push featured + body
// images into R2 before publishing). multipart/form-data with `file` and
// optional `alt_text`.
external.post('/sites/:id/media', async (c) => {
  const siteId = parseInt(c.req.param('id'));
  const access = await requireSiteAccess(c, siteId);
  if (!access.ok) return access.res;

  const user = c.get('user')!;
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ success: false, error: 'multipart/form-data bekleniyor' }, 400);
  }
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return c.json({ success: false, error: 'Dosya gerekli' }, 400);
  }

  const buffer = await file.arrayBuffer();
  const { key, size } = await uploadFile(c.env.R2, siteId, buffer, file.name, file.type);
  const altText = (formData.get('alt_text') as string | null) ?? null;

  const result = await c.env.DB.prepare(
    'INSERT INTO media (site_id, r2_key, filename, mime_type, size, alt_text, author_id) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id, r2_key, filename, mime_type, size, alt_text'
  ).bind(siteId, key, file.name, file.type, size, altText, user.sub).first<{
    id: number;
    r2_key: string;
    filename: string;
    mime_type: string;
    size: number;
    alt_text: string | null;
  }>();

  const domainRow = await c.env.DB.prepare(
    'SELECT domain FROM site_domains WHERE site_id = ? AND is_primary = 1 LIMIT 1'
  ).bind(siteId).first<{ domain: string }>();
  const url = buildMediaUrl(siteId, result!.r2_key, domainRow?.domain ?? null);

  return c.json({
    success: true,
    data: {
      id: result!.id,
      r2_key: result!.r2_key,
      url,
      filename: result!.filename,
      alt_text: result!.alt_text,
    },
  }, 201);
});

// POST /api/external/sites/:id/posts — create a post in the named site.
// Mirrors the JWT-authed POST /api/posts but with explicit site_id in
// the URL and user-scoped auth. Categories/tags accept either numeric IDs
// or strings (auto-created if missing).
external.post('/sites/:id/posts', async (c) => {
  const siteId = parseInt(c.req.param('id'));
  const user = c.get('user')!;
  const access = await requireSiteAccess(c, siteId);
  if (!access.ok) return access.res;

  const body = await c.req.json<{
    title: string;
    content?: string;
    excerpt?: string;
    slug?: string;
    status?: 'draft' | 'publish' | 'pending' | 'scheduled';
    post_type?: string;
    language?: string;
    published_at?: string;
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string;
    categories?: Array<number | string>;
    tags?: Array<number | string>;
    featured_image_id?: number;
  }>();

  if (!body.title) {
    return c.json({ success: false, error: 'Başlık gerekli' }, 400);
  }

  const status = body.status ?? 'draft';
  const language = body.language ?? 'tr';
  const slug = await ensureUniqueSlug(
    c.env.DB,
    'posts',
    body.slug || createSlug(body.title),
    siteId,
    language,
  );

  const sanitized = body.content ? sanitizeHtml(body.content) : null;
  const excerpt = body.excerpt || (sanitized ? truncateText(stripHtml(sanitized), 160) : null);

  const result = await c.env.DB.prepare(
    `INSERT INTO posts (
       site_id, title, slug, content, excerpt, status, post_type, author_id,
       language, seo_title, seo_description, seo_keywords, featured_image_id, published_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, slug, status`
  ).bind(
    siteId,
    body.title,
    slug,
    sanitized,
    excerpt,
    status,
    body.post_type ?? 'post',
    user.sub,
    language,
    body.seo_title ?? null,
    body.seo_description ?? null,
    body.seo_keywords ?? null,
    body.featured_image_id ?? null,
    status === 'publish' ? new Date().toISOString() : status === 'scheduled' ? body.published_at : null,
  ).first<{ id: number; slug: string; status: string }>();

  const postId = result!.id;

  // Resolve categories/tags. Numeric → assume existing taxonomy id.
  // String → look up by slug, create if missing.
  async function attachTaxonomy(items: Array<number | string> | undefined, type: 'category' | 'tag') {
    if (!items?.length) return;
    for (const it of items) {
      let taxId: number | null = null;
      if (typeof it === 'number') {
        taxId = it;
      } else {
        const slugLower = createSlug(it);
        const existing = await c.env.DB.prepare(
          'SELECT id FROM taxonomies WHERE site_id = ? AND type = ? AND slug = ?'
        ).bind(siteId, type, slugLower).first<{ id: number }>();
        if (existing) {
          taxId = existing.id;
        } else {
          const ins = await c.env.DB.prepare(
            'INSERT INTO taxonomies (site_id, type, name, slug) VALUES (?, ?, ?, ?) RETURNING id'
          ).bind(siteId, type, it, slugLower).first<{ id: number }>();
          taxId = ins?.id ?? null;
        }
      }
      if (taxId) {
        await c.env.DB.prepare(
          'INSERT OR IGNORE INTO post_taxonomies (post_id, taxonomy_id) VALUES (?, ?)'
        ).bind(postId, taxId).run();
      }
    }
  }

  await attachTaxonomy(body.categories, 'category');
  await attachTaxonomy(body.tags, 'tag');

  // Build a public URL hint for the dispatcher to record.
  const domainRow = await c.env.DB.prepare(
    'SELECT domain FROM site_domains WHERE site_id = ? AND is_primary = 1 LIMIT 1'
  ).bind(siteId).first<{ domain: string }>();
  const publicUrl = domainRow ? `https://${domainRow.domain}/${slug}` : null;

  return c.json({
    success: true,
    data: {
      id: postId,
      slug: result!.slug,
      status: result!.status,
      url: publicUrl,
    },
  }, 201);
});

// ---- User-scoped key management (called from authenticated admin UI, NOT
// with userApiKeyAuth — this lives under /api/account/keys, not external).

export const accountKeys = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// These routes use the JWT auth from authMiddleware via the admin app,
// not the api key. They're exposed so a logged-in user can mint, list,
// and revoke their own user-scoped keys.

import { authMiddleware } from '../../middleware/auth';
accountKeys.use('*', authMiddleware);

accountKeys.get('/keys', async (c) => {
  const user = c.get('user')!;
  const rows = await c.env.DB.prepare(
    "SELECT id, name, key_prefix, permissions, last_used, expires_at, created_at FROM api_keys WHERE user_id = ? AND scope = 'user' ORDER BY created_at DESC"
  ).bind(user.sub).all();
  return c.json({ success: true, data: rows.results ?? [] });
});

accountKeys.post('/keys', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{ name: string; permissions?: string; expires_at?: string }>();
  if (!body.name) {
    return c.json({ success: false, error: 'İsim gerekli' }, 400);
  }
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const rawKey = 'wcms_' + Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const keyPrefix = rawKey.substring(0, 12);
  const keyHash = await hashApiKey(rawKey);

  const result = await c.env.DB.prepare(
    "INSERT INTO api_keys (scope, site_id, user_id, name, key_hash, key_prefix, permissions, expires_at) VALUES ('user', NULL, ?, ?, ?, ?, ?, ?) RETURNING id, name, key_prefix, permissions, expires_at, created_at"
  ).bind(user.sub, body.name, keyHash, keyPrefix, body.permissions ?? 'read,write', body.expires_at ?? null).first();

  return c.json({ success: true, data: { ...result, key: rawKey } }, 201);
});

accountKeys.delete('/keys/:id', async (c) => {
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'));
  const existing = await c.env.DB.prepare(
    "SELECT id FROM api_keys WHERE id = ? AND user_id = ? AND scope = 'user'"
  ).bind(id, user.sub).first();
  if (!existing) {
    return c.json({ success: false, error: 'API anahtarı bulunamadı' }, 404);
  }
  await c.env.DB.prepare("DELETE FROM api_keys WHERE id = ? AND scope = 'user'").bind(id).run();
  return c.json({ success: true, data: { message: 'silindi' } });
});

export default external;
