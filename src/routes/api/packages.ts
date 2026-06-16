import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { syncCreemProducts } from '../../lib/creem';

const packages = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Public: list active packages (no auth needed for landing page)
// GET /api/packages
packages.get('/', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM packages WHERE is_active = 1 ORDER BY sort_order ASC, price_monthly ASC'
  ).all();
  return c.json({ success: true, data: result.results });
});

// Public: get crypto wallet addresses (no auth - needed for upgrade page)
// GET /api/packages/wallets
// Returns { usdt: { ethereum: "0x...", tron: "T..." }, usdc: { ethereum: "0x..." } }
packages.get('/wallets', async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT key, value FROM global_settings WHERE key LIKE 'crypto_wallet_%'"
  ).all();
  const wallets: Record<string, Record<string, string>> = { usdt: {}, usdc: {} };
  // Also keep legacy format for backward compat
  const legacy: Record<string, string> = {};
  for (const row of result.results as any[]) {
    if (!row.value) continue;
    const key = row.key as string;
    // New format: crypto_wallet_usdt_ethereum, crypto_wallet_usdc_tron
    const usdtMatch = key.match(/^crypto_wallet_usdt_(.+)$/);
    const usdcMatch = key.match(/^crypto_wallet_usdc_(.+)$/);
    if (usdtMatch) {
      wallets.usdt[usdtMatch[1]] = row.value;
    } else if (usdcMatch) {
      wallets.usdc[usdcMatch[1]] = row.value;
    } else {
      // Legacy format: crypto_wallet_ethereum → treat as USDT fallback
      const chain = key.replace('crypto_wallet_', '');
      legacy[chain] = row.value;
    }
  }
  // Merge legacy: if no usdt address for a chain but legacy exists, use it
  for (const [chain, addr] of Object.entries(legacy)) {
    if (!wallets.usdt[chain]) wallets.usdt[chain] = addr;
  }
  return c.json({ success: true, data: wallets });
});

// All management routes require auth + super_admin
packages.use('/admin/*', authMiddleware);

// GET /api/packages/admin/all - List ALL packages including inactive (super_admin)
packages.get('/admin/all', requireRole('super_admin'), async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT p.*, (SELECT COUNT(*) FROM subscriptions WHERE package_id = p.id AND status = \'active\') as active_subscribers FROM packages p ORDER BY p.sort_order ASC, p.id ASC'
  ).all();
  return c.json({ success: true, data: result.results });
});

// POST /api/packages/admin - Create package (super_admin)
packages.post('/admin', requireRole('super_admin'), async (c) => {
  const body = await c.req.json<{
    name: string;
    description?: string;
    price_monthly?: number;
    price_yearly?: number;
    max_sites?: number;
    max_storage_mb?: number;
    max_posts_per_site?: number;
    features?: string[];
    is_active?: boolean;
    sort_order?: number;
    stripe_price_monthly_id?: string;
    stripe_price_yearly_id?: string;
    creem_product_monthly_id?: string;
    creem_product_yearly_id?: string;
    crypto_enabled?: boolean;
    white_label?: boolean;
  }>();

  if (!body.name) {
    return c.json({ success: false, error: 'Paket adı gerekli' }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO packages (name, description, price_monthly, price_yearly, max_sites, max_storage_mb, max_posts_per_site, features, is_active, sort_order, stripe_price_monthly_id, stripe_price_yearly_id, creem_product_monthly_id, creem_product_yearly_id, crypto_enabled, white_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(
    body.name,
    body.description || null,
    body.price_monthly || 0,
    body.price_yearly || 0,
    body.max_sites ?? 1,
    body.max_storage_mb ?? 500,
    body.max_posts_per_site ?? 0,
    body.features ? JSON.stringify(body.features) : null,
    body.is_active !== false ? 1 : 0,
    body.sort_order ?? 0,
    body.stripe_price_monthly_id || null,
    body.stripe_price_yearly_id || null,
    body.creem_product_monthly_id || null,
    body.creem_product_yearly_id || null,
    body.crypto_enabled !== false ? 1 : 0,
    body.white_label ? 1 : 0
  ).first();

  // Auto-provision Creem products for the new package's prices. Non-fatal:
  // the save succeeds even if Creem isn't configured or the API errors.
  const sync = await syncCreemProducts(c.env.DB, {
    name: body.name,
    priceMonthly: body.price_monthly || 0,
    priceYearly: body.price_yearly || 0,
    monthlyId: (result as any)?.creem_product_monthly_id,
    yearlyId: (result as any)?.creem_product_yearly_id,
  });
  if (
    result &&
    (sync.monthlyId !== (result as any).creem_product_monthly_id ||
      sync.yearlyId !== (result as any).creem_product_yearly_id)
  ) {
    await c.env.DB.prepare(
      'UPDATE packages SET creem_product_monthly_id = ?, creem_product_yearly_id = ? WHERE id = ?'
    ).bind(sync.monthlyId, sync.yearlyId, (result as any).id).run();
    (result as any).creem_product_monthly_id = sync.monthlyId;
    (result as any).creem_product_yearly_id = sync.yearlyId;
  }

  return c.json({ success: true, data: result, warning: sync.warning }, 201);
});

// PUT /api/packages/admin/:id - Update package (super_admin)
packages.put('/admin/:id', requireRole('super_admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<any>();

  const existing = await c.env.DB.prepare('SELECT * FROM packages WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ success: false, error: 'Paket bulunamadı' }, 404);

  const result = await c.env.DB.prepare(
    `UPDATE packages SET name = ?, description = ?, price_monthly = ?, price_yearly = ?, max_sites = ?, max_storage_mb = ?, max_posts_per_site = ?, features = ?, is_active = ?, sort_order = ?, stripe_price_monthly_id = ?, stripe_price_yearly_id = ?, creem_product_monthly_id = ?, creem_product_yearly_id = ?, crypto_enabled = ?, white_label = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`
  ).bind(
    body.name ?? existing.name,
    body.description !== undefined ? body.description : existing.description,
    body.price_monthly ?? existing.price_monthly,
    body.price_yearly ?? existing.price_yearly,
    body.max_sites ?? existing.max_sites,
    body.max_storage_mb ?? existing.max_storage_mb,
    body.max_posts_per_site ?? existing.max_posts_per_site,
    body.features ? JSON.stringify(body.features) : (existing as any).features,
    body.is_active !== undefined ? (body.is_active ? 1 : 0) : (existing as any).is_active,
    body.sort_order ?? (existing as any).sort_order,
    body.stripe_price_monthly_id !== undefined ? body.stripe_price_monthly_id : (existing as any).stripe_price_monthly_id,
    body.stripe_price_yearly_id !== undefined ? body.stripe_price_yearly_id : (existing as any).stripe_price_yearly_id,
    body.creem_product_monthly_id !== undefined ? body.creem_product_monthly_id : (existing as any).creem_product_monthly_id,
    body.creem_product_yearly_id !== undefined ? body.creem_product_yearly_id : (existing as any).creem_product_yearly_id,
    body.crypto_enabled !== undefined ? (body.crypto_enabled ? 1 : 0) : (existing as any).crypto_enabled,
    body.white_label !== undefined ? (body.white_label ? 1 : 0) : (existing as any).white_label,
    id
  ).first();

  // Re-provision Creem products only when the price actually changed (or an
  // id is missing). Pass the previous prices and existing ids so unchanged
  // prices keep their immutable product. Non-fatal — never breaks the save.
  const sync = await syncCreemProducts(c.env.DB, {
    name: (result as any)?.name ?? body.name ?? (existing as any).name,
    priceMonthly: (result as any)?.price_monthly ?? 0,
    priceYearly: (result as any)?.price_yearly ?? 0,
    prevPriceMonthly: (existing as any).price_monthly,
    prevPriceYearly: (existing as any).price_yearly,
    monthlyId: (result as any)?.creem_product_monthly_id,
    yearlyId: (result as any)?.creem_product_yearly_id,
  });
  if (
    result &&
    (sync.monthlyId !== (result as any).creem_product_monthly_id ||
      sync.yearlyId !== (result as any).creem_product_yearly_id)
  ) {
    await c.env.DB.prepare(
      'UPDATE packages SET creem_product_monthly_id = ?, creem_product_yearly_id = ? WHERE id = ?'
    ).bind(sync.monthlyId, sync.yearlyId, id).run();
    (result as any).creem_product_monthly_id = sync.monthlyId;
    (result as any).creem_product_yearly_id = sync.yearlyId;
  }

  return c.json({ success: true, data: result, warning: sync.warning });
});

// DELETE /api/packages/admin/:id (super_admin)
packages.delete('/admin/:id', requireRole('super_admin'), async (c) => {
  const id = parseInt(c.req.param('id'));

  // Check for active subscribers
  const subs = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM subscriptions WHERE package_id = ? AND status = 'active'"
  ).bind(id).first<{ count: number }>();

  if (subs && subs.count > 0) {
    return c.json({ success: false, error: `Bu pakette ${subs.count} aktif abone var. Önce abonelikleri değiştirin.` }, 400);
  }

  await c.env.DB.prepare('DELETE FROM packages WHERE id = ?').bind(id).run();
  return c.json({ success: true, data: { message: 'Paket silindi' } });
});

export default packages;
