import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';

const shortUrls = new Hono<{ Bindings: Bindings; Variables: Variables }>();

shortUrls.use('*', authMiddleware, requireRole('super_admin'));

// Slugify with Turkish character support, preserving case
function slugify(text: string): string {
  const turkishMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U',
  };

  return text
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (char) => turkishMap[char] || char)
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// GET /api/short-urls - List all short URLs
shortUrls.get('/', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM short_urls ORDER BY created_at DESC'
  ).all();
  return c.json({ success: true, data: result.results });
});

// POST /api/short-urls - Create a new short URL
shortUrls.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{
    name?: string;
    target_url: string;
  }>();

  if (!body.target_url) {
    return c.json({ success: false, error: 'target_url is required' }, 400);
  }

  let slug: string | null = null;
  if (body.name && body.name.trim()) {
    slug = slugify(body.name.trim());
    if (!slug) slug = null;
  }

  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO short_urls (name, slug, target_url, created_by) VALUES (?, ?, ?, ?) RETURNING *'
    ).bind(
      body.name?.trim() || null,
      slug,
      body.target_url.trim(),
      user.sub
    ).first();

    return c.json({ success: true, data: result }, 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return c.json({ success: false, error: 'A short URL with this slug already exists' }, 409);
    }
    throw err;
  }
});

// PUT /api/short-urls/:id - Update a short URL
shortUrls.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{
    name?: string;
    target_url?: string;
  }>();

  const existing = await c.env.DB.prepare(
    'SELECT id FROM short_urls WHERE id = ?'
  ).bind(id).first();

  if (!existing) {
    return c.json({ success: false, error: 'Short URL not found' }, 404);
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    values.push(body.name?.trim() || null);

    // Regenerate slug from name
    let slug: string | null = null;
    if (body.name && body.name.trim()) {
      slug = slugify(body.name.trim());
      if (!slug) slug = null;
    }
    updates.push('slug = ?');
    values.push(slug);
  }

  if (body.target_url !== undefined) {
    if (!body.target_url) {
      return c.json({ success: false, error: 'target_url cannot be empty' }, 400);
    }
    updates.push('target_url = ?');
    values.push(body.target_url.trim());
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: 'No fields to update' }, 400);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  try {
    const result = await c.env.DB.prepare(
      `UPDATE short_urls SET ${updates.join(', ')} WHERE id = ? RETURNING *`
    ).bind(...values).first();

    return c.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return c.json({ success: false, error: 'A short URL with this slug already exists' }, 409);
    }
    throw err;
  }
});

// DELETE /api/short-urls/:id - Delete a short URL
shortUrls.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare(
    'SELECT id FROM short_urls WHERE id = ?'
  ).bind(id).first();

  if (!existing) {
    return c.json({ success: false, error: 'Short URL not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM short_urls WHERE id = ?').bind(id).run();

  return c.json({ success: true, data: { message: 'Short URL deleted' } });
});

export default shortUrls;
