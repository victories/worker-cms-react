import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createSlug } from '../../lib/slug';
import { deleteAllSiteFiles } from '../../lib/storage';
import { deleteCustomHostname, getCfCredentials } from './domains';
import { createDefaultContent } from '../../lib/default-content';
import { canReactivate } from '../../lib/site-quota';

const sites = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All site management routes require auth
sites.use('*', authMiddleware);

// GET /api/sites - List all sites (super_admin only)
sites.get('/', requireRole('super_admin'), async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT s.*, (SELECT COUNT(*) FROM posts WHERE site_id = s.id) as post_count, (SELECT COUNT(*) FROM media WHERE site_id = s.id) as media_count FROM sites s ORDER BY s.created_at DESC'
  ).all();

  // Fetch domains + owner for each site
  const sitesWithDomains = await Promise.all(
    result.results.map(async (site: any) => {
      const domains = await c.env.DB.prepare('SELECT * FROM site_domains WHERE site_id = ?')
        .bind(site.id)
        .all();
      // Get owner (first admin user assigned to this site)
      const owner = await c.env.DB.prepare(
        `SELECT u.id, u.email, u.display_name, u.role FROM users u
         JOIN user_sites us ON u.id = us.user_id
         WHERE us.site_id = ? ORDER BY u.id ASC LIMIT 1`
      ).bind(site.id).first<{ id: number; email: string; display_name: string; role: string }>();
      return { ...site, domains: domains.results, owner: owner || null };
    })
  );

  return c.json({ success: true, data: sitesWithDomains });
});

// GET /api/sites/my - List current user's sites (for non-super_admin users)
sites.get('/my', async (c) => {
  const user = c.get('user')!;

  const result = await c.env.DB.prepare(
    `SELECT s.*,
       (SELECT COUNT(*) FROM posts WHERE site_id = s.id) as post_count,
       (SELECT COUNT(*) FROM media WHERE site_id = s.id) as media_count
     FROM sites s
     JOIN user_sites us ON s.id = us.site_id
     WHERE us.user_id = ?
     ORDER BY s.created_at DESC`
  ).bind(user.sub).all();

  const sitesWithDomains = await Promise.all(
    result.results.map(async (site: any) => {
      const domains = await c.env.DB.prepare('SELECT * FROM site_domains WHERE site_id = ?')
        .bind(site.id)
        .all();
      return { ...site, domains: domains.results };
    })
  );

  return c.json({ success: true, data: sitesWithDomains });
});

// POST /api/sites - Create new site (super_admin or users with max_sites > 0)
sites.post('/', async (c) => {
  const currentUser = c.get('user')!;

  // Check site creation permission
  if (currentUser.role !== 'super_admin') {
    const userRecord = await c.env.DB.prepare('SELECT max_sites FROM users WHERE id = ?')
      .bind(currentUser.sub).first<{ max_sites: number }>();
    const maxSites = userRecord?.max_sites ?? 0;
    if (maxSites <= 0) {
      return c.json({ success: false, error: 'Site oluşturma yetkiniz yok' }, 403);
    }
    // Count user's existing sites
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM user_sites us
       JOIN sites s ON s.id = us.site_id
       WHERE us.user_id = ? AND s.status = 'active'`
    ).bind(currentUser.sub).first<{ count: number }>();
    if ((countResult?.count ?? 0) >= maxSites) {
      return c.json({ success: false, error: `Maksimum site limitine ulaştınız (${maxSites})` }, 403);
    }
  }

  const body = await c.req.json<{
    name: string;
    description?: string;
    domain?: string;
    default_language?: string;
  }>();

  if (!body.name) {
    return c.json({ success: false, error: 'Site adı gerekli' }, 400);
  }

  const slug = createSlug(body.name);

  // Check unique slug
  const existing = await c.env.DB.prepare('SELECT id FROM sites WHERE slug = ?').bind(slug).first();
  if (existing) {
    return c.json({ success: false, error: 'Bu isimde bir site zaten var' }, 400);
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO sites (name, slug, description, default_language) VALUES (?, ?, ?, ?) RETURNING *'
  ).bind(body.name, slug, body.description || null, body.default_language || 'tr').first();

  // Add domain if provided
  if (body.domain && result) {
    const domainExists = await c.env.DB.prepare('SELECT id FROM site_domains WHERE domain = ?')
      .bind(body.domain.toLowerCase())
      .first();

    if (domainExists) {
      return c.json({ success: false, error: 'Bu domain zaten kullanılıyor' }, 400);
    }

    await c.env.DB.prepare(
      'INSERT INTO site_domains (site_id, domain, is_primary) VALUES (?, ?, 1)'
    ).bind(result.id, body.domain.toLowerCase()).run();
  }

  // Create default settings
  const siteId = result!.id;
  const defaultSettings = [
    ['site_title', body.name],
    ['site_description', body.description || ''],
    ['posts_per_page', '10'],
    ['amp_enabled', '1'],
    ['theme_primary_color', '#2563eb'],
    ['theme_font_family', 'Inter'],
  ];

  for (const [key, value] of defaultSettings) {
    await c.env.DB.prepare('INSERT INTO settings (site_id, key, value) VALUES (?, ?, ?)')
      .bind(siteId, key, value)
      .run();
  }

  // Create default category
  await c.env.DB.prepare(
    'INSERT INTO taxonomies (site_id, name, slug, type, language) VALUES (?, ?, ?, ?, ?)'
  ).bind(siteId, 'Genel', 'genel', 'category', 'tr').run();

  // Auto-assign the creating user to the new site (for non-super_admin)
  if (currentUser.role !== 'super_admin') {
    await c.env.DB.prepare(
      'INSERT INTO user_sites (user_id, site_id, role_override) VALUES (?, ?, ?)'
    ).bind(currentUser.sub, siteId, 'admin').run();
  }

  // Create default demo content (pages, posts, menu)
  try {
    await createDefaultContent(c.env.DB, siteId as number, currentUser.sub, body.name, body.default_language || 'tr');
  } catch (e) {
    // Non-critical: site is created even if demo content fails
    console.error('Default content creation failed:', e);
  }

  return c.json({ success: true, data: result }, 201);
});

// GET /api/sites/:id (super_admin or site owner)
sites.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = c.get('user')!;

  // Non-super_admin users can only access their own sites
  if (user.role !== 'super_admin') {
    const membership = await c.env.DB.prepare(
      'SELECT 1 FROM user_sites WHERE user_id = ? AND site_id = ?'
    ).bind(user.sub, id).first();
    if (!membership) {
      return c.json({ success: false, error: 'Bu siteye erişim yetkiniz yok' }, 403);
    }
  }

  const site = await c.env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(id).first();

  if (!site) {
    return c.json({ success: false, error: 'Site bulunamadı' }, 404);
  }

  const domains = await c.env.DB.prepare('SELECT * FROM site_domains WHERE site_id = ?').bind(id).all();
  const settings = await c.env.DB.prepare('SELECT key, value FROM settings WHERE site_id = ?').bind(id).all();

  return c.json({
    success: true,
    data: {
      ...site,
      domains: domains.results,
      settings: Object.fromEntries(settings.results.map((s: any) => [s.key, s.value])),
    },
  });
});

// PUT /api/sites/:id (super_admin or site owner for limited fields)
sites.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = c.get('user')!;
  const body = await c.req.json<{ name?: string; description?: string; status?: string; default_language?: string; is_management?: boolean }>();

  // Non-super_admin users can only update their own sites
  if (user.role !== 'super_admin') {
    const membership = await c.env.DB.prepare(
      'SELECT role_override FROM user_sites WHERE user_id = ? AND site_id = ?'
    ).bind(user.sub, id).first<{ role_override: string }>();
    if (!membership) {
      return c.json({ success: false, error: 'Bu siteye erişim yetkiniz yok' }, 403);
    }
    // Regular users cannot change status or is_management
    delete body.status;
    delete body.is_management;
  }

  const existing = await c.env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ success: false, error: 'Site bulunamadı' }, 404);
  }

  // Management sites cannot be paused/suspended
  if (body.status && body.status !== 'active' && (existing as any).is_management === 1) {
    return c.json({ success: false, error: 'Yönetim sitesi duraklatılamaz' }, 403);
  }

  const result = await c.env.DB.prepare(
    'UPDATE sites SET name = ?, description = ?, status = ?, default_language = ?, is_management = ?, updated_at = datetime(\'now\') WHERE id = ? RETURNING *'
  ).bind(
    body.name || existing.name,
    body.description !== undefined ? body.description : existing.description,
    body.status || existing.status,
    body.default_language || existing.default_language,
    body.is_management !== undefined ? (body.is_management ? 1 : 0) : (existing as any).is_management || 0,
    id
  ).first();

  return c.json({ success: true, data: result });
});

// POST /api/sites/:id/activate - bring a paused site back online, only
// if the user still has quota headroom (active sites < max_sites).
sites.post('/:id/activate', async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = c.get('user')!;

  const site = await c.env.DB.prepare("SELECT id, status FROM sites WHERE id = ?")
    .bind(id).first<{ id: number; status: string }>();
  if (!site) return c.json({ success: false, error: 'Site bulunamadı' }, 404);
  if (site.status !== 'paused') {
    return c.json({ success: false, error: 'Site zaten aktif' }, 400);
  }

  if (user.role !== 'super_admin') {
    const owns = await c.env.DB.prepare(
      'SELECT 1 FROM user_sites WHERE user_id = ? AND site_id = ?'
    ).bind(user.sub, id).first();
    if (!owns) return c.json({ success: false, error: 'Yetkiniz yok' }, 403);

    const userRow = await c.env.DB.prepare('SELECT max_sites FROM users WHERE id = ?')
      .bind(user.sub).first<{ max_sites: number }>();
    const activeRow = await c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM user_sites us JOIN sites s ON s.id = us.site_id
       WHERE us.user_id = ? AND s.status = 'active'`
    ).bind(user.sub).first<{ n: number }>();
    if (!canReactivate(activeRow?.n ?? 0, userRow?.max_sites ?? 0)) {
      return c.json({
        success: false,
        error: 'Kota dolu. Önce ek site alın veya başka bir siteyi duraklatın.',
      }, 403);
    }
  }

  await c.env.DB.prepare(
    "UPDATE sites SET status = 'active', updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();
  return c.json({ success: true });
});

// DELETE /api/sites/:id (super_admin only)
sites.delete('/:id', requireRole('super_admin'), async (c) => {
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ success: false, error: 'Site bulunamadı' }, 404);
  }

  // Management sites cannot be deleted
  if ((existing as any).is_management === 1) {
    return c.json({ success: false, error: 'Yönetim sitesi silinemez' }, 403);
  }

  try {
    // Clean up Custom Hostnames from Cloudflare before deleting DB records
    const allDomains = await c.env.DB.prepare(
      'SELECT domain, cf_custom_hostname_id, setup_method FROM site_domains WHERE site_id = ?'
    ).bind(id).all<{ domain: string; cf_custom_hostname_id: string | null; setup_method: string | null }>();

    const cf = await getCfCredentials(c.env.DB);
    for (const d of allDomains.results || []) {
      if (d.setup_method === 'cname' && d.cf_custom_hostname_id && cf.saasZoneId) {
        await deleteCustomHostname(cf, d.cf_custom_hostname_id);
      }
    }
    // Also clean up pending domain record
    const primaryDomainForCleanup = allDomains.results?.find((d: any) => true);
    if (primaryDomainForCleanup) {
      const bareDomain = primaryDomainForCleanup.domain.replace(/^www\./, '');
      await c.env.DB.prepare("DELETE FROM global_settings WHERE key = ?")
        .bind(`pending_domain:${bareDomain}`).run();
    }

    // Delete all R2 files for this site
    await deleteAllSiteFiles(c.env.R2, id);

    // Manually delete all dependent records (some tables may lack ON DELETE CASCADE).
    // Order matters: delete child tables before parent tables to avoid FK violations.

    // 1) Get post IDs and menu IDs for this site to clean their children
    const sitePosts = await c.env.DB.prepare('SELECT id FROM posts WHERE site_id = ?').bind(id).all();
    const postIds = sitePosts.results?.map((r: any) => r.id) || [];

    const siteMenus = await c.env.DB.prepare('SELECT id FROM menus WHERE site_id = ?').bind(id).all();
    const menuIds = siteMenus.results?.map((r: any) => r.id) || [];

    const siteTaxonomies = await c.env.DB.prepare('SELECT id FROM taxonomies WHERE site_id = ?').bind(id).all();
    const taxIds = siteTaxonomies.results?.map((r: any) => r.id) || [];

    const siteServices = await c.env.DB.prepare('SELECT id FROM seo_services WHERE site_id = ?').bind(id).all();
    const serviceIds = siteServices.results?.map((r: any) => r.id) || [];

    // 2) Delete post-children: post_meta, comments, revisions, seo_scores, post_taxonomies
    if (postIds.length > 0) {
      const phPost = postIds.map(() => '?').join(',');
      await c.env.DB.batch([
        c.env.DB.prepare(`DELETE FROM post_meta WHERE post_id IN (${phPost})`).bind(...postIds),
        c.env.DB.prepare(`DELETE FROM comments WHERE post_id IN (${phPost})`).bind(...postIds),
        c.env.DB.prepare(`DELETE FROM revisions WHERE post_id IN (${phPost})`).bind(...postIds),
        c.env.DB.prepare(`DELETE FROM post_taxonomies WHERE post_id IN (${phPost})`).bind(...postIds),
      ]);
      if (serviceIds.length > 0) {
        const phSvc = serviceIds.map(() => '?').join(',');
        await c.env.DB.prepare(`DELETE FROM seo_scores WHERE post_id IN (${phPost}) OR service_id IN (${phSvc})`).bind(...postIds, ...serviceIds).run();
      } else {
        await c.env.DB.prepare(`DELETE FROM seo_scores WHERE post_id IN (${phPost})`).bind(...postIds).run();
      }
    }

    // 3) Delete menu_items (child of menus)
    if (menuIds.length > 0) {
      const phMenu = menuIds.map(() => '?').join(',');
      await c.env.DB.prepare(`DELETE FROM menu_items WHERE menu_id IN (${phMenu})`).bind(...menuIds).run();
    }

    // 4) Delete post_taxonomies referencing site taxonomies (if any remain)
    if (taxIds.length > 0) {
      const phTax = taxIds.map(() => '?').join(',');
      await c.env.DB.prepare(`DELETE FROM post_taxonomies WHERE taxonomy_id IN (${phTax})`).bind(...taxIds).run();
    }

    // 5) Delete all direct site_id tables
    const directTables = [
      'contact_submissions', 'ai_logs', 'ai_jobs', 'ai_prompts', 'ai_providers',
      'redirects', 'shortcodes', 'seo_services', 'site_plugins', 'page_views',
      'api_keys', 'settings', 'widgets', 'menus', 'media',
      'taxonomies', 'posts', 'user_sites', 'site_domains',
    ];
    await c.env.DB.batch(
      directTables.map((table) =>
        c.env.DB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(id)
      )
    );

    // Now safe to delete the site itself
    await c.env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();

    return c.json({ success: true, data: { message: 'Site silindi' } });
  } catch (err: any) {
    console.error('Site delete error:', err);
    return c.json({ success: false, error: err.message || 'Site silinirken hata oluştu' }, 500);
  }
});

// DELETE /api/sites/:id/my - Delete own site (regular users, ownership check)
sites.delete('/:id/my', async (c) => {
  const currentUser = c.get('user')!;
  const id = parseInt(c.req.param('id'));

  // Verify ownership
  const ownership = await c.env.DB.prepare(
    'SELECT 1 FROM user_sites WHERE user_id = ? AND site_id = ?'
  ).bind(currentUser.sub, id).first();
  if (!ownership) {
    return c.json({ success: false, error: 'Bu site size ait değil' }, 403);
  }

  const existing = await c.env.DB.prepare('SELECT * FROM sites WHERE id = ?').bind(id).first<any>();
  if (!existing) {
    return c.json({ success: false, error: 'Site bulunamadı' }, 404);
  }

  // Management sites cannot be deleted
  if (existing.is_management === 1) {
    return c.json({ success: false, error: 'Yönetim sitesi silinemez' }, 403);
  }

  // Confirm domain match
  const body = await c.req.json<{ confirm_domain: string }>().catch(() => ({ confirm_domain: '' }));
  const primaryDomain = await c.env.DB.prepare(
    'SELECT domain FROM site_domains WHERE site_id = ? AND is_primary = 1 LIMIT 1'
  ).bind(id).first<{ domain: string }>();

  if (!primaryDomain || body.confirm_domain !== primaryDomain.domain) {
    return c.json({ success: false, error: 'Domain doğrulaması başarısız' }, 400);
  }

  try {
    // Clean up Custom Hostnames from Cloudflare before deleting DB records
    const allDomains = await c.env.DB.prepare(
      'SELECT domain, cf_custom_hostname_id, setup_method FROM site_domains WHERE site_id = ?'
    ).bind(id).all<{ domain: string; cf_custom_hostname_id: string | null; setup_method: string | null }>();

    const cf = await getCfCredentials(c.env.DB);
    for (const d of allDomains.results || []) {
      if (d.setup_method === 'cname' && d.cf_custom_hostname_id && cf.saasZoneId) {
        await deleteCustomHostname(cf, d.cf_custom_hostname_id);
      }
    }

    // Delete all R2 files for this site
    await deleteAllSiteFiles(c.env.R2, id);

    // Delete child records
    const sitePosts = await c.env.DB.prepare('SELECT id FROM posts WHERE site_id = ?').bind(id).all();
    const postIds = sitePosts.results?.map((r: any) => r.id) || [];
    const siteMenus = await c.env.DB.prepare('SELECT id FROM menus WHERE site_id = ?').bind(id).all();
    const menuIds = siteMenus.results?.map((r: any) => r.id) || [];
    const siteTaxonomies = await c.env.DB.prepare('SELECT id FROM taxonomies WHERE site_id = ?').bind(id).all();
    const taxIds = siteTaxonomies.results?.map((r: any) => r.id) || [];
    const siteServices = await c.env.DB.prepare('SELECT id FROM seo_services WHERE site_id = ?').bind(id).all();
    const serviceIds = siteServices.results?.map((r: any) => r.id) || [];

    if (postIds.length > 0) {
      const phPost = postIds.map(() => '?').join(',');
      await c.env.DB.batch([
        c.env.DB.prepare(`DELETE FROM post_meta WHERE post_id IN (${phPost})`).bind(...postIds),
        c.env.DB.prepare(`DELETE FROM comments WHERE post_id IN (${phPost})`).bind(...postIds),
        c.env.DB.prepare(`DELETE FROM revisions WHERE post_id IN (${phPost})`).bind(...postIds),
        c.env.DB.prepare(`DELETE FROM post_taxonomies WHERE post_id IN (${phPost})`).bind(...postIds),
      ]);
      if (serviceIds.length > 0) {
        const phSvc = serviceIds.map(() => '?').join(',');
        await c.env.DB.prepare(`DELETE FROM seo_scores WHERE post_id IN (${phPost}) OR service_id IN (${phSvc})`).bind(...postIds, ...serviceIds).run();
      } else {
        await c.env.DB.prepare(`DELETE FROM seo_scores WHERE post_id IN (${phPost})`).bind(...postIds).run();
      }
    }
    if (menuIds.length > 0) {
      const phMenu = menuIds.map(() => '?').join(',');
      await c.env.DB.prepare(`DELETE FROM menu_items WHERE menu_id IN (${phMenu})`).bind(...menuIds).run();
    }
    if (taxIds.length > 0) {
      const phTax = taxIds.map(() => '?').join(',');
      await c.env.DB.prepare(`DELETE FROM post_taxonomies WHERE taxonomy_id IN (${phTax})`).bind(...taxIds).run();
    }

    const directTables = [
      'contact_submissions', 'ai_logs', 'ai_jobs', 'ai_prompts', 'ai_providers',
      'redirects', 'shortcodes', 'seo_services', 'site_plugins', 'page_views',
      'api_keys', 'settings', 'widgets', 'menus', 'media',
      'taxonomies', 'posts', 'user_sites', 'site_domains',
    ];
    await c.env.DB.batch(
      directTables.map((table) =>
        c.env.DB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(id)
      )
    );

    // Clean up pending domain record
    if (primaryDomain) {
      await c.env.DB.prepare("DELETE FROM global_settings WHERE key = ?")
        .bind(`pending_domain:${primaryDomain.domain}`).run();
    }

    await c.env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();

    return c.json({ success: true, data: { message: 'Site silindi' } });
  } catch (err: any) {
    console.error('Site delete (user) error:', err);
    return c.json({ success: false, error: err.message || 'Site silinirken hata oluştu' }, 500);
  }
});

// POST /api/sites/:id/domains - Add domain (super_admin only)
sites.post('/:id/domains', requireRole('super_admin'), async (c) => {
  const siteId = parseInt(c.req.param('id'));
  const body = await c.req.json<{ domain: string; is_primary?: boolean }>();

  if (!body.domain) {
    return c.json({ success: false, error: 'Domain gerekli' }, 400);
  }

  const domain = body.domain.toLowerCase().trim();

  // Check unique
  const existing = await c.env.DB.prepare('SELECT id FROM site_domains WHERE domain = ?').bind(domain).first();
  if (existing) {
    return c.json({ success: false, error: 'Bu domain zaten kullanılıyor' }, 400);
  }

  if (body.is_primary) {
    // Unset other primary domains for this site
    await c.env.DB.prepare('UPDATE site_domains SET is_primary = 0 WHERE site_id = ?').bind(siteId).run();
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO site_domains (site_id, domain, is_primary) VALUES (?, ?, ?) RETURNING *'
  ).bind(siteId, domain, body.is_primary ? 1 : 0).first();

  return c.json({ success: true, data: result }, 201);
});

// DELETE /api/sites/:id/domains/:domainId (super_admin only)
sites.delete('/:id/domains/:domainId', requireRole('super_admin'), async (c) => {
  const domainId = parseInt(c.req.param('domainId'));

  await c.env.DB.prepare('DELETE FROM site_domains WHERE id = ?').bind(domainId).run();

  return c.json({ success: true, data: { message: 'Domain kaldırıldı' } });
});

// PUT /api/sites/:id/domains/:domainId/primary (super_admin only)
sites.put('/:id/domains/:domainId/primary', requireRole('super_admin'), async (c) => {
  const siteId = parseInt(c.req.param('id'));
  const domainId = parseInt(c.req.param('domainId'));

  // Unset all primary for this site
  await c.env.DB.prepare('UPDATE site_domains SET is_primary = 0 WHERE site_id = ?').bind(siteId).run();
  // Set new primary
  await c.env.DB.prepare('UPDATE site_domains SET is_primary = 1 WHERE id = ?').bind(domainId).run();

  return c.json({ success: true, data: { message: 'Ana domain güncellendi' } });
});

export default sites;
