import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';

const redirects = new Hono<{ Bindings: Bindings; Variables: Variables }>();

redirects.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// GET /api/redirects - List all redirects for current site
redirects.get('/', async (c) => {
  const siteId = c.get('siteId')!;
  const result = await c.env.DB.prepare(
    'SELECT * FROM redirects WHERE site_id = ? ORDER BY created_at DESC'
  ).bind(siteId).all();
  return c.json({ success: true, data: result.results });
});

// POST /api/redirects - Create a new redirect
redirects.post('/', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const body = await c.req.json<{
    source_path: string;
    target_url?: string;
    status_code?: number;
    is_active?: number;
  }>();

  if (!body.source_path) {
    return c.json({ success: false, error: 'source_path is required' }, 400);
  }

  // Normalize source_path to start with /
  let sourcePath = body.source_path.trim();
  if (!sourcePath.startsWith('/')) {
    sourcePath = '/' + sourcePath;
  }

  const statusCode = body.status_code || 301;
  const validCodes = [301, 302, 403, 404, 410];
  if (!validCodes.includes(statusCode)) {
    return c.json({ success: false, error: 'Invalid status_code. Valid: 301, 302, 403, 404, 410' }, 400);
  }

  // For 301/302 redirects, target_url is required
  if ((statusCode === 301 || statusCode === 302) && !body.target_url) {
    return c.json({ success: false, error: 'target_url is required for 301/302 redirects' }, 400);
  }

  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO redirects (site_id, source_path, target_url, status_code, is_active) VALUES (?, ?, ?, ?, ?) RETURNING *'
    ).bind(
      siteId,
      sourcePath,
      body.target_url || null,
      statusCode,
      body.is_active !== undefined ? body.is_active : 1
    ).first();

    return c.json({ success: true, data: result }, 201);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return c.json({ success: false, error: 'A redirect for this source path already exists' }, 409);
    }
    throw err;
  }
});

// PUT /api/redirects/:id - Update a redirect
redirects.put('/:id', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{
    source_path?: string;
    target_url?: string;
    status_code?: number;
    is_active?: number;
  }>();

  // Verify ownership
  const existing = await c.env.DB.prepare(
    'SELECT id FROM redirects WHERE id = ? AND site_id = ?'
  ).bind(id, siteId).first();

  if (!existing) {
    return c.json({ success: false, error: 'Redirect not found' }, 404);
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (body.source_path !== undefined) {
    let sourcePath = body.source_path.trim();
    if (!sourcePath.startsWith('/')) sourcePath = '/' + sourcePath;
    updates.push('source_path = ?');
    values.push(sourcePath);
  }

  if (body.target_url !== undefined) {
    updates.push('target_url = ?');
    values.push(body.target_url || null);
  }

  if (body.status_code !== undefined) {
    const validCodes = [301, 302, 403, 404, 410];
    if (!validCodes.includes(body.status_code)) {
      return c.json({ success: false, error: 'Invalid status_code' }, 400);
    }
    updates.push('status_code = ?');
    values.push(body.status_code);
  }

  if (body.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(body.is_active);
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: 'No fields to update' }, 400);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id, siteId);

  try {
    const result = await c.env.DB.prepare(
      `UPDATE redirects SET ${updates.join(', ')} WHERE id = ? AND site_id = ? RETURNING *`
    ).bind(...values).first();

    return c.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return c.json({ success: false, error: 'A redirect for this source path already exists' }, 409);
    }
    throw err;
  }
});

// DELETE /api/redirects/:id - Delete a redirect
redirects.delete('/:id', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare(
    'SELECT id FROM redirects WHERE id = ? AND site_id = ?'
  ).bind(id, siteId).first();

  if (!existing) {
    return c.json({ success: false, error: 'Redirect not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM redirects WHERE id = ? AND site_id = ?').bind(id, siteId).run();

  return c.json({ success: true, data: { message: 'Redirect deleted' } });
});

export default redirects;
