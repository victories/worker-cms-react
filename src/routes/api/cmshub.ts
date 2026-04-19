import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';

const cmshub = new Hono<{ Bindings: Bindings; Variables: Variables }>();

cmshub.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// cms-hub public API base. Hardcoded — internal coupling between
// these two workers, not user-configurable.
const CMSHUB_BASE = 'https://bot.workercms.com/api/v1';

const KEY_NAME = 'cmshub.api_key';

async function getKey(db: D1Database, siteId: number): Promise<string | null> {
  const row = await db
    .prepare('SELECT value FROM settings WHERE site_id = ? AND key = ?')
    .bind(siteId, KEY_NAME)
    .first<{ value: string }>();
  return row?.value ?? null;
}

function maskKey(raw: string): string {
  if (raw.length <= 5) return '*'.repeat(raw.length);
  return raw.slice(0, 5) + '*'.repeat(Math.max(4, raw.length - 5));
}

async function callCmsHub(key: string, path: string): Promise<{ ok: true; data: any } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(`${CMSHUB_BASE}${path}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) {
      const message = parsed?.error?.message ?? `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: message };
    }
    return { ok: true, data: parsed };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// GET /api/cmshub/config — has_key + masked hint + org info if key valid
cmshub.get('/config', requireRole('admin', 'super_admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const key = await getKey(c.env.DB, siteId);
  if (!key) {
    return c.json({ success: true, data: { has_key: false } });
  }
  // Live verify against /me to surface org name + balance
  const me = await callCmsHub(key, '/me');
  if (!me.ok) {
    return c.json({
      success: true,
      data: {
        has_key: true,
        key_hint: maskKey(key),
        valid: false,
        error: me.error,
      },
    });
  }
  return c.json({
    success: true,
    data: {
      has_key: true,
      key_hint: maskKey(key),
      valid: true,
      organization: me.data?.data?.organization ?? null,
    },
  });
});

// POST /api/cmshub/config — { api_key } save + verify
cmshub.post('/config', requireRole('admin', 'super_admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const body = await c.req.json<{ api_key?: string }>();
  const raw = (body.api_key ?? '').trim();
  if (!raw) {
    return c.json({ success: false, error: 'API key gerekli' }, 400);
  }
  if (!raw.startsWith('cms_live_')) {
    return c.json({ success: false, error: "API key 'cms_live_' ile başlamalı" }, 400);
  }
  // Verify before persisting
  const me = await callCmsHub(raw, '/me');
  if (!me.ok) {
    return c.json({ success: false, error: `Doğrulama başarısız: ${me.error}` }, me.status === 401 ? 401 : 502);
  }
  await c.env.DB
    .prepare('INSERT INTO settings (site_id, key, value) VALUES (?, ?, ?) ON CONFLICT(site_id, key) DO UPDATE SET value = ?')
    .bind(siteId, KEY_NAME, raw, raw)
    .run();
  return c.json({
    success: true,
    data: {
      has_key: true,
      key_hint: maskKey(raw),
      valid: true,
      organization: me.data?.data?.organization ?? null,
    },
  });
});

// DELETE /api/cmshub/config — clear
cmshub.delete('/config', requireRole('admin', 'super_admin'), async (c) => {
  const siteId = c.get('siteId')!;
  await c.env.DB.prepare('DELETE FROM settings WHERE site_id = ? AND key = ?').bind(siteId, KEY_NAME).run();
  return c.json({ success: true, data: { has_key: false } });
});

// Generic proxy helper — returns 401 if no key, else forwards
async function proxy(c: any, path: string) {
  const siteId = c.get('siteId')!;
  const key = await getKey(c.env.DB, siteId);
  if (!key) {
    return c.json({ success: false, error: 'cms-hub API anahtarı yapılandırılmamış' }, 401);
  }
  const res = await callCmsHub(key, path);
  if (!res.ok) {
    return c.json({ success: false, error: res.error }, res.status === 401 ? 401 : 502);
  }
  return c.json({ success: true, data: res.data?.data ?? res.data });
}

cmshub.get('/sites', (c) => proxy(c, '/sites'));
cmshub.get('/content', (c) => proxy(c, '/content'));
cmshub.get('/content/:id', (c) => proxy(c, `/content/${c.req.param('id')}`));

export default cmshub;
