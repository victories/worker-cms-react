import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { sendEmailViaResend, buildNotificationEmail, buildReplyEmail, getMailSettings } from '../../lib/email';
import { verifyRecaptcha, getRecaptchaSettings } from '../../lib/recaptcha';

const contact = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ──────────────────────────────────────────────────
// PUBLIC: POST /api/contact — Form submission (no auth)
// ──────────────────────────────────────────────────
contact.post('/', async (c) => {
  const siteId = c.get('siteId');
  if (!siteId) {
    return c.json({ success: false, error: 'Site not found' }, 400);
  }

  let body: { name?: string; email?: string; subject?: string; message?: string; recaptcha_token?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON' }, 400);
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const subject = body.subject?.trim() || null;
  const message = body.message?.trim();

  if (!name || !email || !message) {
    return c.json({ success: false, error: 'Name, email and message are required' }, 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ success: false, error: 'Invalid email address' }, 400);
  }

  // reCAPTCHA v3 verification
  const recaptcha = await getRecaptchaSettings(c.env.DB, siteId);
  if (recaptcha.enabled && recaptcha.onContact && recaptcha.secretKey) {
    const token = body.recaptcha_token;
    if (!token) {
      return c.json({ success: false, error: 'reCAPTCHA token is required' }, 400);
    }
    const result = await verifyRecaptcha(recaptcha.secretKey, token, recaptcha.scoreThreshold);
    if (!result.success) {
      return c.json({ success: false, error: 'reCAPTCHA verification failed' }, 403);
    }
  }

  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null;

  // Store in DB
  const result = await c.env.DB.prepare(
    `INSERT INTO contact_submissions (site_id, name, email, subject, message, ip_address)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(siteId, name, email, subject, message, ip).first<{ id: number }>();

  // Send notification email (fire and forget)
  c.executionCtx.waitUntil((async () => {
    try {
      // Get global mail settings
      const mailSettings = await getMailSettings(c.env.DB, c.env.RESEND_API_KEY);
      if (!mailSettings.enabled || !mailSettings.onContact || !mailSettings.apiKey) return;

      // Get plugin settings for this site (may have per-site recipient)
      const pluginRow = await c.env.DB.prepare(
        `SELECT sp.settings FROM site_plugins sp
         JOIN plugins p ON p.id = sp.plugin_id
         WHERE sp.site_id = ? AND p.slug = 'contact-form' AND sp.is_active = 1`
      ).bind(siteId).first<{ settings: string | null }>();

      let recipientEmail = '';
      let senderEmail = '';
      if (pluginRow?.settings) {
        try {
          const parsed = JSON.parse(pluginRow.settings);
          recipientEmail = parsed.recipientEmail || '';
          senderEmail = parsed.senderEmail || '';
        } catch {}
      }

      // Fallback to global admin email
      if (!recipientEmail) recipientEmail = mailSettings.adminEmail;
      if (!recipientEmail) return;

      // Get site name for email
      const site = await c.env.DB.prepare('SELECT name FROM sites WHERE id = ?')
        .bind(siteId).first<{ name: string }>();

      const fromAddress = senderEmail || mailSettings.fromAddress;
      const fromDisplay = mailSettings.fromName
        ? `${mailSettings.fromName} <${fromAddress}>`
        : fromAddress;
      const html = buildNotificationEmail({
        name,
        email,
        subject,
        message,
        siteName: site?.name,
      });

      await sendEmailViaResend(mailSettings.apiKey, {
        to: recipientEmail,
        from: fromDisplay,
        subject: `📩 Yeni Mesaj: ${subject || name}`,
        html,
        replyTo: email,
      });
    } catch (err: any) {
      console.error('[Contact] Email notification failed:', err.message);
    }
  })());

  return c.json({ success: true, data: { id: result?.id, message: 'Message sent successfully' } });
});

// ──────────────────────────────────────────────────
// PUBLIC: GET /api/contact/recaptcha-config — Expose site key for frontend
// ──────────────────────────────────────────────────
contact.get('/recaptcha-config', async (c) => {
  const siteId = c.get('siteId');
  if (!siteId) return c.json({ success: true, data: { enabled: false } });

  const recaptcha = await getRecaptchaSettings(c.env.DB, siteId);
  return c.json({
    success: true,
    data: {
      enabled: recaptcha.enabled,
      siteKey: recaptcha.enabled ? recaptcha.siteKey : '',
      onContact: recaptcha.onContact,
      onComments: recaptcha.onComments,
    },
  });
});

// ──────────────────────────────────────────────────
// ADMIN: /api/contact/submissions — Requires auth
// ──────────────────────────────────────────────────

// GET /api/contact/submissions — List all submissions
contact.get('/submissions', authMiddleware, requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const url = new URL(c.req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const perPage = parseInt(url.searchParams.get('per_page') || '20');
  const status = url.searchParams.get('status'); // 'unread', 'read', 'replied', or null for all

  let countSql = 'SELECT COUNT(*) as total FROM contact_submissions WHERE site_id = ?';
  let dataSql = `SELECT cs.*, u.display_name as replied_by_name
    FROM contact_submissions cs
    LEFT JOIN users u ON u.id = cs.replied_by
    WHERE cs.site_id = ?`;
  const params: any[] = [siteId];

  if (status) {
    countSql += ' AND status = ?';
    dataSql += ' AND cs.status = ?';
    params.push(status);
  }

  dataSql += ' ORDER BY cs.created_at DESC LIMIT ? OFFSET ?';

  const countParams = [...params];
  params.push(perPage, (page - 1) * perPage);

  const [countResult, dataResult] = await Promise.all([
    c.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>(),
    c.env.DB.prepare(dataSql).bind(...params).all(),
  ]);

  const total = countResult?.total || 0;

  // Also get unread count for badge
  const unreadResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM contact_submissions WHERE site_id = ? AND status = ?'
  ).bind(siteId, 'unread').first<{ count: number }>();

  return c.json({
    success: true,
    data: dataResult.results,
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
      unread_count: unreadResult?.count || 0,
    },
  });
});

// GET /api/contact/submissions/unread-count — Quick unread count (for badge)
contact.get('/submissions/unread-count', authMiddleware, requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const result = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM contact_submissions WHERE site_id = ? AND status = ?'
  ).bind(siteId, 'unread').first<{ count: number }>();

  return c.json({ success: true, data: { count: result?.count || 0 } });
});

// GET /api/contact/submissions/:id — Get single submission
contact.get('/submissions/:id', authMiddleware, requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const row = await c.env.DB.prepare(
    `SELECT cs.*, u.display_name as replied_by_name
     FROM contact_submissions cs
     LEFT JOIN users u ON u.id = cs.replied_by
     WHERE cs.id = ? AND cs.site_id = ?`
  ).bind(id, siteId).first();

  if (!row) {
    return c.json({ success: false, error: 'Submission not found' }, 404);
  }

  // Auto-mark as read when viewed
  if (row.status === 'unread') {
    await c.env.DB.prepare(
      'UPDATE contact_submissions SET status = ? WHERE id = ?'
    ).bind('read', id).run();
    (row as any).status = 'read';
  }

  return c.json({ success: true, data: row });
});

// PUT /api/contact/submissions/:id/status — Update status
contact.put('/submissions/:id/status', authMiddleware, requireRole('admin'), requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ status: string }>();

  const validStatuses = ['unread', 'read', 'replied', 'archived'];
  if (!validStatuses.includes(body.status)) {
    return c.json({ success: false, error: 'Invalid status' }, 400);
  }

  await c.env.DB.prepare(
    'UPDATE contact_submissions SET status = ? WHERE id = ? AND site_id = ?'
  ).bind(body.status, id, siteId).run();

  return c.json({ success: true, data: { message: 'Status updated' } });
});

// POST /api/contact/submissions/:id/reply — Send reply email
contact.post('/submissions/:id/reply', authMiddleware, requireRole('admin'), requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));
  const user = c.get('user')!;
  const body = await c.req.json<{ content: string; subject?: string }>();

  if (!body.content?.trim()) {
    return c.json({ success: false, error: 'Reply content is required' }, 400);
  }

  // Get the original submission
  const submission = await c.env.DB.prepare(
    'SELECT * FROM contact_submissions WHERE id = ? AND site_id = ?'
  ).bind(id, siteId).first<{
    id: number; name: string; email: string; subject: string | null; message: string;
  }>();

  if (!submission) {
    return c.json({ success: false, error: 'Submission not found' }, 404);
  }

  // Get global mail settings
  const mailSettings = await getMailSettings(c.env.DB, c.env.RESEND_API_KEY);
  if (!mailSettings.enabled || !mailSettings.apiKey) {
    return c.json({ success: false, error: 'Email service not configured' }, 500);
  }

  // Get plugin settings for sender email (per-site override)
  const pluginRow = await c.env.DB.prepare(
    `SELECT sp.settings FROM site_plugins sp
     JOIN plugins p ON p.id = sp.plugin_id
     WHERE sp.site_id = ? AND p.slug = 'contact-form' AND sp.is_active = 1`
  ).bind(siteId).first<{ settings: string | null }>();

  let senderEmail = '';
  let recipientEmail = '';
  if (pluginRow?.settings) {
    try {
      const parsed = JSON.parse(pluginRow.settings);
      senderEmail = parsed.senderEmail || '';
      recipientEmail = parsed.recipientEmail || '';
    } catch {}
  }

  const site = await c.env.DB.prepare('SELECT name FROM sites WHERE id = ?')
    .bind(siteId).first<{ name: string }>();

  const fromAddress = senderEmail || mailSettings.fromAddress;
  const fromDisplay = mailSettings.fromName
    ? `${mailSettings.fromName} <${fromAddress}>`
    : fromAddress;
  const replySubject = body.subject || `Re: ${submission.subject || 'İletişim Mesajınız'}`;

  const html = buildReplyEmail({
    originalName: submission.name,
    originalMessage: submission.message,
    replyContent: body.content.trim(),
    siteName: site?.name,
  });

  const emailResult = await sendEmailViaResend(mailSettings.apiKey, {
    to: submission.email,
    from: fromDisplay,
    subject: replySubject,
    html,
    replyTo: recipientEmail || mailSettings.adminEmail || fromAddress,
  });

  if (!emailResult.success) {
    return c.json({ success: false, error: `Email gönderilemedi: ${emailResult.error}` }, 500);
  }

  // Update submission with reply info
  await c.env.DB.prepare(
    `UPDATE contact_submissions SET
      reply_content = ?,
      replied_at = datetime('now'),
      replied_by = ?,
      status = 'replied'
     WHERE id = ? AND site_id = ?`
  ).bind(body.content.trim(), user.sub, id, siteId).run();

  return c.json({ success: true, data: { message: 'Reply sent successfully', emailId: emailResult.id } });
});

// DELETE /api/contact/submissions/:id
contact.delete('/submissions/:id', authMiddleware, requireRole('admin'), requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  await c.env.DB.prepare(
    'DELETE FROM contact_submissions WHERE id = ? AND site_id = ?'
  ).bind(id, siteId).run();

  return c.json({ success: true, data: { message: 'Submission deleted' } });
});

// DELETE /api/contact/submissions — Bulk delete
contact.delete('/submissions', authMiddleware, requireRole('admin'), requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const body = await c.req.json<{ ids: number[] }>();

  if (!body.ids?.length) {
    return c.json({ success: false, error: 'No IDs provided' }, 400);
  }

  // Batch delete (D1 variable limit safe)
  const BATCH = 30;
  for (let i = 0; i < body.ids.length; i += BATCH) {
    const batch = body.ids.slice(i, i + BATCH);
    const placeholders = batch.map(() => '?').join(',');
    await c.env.DB.prepare(
      `DELETE FROM contact_submissions WHERE site_id = ? AND id IN (${placeholders})`
    ).bind(siteId, ...batch).run();
  }

  return c.json({ success: true, data: { message: `${body.ids.length} submissions deleted` } });
});

export default contact;
