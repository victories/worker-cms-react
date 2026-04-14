import { Hono } from 'hono';
import type { Bindings, Variables, User } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { hashPassword } from '../../lib/auth';

const users = new Hono<{ Bindings: Bindings; Variables: Variables }>();

users.use('*', authMiddleware);

// GET /api/users
users.get('/', requireRole('admin'), async (c) => {
  const user = c.get('user')!;

  let result;
  if (user.role === 'super_admin') {
    result = await c.env.DB.prepare(
      'SELECT id, email, display_name, role, language, totp_enabled, max_sites, max_editors, max_writers, ai_enabled, ai_use_global, created_by, last_login, created_at FROM users ORDER BY created_at DESC'
    ).all();
  } else {
    // Admin can see users they created + users assigned to their sites
    const siteId = c.get('siteId');
    if (!siteId) return c.json({ success: false, error: 'Site belirtilmedi' }, 400);

    result = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.display_name, u.role, u.language, u.totp_enabled, u.max_sites, u.max_editors, u.max_writers, u.ai_enabled, u.ai_use_global, u.created_by, u.last_login, u.created_at,
       us.role_override
       FROM users u
       JOIN user_sites us ON u.id = us.user_id
       WHERE us.site_id = ?
       ORDER BY u.created_at DESC`
    ).bind(siteId).all();
  }

  return c.json({ success: true, data: result.results });
});

// POST /api/users
users.post('/', requireRole('admin'), async (c) => {
  const currentUser = c.get('user')!;
  const body = await c.req.json<{
    email: string; password: string; display_name: string;
    role?: string; language?: string;
    max_sites?: number; max_editors?: number; max_writers?: number;
    ai_enabled?: number; ai_use_global?: number;
    site_ids?: number[];
  }>();

  if (!body.email || !body.password || !body.display_name) {
    return c.json({ success: false, error: 'E-posta, şifre ve isim gerekli' }, 400);
  }

  if (body.password.length < 8) {
    return c.json({ success: false, error: 'Şifre en az 8 karakter olmalı' }, 400);
  }

  const role = body.role || 'writer';

  // Only super_admin can create admins or super_admins
  if ((role === 'admin' || role === 'super_admin') && currentUser.role !== 'super_admin') {
    return c.json({ success: false, error: 'Bu rolde kullanıcı oluşturma yetkiniz yok' }, 403);
  }

  // Admin users can only create writer/editor — enforce role limits
  if (currentUser.role === 'admin') {
    if (role !== 'writer' && role !== 'editor') {
      return c.json({ success: false, error: 'Sadece writer veya editor oluşturabilirsiniz' }, 403);
    }

    // Check limits from current user's record
    const adminRecord = await c.env.DB.prepare(
      'SELECT max_editors, max_writers FROM users WHERE id = ?'
    ).bind(currentUser.sub).first<{ max_editors: number; max_writers: number }>();

    if (!adminRecord) {
      return c.json({ success: false, error: 'Kullanıcı kaydı bulunamadı' }, 500);
    }

    if (role === 'editor') {
      const editorCount = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM users WHERE created_by = ? AND role = 'editor'"
      ).bind(currentUser.sub).first<{ count: number }>();
      if ((editorCount?.count ?? 0) >= (adminRecord.max_editors ?? 0)) {
        return c.json({ success: false, error: `Editör limiti doldu (${adminRecord.max_editors ?? 0})` }, 403);
      }
    }

    if (role === 'writer') {
      const writerCount = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM users WHERE created_by = ? AND role = 'writer'"
      ).bind(currentUser.sub).first<{ count: number }>();
      if ((writerCount?.count ?? 0) >= (adminRecord.max_writers ?? 0)) {
        return c.json({ success: false, error: `Yazar limiti doldu (${adminRecord.max_writers ?? 0})` }, 403);
      }
    }

    // Admin must provide at least one site
    if (!body.site_ids || body.site_ids.length === 0) {
      return c.json({ success: false, error: 'En az bir site seçilmeli' }, 400);
    }
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(body.email.toLowerCase().trim()).first();
  if (existing) {
    return c.json({ success: false, error: 'Bu e-posta zaten kullanılıyor' }, 400);
  }

  const passwordHash = await hashPassword(body.password);

  // Only super_admin can set permission fields
  const maxSites = currentUser.role === 'super_admin' ? (body.max_sites ?? 0) : 0;
  const maxEditors = currentUser.role === 'super_admin' ? (body.max_editors ?? 0) : 0;
  const maxWriters = currentUser.role === 'super_admin' ? (body.max_writers ?? 0) : 0;
  const aiEnabled = currentUser.role === 'super_admin' ? (body.ai_enabled ?? 0) : 0;
  const aiUseGlobal = currentUser.role === 'super_admin' ? (body.ai_use_global ?? 0) : 0;

  // Track who created this user (null for super_admin-created users, or admin's id)
  const createdBy = currentUser.role === 'super_admin' ? null : currentUser.sub;

  const result = await c.env.DB.prepare(
    'INSERT INTO users (email, password_hash, display_name, role, language, max_sites, max_editors, max_writers, ai_enabled, ai_use_global, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, email, display_name, role, language, max_sites, max_editors, max_writers, ai_enabled, ai_use_global, created_by, created_at'
  ).bind(
    body.email.toLowerCase().trim(), passwordHash, body.display_name, role, body.language || 'tr',
    maxSites, maxEditors, maxWriters, aiEnabled, aiUseGlobal, createdBy
  ).first();

  // Assign user to selected sites
  if (result && body.site_ids && body.site_ids.length > 0) {
    const newUserId = (result as any).id;
    for (const siteId of body.site_ids) {
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO user_sites (user_id, site_id, role_override) VALUES (?, ?, ?)'
      ).bind(newUserId, siteId, null).run();
    }
  }

  return c.json({ success: true, data: result }, 201);
});

// PUT /api/users/:id
users.put('/:id', async (c) => {
  const currentUser = c.get('user')!;
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{
    display_name?: string; email?: string; password?: string;
    role?: string; language?: string;
    max_sites?: number; max_editors?: number; max_writers?: number;
    ai_enabled?: number; ai_use_global?: number;
  }>();

  // Users can edit themselves; admins can edit others
  if (id !== currentUser.sub && currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
    return c.json({ success: false, error: 'Yetkiniz yok' }, 403);
  }

  // Only super_admin can change roles and permission fields
  if (body.role && currentUser.role !== 'super_admin') {
    return c.json({ success: false, error: 'Rol değiştirme yetkiniz yok' }, 403);
  }
  if ((body.max_sites !== undefined || body.max_editors !== undefined || body.max_writers !== undefined || body.ai_enabled !== undefined || body.ai_use_global !== undefined) && currentUser.role !== 'super_admin') {
    return c.json({ success: false, error: 'Bu alanları değiştirme yetkiniz yok' }, 403);
  }

  // Check email uniqueness if changing email
  if (body.email) {
    const emailLower = body.email.toLowerCase().trim();
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .bind(emailLower, id).first();
    if (existing) {
      return c.json({ success: false, error: 'Bu e-posta zaten kullanılıyor' }, 400);
    }
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.display_name) { updates.push('display_name = ?'); params.push(body.display_name); }
  if (body.email) { updates.push('email = ?'); params.push(body.email.toLowerCase().trim()); }
  if (body.role) { updates.push('role = ?'); params.push(body.role); }
  if (body.language) { updates.push('language = ?'); params.push(body.language); }
  if (body.password) {
    if (body.password.length < 8) return c.json({ success: false, error: 'Şifre en az 8 karakter' }, 400);
    updates.push('password_hash = ?');
    params.push(await hashPassword(body.password));
  }
  if (body.max_sites !== undefined) { updates.push('max_sites = ?'); params.push(body.max_sites); }
  if (body.max_editors !== undefined) { updates.push('max_editors = ?'); params.push(body.max_editors); }
  if (body.max_writers !== undefined) { updates.push('max_writers = ?'); params.push(body.max_writers); }
  if (body.ai_enabled !== undefined) { updates.push('ai_enabled = ?'); params.push(body.ai_enabled); }
  if (body.ai_use_global !== undefined) { updates.push('ai_use_global = ?'); params.push(body.ai_use_global); }

  if (updates.length === 0) {
    return c.json({ success: false, error: 'Güncellenecek alan yok' }, 400);
  }

  updates.push("updated_at = datetime('now')");
  params.push(id);

  const result = await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ? RETURNING id, email, display_name, role, language, max_sites, max_editors, max_writers, ai_enabled, ai_use_global, created_by, created_at`
  ).bind(...params).first();

  if (!result) return c.json({ success: false, error: 'Kullanıcı bulunamadı' }, 404);

  return c.json({ success: true, data: result });
});

// DELETE /api/users/:id
users.delete('/:id', requireRole('super_admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const currentUser = c.get('user')!;

  if (id === currentUser.sub) {
    return c.json({ success: false, error: 'Kendinizi silemezsiniz' }, 400);
  }

  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return c.json({ success: true, data: { message: 'Kullanıcı silindi' } });
});

// POST /api/users/:id/sites - Assign user to site
users.post('/:id/sites', requireRole('super_admin'), async (c) => {
  const userId = parseInt(c.req.param('id'));
  const body = await c.req.json<{ site_id: number; role_override?: string }>();

  if (!body.site_id) return c.json({ success: false, error: 'site_id gerekli' }, 400);

  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO user_sites (user_id, site_id, role_override) VALUES (?, ?, ?)'
  ).bind(userId, body.site_id, body.role_override || null).run();

  return c.json({ success: true, data: { message: 'Kullanıcı siteye atandı' } });
});

// DELETE /api/users/:id/sites/:siteId - Remove user from site
users.delete('/:id/sites/:siteId', requireRole('super_admin'), async (c) => {
  const userId = parseInt(c.req.param('id'));
  const siteId = parseInt(c.req.param('siteId'));

  await c.env.DB.prepare('DELETE FROM user_sites WHERE user_id = ? AND site_id = ?')
    .bind(userId, siteId).run();

  return c.json({ success: true, data: { message: 'Kullanıcı siteden kaldırıldı' } });
});

// GET /api/users/:id/sites - Get user's sites
users.get('/:id/sites', async (c) => {
  const userId = parseInt(c.req.param('id'));

  const result = await c.env.DB.prepare(
    'SELECT s.*, us.role_override FROM sites s JOIN user_sites us ON s.id = us.site_id WHERE us.user_id = ?'
  ).bind(userId).all();

  return c.json({ success: true, data: result.results });
});

export default users;
