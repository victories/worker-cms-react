import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware } from '../../middleware/auth';
import { createDefaultContent } from '../../lib/default-content';

const domains = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Helper: detect if domain is a subdomain (e.g. cms.example.com) vs root domain (e.g. example.com, abc.com.tr)
function isSubdomain(domain: string): boolean {
  const clean = domain.replace(/^www\./, '');
  const parts = clean.split('.');
  if (parts.length <= 2) return false; // example.com
  // Check for known two-part TLDs (com.tr, co.uk, org.br, etc.)
  const lastTwo = parts.slice(-2).join('.');
  const twoPartTLDs = [
    'com.tr', 'org.tr', 'net.tr', 'gov.tr', 'edu.tr', 'gen.tr', 'bel.tr',
    'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'net.uk',
    'com.br', 'org.br', 'net.br',
    'co.jp', 'or.jp', 'ne.jp', 'ac.jp',
    'com.au', 'org.au', 'net.au', 'edu.au',
    'co.za', 'org.za', 'net.za',
    'co.in', 'org.in', 'net.in',
    'com.de', 'org.de',
    'co.kr', 'or.kr',
    'com.mx', 'org.mx',
    'com.ar', 'org.ar',
    'co.il', 'org.il',
    'com.cn', 'org.cn', 'net.cn',
    'co.nz', 'org.nz', 'net.nz',
    'com.pl', 'org.pl', 'net.pl',
    'com.ru', 'org.ru', 'net.ru',
    'com.ua', 'org.ua', 'net.ua',
    'co.id', 'or.id',
  ];
  if (twoPartTLDs.includes(lastTwo)) {
    return parts.length > 3; // abc.com.tr = root (3 parts), sub.abc.com.tr = subdomain (4 parts)
  }
  return parts.length > 2; // cms.example.com = subdomain (3 parts)
}

domains.use('*', authMiddleware);

// Helper: get Cloudflare credentials from global_settings
async function getCfCredentials(db: D1Database) {
  const rows = await db.prepare(
    "SELECT key, value FROM global_settings WHERE key IN ('cf_api_key', 'cf_email', 'cf_account_id', 'cf_saas_zone_id', 'cname_target')"
  ).all<{ key: string; value: string }>();

  const map: Record<string, string> = {};
  for (const r of rows.results || []) {
    if (r.value) map[r.key] = r.value;
  }
  return {
    apiKey: map.cf_api_key || '',
    email: map.cf_email || '',
    accountId: map.cf_account_id || '',
    saasZoneId: map.cf_saas_zone_id || '',
    cnameTarget: map.cname_target || 'proxy.workercms.com',
  };
}

// Helper: make Cloudflare API request
async function cfFetch(path: string, opts: { method?: string; body?: any; apiKey: string; email: string }) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method: opts.method || 'GET',
    headers: {
      'X-Auth-Key': opts.apiKey,
      'X-Auth-Email': opts.email,
      'Content-Type': 'application/json',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json() as Promise<any>;
}

// POST /api/domains/setup — Add domain via Custom Hostnames (CNAME method)
domains.post('/setup', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: 'Yetkilendirme gerekli' }, 401);

  const body = await c.req.json<{ domain: string }>();
  let domain = (body.domain || '').trim().toLowerCase();

  // Clean domain - remove protocol, www, trailing slash
  domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

  if (!domain || !domain.includes('.')) {
    return c.json({ success: false, error: 'Geçerli bir domain girin (örn: example.com)' }, 400);
  }

  // Check site creation limit (non-super_admin)
  if (user.role !== 'super_admin') {
    const userRecord = await c.env.DB.prepare('SELECT max_sites FROM users WHERE id = ?')
      .bind(user.sub).first<{ max_sites: number }>();
    const maxSites = userRecord?.max_sites ?? 0;
    if (maxSites <= 0) {
      return c.json({ success: false, error: 'Site oluşturma yetkiniz yok. Lütfen bir paket satın alın.' }, 403);
    }
    const countResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM user_sites WHERE user_id = ?')
      .bind(user.sub).first<{ count: number }>();
    if ((countResult?.count ?? 0) >= maxSites) {
      return c.json({ success: false, error: `Maksimum site limitine ulaştınız (${maxSites}). Daha fazla site eklemek için paketinizi yükseltin.` }, 403);
    }
  }

  const addWww = !isSubdomain(domain);

  // Check if domain already exists in our system
  const existing = await c.env.DB.prepare(
    addWww
      ? 'SELECT id, site_id FROM site_domains WHERE domain = ? OR domain = ?'
      : 'SELECT id, site_id FROM site_domains WHERE domain = ?'
  ).bind(...(addWww ? [domain, `www.${domain}`] : [domain])).first();

  if (existing) {
    return c.json({ success: false, error: 'Bu domain zaten sistemde kayıtlı' }, 409);
  }

  const cf = await getCfCredentials(c.env.DB);
  if (!cf.apiKey || !cf.email) {
    return c.json({ success: false, error: 'Cloudflare API ayarları yapılandırılmamış. Yönetici global ayarlardan yapılandırmalı.' }, 500);
  }

  if (!cf.saasZoneId) {
    return c.json({ success: false, error: 'Cloudflare for SaaS yapılandırılmamış (cf_saas_zone_id eksik).' }, 500);
  }

  // Create Custom Hostname for bare domain
  const chResult = await cfFetch(`/zones/${cf.saasZoneId}/custom_hostnames`, {
    method: 'POST',
    body: {
      hostname: domain,
      ssl: {
        method: 'http',
        type: 'dv',
        settings: {
          http2: 'on',
          min_tls_version: '1.2',
          tls_1_3: 'on',
        },
      },
    },
    apiKey: cf.apiKey,
    email: cf.email,
  });

  if (!chResult.success) {
    const errMsg = chResult.errors?.[0]?.message || 'Custom hostname oluşturulamadı';
    console.error('[Domain] Custom hostname create failed:', JSON.stringify(chResult.errors));
    return c.json({ success: false, error: errMsg }, 400);
  }

  const customHostname = chResult.result;
  const chId = customHostname.id;

  // Create Custom Hostname for www variant (only for root domains)
  let wwwChId: string | null = null;
  if (addWww) {
    const wwwResult = await cfFetch(`/zones/${cf.saasZoneId}/custom_hostnames`, {
      method: 'POST',
      body: {
        hostname: `www.${domain}`,
        ssl: {
          method: 'http',
          type: 'dv',
          settings: {
            http2: 'on',
            min_tls_version: '1.2',
            tls_1_3: 'on',
          },
        },
      },
      apiKey: cf.apiKey,
      email: cf.email,
    });
    wwwChId = wwwResult.success ? wwwResult.result.id : null;
  }

  // Create site with 'pending' status (CNAME not yet verified)
  const siteName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  const slug = domain.replace(/\./g, '-');

  const siteResult = await c.env.DB.prepare(
    `INSERT INTO sites (name, slug, status, default_language) VALUES (?, ?, 'pending', 'tr')`
  ).bind(siteName, slug).run();

  const siteId = siteResult.meta?.last_row_id;
  if (!siteId) {
    return c.json({ success: false, error: 'Site oluşturulamadı' }, 500);
  }

  // Add primary domain (bare domain) with CNAME setup method
  await c.env.DB.prepare(
    `INSERT INTO site_domains (site_id, domain, is_primary, ssl_status, setup_method, cf_custom_hostname_id) VALUES (?, ?, 1, 'pending', 'cname', ?)`
  ).bind(siteId, domain, chId).run();

  // Add www variant (only for root domains)
  if (addWww) {
    await c.env.DB.prepare(
      `INSERT INTO site_domains (site_id, domain, is_primary, ssl_status, setup_method, cf_custom_hostname_id) VALUES (?, ?, 0, 'pending', 'cname', ?)`
    ).bind(siteId, `www.${domain}`, wwwChId).run();
  }

  // Assign user to site
  await c.env.DB.prepare(
    `INSERT INTO user_sites (user_id, site_id, role_override) VALUES (?, ?, 'admin')`
  ).bind(user.sub, siteId).run();

  // Initialize default settings
  await c.env.DB.prepare(
    `INSERT INTO settings (site_id, key, value) VALUES (?, 'site_title', ?), (?, 'posts_per_page', '10')`
  ).bind(siteId, siteName, siteId).run();

  // Create default category
  await c.env.DB.prepare(
    `INSERT INTO taxonomies (site_id, name, slug, type, language) VALUES (?, 'Genel', 'genel', 'category', 'tr')`
  ).bind(siteId).run();

  // Create default demo content (pages, posts, menu)
  try {
    await createDefaultContent(c.env.DB, siteId as number, user.sub, siteName, 'tr');
  } catch (e) {
    console.error('Default content creation failed:', e);
  }

  // Store pending info for cron verification
  const pendingData = JSON.stringify({
    setup_method: 'cname',
    cf_custom_hostname_id: chId,
    cf_www_custom_hostname_id: wwwChId,
    site_id: siteId,
    user_id: user.sub,
    created_at: new Date().toISOString(),
  });
  await c.env.DB.prepare(
    "INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?"
  ).bind(`pending_domain:${domain}`, pendingData, pendingData).run();

  // The CNAME target the user needs to point their domain to
  const cnameTarget = cf.cnameTarget;

  return c.json({
    success: true,
    data: {
      site_id: siteId,
      domain,
      setup_method: 'cname',
      cname_target: cnameTarget,
      custom_hostname_id: chId,
      status: 'pending',
      is_subdomain: !addWww,
      // SSL validation info from CF
      ssl_status: customHostname.ssl?.status || 'initializing',
      ownership_verification: customHostname.ownership_verification || null,
    },
  });
});

// POST /api/domains/verify — Manually check CNAME / Custom Hostname status
domains.post('/verify', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: 'Yetkilendirme gerekli' }, 401);

  const body = await c.req.json<{ domain: string }>();
  const domain = (body.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

  if (!domain) return c.json({ success: false, error: 'Domain gerekli' }, 400);

  // Get pending domain info
  const pendingRow = await c.env.DB.prepare(
    "SELECT value FROM global_settings WHERE key = ?"
  ).bind(`pending_domain:${domain}`).first<{ value: string }>();

  if (!pendingRow) {
    return c.json({ success: false, error: 'Bu domain için bekleyen bir kurulum bulunamadı. Zaten aktif olabilir.' }, 404);
  }

  const pending = JSON.parse(pendingRow.value);

  const cf = await getCfCredentials(c.env.DB);
  if (!cf.apiKey || !cf.email) {
    return c.json({ success: false, error: 'Cloudflare API ayarları yapılandırılmamış' }, 500);
  }

  // Branch by setup method
  if (pending.setup_method === 'cname') {
    return await verifyCnameHostname(c, domain, pending, cf);
  } else {
    return await verifyNsDomain(c, domain, pending, cf);
  }
});

// Verify CNAME-based Custom Hostname
async function verifyCnameHostname(c: any, domain: string, pending: any, cf: any) {
  const chResult = await cfFetch(`/zones/${cf.saasZoneId}/custom_hostnames/${pending.cf_custom_hostname_id}`, {
    apiKey: cf.apiKey,
    email: cf.email,
  });

  if (!chResult.success) {
    return c.json({ success: false, error: 'Custom hostname bilgisi alınamadı' }, 500);
  }

  const ch = chResult.result;
  const sslStatus = ch.ssl?.status || 'unknown';
  const hostnameStatus = ch.status || 'unknown';

  // Hostname active means CNAME is verified — activate the domain
  // SSL will auto-provision once CNAME is active, no need to block on it
  if (hostnameStatus === 'active') {
    await activateCnameDomain(c.env.DB, domain, pending, cf);

    const sslNote = (sslStatus === 'active')
      ? ''
      : ' SSL sertifikası birkaç dakika içinde otomatik aktifleşecektir.';

    return c.json({
      success: true,
      data: {
        verified: true,
        status: 'active',
        ssl_status: sslStatus,
        domain,
        message: 'CNAME doğrulandı! Domain aktif.' + sslNote,
      },
    });
  }

  // Not yet active
  let message = 'CNAME kaydı henüz algılanmadı. ';
  if (hostnameStatus === 'pending') {
    message += `Domain sağlayıcınızda CNAME kaydını ${cf.cnameTarget} olarak ayarladığınızdan emin olun.`;
  } else {
    message += `Durum: ${hostnameStatus}, SSL: ${sslStatus}`;
  }

  return c.json({
    success: true,
    data: {
      verified: false,
      status: hostnameStatus,
      ssl_status: sslStatus,
      cname_target: cf.cnameTarget,
      message,
    },
  });
}

// Verify NS-based domain (legacy)
async function verifyNsDomain(c: any, domain: string, pending: any, cf: any) {
  const zoneResult = await cfFetch(`/zones/${pending.zone_id}`, { apiKey: cf.apiKey, email: cf.email });

  if (!zoneResult.success) {
    return c.json({ success: false, error: 'Cloudflare zone bilgisi alınamadı' }, 500);
  }

  const zoneStatus = zoneResult.result.status;

  if (zoneStatus !== 'active') {
    return c.json({
      success: true,
      data: {
        verified: false,
        status: zoneStatus,
        name_servers: zoneResult.result.name_servers,
        message: 'NS kayıtları henüz yayılmamış. Otomatik kontrol devam ediyor, birkaç dakika içinde tekrar deneyin.',
      },
    });
  }

  // NS verified! Activate domains
  await activateNsDomain(c.env.DB, domain, pending, cf);

  return c.json({
    success: true,
    data: {
      verified: true,
      status: 'active',
      domain,
      message: 'NS doğrulandı! Domain aktif.',
    },
  });
}

// Helper: activate a CNAME-based domain after Custom Hostname is active
async function activateCnameDomain(
  db: D1Database,
  domain: string,
  pending: { cf_custom_hostname_id: string; cf_www_custom_hostname_id?: string; site_id: number },
  cf: { apiKey: string; email: string; accountId?: string }
) {
  // Update domain ssl_status to active
  const addWww = !isSubdomain(domain);
  if (addWww) {
    await db.prepare(
      "UPDATE site_domains SET ssl_status = 'active' WHERE domain = ? OR domain = ?"
    ).bind(domain, `www.${domain}`).run();
  } else {
    await db.prepare(
      "UPDATE site_domains SET ssl_status = 'active' WHERE domain = ?"
    ).bind(domain).run();
  }

  // Activate site status
  if (pending.site_id) {
    await db.prepare(
      "UPDATE sites SET status = 'active' WHERE id = ? AND status = 'pending'"
    ).bind(pending.site_id).run();
  }

  // Clean up pending record
  await db.prepare(
    "DELETE FROM global_settings WHERE key = ?"
  ).bind(`pending_domain:${domain}`).run();

  console.log(`[Domain] CNAME domain activated: ${domain}`);
}

// Helper: activate a NS-based domain after zone is active (legacy)
async function activateNsDomain(
  db: D1Database,
  domain: string,
  pending: { zone_id: string; site_id: number },
  cf: { apiKey: string; email: string; accountId?: string }
) {
  const addWww = !isSubdomain(domain);

  // Update domain ssl_status to active
  if (addWww) {
    await db.prepare(
      "UPDATE site_domains SET ssl_status = 'active' WHERE domain = ? OR domain = ?"
    ).bind(domain, `www.${domain}`).run();
  } else {
    await db.prepare(
      "UPDATE site_domains SET ssl_status = 'active' WHERE domain = ?"
    ).bind(domain).run();
  }

  // Activate site status
  if (pending.site_id) {
    await db.prepare(
      "UPDATE sites SET status = 'active' WHERE id = ? AND status = 'pending'"
    ).bind(pending.site_id).run();
  }

  // Add DNS www CNAME record (only for root domains)
  if (addWww) {
    try {
      await cfFetch(`/zones/${pending.zone_id}/dns_records`, {
        method: 'POST',
        body: { type: 'CNAME', name: 'www', content: domain, proxied: true },
        apiKey: cf.apiKey,
        email: cf.email,
      });
    } catch { /* ignore if already exists */ }
  }

  // Add Workers custom domains so the Worker receives traffic
  const accountId = cf.accountId || '';
  if (accountId) {
    const workerName = 'wp-cms';
    const hostnames = addWww ? [domain, `www.${domain}`] : [domain];
    for (const hostname of hostnames) {
      try {
        await cfFetch(`/accounts/${accountId}/workers/domains`, {
          method: 'PUT',
          body: {
            hostname,
            zone_id: pending.zone_id,
            service: workerName,
            environment: 'production',
          },
          apiKey: cf.apiKey,
          email: cf.email,
        });
        console.log(`[Domain] Workers custom domain added: ${hostname}`);
      } catch (err) {
        console.error(`[Domain] Failed to add Workers custom domain ${hostname}:`, err);
      }
    }
  }

  // Clean up pending record
  await db.prepare(
    "DELETE FROM global_settings WHERE key = ?"
  ).bind(`pending_domain:${domain}`).run();

  console.log(`[Domain] NS domain activated: ${domain}`);
}

// GET /api/domains/my — Get user's sites and domain status
domains.get('/my', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: 'Yetkilendirme gerekli' }, 401);

  const sites = await c.env.DB.prepare(
    `SELECT s.id, s.name, s.slug, s.status, sd.domain, sd.is_primary, sd.ssl_status, sd.setup_method
     FROM sites s
     JOIN user_sites us ON s.id = us.site_id
     LEFT JOIN site_domains sd ON s.id = sd.site_id
     WHERE us.user_id = ?
     ORDER BY s.id, sd.is_primary DESC`
  ).bind(user.sub).all();

  // Group domains by site
  const siteMap = new Map<number, any>();
  for (const row of (sites.results || []) as any[]) {
    if (!siteMap.has(row.id)) {
      siteMap.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        domains: [],
      });
    }
    if (row.domain) {
      siteMap.get(row.id).domains.push({
        domain: row.domain,
        is_primary: row.is_primary,
        ssl_status: row.ssl_status,
        setup_method: row.setup_method || 'ns',
      });
    }
  }

  // Check for pending domains
  const cf = await getCfCredentials(c.env.DB);
  const pendingDomains: any[] = [];
  for (const site of siteMap.values()) {
    for (const d of site.domains) {
      if (d.ssl_status === 'pending' && d.is_primary) {
        const pendingRow = await c.env.DB.prepare(
          "SELECT value FROM global_settings WHERE key = ?"
        ).bind(`pending_domain:${d.domain}`).first<{ value: string }>();
        if (pendingRow) {
          const info = JSON.parse(pendingRow.value);
          pendingDomains.push({
            domain: d.domain,
            setup_method: info.setup_method || 'ns',
            name_servers: info.name_servers,
            cname_target: info.setup_method === 'cname' ? cf.cnameTarget : undefined,
            zone_status: info.status,
          });
        }
      }
    }
  }

  return c.json({
    success: true,
    data: {
      sites: Array.from(siteMap.values()),
      has_sites: siteMap.size > 0,
      pending_domains: pendingDomains,
    },
  });
});

// Exported function for cron: check all pending domains
export async function checkPendingDomains(env: Bindings) {
  const cf = await getCfCredentials(env.DB);
  if (!cf.apiKey || !cf.email) return;

  // Find all pending_domain:* entries
  const pendingRows = await env.DB.prepare(
    "SELECT key, value FROM global_settings WHERE key LIKE 'pending_domain:%'"
  ).all<{ key: string; value: string }>();

  for (const row of pendingRows.results || []) {
    const domain = row.key.replace('pending_domain:', '');
    const pending = JSON.parse(row.value);

    try {
      if (pending.setup_method === 'cname') {
        // Check Custom Hostname status
        if (!pending.cf_custom_hostname_id || !cf.saasZoneId) continue;

        const chResult = await cfFetch(`/zones/${cf.saasZoneId}/custom_hostnames/${pending.cf_custom_hostname_id}`, {
          apiKey: cf.apiKey,
          email: cf.email,
        });

        if (chResult.success) {
          const ch = chResult.result;
          // Activate when hostname is active (CNAME verified), SSL auto-provisions
          if (ch.status === 'active') {
            await activateCnameDomain(env.DB, domain, pending, cf);
            console.log(`[Cron] CNAME domain activated: ${domain} (ssl: ${ch.ssl?.status})`);
          }
        }
      } else {
        // Legacy NS check
        if (!pending.zone_id) continue;

        const zoneResult = await cfFetch(`/zones/${pending.zone_id}`, { apiKey: cf.apiKey, email: cf.email });

        if (zoneResult.success && zoneResult.result.status === 'active') {
          await activateNsDomain(env.DB, domain, pending, cf);
          console.log(`[Cron] NS domain activated: ${domain}`);
        }
      }
    } catch (err) {
      console.error(`[Cron] Failed to check domain ${domain}:`, err);
    }
  }
}

// DELETE /api/domains/custom-hostname/:id — Cleanup helper for deleting a custom hostname
async function deleteCustomHostname(cf: { apiKey: string; email: string; saasZoneId: string }, chId: string) {
  if (!chId || !cf.saasZoneId) return;
  try {
    await cfFetch(`/zones/${cf.saasZoneId}/custom_hostnames/${chId}`, {
      method: 'DELETE',
      apiKey: cf.apiKey,
      email: cf.email,
    });
  } catch (err) {
    console.error(`[Domain] Failed to delete custom hostname ${chId}:`, err);
  }
}

// Export cleanup helper for use in site deletion
export { deleteCustomHostname, getCfCredentials };

export default domains;
