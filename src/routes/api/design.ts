import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { cachePurgeSite } from '../../lib/cache';
import {
  loadActiveDesign,
  saveActiveDesign,
  resetActiveDesign,
  type SaveDesignPayload,
} from '../../lib/themes/design';
import { PALETTES, DEFAULT_PALETTE_SLUG } from '../../lib/themes/palettes';

const design = new Hono<{ Bindings: Bindings; Variables: Variables }>();

design.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// GET /api/design — current site's resolved design (or synthesised default)
design.get('/', async (c) => {
  const siteId = c.get('siteId')!;
  const active = await loadActiveDesign(c.env.DB, siteId);
  return c.json({ success: true, data: active });
});

// PUT /api/design — admin save (partial payload allowed)
design.put('/', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const body = (await c.req.json().catch(() => ({}))) as SaveDesignPayload;

  const next = await saveActiveDesign(c.env.DB, siteId, body);
  await cachePurgeSite(c.env.CACHE, siteId);
  return c.json({ success: true, data: next });
});

// POST /api/design/reset — replace style+layout with a preset's defaults
design.post('/reset', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const body = (await c.req.json().catch(() => ({}))) as { presetSlug?: string };
  const slug = body.presetSlug && PALETTES[body.presetSlug] ? body.presetSlug : DEFAULT_PALETTE_SLUG;

  const next = await resetActiveDesign(c.env.DB, siteId, slug);
  await cachePurgeSite(c.env.CACHE, siteId);
  return c.json({ success: true, data: next });
});

// GET /api/design/presets — every built-in palette as a "starter preset"
design.get('/presets', async (c) => {
  const list = Object.values(PALETTES).map((p) => ({
    slug: p.slug,
    name: p.name,
    description: p.description ?? '',
    light: p.light,
    dark: p.dark,
  }));
  return c.json({
    success: true,
    data: { default: DEFAULT_PALETTE_SLUG, presets: list },
  });
});

export default design;
