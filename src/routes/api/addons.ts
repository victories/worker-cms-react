import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { syncCreemProducts } from '../../lib/creem';

const addons = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Derive a URL-safe slug from a name: lowercase, non-alphanumerics → single
// hyphens, trimmed hyphens.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Public: list active addons (no auth needed for landing/upgrade page)
// GET /api/addons
addons.get('/', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM addons WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
  ).all();
  return c.json({ success: true, data: result.results });
});

// All management routes require auth + super_admin
addons.use('/admin/*', authMiddleware);

// GET /api/addons/admin/all - List ALL addons including inactive (super_admin)
addons.get('/admin/all', requireRole('super_admin'), async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM addons ORDER BY sort_order ASC, id ASC'
  ).all();
  return c.json({ success: true, data: result.results });
});

// POST /api/addons/admin - Create addon (super_admin)
addons.post('/admin', requireRole('super_admin'), async (c) => {
  const body = await c.req.json<{
    key?: string;
    name: string;
    description?: string;
    type?: 'unit' | 'feature';
    unit_label?: string;
    feature_key?: string;
    price_monthly?: number;
    price_yearly?: number;
    creem_product_monthly_id?: string;
    creem_product_yearly_id?: string;
    max_units?: number;
    is_active?: boolean;
    sort_order?: number;
  }>();

  if (!body.name) {
    return c.json({ success: false, error: 'Eklenti adı gerekli' }, 400);
  }

  const key = body.key ? body.key : slugify(body.name);

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO addons (key, name, description, type, unit_label, feature_key, price_monthly, price_yearly, creem_product_monthly_id, creem_product_yearly_id, max_units, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    ).bind(
      key,
      body.name,
      body.description || null,
      body.type === 'unit' ? 'unit' : 'feature',
      body.unit_label || null,
      body.feature_key || null,
      body.price_monthly || 0,
      body.price_yearly || 0,
      body.creem_product_monthly_id || null,
      body.creem_product_yearly_id || null,
      body.max_units ?? null,
      body.is_active !== false ? 1 : 0,
      body.sort_order ?? 0
    ).first();

    // Auto-provision Creem products for the new addon's prices. Non-fatal:
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
        'UPDATE addons SET creem_product_monthly_id = ?, creem_product_yearly_id = ? WHERE id = ?'
      ).bind(sync.monthlyId, sync.yearlyId, (result as any).id).run();
      (result as any).creem_product_monthly_id = sync.monthlyId;
      (result as any).creem_product_yearly_id = sync.yearlyId;
    }

    return c.json({ success: true, data: result, warning: sync.warning }, 201);
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    if (msg.includes('UNIQUE') || msg.includes('constraint')) {
      return c.json({ success: false, error: 'Bu anahtar zaten kullanılıyor' }, 400);
    }
    throw err;
  }
});

// PUT /api/addons/admin/:id - Update addon (super_admin). key is immutable.
addons.put('/admin/:id', requireRole('super_admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<any>();

  const existing = await c.env.DB.prepare('SELECT * FROM addons WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ success: false, error: 'Eklenti bulunamadı' }, 404);

  const result = await c.env.DB.prepare(
    `UPDATE addons SET name = ?, description = ?, type = ?, unit_label = ?, feature_key = ?, price_monthly = ?, price_yearly = ?, creem_product_monthly_id = ?, creem_product_yearly_id = ?, max_units = ?, is_active = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`
  ).bind(
    body.name ?? existing.name,
    body.description !== undefined ? body.description : (existing as any).description,
    body.type !== undefined ? (body.type === 'unit' ? 'unit' : 'feature') : (existing as any).type,
    body.unit_label !== undefined ? body.unit_label : (existing as any).unit_label,
    body.feature_key !== undefined ? body.feature_key : (existing as any).feature_key,
    body.price_monthly ?? (existing as any).price_monthly,
    body.price_yearly ?? (existing as any).price_yearly,
    body.creem_product_monthly_id !== undefined ? body.creem_product_monthly_id : (existing as any).creem_product_monthly_id,
    body.creem_product_yearly_id !== undefined ? body.creem_product_yearly_id : (existing as any).creem_product_yearly_id,
    body.max_units !== undefined ? body.max_units : (existing as any).max_units,
    body.is_active !== undefined ? (body.is_active ? 1 : 0) : (existing as any).is_active,
    body.sort_order ?? (existing as any).sort_order,
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
      'UPDATE addons SET creem_product_monthly_id = ?, creem_product_yearly_id = ? WHERE id = ?'
    ).bind(sync.monthlyId, sync.yearlyId, id).run();
    (result as any).creem_product_monthly_id = sync.monthlyId;
    (result as any).creem_product_yearly_id = sync.yearlyId;
  }

  return c.json({ success: true, data: result, warning: sync.warning });
});

// DELETE /api/addons/admin/:id (super_admin)
addons.delete('/admin/:id', requireRole('super_admin'), async (c) => {
  const id = parseInt(c.req.param('id'));

  await c.env.DB.prepare('DELETE FROM addons WHERE id = ?').bind(id).run();
  return c.json({ success: true, data: { message: 'Eklenti silindi' } });
});

export default addons;
