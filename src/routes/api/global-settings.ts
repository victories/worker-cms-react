import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { getMailSettings, sendEmailViaResend, getDefaultTemplate, renderTemplate, EMAIL_EVENTS, type EmailEventType } from '../../lib/email';

const globalSettings = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All global-settings endpoints require super_admin — no site context needed
globalSettings.use('*', authMiddleware);

// GET /api/global-settings
globalSettings.get('/', requireRole('super_admin'), async (c) => {
  const result = await c.env.DB.prepare('SELECT key, value FROM global_settings').all();
  const data = Object.fromEntries(
    (result.results as any[]).map((r: any) => [r.key, r.value])
  );
  return c.json({ success: true, data });
});

// PUT /api/global-settings
globalSettings.put('/', requireRole('super_admin'), async (c) => {
  const body = await c.req.json<Record<string, string>>();

  // Protect system keys from being modified via this endpoint
  const protectedKeys = ['version', 'setup_complete'];

  for (const [key, value] of Object.entries(body)) {
    if (protectedKeys.includes(key)) continue;
    await c.env.DB.prepare(
      'INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
    ).bind(key, value, value).run();
  }

  return c.json({ success: true, data: body });
});

// GET /api/global-settings/email-events — list all email event types with metadata
globalSettings.get('/email-events', requireRole('super_admin'), async (c) => {
  return c.json({ success: true, data: EMAIL_EVENTS });
});

// GET /api/global-settings/email-template/:event — get template (custom or default)
globalSettings.get('/email-template/:event', requireRole('super_admin'), async (c) => {
  const event = c.req.param('event') as EmailEventType;
  const eventMeta = EMAIL_EVENTS.find(e => e.type === event);
  if (!eventMeta) return c.json({ success: false, error: 'Unknown event' }, 400);

  const defaultTpl = getDefaultTemplate(event);

  // Check for custom template in DB
  const subjectKey = `mail_tpl_${event}_subject`;
  const bodyKey = `mail_tpl_${event}_body`;
  const rows = await c.env.DB.prepare(
    'SELECT key, value FROM global_settings WHERE key IN (?, ?)'
  ).bind(subjectKey, bodyKey).all();

  const map = new Map<string, string>();
  for (const row of rows.results as { key: string; value: string }[]) {
    map.set(row.key, row.value);
  }

  return c.json({
    success: true,
    data: {
      event,
      variables: eventMeta.variables,
      defaultTemplate: defaultTpl,
      customTemplate: {
        subject: map.get(subjectKey) || '',
        body: map.get(bodyKey) || '',
      },
      isCustomized: !!(map.get(subjectKey) || map.get(bodyKey)),
    },
  });
});

// PUT /api/global-settings/email-template/:event — save custom template
globalSettings.put('/email-template/:event', requireRole('super_admin'), async (c) => {
  const event = c.req.param('event') as EmailEventType;
  const eventMeta = EMAIL_EVENTS.find(e => e.type === event);
  if (!eventMeta) return c.json({ success: false, error: 'Unknown event' }, 400);

  const body = await c.req.json<{ subject?: string; body?: string }>();
  const subjectKey = `mail_tpl_${event}_subject`;
  const bodyKey = `mail_tpl_${event}_body`;

  if (body.subject !== undefined) {
    if (body.subject.trim()) {
      await c.env.DB.prepare(
        'INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
      ).bind(subjectKey, body.subject, body.subject).run();
    } else {
      await c.env.DB.prepare('DELETE FROM global_settings WHERE key = ?').bind(subjectKey).run();
    }
  }

  if (body.body !== undefined) {
    if (body.body.trim()) {
      await c.env.DB.prepare(
        'INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
      ).bind(bodyKey, body.body, body.body).run();
    } else {
      await c.env.DB.prepare('DELETE FROM global_settings WHERE key = ?').bind(bodyKey).run();
    }
  }

  return c.json({ success: true });
});

// DELETE /api/global-settings/email-template/:event — reset to default
globalSettings.delete('/email-template/:event', requireRole('super_admin'), async (c) => {
  const event = c.req.param('event') as EmailEventType;
  const eventMeta = EMAIL_EVENTS.find(e => e.type === event);
  if (!eventMeta) return c.json({ success: false, error: 'Unknown event' }, 400);

  await c.env.DB.prepare(
    'DELETE FROM global_settings WHERE key IN (?, ?)'
  ).bind(`mail_tpl_${event}_subject`, `mail_tpl_${event}_body`).run();

  return c.json({ success: true });
});

// POST /api/global-settings/email-test — send test email
globalSettings.post('/email-test', requireRole('super_admin'), async (c) => {
  const body = await c.req.json<{ event: EmailEventType; to: string }>();
  const mailSettings = await getMailSettings(c.env.DB, c.env.RESEND_API_KEY);

  if (!mailSettings.enabled || !mailSettings.apiKey) {
    return c.json({ success: false, error: 'Mail is disabled or API key is missing' }, 400);
  }

  const eventMeta = EMAIL_EVENTS.find(e => e.type === body.event);
  if (!eventMeta) return c.json({ success: false, error: 'Unknown event' }, 400);

  // Build sample vars
  const sampleVars: Record<string, string> = {};
  for (const v of eventMeta.variables) {
    switch (v) {
      case 'user_name': sampleVars[v] = 'Test Kullanıcı'; break;
      case 'user_email': sampleVars[v] = body.to; break;
      case 'site_name': sampleVars[v] = 'Worker CMS'; break;
      case 'login_url': sampleVars[v] = `https://${c.env.ADMIN_DOMAIN || 'workercms.com'}/admin/login`; break;
      case 'reset_url': sampleVars[v] = `https://${c.env.ADMIN_DOMAIN || 'workercms.com'}/admin/reset-password?token=test123`; break;
      case 'post_title': sampleVars[v] = 'Örnek Yazı Başlığı'; break;
      case 'post_excerpt': sampleVars[v] = 'Bu bir test yazı özetidir. This is a test post excerpt.'; break;
      case 'post_url': sampleVars[v] = `https://${c.env.ADMIN_DOMAIN || 'workercms.com'}/ornek-yazi`; break;
      case 'author_name': sampleVars[v] = 'Yazar Adı'; break;
      case 'author_email': sampleVars[v] = 'yazar@example.com'; break;
      case 'comment_content': sampleVars[v] = 'Bu bir test yorumdur. This is a test comment.'; break;
      case 'contact_name': sampleVars[v] = 'İletişim Adı'; break;
      case 'contact_email': sampleVars[v] = 'iletisim@example.com'; break;
      case 'contact_subject': sampleVars[v] = 'Test Konusu'; break;
      case 'contact_message': sampleVars[v] = 'Bu bir test mesajıdır. This is a test message.'; break;
      case 'package_name': sampleVars[v] = 'Pro Paket'; break;
      case 'billing_period': sampleVars[v] = 'Aylık / Monthly'; break;
      case 'payment_method': sampleVars[v] = 'Kredi Kartı / Credit Card'; break;
      case 'period_end': sampleVars[v] = '2026-04-17'; break;
      case 'days_left': sampleVars[v] = '7'; break;
      case 'renew_url': sampleVars[v] = `https://${c.env.ADMIN_DOMAIN || 'workercms.com'}/admin/subscription`; break;
      default: sampleVars[v] = `[${v}]`;
    }
  }

  // Load custom or default template
  const subjectKey = `mail_tpl_${body.event}_subject`;
  const bodyKey = `mail_tpl_${body.event}_body`;
  const rows = await c.env.DB.prepare(
    'SELECT key, value FROM global_settings WHERE key IN (?, ?)'
  ).bind(subjectKey, bodyKey).all();
  const map = new Map<string, string>();
  for (const row of rows.results as { key: string; value: string }[]) {
    map.set(row.key, row.value);
  }

  const defaultTpl = getDefaultTemplate(body.event);
  const subject = renderTemplate(map.get(subjectKey) || defaultTpl.subject, sampleVars);
  const bodyHtml = renderTemplate(map.get(bodyKey) || defaultTpl.body, sampleVars);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;background:#f5f5f5;">
  <div style="background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;padding:24px;border-top:3px solid ${eventMeta.accentColor};">
    ${bodyHtml}
  </div>
  <p style="text-align:center;margin:16px 0 0;font-size:0.75em;color:#aaa;">
    Worker CMS — Modern Multi-Site CMS
  </p>
</body>
</html>`;

  const from = `${mailSettings.fromName || 'Worker CMS'} <${mailSettings.fromAddress}>`;
  const result = await sendEmailViaResend(mailSettings.apiKey, {
    to: body.to,
    from,
    subject: `[TEST] ${subject}`,
    html,
  });

  return c.json(result);
});

export default globalSettings;
