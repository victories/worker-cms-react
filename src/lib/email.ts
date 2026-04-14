/**
 * Email sending utility via Resend API
 * https://resend.com/docs/api-reference/emails/send-email
 *
 * Template system: Each email event has a default template.
 * Admins can customize subject + body per event via global_settings.
 * Templates support {{variable}} placeholders.
 */

// ─── Types ───────────────────────────────────────────────────

export type EmailEventType =
  | 'welcome'           // New user registration welcome
  | 'password_reset'    // Password reset request
  | 'new_comment'       // New comment on a post
  | 'new_contact'       // Contact form submission
  | 'subscription_active'    // Subscription activated
  | 'subscription_expiring'  // Subscription expiring soon
  | 'subscription_cancelled' // Subscription cancelled
  | 'new_post_published';    // New post published notification

export interface MailSettings {
  enabled: boolean;
  provider: string;
  apiKey: string;
  fromAddress: string;
  fromName: string;
  adminEmail: string;
  // Per-event toggles
  onComment: boolean;
  onContact: boolean;
  onUserRegister: boolean;
  onSubscriptionActive: boolean;
  onSubscriptionExpiring: boolean;
  onSubscriptionCancelled: boolean;
  onPasswordReset: boolean;
  onNewPostPublished: boolean;
}

export interface EmailTemplate {
  subject: string;
  body: string; // HTML with {{variable}} placeholders
}

// ─── Settings ────────────────────────────────────────────────

/**
 * Get mail settings from global_settings table, falling back to env variables.
 */
export async function getMailSettings(
  db: D1Database,
  envApiKey?: string
): Promise<MailSettings> {
  const result = await db.prepare(
    "SELECT key, value FROM global_settings WHERE key LIKE 'mail_%'"
  ).all();

  const map = new Map<string, string>();
  for (const row of result.results as { key: string; value: string }[]) {
    map.set(row.key, row.value);
  }

  return {
    enabled: map.get('mail_enabled') !== 'false', // default true
    provider: map.get('mail_provider') || 'resend',
    apiKey: map.get('mail_api_key') || envApiKey || '',
    fromAddress: map.get('mail_from_address') || 'info@workercms.com',
    fromName: map.get('mail_from_name') || 'Worker CMS',
    adminEmail: map.get('mail_admin_email') || '',
    onComment: map.get('mail_on_comment') !== 'false',
    onContact: map.get('mail_on_contact') !== 'false',
    onUserRegister: map.get('mail_on_user_register') !== 'false',
    onSubscriptionActive: map.get('mail_on_subscription_active') !== 'false',
    onSubscriptionExpiring: map.get('mail_on_subscription_expiring') !== 'false',
    onSubscriptionCancelled: map.get('mail_on_subscription_cancelled') !== 'false',
    onPasswordReset: map.get('mail_on_password_reset') !== 'false',
    onNewPostPublished: map.get('mail_on_new_post_published') === 'true', // default off
  };
}

/**
 * Get custom template for an event from DB, or return null for default.
 */
export async function getCustomTemplate(
  db: D1Database,
  event: EmailEventType
): Promise<EmailTemplate | null> {
  const subjectKey = `mail_tpl_${event}_subject`;
  const bodyKey = `mail_tpl_${event}_body`;
  const rows = await db.prepare(
    'SELECT key, value FROM global_settings WHERE key IN (?, ?)'
  ).bind(subjectKey, bodyKey).all();

  const map = new Map<string, string>();
  for (const row of rows.results as { key: string; value: string }[]) {
    map.set(row.key, row.value);
  }

  const subject = map.get(subjectKey);
  const body = map.get(bodyKey);
  if (!subject && !body) return null;
  return {
    subject: subject || getDefaultTemplate(event).subject,
    body: body || getDefaultTemplate(event).body,
  };
}

// ─── Template Engine ─────────────────────────────────────────

/**
 * Replace {{variable}} placeholders with actual values
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return vars[key] !== undefined ? vars[key] : `{{${key}}}`;
  });
}

/**
 * Wrap body content in the standard email layout
 */
function wrapInLayout(bodyHtml: string, accentColor: string = '#4a90d9'): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;background:#f5f5f5;">
  <div style="background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;padding:24px;border-top:3px solid ${accentColor};">
    ${bodyHtml}
  </div>
  <p style="text-align:center;margin:16px 0 0;font-size:0.75em;color:#aaa;">
    Worker CMS &mdash; Modern Multi-Site CMS
  </p>
</body>
</html>`;
}

// ─── Default Templates ───────────────────────────────────────

export function getDefaultTemplate(event: EmailEventType): EmailTemplate {
  switch (event) {
    case 'welcome':
      return {
        subject: 'Hoş geldiniz! / Welcome to {{site_name}}!',
        body: `<h2 style="margin:0 0 16px;color:#1a1a2e;">👋 Hoş Geldiniz / Welcome</h2>
<p>Merhaba <strong>{{user_name}}</strong>,</p>
<p>{{site_name}} platformuna başarıyla kayıt oldunuz. Hemen giriş yaparak sitenizi oluşturabilirsiniz.</p>
<p>Hi <strong>{{user_name}}</strong>,</p>
<p>You have successfully registered on {{site_name}}. Log in now to create your site.</p>
<div style="text-align:center;margin:24px 0;">
  <a href="{{login_url}}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
    Giriş Yap / Log In
  </a>
</div>`,
      };

    case 'password_reset':
      return {
        subject: 'Şifre Sıfırlama / Password Reset',
        body: `<h2 style="margin:0 0 16px;color:#1a1a2e;">🔐 Şifre Sıfırlama / Password Reset</h2>
<p>Merhaba <strong>{{user_name}}</strong>,</p>
<p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın. Bu bağlantı 1 saat geçerlidir.</p>
<p>Click the link below to reset your password. This link is valid for 1 hour.</p>
<div style="text-align:center;margin:24px 0;">
  <a href="{{reset_url}}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
    Şifremi Sıfırla / Reset Password
  </a>
</div>
<p style="font-size:0.85em;color:#999;">Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.<br>If you did not request this, you can ignore this email.</p>`,
      };

    case 'new_comment':
      return {
        subject: 'Yeni Yorum: {{post_title}} / New Comment',
        body: `<h2 style="margin:0 0 16px;color:#1a1a2e;">💬 Yeni Yorum / New Comment</h2>
{{#site_name}}<p style="margin:0 0 12px;color:#666;font-size:0.9em;">Site: <strong>{{site_name}}</strong></p>{{/site_name}}
<table style="width:100%;border-collapse:collapse;">
  <tr>
    <td style="padding:8px 12px;background:#f8f9fa;border:1px solid #eee;font-weight:600;width:120px;">Yazı / Post</td>
    <td style="padding:8px 12px;background:#f8f9fa;border:1px solid #eee;">{{post_title}}</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;background:#fff;border:1px solid #eee;font-weight:600;">Yazar / Author</td>
    <td style="padding:8px 12px;background:#fff;border:1px solid #eee;">{{author_name}} {{author_email}}</td>
  </tr>
</table>
<div style="margin-top:16px;padding:16px;background:#f8f9fa;border:1px solid #eee;border-radius:4px;">
  <p style="margin:0 0 8px;font-weight:600;color:#555;">Yorum / Comment:</p>
  <p style="margin:0;white-space:pre-wrap;line-height:1.6;">{{comment_content}}</p>
</div>`,
      };

    case 'new_contact':
      return {
        subject: 'Yeni İletişim: {{contact_subject}} / New Contact',
        body: `<h2 style="margin:0 0 16px;color:#1a1a2e;">📩 Yeni İletişim Mesajı / New Contact</h2>
{{#site_name}}<p style="margin:0 0 12px;color:#666;font-size:0.9em;">Site: <strong>{{site_name}}</strong></p>{{/site_name}}
<table style="width:100%;border-collapse:collapse;">
  <tr>
    <td style="padding:8px 12px;background:#fff;border:1px solid #eee;font-weight:600;width:100px;">İsim / Name</td>
    <td style="padding:8px 12px;background:#fff;border:1px solid #eee;">{{contact_name}}</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;background:#f8f9fa;border:1px solid #eee;font-weight:600;">E-posta</td>
    <td style="padding:8px 12px;background:#f8f9fa;border:1px solid #eee;">{{contact_email}}</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;background:#fff;border:1px solid #eee;font-weight:600;">Konu / Subject</td>
    <td style="padding:8px 12px;background:#fff;border:1px solid #eee;">{{contact_subject}}</td>
  </tr>
</table>
<div style="margin-top:16px;padding:16px;background:#f8f9fa;border:1px solid #eee;border-radius:4px;">
  <p style="margin:0 0 8px;font-weight:600;color:#555;">Mesaj / Message:</p>
  <p style="margin:0;white-space:pre-wrap;line-height:1.6;">{{contact_message}}</p>
</div>`,
      };

    case 'subscription_active':
      return {
        subject: 'Abonelik Aktif / Subscription Active - {{package_name}}',
        body: `<h2 style="margin:0 0 16px;color:#1a1a2e;">🎉 Abonelik Aktif / Subscription Active</h2>
<p>Merhaba <strong>{{user_name}}</strong>,<br>Aboneliğiniz başarıyla aktifleştirildi!</p>
<p>Hi <strong>{{user_name}}</strong>,<br>Your subscription has been activated!</p>
<table style="width:100%;border-collapse:collapse;">
  <tr>
    <td style="padding:8px 12px;background:#fff;border:1px solid #eee;font-weight:600;width:140px;">Paket / Plan</td>
    <td style="padding:8px 12px;background:#fff;border:1px solid #eee;">{{package_name}}</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;background:#f8f9fa;border:1px solid #eee;font-weight:600;">Dönem / Period</td>
    <td style="padding:8px 12px;background:#f8f9fa;border:1px solid #eee;">{{billing_period}}</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;background:#fff;border:1px solid #eee;font-weight:600;">Ödeme / Payment</td>
    <td style="padding:8px 12px;background:#fff;border:1px solid #eee;">{{payment_method}}</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;background:#f8f9fa;border:1px solid #eee;font-weight:600;">Bitiş / Expires</td>
    <td style="padding:8px 12px;background:#f8f9fa;border:1px solid #eee;">{{period_end}}</td>
  </tr>
</table>
<p style="margin:16px 0 0;font-size:0.85em;color:#999;">Panelden sitenizi yönetmeye hemen başlayabilirsiniz.<br>You can start managing your site from the panel right away.</p>`,
      };

    case 'subscription_expiring':
      return {
        subject: 'Abonelik Sona Eriyor / Subscription Expiring - {{package_name}}',
        body: `<h2 style="margin:0 0 16px;color:#1a1a2e;">⏰ Abonelik Sona Eriyor / Subscription Expiring</h2>
<p>Merhaba <strong>{{user_name}}</strong>,<br>
<strong>{{package_name}}</strong> paketinizin süresi <strong>{{days_left}} gün</strong> sonra ({{period_end}}) sona erecek.</p>
<p>Hi <strong>{{user_name}}</strong>,<br>
Your <strong>{{package_name}}</strong> plan expires in <strong>{{days_left}} day(s)</strong> ({{period_end}}).</p>
<div style="text-align:center;margin:24px 0;">
  <a href="{{renew_url}}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
    Yenile / Renew Now
  </a>
</div>
<p style="font-size:0.85em;color:#999;">Süre dolduğunda siteniz pasife alınacaktır.<br>Your site will be deactivated when expired.</p>`,
      };

    case 'subscription_cancelled':
      return {
        subject: 'Abonelik İptal / Subscription Cancelled - {{package_name}}',
        body: `<h2 style="margin:0 0 16px;color:#1a1a2e;">❌ Abonelik İptal Edildi / Subscription Cancelled</h2>
<p>Merhaba <strong>{{user_name}}</strong>,</p>
<p><strong>{{package_name}}</strong> paketiniz iptal edildi. Mevcut dönem sonuna kadar hizmetiniz devam edecektir.</p>
<p>Hi <strong>{{user_name}}</strong>,</p>
<p>Your <strong>{{package_name}}</strong> plan has been cancelled. Your service will continue until the end of the current period.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr>
    <td style="padding:8px 12px;background:#f8f9fa;border:1px solid #eee;font-weight:600;">Bitiş / Expires</td>
    <td style="padding:8px 12px;background:#f8f9fa;border:1px solid #eee;">{{period_end}}</td>
  </tr>
</table>
<div style="text-align:center;margin:24px 0;">
  <a href="{{renew_url}}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
    Tekrar Abone Ol / Resubscribe
  </a>
</div>`,
      };

    case 'new_post_published':
      return {
        subject: 'Yeni Yazı Yayınlandı: {{post_title}}',
        body: `<h2 style="margin:0 0 16px;color:#1a1a2e;">📝 Yeni Yazı / New Post Published</h2>
<p>Sitenizde yeni bir yazı yayınlandı / A new post has been published on your site:</p>
<div style="padding:16px;background:#f8f9fa;border:1px solid #eee;border-radius:4px;margin:16px 0;">
  <h3 style="margin:0 0 8px;">{{post_title}}</h3>
  <p style="margin:0;color:#666;font-size:0.9em;">{{post_excerpt}}</p>
</div>
<div style="text-align:center;margin:24px 0;">
  <a href="{{post_url}}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
    Yazıyı Gör / View Post
  </a>
</div>`,
      };
  }
}

/**
 * All available email events with metadata
 */
export const EMAIL_EVENTS: {
  type: EmailEventType;
  settingKey: string;
  labelTr: string;
  labelEn: string;
  descTr: string;
  descEn: string;
  accentColor: string;
  variables: string[];
}[] = [
  {
    type: 'welcome',
    settingKey: 'mail_on_user_register',
    labelTr: 'Hoş Geldin E-postası',
    labelEn: 'Welcome Email',
    descTr: 'Yeni kullanıcı kaydolduğunda hoş geldin maili gönder',
    descEn: 'Send welcome email when a new user registers',
    accentColor: '#2563eb',
    variables: ['user_name', 'user_email', 'site_name', 'login_url'],
  },
  {
    type: 'password_reset',
    settingKey: 'mail_on_password_reset',
    labelTr: 'Şifre Sıfırlama',
    labelEn: 'Password Reset',
    descTr: 'Kullanıcı şifre sıfırlama isteğinde e-posta gönder',
    descEn: 'Send email when user requests password reset',
    accentColor: '#dc2626',
    variables: ['user_name', 'user_email', 'reset_url', 'site_name'],
  },
  {
    type: 'new_comment',
    settingKey: 'mail_on_comment',
    labelTr: 'Yeni Yorum',
    labelEn: 'New Comment',
    descTr: 'Yeni yorum yazıldığında yöneticiye bildir',
    descEn: 'Notify admin when a new comment is posted',
    accentColor: '#4a90d9',
    variables: ['author_name', 'author_email', 'comment_content', 'post_title', 'post_url', 'site_name'],
  },
  {
    type: 'new_contact',
    settingKey: 'mail_on_contact',
    labelTr: 'Yeni İletişim Mesajı',
    labelEn: 'New Contact Message',
    descTr: 'İletişim formu gönderildiğinde yöneticiye bildir',
    descEn: 'Notify admin when a contact form is submitted',
    accentColor: '#4a90d9',
    variables: ['contact_name', 'contact_email', 'contact_subject', 'contact_message', 'site_name'],
  },
  {
    type: 'subscription_active',
    settingKey: 'mail_on_subscription_active',
    labelTr: 'Abonelik Aktif',
    labelEn: 'Subscription Active',
    descTr: 'Abonelik aktifleştiğinde kullanıcıya bildir',
    descEn: 'Notify user when subscription is activated',
    accentColor: '#22c55e',
    variables: ['user_name', 'package_name', 'billing_period', 'payment_method', 'period_end'],
  },
  {
    type: 'subscription_expiring',
    settingKey: 'mail_on_subscription_expiring',
    labelTr: 'Abonelik Sona Eriyor',
    labelEn: 'Subscription Expiring',
    descTr: 'Abonelik süresi dolmak üzereyken kullanıcıya hatırlat',
    descEn: 'Remind user when subscription is about to expire',
    accentColor: '#f59e0b',
    variables: ['user_name', 'package_name', 'days_left', 'period_end', 'renew_url'],
  },
  {
    type: 'subscription_cancelled',
    settingKey: 'mail_on_subscription_cancelled',
    labelTr: 'Abonelik İptal',
    labelEn: 'Subscription Cancelled',
    descTr: 'Abonelik iptal edildiğinde kullanıcıya bildir',
    descEn: 'Notify user when subscription is cancelled',
    accentColor: '#ef4444',
    variables: ['user_name', 'package_name', 'period_end', 'renew_url'],
  },
  {
    type: 'new_post_published',
    settingKey: 'mail_on_new_post_published',
    labelTr: 'Yeni Yazı Yayınlandı',
    labelEn: 'New Post Published',
    descTr: 'Yeni bir yazı yayınlandığında site sahibine bildir',
    descEn: 'Notify site owner when a new post is published',
    accentColor: '#8b5cf6',
    variables: ['post_title', 'post_excerpt', 'post_url', 'site_name', 'author_name'],
  },
];

// ─── Send Helpers ────────────────────────────────────────────

interface SendEmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmailViaResend(
  apiKey: string,
  options: SendEmailOptions
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      }),
    });

    if (res.ok) {
      const data = await res.json() as { id: string };
      return { success: true, id: data.id };
    }

    const errorData = await res.text();
    console.error('[Email] Resend API error:', res.status, errorData);
    return { success: false, error: `Resend API error: ${res.status}` };
  } catch (err: any) {
    console.error('[Email] Send failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * High-level: send a templated email for an event.
 * Checks if event is enabled, loads custom or default template, renders, and sends.
 */
export async function sendTemplatedEmail(
  db: D1Database,
  mailSettings: MailSettings,
  event: EmailEventType,
  to: string,
  vars: Record<string, string>,
  options?: { replyTo?: string }
): Promise<{ success: boolean; id?: string; error?: string; skipped?: boolean }> {
  if (!mailSettings.enabled || !mailSettings.apiKey) {
    return { success: false, skipped: true, error: 'Mail disabled or no API key' };
  }

  // Check if this event is enabled
  const eventMeta = EMAIL_EVENTS.find(e => e.type === event);
  if (!eventMeta) return { success: false, error: `Unknown event: ${event}` };

  // Load custom template or use default
  const customTpl = await getCustomTemplate(db, event);
  const tpl = customTpl || getDefaultTemplate(event);

  const subject = renderTemplate(tpl.subject, vars);
  const bodyHtml = renderTemplate(tpl.body, vars);
  const html = wrapInLayout(bodyHtml, eventMeta.accentColor);

  const from = `${mailSettings.fromName || 'Worker CMS'} <${mailSettings.fromAddress}>`;

  return sendEmailViaResend(mailSettings.apiKey, {
    to,
    from,
    subject,
    html,
    replyTo: options?.replyTo,
  });
}

// ─── Legacy Builders (backward compat) ──────────────────────
// These are kept for existing call sites that haven't migrated to sendTemplatedEmail yet.

/**
 * Build notification email HTML for a new contact form submission
 */
export function buildNotificationEmail(data: {
  name: string;
  email: string;
  subject: string | null;
  message: string;
  siteName?: string;
}): string {
  const vars: Record<string, string> = {
    contact_name: escHtml(data.name),
    contact_email: escHtml(data.email),
    contact_subject: escHtml(data.subject || '-'),
    contact_message: escHtml(data.message),
    site_name: data.siteName ? escHtml(data.siteName) : '',
  };
  const tpl = getDefaultTemplate('new_contact');
  return wrapInLayout(renderTemplate(tpl.body, vars), '#4a90d9');
}

/**
 * Build reply email HTML
 */
export function buildReplyEmail(data: {
  originalName: string;
  originalMessage: string;
  replyContent: string;
  siteName?: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:24px;">
    ${data.siteName ? `<p style="margin:0 0 16px;color:#666;font-size:0.9em;">From: <strong>${escHtml(data.siteName)}</strong></p>` : ''}
    <div style="padding:16px;background:#fff;border:1px solid #eee;border-radius:4px;line-height:1.6;">
      <p style="margin:0;white-space:pre-wrap;">${escHtml(data.replyContent)}</p>
    </div>
    <div style="margin-top:20px;padding:12px 16px;background:#f0f0f0;border-left:3px solid #ccc;border-radius:0 4px 4px 0;">
      <p style="margin:0 0 4px;font-size:0.85em;color:#888;">
        ${escHtml(data.originalName)} yazdı / wrote:
      </p>
      <p style="margin:0;font-size:0.9em;color:#666;white-space:pre-wrap;">${escHtml(data.originalMessage)}</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build notification email HTML for a new comment
 */
export function buildCommentNotificationEmail(data: {
  authorName: string;
  authorEmail: string | null;
  content: string;
  postTitle: string;
  postUrl?: string;
  siteName?: string;
}): string {
  const vars: Record<string, string> = {
    author_name: escHtml(data.authorName),
    author_email: data.authorEmail ? `(${escHtml(data.authorEmail)})` : '',
    comment_content: escHtml(data.content),
    post_title: data.postUrl ? `<a href="${escHtml(data.postUrl)}" style="color:#4a90d9;">${escHtml(data.postTitle)}</a>` : escHtml(data.postTitle),
    post_url: data.postUrl || '',
    site_name: data.siteName ? escHtml(data.siteName) : '',
  };
  const tpl = getDefaultTemplate('new_comment');
  return wrapInLayout(renderTemplate(tpl.body, vars), '#4a90d9');
}

/**
 * Build subscription confirmation email
 */
export function buildSubscriptionEmail(data: {
  userName: string;
  packageName: string;
  billingPeriod: string;
  periodEnd: string;
  paymentMethod: string;
}): string {
  const periodLabel = data.billingPeriod === 'yearly' ? 'Yıllık / Yearly' : 'Aylık / Monthly';
  const methodLabel = data.paymentMethod === 'stripe' ? 'Kredi Kartı / Credit Card'
    : data.paymentMethod === 'crypto' ? 'Crypto (USDT/USDC)'
    : 'Manuel / Manual';
  const vars: Record<string, string> = {
    user_name: escHtml(data.userName),
    package_name: escHtml(data.packageName),
    billing_period: periodLabel,
    payment_method: methodLabel,
    period_end: escHtml(data.periodEnd),
  };
  const tpl = getDefaultTemplate('subscription_active');
  return wrapInLayout(renderTemplate(tpl.body, vars), '#22c55e');
}

/**
 * Build subscription expiring soon email
 */
export function buildSubscriptionExpiringEmail(data: {
  userName: string;
  packageName: string;
  daysLeft: number;
  periodEnd: string;
  renewUrl: string;
}): string {
  const vars: Record<string, string> = {
    user_name: escHtml(data.userName),
    package_name: escHtml(data.packageName),
    days_left: String(data.daysLeft),
    period_end: escHtml(data.periodEnd),
    renew_url: escHtml(data.renewUrl),
  };
  const tpl = getDefaultTemplate('subscription_expiring');
  return wrapInLayout(renderTemplate(tpl.body, vars), '#f59e0b');
}

// ─── Utility ─────────────────────────────────────────────────

export function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
