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

// ── ACME / SSL HTTP-01 Challenge Tokens ─────────────────────────────
//
// When a customer points their apex domain (e.g. hasangul.com) at
// Cloudflare via CNAME, Cloudflare's Custom Hostname feature can't
// always issue an SSL certificate automatically — it has to perform
// HTTP-01 validation by hitting `http://<domain>/.well-known/acme-challenge/<token>`
// on the user's origin and getting the matching response back.
//
// These endpoints let an authenticated site owner paste the token /
// response pair Cloudflare displays in the "Pending Validation (HTTP)"
// panel. The worker then serves the response on the right URL — see
// the `/.well-known/acme-challenge/*` handler in src/index.ts.

interface AcmeChallengeRow {
  id: number;
  site_id: number;
  domain: string;
  token: string;
  response: string;
  created_at: string;
}

/** Resolve site_id from a domain the user owns. Returns null if not authorised. */
async function siteForDomain(
  db: D1Database,
  userId: number,
  isSuperAdmin: boolean,
  domain: string
): Promise<number | null> {
  const cleanDomain = domain.toLowerCase().trim();
  if (isSuperAdmin) {
    const row = await db
      .prepare('SELECT site_id FROM site_domains WHERE domain = ? LIMIT 1')
      .bind(cleanDomain)
      .first<{ site_id: number }>();
    return row?.site_id ?? null;
  }
  const row = await db
    .prepare(
      `SELECT sd.site_id FROM site_domains sd
       JOIN user_sites us ON us.site_id = sd.site_id
       WHERE sd.domain = ? AND us.user_id = ? LIMIT 1`
    )
    .bind(cleanDomain, userId)
    .first<{ site_id: number }>();
  return row?.site_id ?? null;
}

// GET /api/domains/acme?domain=example.com — list challenges for a domain
domains.get('/acme', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: 'Yetkilendirme gerekli' }, 401);

  const domain = (c.req.query('domain') || '').toLowerCase().trim();
  if (!domain) {
    return c.json({ success: false, error: 'domain parametresi gerekli' }, 400);
  }

  const isSuperAdmin = user.role === 'super_admin';
  const siteId = await siteForDomain(c.env.DB, user.sub, isSuperAdmin, domain);
  if (!siteId) {
    return c.json({ success: false, error: 'Bu domain üzerinde yetkiniz yok' }, 403);
  }

  const rows = await c.env.DB.prepare(
    'SELECT id, site_id, domain, token, response, created_at FROM domain_acme_challenges WHERE domain = ? ORDER BY created_at DESC'
  ).bind(domain).all<AcmeChallengeRow>();

  return c.json({ success: true, data: rows.results || [] });
});

// POST /api/domains/acme — add or replace a challenge token
// Body: { domain: string, token: string, response: string }
// Accepts either a bare token ("S9pGfiC2...") or the full URL or the
// "token.response" value pasted directly from Cloudflare.
domains.post('/acme', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: 'Yetkilendirme gerekli' }, 401);

  const body = await c.req.json<{ domain?: string; token?: string; response?: string }>();
  const domain = (body.domain || '').toLowerCase().trim();
  let token = (body.token || '').trim();
  let response = (body.response || '').trim();

  // Cloudflare's UI shows the path like
  //   "http://hasangul.com/.well-known/acme-challenge/F4IIEHYJ_GOakM1..."
  // or just "hasangul.com/.well-known/acme-challenge/F4IIEHYJ_GOakM1...".
  // Extract the token if a full URL was pasted.
  const pathMatch = token.match(/\/\.well-known\/acme-challenge\/([A-Za-z0-9_-]+)/);
  if (pathMatch) token = pathMatch[1];

  // The response is usually `<token>.<keyAuth>` — accept either the full
  // value or just the keyAuth half. We store whatever the user gave us.
  if (!domain || !token || !response) {
    return c.json({
      success: false,
      error: 'domain, token ve response alanları zorunludur',
    }, 400);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    return c.json({ success: false, error: 'Geçersiz token formatı' }, 400);
  }

  const isSuperAdmin = user.role === 'super_admin';
  const siteId = await siteForDomain(c.env.DB, user.sub, isSuperAdmin, domain);
  if (!siteId) {
    return c.json({ success: false, error: 'Bu domain üzerinde yetkiniz yok' }, 403);
  }

  // Upsert by token (the unique index lets us simply REPLACE).
  await c.env.DB.prepare(
    `INSERT INTO domain_acme_challenges (site_id, domain, token, response)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET
       site_id = excluded.site_id,
       domain  = excluded.domain,
       response = excluded.response`
  ).bind(siteId, domain, token, response).run();

  const saved = await c.env.DB.prepare(
    'SELECT id, site_id, domain, token, response, created_at FROM domain_acme_challenges WHERE token = ?'
  ).bind(token).first<AcmeChallengeRow>();

  return c.json({ success: true, data: saved });
});

// POST /api/domains/acme/sync — pull pending validation tokens from
// Cloudflare and upsert them into domain_acme_challenges.
//
// Body: { domain?: string }   if omitted, syncs every domain the user
//                              owns that has a cf_custom_hostname_id.
//
// For each matching site_domain we GET
//   /zones/{saasZoneId}/custom_hostnames/{cf_custom_hostname_id}
// and read ssl.validation_records[]. Each record has http_url
// (token in the last segment) + http_body (the response).
domains.post('/acme/sync', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: 'Yetkilendirme gerekli' }, 401);

  const isSuperAdmin = user.role === 'super_admin';
  const body = await c.req
    .json<{ domain?: string }>()
    .catch(() => ({} as { domain?: string }));
  const filterDomain = (body.domain || '').toLowerCase().trim();

  const cf = await getCfCredentials(c.env.DB);
  if (!cf.apiKey || !cf.email || !cf.saasZoneId) {
    return c.json({
      success: false,
      error: 'Cloudflare API kimlik bilgileri yapılandırılmamış. Önce Global Ayarlar → Cloudflare bölümünden ekleyin.',
    }, 400);
  }

  // Find which domains to sync. Each row carries the CF custom hostname id.
  let rows: Array<{ id: number; site_id: number; domain: string; cf_custom_hostname_id: string | null }>;
  if (isSuperAdmin) {
    const q = filterDomain
      ? c.env.DB.prepare(
          `SELECT id, site_id, domain, cf_custom_hostname_id FROM site_domains
           WHERE domain = ? AND cf_custom_hostname_id IS NOT NULL`
        ).bind(filterDomain)
      : c.env.DB.prepare(
          `SELECT id, site_id, domain, cf_custom_hostname_id FROM site_domains
           WHERE cf_custom_hostname_id IS NOT NULL`
        );
    const r = await q.all<{ id: number; site_id: number; domain: string; cf_custom_hostname_id: string | null }>();
    rows = r.results || [];
  } else {
    const q = filterDomain
      ? c.env.DB.prepare(
          `SELECT sd.id, sd.site_id, sd.domain, sd.cf_custom_hostname_id
             FROM site_domains sd
             JOIN user_sites us ON us.site_id = sd.site_id
            WHERE sd.domain = ? AND us.user_id = ?
              AND sd.cf_custom_hostname_id IS NOT NULL`
        ).bind(filterDomain, user.sub)
      : c.env.DB.prepare(
          `SELECT sd.id, sd.site_id, sd.domain, sd.cf_custom_hostname_id
             FROM site_domains sd
             JOIN user_sites us ON us.site_id = sd.site_id
            WHERE us.user_id = ? AND sd.cf_custom_hostname_id IS NOT NULL`
        ).bind(user.sub);
    const r = await q.all<{ id: number; site_id: number; domain: string; cf_custom_hostname_id: string | null }>();
    rows = r.results || [];
  }

  if (rows.length === 0) {
    return c.json({
      success: false,
      error: filterDomain
        ? `${filterDomain} için Cloudflare custom hostname bulunamadı`
        : 'Senkronlanacak custom hostname bulunamadı',
    }, 404);
  }

  type TxtRecord = { name: string; value: string; purpose: 'ssl' | 'ownership' };
  type SyncEntry = {
    domain: string;
    cf_status: string;
    ssl_status: string;
    method: string;
    saved: number;
    skipped: number;
    txt_records: TxtRecord[];
    error?: string;
  };
  const summary: SyncEntry[] = [];
  let totalSaved = 0;

  for (const row of rows) {
    if (!row.cf_custom_hostname_id) continue;
    const entry: SyncEntry = {
      domain: row.domain,
      cf_status: 'unknown',
      ssl_status: 'unknown',
      method: 'unknown',
      saved: 0,
      skipped: 0,
      txt_records: [],
    };
    try {
      const chResult = await cfFetch(
        `/zones/${cf.saasZoneId}/custom_hostnames/${row.cf_custom_hostname_id}`,
        { apiKey: cf.apiKey, email: cf.email }
      );
      if (!chResult.success) {
        entry.error = chResult.errors?.[0]?.message || 'Cloudflare API hatası';
        summary.push(entry);
        continue;
      }
      const ch = chResult.result || {};
      entry.cf_status = ch.status || 'unknown';
      entry.ssl_status = ch.ssl?.status || 'unknown';
      entry.method = ch.ssl?.method || 'unknown';

      type CfValidationRecord = {
        http_url?: string;
        http_body?: string;
        txt_name?: string;
        txt_value?: string;
      };
      const records: CfValidationRecord[] = ch.ssl?.validation_records || [];
      for (const rec of records) {
        // HTTP-01 token → save to DB so the worker can serve it.
        if (rec.http_url && rec.http_body) {
          const m = rec.http_url.match(/\/\.well-known\/acme-challenge\/([A-Za-z0-9_-]+)/);
          if (m) {
            const token = m[1];
            const response = rec.http_body.trim();
            await c.env.DB.prepare(
              `INSERT INTO domain_acme_challenges (site_id, domain, token, response)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(token) DO UPDATE SET
                 site_id = excluded.site_id,
                 domain  = excluded.domain,
                 response = excluded.response`
            ).bind(row.site_id, row.domain, token, response).run();
            entry.saved++;
            totalSaved++;
          } else {
            entry.skipped++;
          }
        }
        // DNS-01 / TXT validation — can't be served from the worker;
        // surface to the admin so they can paste it into their DNS.
        if (rec.txt_name && rec.txt_value) {
          entry.txt_records.push({
            name: rec.txt_name,
            value: rec.txt_value,
            purpose: 'ssl',
          });
        }
      }
      // Cloudflare also exposes a separate `ownership_verification` TXT
      // pair to prove the customer controls the hostname (independent
      // of the SSL validation). It only applies to Custom Hostnames
      // whose apex couldn't CNAME — exactly the case in the screenshot.
      const ov = ch.ownership_verification;
      if (ov?.name && ov?.value) {
        entry.txt_records.push({
          name: ov.name,
          value: ov.value,
          purpose: 'ownership',
        });
      }
    } catch (err) {
      entry.error = err instanceof Error ? err.message : String(err);
    }
    summary.push(entry);
  }

  return c.json({
    success: true,
    data: { total_saved: totalSaved, domains: summary },
  });
});

// GET /api/domains/acme/dns-check?domain=hasangul.com — query the public
// DNS via Cloudflare's DNS-over-HTTPS resolver and report which TXT
// records are currently visible. Used to debug "I added TXT but CF
// still says pending" — this proves whether the records actually
// propagated and whether their values match what CF expects.
domains.get('/acme/dns-check', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: 'Yetkilendirme gerekli' }, 401);

  const domain = (c.req.query('domain') || '').toLowerCase().trim();
  if (!domain) {
    return c.json({ success: false, error: 'domain parametresi gerekli' }, 400);
  }

  const isSuperAdmin = user.role === 'super_admin';
  const siteId = await siteForDomain(c.env.DB, user.sub, isSuperAdmin, domain);
  if (!siteId) {
    return c.json({ success: false, error: 'Bu domain üzerinde yetkiniz yok' }, 403);
  }

  // Names CF cares about for Custom Hostname pre-validation + SSL.
  const names = [
    `_acme-challenge.${domain}`,
    `_cf-custom-hostname.${domain}`,
  ];
  // Common typos / panel quirks: when a user pastes the full FQDN into
  // a DNS panel that auto-appends the zone, the actual record ends up
  // double-suffixed (e.g. _acme-challenge.example.com.example.com).
  // We probe these too so we can surface a clear "wrong place" hint.
  const typoNames = [
    `_acme-challenge.${domain}.${domain}`,
    `_cf-custom-hostname.${domain}.${domain}`,
  ];

  type Lookup = {
    name: string;
    type: string;
    found: string[];
    error?: string;
    /** When true, this lookup represents a misconfigured (double-suffix) name. */
    typo?: boolean;
  };
  const lookups: Lookup[] = [];

  async function probe(name: string, recordType: string, typo: boolean) {
    try {
      const r = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${recordType}`,
        { headers: { accept: 'application/dns-json' } }
      );
      const json = await r.json() as { Answer?: Array<{ data: string; type: number }> };
      const found = (json.Answer || [])
        .map((a) => a.data.replace(/^"|"$/g, ''))
        .filter(Boolean);
      lookups.push({ name, type: recordType, found, typo });
    } catch (err) {
      lookups.push({
        name,
        type: recordType,
        found: [],
        error: err instanceof Error ? err.message : String(err),
        typo,
      });
    }
  }

  // Query both TXT and CNAME for completeness — CF docs sometimes call
  // for TXT but the API also accepts CNAME aliases of the validation
  // hostname. Showing both saves confusion.
  for (const name of names) {
    for (const recordType of ['TXT', 'CNAME']) await probe(name, recordType, false);
  }
  // Probe common-mistake names — only TXT, since that's where users
  // typically misplace the record.
  for (const name of typoNames) await probe(name, 'TXT', true);

  // Also resolve the apex/host directly to surface where it's currently
  // pointing — useful when the user expects HTTP-01 to work.
  try {
    const r = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      { headers: { accept: 'application/dns-json' } }
    );
    const json = await r.json() as { Answer?: Array<{ data: string }> };
    lookups.push({
      name: domain,
      type: 'A',
      found: (json.Answer || []).map((a) => a.data),
    });
  } catch {
    /* ignore */
  }
  try {
    const r = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
      { headers: { accept: 'application/dns-json' } }
    );
    const json = await r.json() as { Answer?: Array<{ data: string }> };
    const cnames = (json.Answer || []).map((a) => a.data);
    if (cnames.length > 0) {
      lookups.push({ name: domain, type: 'CNAME', found: cnames });
    }
  } catch {
    /* ignore */
  }

  return c.json({ success: true, data: { domain, lookups } });
});

// POST /api/domains/acme/recheck — ask Cloudflare to re-attempt
// validation on the Custom Hostname. Useful when a TXT record was
// added but CF cached an earlier failure: a no-op PATCH to the
// hostname forces CF to re-evaluate.
domains.post('/acme/recheck', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: 'Yetkilendirme gerekli' }, 401);

  const body = await c.req
    .json<{ domain?: string }>()
    .catch(() => ({} as { domain?: string }));
  const domain = (body.domain || '').toLowerCase().trim();
  if (!domain) {
    return c.json({ success: false, error: 'domain alanı zorunludur' }, 400);
  }

  const isSuperAdmin = user.role === 'super_admin';
  const row = isSuperAdmin
    ? await c.env.DB.prepare(
        'SELECT site_id, cf_custom_hostname_id FROM site_domains WHERE domain = ? LIMIT 1'
      ).bind(domain).first<{ site_id: number; cf_custom_hostname_id: string | null }>()
    : await c.env.DB.prepare(
        `SELECT sd.site_id, sd.cf_custom_hostname_id
           FROM site_domains sd
           JOIN user_sites us ON us.site_id = sd.site_id
          WHERE sd.domain = ? AND us.user_id = ? LIMIT 1`
      ).bind(domain, user.sub).first<{ site_id: number; cf_custom_hostname_id: string | null }>();

  if (!row) return c.json({ success: false, error: 'Bu domain üzerinde yetkiniz yok' }, 403);
  if (!row.cf_custom_hostname_id) {
    return c.json({
      success: false,
      error: 'Bu domain Cloudflare Custom Hostname olarak yapılandırılmamış',
    }, 400);
  }

  const cf = await getCfCredentials(c.env.DB);
  if (!cf.apiKey || !cf.email || !cf.saasZoneId) {
    return c.json({
      success: false,
      error: 'Cloudflare API kimlik bilgileri yapılandırılmamış',
    }, 400);
  }

  // Get current method first so we can re-set the same value (a no-op
  // PATCH is enough to trigger CF to re-poll TXT/HTTP).
  const cur = await cfFetch(
    `/zones/${cf.saasZoneId}/custom_hostnames/${row.cf_custom_hostname_id}`,
    { apiKey: cf.apiKey, email: cf.email }
  );
  if (!cur.success) {
    return c.json({
      success: false,
      error: cur.errors?.[0]?.message || 'Cloudflare durumu okunamadı',
    }, 500);
  }
  const currentMethod = cur.result?.ssl?.method || 'http';

  const patched = await cfFetch(
    `/zones/${cf.saasZoneId}/custom_hostnames/${row.cf_custom_hostname_id}`,
    {
      method: 'PATCH',
      apiKey: cf.apiKey,
      email: cf.email,
      body: { ssl: { method: currentMethod, type: 'dv' } },
    }
  );
  if (!patched.success) {
    return c.json({
      success: false,
      error: patched.errors?.[0]?.message || 'Yeniden doğrulama tetiklenemedi',
    }, 500);
  }

  return c.json({
    success: true,
    data: {
      domain,
      hostname_status: patched.result?.status || 'unknown',
      ssl_status: patched.result?.ssl?.status || 'unknown',
      method: patched.result?.ssl?.method || currentMethod,
      verification_errors: patched.result?.verification_errors || [],
      ssl_validation_errors: patched.result?.ssl?.validation_errors || [],
    },
  });
});

// POST /api/domains/acme/method — switch SSL validation method on
// Cloudflare for a Custom Hostname.
//
// Body: { domain: string, method: 'http' | 'txt' }
//
// HTTP validation lets our worker serve the token. TXT validation
// requires the customer to add a DNS TXT record at their registrar
// (we can't write it for them). Useful when the apex can't CNAME and
// HTTP isn't reachable yet, or vice-versa.
domains.post('/acme/method', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: 'Yetkilendirme gerekli' }, 401);

  const body = await c.req.json<{ domain?: string; method?: string }>().catch(
    () => ({} as { domain?: string; method?: string })
  );
  const domain = (body.domain || '').toLowerCase().trim();
  const method = (body.method || '').toLowerCase().trim();
  if (!domain || (method !== 'http' && method !== 'txt')) {
    return c.json({
      success: false,
      error: 'domain ve method (http|txt) zorunlu',
    }, 400);
  }

  const isSuperAdmin = user.role === 'super_admin';
  // Resolve site_id and pull the cf hostname id.
  const row = isSuperAdmin
    ? await c.env.DB.prepare(
        'SELECT id, site_id, cf_custom_hostname_id FROM site_domains WHERE domain = ? LIMIT 1'
      ).bind(domain).first<{ id: number; site_id: number; cf_custom_hostname_id: string | null }>()
    : await c.env.DB.prepare(
        `SELECT sd.id, sd.site_id, sd.cf_custom_hostname_id
           FROM site_domains sd
           JOIN user_sites us ON us.site_id = sd.site_id
          WHERE sd.domain = ? AND us.user_id = ? LIMIT 1`
      ).bind(domain, user.sub).first<{ id: number; site_id: number; cf_custom_hostname_id: string | null }>();

  if (!row) {
    return c.json({ success: false, error: 'Bu domain üzerinde yetkiniz yok' }, 403);
  }
  if (!row.cf_custom_hostname_id) {
    return c.json({
      success: false,
      error: 'Bu domain Cloudflare Custom Hostname olarak yapılandırılmamış',
    }, 400);
  }

  const cf = await getCfCredentials(c.env.DB);
  if (!cf.apiKey || !cf.email || !cf.saasZoneId) {
    return c.json({
      success: false,
      error: 'Cloudflare API kimlik bilgileri yapılandırılmamış',
    }, 400);
  }

  const result = await cfFetch(
    `/zones/${cf.saasZoneId}/custom_hostnames/${row.cf_custom_hostname_id}`,
    {
      method: 'PATCH',
      apiKey: cf.apiKey,
      email: cf.email,
      body: { ssl: { method, type: 'dv' } },
    }
  );

  if (!result.success) {
    return c.json({
      success: false,
      error: result.errors?.[0]?.message || 'Cloudflare yöntem değişikliği başarısız',
    }, 500);
  }

  return c.json({
    success: true,
    data: {
      domain,
      method,
      ssl_status: result.result?.ssl?.status || 'unknown',
    },
  });
});

// DELETE /api/domains/acme/:id
domains.delete('/acme/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: 'Yetkilendirme gerekli' }, 401);

  const id = Number(c.req.param('id'));
  if (!id) return c.json({ success: false, error: 'Geçersiz id' }, 400);

  const row = await c.env.DB.prepare(
    'SELECT site_id, domain FROM domain_acme_challenges WHERE id = ?'
  ).bind(id).first<{ site_id: number; domain: string }>();
  if (!row) return c.json({ success: false, error: 'Bulunamadı' }, 404);

  const isSuperAdmin = user.role === 'super_admin';
  if (!isSuperAdmin) {
    const owns = await c.env.DB.prepare(
      'SELECT 1 AS ok FROM user_sites WHERE site_id = ? AND user_id = ? LIMIT 1'
    ).bind(row.site_id, user.sub).first<{ ok: number }>();
    if (!owns) return c.json({ success: false, error: 'Bu kayıt üzerinde yetkiniz yok' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM domain_acme_challenges WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default domains;
