import { Hono } from 'hono';
import type { Bindings, Variables, User } from '../../types';
import { hashPassword, verifyPassword, createAccessToken, createRefreshToken, verifyToken } from '../../lib/auth';
import { generateTOTPSecret, verifyTOTP, generateTOTPUri } from '../../lib/totp';
import { authMiddleware } from '../../middleware/auth';
import { getMailSettings, sendTemplatedEmail } from '../../lib/email';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /api/auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string; totp_code?: string }>();

  if (!body.email || !body.password) {
    return c.json({ success: false, error: 'E-posta ve şifre gerekli' }, 400);
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(body.email.toLowerCase().trim())
    .first<User>();

  if (!user) {
    return c.json({ success: false, error: 'E-posta veya şifre hatalı' }, 401);
  }

  const validPassword = await verifyPassword(body.password, user.password_hash);
  if (!validPassword) {
    return c.json({ success: false, error: 'E-posta veya şifre hatalı' }, 401);
  }

  // Check 2FA if enabled
  if (user.totp_enabled) {
    if (!body.totp_code) {
      return c.json({ success: false, error: '2FA kodu gerekli', requires_2fa: true }, 401);
    }
    if (!user.totp_secret) {
      return c.json({ success: false, error: '2FA yapılandırması bozuk' }, 500);
    }
    const validTotp = await verifyTOTP(user.totp_secret, body.totp_code);
    if (!validTotp) {
      return c.json({ success: false, error: '2FA kodu geçersiz' }, 401);
    }
  }

  // Update last login
  await c.env.DB.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?')
    .bind(user.id)
    .run();

  const accessToken = await createAccessToken(user, c.env.JWT_SECRET);
  const refreshToken = await createRefreshToken(user, c.env.JWT_SECRET);

  // Get user's accessible sites
  let sites;
  if (user.role === 'super_admin') {
    sites = await c.env.DB.prepare('SELECT id, name, slug, status FROM sites WHERE status = ?')
      .bind('active')
      .all();
  } else {
    sites = await c.env.DB.prepare(
      'SELECT s.id, s.name, s.slug, s.status FROM sites s JOIN user_sites us ON s.id = us.site_id WHERE us.user_id = ? AND s.status = ?'
    ).bind(user.id, 'active').all();
  }

  return c.json({
    success: true,
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        language: user.language,
        totp_enabled: !!user.totp_enabled,
        max_sites: user.max_sites ?? 0,
        max_editors: user.max_editors ?? 0,
        max_writers: user.max_writers ?? 0,
        ai_enabled: user.ai_enabled ?? 0,
        ai_use_global: user.ai_use_global ?? 0,
      },
      sites: sites.results,
    },
  });
});

// POST /api/auth/refresh
auth.post('/refresh', async (c) => {
  const body = await c.req.json<{ refresh_token: string }>();

  if (!body.refresh_token) {
    return c.json({ success: false, error: 'Refresh token gerekli' }, 400);
  }

  const payload = await verifyToken(body.refresh_token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ success: false, error: 'Geçersiz veya süresi dolmuş token' }, 401);
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(payload.sub)
    .first<User>();

  if (!user) {
    return c.json({ success: false, error: 'Kullanıcı bulunamadı' }, 401);
  }

  const accessToken = await createAccessToken(user, c.env.JWT_SECRET);
  const refreshToken = await createRefreshToken(user, c.env.JWT_SECRET);

  return c.json({
    success: true,
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
});

// POST /api/auth/logout (client-side token removal, server-side optional blacklisting)
auth.post('/logout', async (c) => {
  return c.json({ success: true });
});

// POST /api/auth/setup - Initial setup (create first super admin)
auth.post('/setup', async (c) => {
  // Check if setup is already complete
  const setupDone = await c.env.DB.prepare('SELECT value FROM global_settings WHERE key = ?')
    .bind('setup_complete')
    .first<{ value: string }>();

  if (setupDone?.value === '1') {
    return c.json({ success: false, error: 'Kurulum zaten tamamlanmış' }, 400);
  }

  const body = await c.req.json<{ email: string; password: string; display_name: string }>();

  if (!body.email || !body.password || !body.display_name) {
    return c.json({ success: false, error: 'E-posta, şifre ve isim gerekli' }, 400);
  }

  if (body.password.length < 8) {
    return c.json({ success: false, error: 'Şifre en az 8 karakter olmalı' }, 400);
  }

  const passwordHash = await hashPassword(body.password);

  // Update or insert super admin
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE role = ?').bind('super_admin').first();

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE users SET email = ?, password_hash = ?, display_name = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(body.email.toLowerCase().trim(), passwordHash, body.display_name, existing.id).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
    ).bind(body.email.toLowerCase().trim(), passwordHash, body.display_name, 'super_admin').run();
  }

  // Mark setup as complete
  await c.env.DB.prepare('UPDATE global_settings SET value = ? WHERE key = ?')
    .bind('1', 'setup_complete')
    .run();

  return c.json({ success: true, data: { message: 'Kurulum tamamlandı' } });
});

// POST /api/auth/impersonate/:userId - Login as another user
auth.post('/impersonate/:userId', authMiddleware, async (c) => {
  const currentUser = c.get('user')!;

  // Only super_admin and admin can impersonate
  if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
    return c.json({ success: false, error: 'Bu işlem için yetkiniz yok' }, 403);
  }

  const targetUserId = parseInt(c.req.param('userId'));
  if (isNaN(targetUserId)) {
    return c.json({ success: false, error: 'Geçersiz kullanıcı ID' }, 400);
  }

  // Cannot impersonate yourself
  if (targetUserId === currentUser.sub) {
    return c.json({ success: false, error: 'Kendinize geçiş yapamazsınız' }, 400);
  }

  const targetUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(targetUserId)
    .first<User>();

  if (!targetUser) {
    return c.json({ success: false, error: 'Kullanıcı bulunamadı' }, 404);
  }

  // Admin cannot impersonate super_admin or other admins
  if (currentUser.role === 'admin' && (targetUser.role === 'super_admin' || targetUser.role === 'admin')) {
    return c.json({ success: false, error: 'Bu kullanıcıya geçiş yapamazsınız' }, 403);
  }

  const accessToken = await createAccessToken(targetUser, c.env.JWT_SECRET);
  const refreshToken = await createRefreshToken(targetUser, c.env.JWT_SECRET);

  // Get target user's accessible sites
  let sites;
  if (targetUser.role === 'super_admin') {
    sites = await c.env.DB.prepare('SELECT id, name, slug, status FROM sites WHERE status = ?')
      .bind('active')
      .all();
  } else {
    sites = await c.env.DB.prepare(
      'SELECT s.id, s.name, s.slug, s.status FROM sites s JOIN user_sites us ON s.id = us.site_id WHERE us.user_id = ? AND s.status = ?'
    ).bind(targetUser.id, 'active').all();
  }

  return c.json({
    success: true,
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        display_name: targetUser.display_name,
        role: targetUser.role,
        language: targetUser.language,
        totp_enabled: !!targetUser.totp_enabled,
        max_sites: targetUser.max_sites ?? 0,
        max_editors: targetUser.max_editors ?? 0,
        max_writers: targetUser.max_writers ?? 0,
        ai_enabled: targetUser.ai_enabled ?? 0,
        ai_use_global: targetUser.ai_use_global ?? 0,
      },
      sites: sites.results,
    },
  });
});

// ---- Registration ----

// Plan limits
const PLAN_LIMITS: Record<string, { max_sites: number; max_editors: number; max_writers: number; ai_enabled: number }> = {
  starter:    { max_sites: 1,  max_editors: 1,  max_writers: 2,  ai_enabled: 0 },
  pro:        { max_sites: 10, max_editors: 5,  max_writers: 20, ai_enabled: 1 },
  enterprise: { max_sites: 999, max_editors: 999, max_writers: 999, ai_enabled: 1 },
};

// POST /api/auth/register — public
auth.post('/register', async (c) => {
  const body = await c.req.json<{
    email: string; password: string; display_name: string; plan?: string;
  }>();

  if (!body.email || !body.password || !body.display_name) {
    return c.json({ success: false, error: 'E-posta, şifre ve isim gerekli' }, 400);
  }
  if (body.password.length < 8) {
    return c.json({ success: false, error: 'Şifre en az 8 karakter olmalı' }, 400);
  }

  const email = body.email.toLowerCase().trim();
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return c.json({ success: false, error: 'Bu e-posta zaten kayıtlı' }, 409);
  }

  const plan = (body.plan && PLAN_LIMITS[body.plan]) ? body.plan : 'starter';
  const limits = PLAN_LIMITS[plan];
  const passwordHash = await hashPassword(body.password);

  const result = await c.env.DB.prepare(
    `INSERT INTO users (email, password_hash, display_name, role, max_sites, max_editors, max_writers, ai_enabled)
     VALUES (?, ?, ?, 'admin', ?, ?, ?, ?)`
  ).bind(email, passwordHash, body.display_name, limits.max_sites, limits.max_editors, limits.max_writers, limits.ai_enabled).run();

  const userId = result.meta?.last_row_id;

  // Site creation is handled by Domain Setup wizard after registration

  // Send welcome email (non-blocking)
  try {
    const mailSettings = await getMailSettings(c.env.DB, c.env.RESEND_API_KEY);
    if (mailSettings.enabled && mailSettings.onUserRegister && mailSettings.apiKey) {
      const adminDomain = c.env.ADMIN_DOMAIN || 'workercms.com';
      c.executionCtx.waitUntil(
        sendTemplatedEmail(c.env.DB, mailSettings, 'welcome', email, {
          user_name: body.display_name,
          user_email: email,
          site_name: 'Worker CMS',
          login_url: `https://${adminDomain}/admin/login`,
        })
      );
    }
  } catch (e) {
    console.error('[Auth] Welcome email error:', e);
  }

  // Auto-login
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<User>();
  if (!user) return c.json({ success: false, error: 'Kayıt başarısız' }, 500);

  const accessToken = await createAccessToken(user, c.env.JWT_SECRET);
  const refreshToken = await createRefreshToken(user, c.env.JWT_SECRET);

  const sites = await c.env.DB.prepare(
    'SELECT s.id, s.name, s.slug, s.status FROM sites s JOIN user_sites us ON s.id = us.site_id WHERE us.user_id = ? AND s.status = ?'
  ).bind(user.id, 'active').all();

  return c.json({
    success: true,
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id, email: user.email, display_name: user.display_name,
        role: user.role, language: user.language, totp_enabled: false,
        max_sites: user.max_sites ?? 0, max_editors: user.max_editors ?? 0,
        max_writers: user.max_writers ?? 0, ai_enabled: user.ai_enabled ?? 0,
        ai_use_global: user.ai_use_global ?? 0,
      },
      sites: sites.results,
    },
  });
});

// ---- OAuth helpers ----

async function findOrCreateOAuthUser(
  env: Bindings,
  provider: string,
  providerUserId: string,
  email: string,
  displayName: string,
  avatarUrl?: string
): Promise<User> {
  // 1. Check if user exists by email
  let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email.toLowerCase().trim()).first<User>();

  if (!user) {
    // Create new user with starter plan
    const limits = PLAN_LIMITS.starter;
    await env.DB.prepare(
      `INSERT INTO users (email, password_hash, display_name, role, avatar_url, max_sites, max_editors, max_writers, ai_enabled)
       VALUES (?, ?, ?, 'admin', ?, ?, ?, ?, ?)`
    ).bind(
      email.toLowerCase().trim(),
      `oauth_${provider}_${providerUserId}`, // placeholder hash, can't login with password
      displayName || email.split('@')[0],
      avatarUrl || '',
      limits.max_sites, limits.max_editors, limits.max_writers, limits.ai_enabled
    ).run();

    user = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
      .bind(email.toLowerCase().trim()).first<User>();

    // Site creation is handled by Domain Setup wizard after registration
  } else {
    // Update avatar if missing
    if (avatarUrl && !user.avatar_url) {
      await env.DB.prepare('UPDATE users SET avatar_url = ? WHERE id = ?')
        .bind(avatarUrl, user.id).run();
    }
  }

  // Update last login
  if (user) {
    await env.DB.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?")
      .bind(user.id).run();
  }

  return user!;
}

// Helper: get OAuth credentials from DB (global_settings) or fall back to env vars
async function getOAuthCreds(env: Bindings, provider: 'google' | 'github') {
  const idKey = `${provider}_client_id`;
  const secretKey = `${provider}_client_secret`;

  const rows = await env.DB.prepare(
    "SELECT key, value FROM global_settings WHERE key IN (?, ?)"
  ).bind(idKey, secretKey).all<{ key: string; value: string }>();

  const map: Record<string, string> = {};
  for (const r of rows.results || []) {
    if (r.value) map[r.key] = r.value;
  }

  const clientId = map[idKey] || (provider === 'google' ? env.GOOGLE_CLIENT_ID : env.GITHUB_CLIENT_ID) || '';
  const clientSecret = map[secretKey] || (provider === 'google' ? env.GOOGLE_CLIENT_SECRET : env.GITHUB_CLIENT_SECRET) || '';
  return { clientId, clientSecret };
}

// ---- Google OAuth ----

// GET /api/auth/google — redirect to Google
auth.get('/google', async (c) => {
  const { clientId } = await getOAuthCreds(c.env, 'google');
  if (!clientId) return c.json({ success: false, error: 'Google OAuth yapılandırılmamış' }, 500);

  const adminDomain = c.env.ADMIN_DOMAIN || c.req.header('host') || '';
  const protocol = adminDomain.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${adminDomain}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /api/auth/google/callback
auth.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.json({ success: false, error: 'Authorization code eksik' }, 400);

  const { clientId, clientSecret } = await getOAuthCreds(c.env, 'google');
  const adminDomain = c.env.ADMIN_DOMAIN || c.req.header('host') || '';
  const protocol = adminDomain.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${adminDomain}/api/auth/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return c.json({ success: false, error: 'Google token alınamadı' }, 400);
  }

  const tokenData = await tokenRes.json<{ access_token: string }>();

  // Get user info
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userInfoRes.ok) {
    return c.json({ success: false, error: 'Google kullanıcı bilgisi alınamadı' }, 400);
  }

  const googleUser = await userInfoRes.json<{ id: string; email: string; name: string; picture?: string }>();

  const user = await findOrCreateOAuthUser(c.env, 'google', googleUser.id, googleUser.email, googleUser.name, googleUser.picture);

  const accessToken = await createAccessToken(user, c.env.JWT_SECRET);
  const refreshToken = await createRefreshToken(user, c.env.JWT_SECRET);

  // Redirect to SPA with tokens in hash
  return c.redirect(`${protocol}://${adminDomain}/admin/oauth-callback?access_token=${accessToken}&refresh_token=${refreshToken}`);
});

// ---- GitHub OAuth ----

// GET /api/auth/github — redirect to GitHub
auth.get('/github', async (c) => {
  const { clientId } = await getOAuthCreds(c.env, 'github');
  if (!clientId) return c.json({ success: false, error: 'GitHub OAuth yapılandırılmamış' }, 500);

  const adminDomain = c.env.ADMIN_DOMAIN || c.req.header('host') || '';
  const protocol = adminDomain.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${adminDomain}/api/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'user:email',
  });

  return c.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// GET /api/auth/github/callback
auth.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.json({ success: false, error: 'Authorization code eksik' }, 400);

  const { clientId, clientSecret } = await getOAuthCreds(c.env, 'github');
  const adminDomain = c.env.ADMIN_DOMAIN || c.req.header('host') || '';
  const protocol = adminDomain.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${adminDomain}/api/auth/github/callback`;

  // Exchange code for token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json<{ access_token?: string; error?: string }>();
  if (!tokenData.access_token) {
    return c.json({ success: false, error: tokenData.error || 'GitHub token alınamadı' }, 400);
  }

  // Get user info
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'WP-CMS' },
  });
  const ghUser = await userRes.json<{ id: number; login: string; name?: string; avatar_url?: string; email?: string }>();

  // If email not public, fetch from emails API
  let email = ghUser.email;
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'WP-CMS' },
    });
    const emails = await emailsRes.json<Array<{ email: string; primary: boolean; verified: boolean }>>();
    const primary = emails.find((e) => e.primary && e.verified);
    email = primary?.email || emails[0]?.email;
  }

  if (!email) {
    return c.json({ success: false, error: 'GitHub hesabında e-posta bulunamadı' }, 400);
  }

  const user = await findOrCreateOAuthUser(c.env, 'github', String(ghUser.id), email, ghUser.name || ghUser.login, ghUser.avatar_url);

  const accessToken = await createAccessToken(user, c.env.JWT_SECRET);
  const refreshToken = await createRefreshToken(user, c.env.JWT_SECRET);

  return c.redirect(`${protocol}://${adminDomain}/admin/oauth-callback?access_token=${accessToken}&refresh_token=${refreshToken}`);
});

// ---- 2FA Endpoints ----

// POST /api/auth/2fa/setup - Generate TOTP secret
auth.post('/2fa/setup', authMiddleware, async (c) => {
  const user = c.get('user')!;

  const secret = generateTOTPSecret();
  const userRecord = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?')
    .bind(user.sub).first<{ email: string }>();

  if (!userRecord) {
    return c.json({ success: false, error: 'Kullanıcı bulunamadı' }, 404);
  }

  const uri = generateTOTPUri(secret, userRecord.email);

  return c.json({
    success: true,
    data: { secret, uri },
  });
});

// POST /api/auth/2fa/verify - Verify code and enable 2FA
auth.post('/2fa/verify', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{ code: string; secret: string }>();

  if (!body.code || !body.secret) {
    return c.json({ success: false, error: 'Kod ve secret gerekli' }, 400);
  }

  const valid = await verifyTOTP(body.secret, body.code);
  if (!valid) {
    return c.json({ success: false, error: '2FA kodu geçersiz, tekrar deneyin' }, 400);
  }

  // Save secret and enable 2FA
  await c.env.DB.prepare('UPDATE users SET totp_secret = ?, totp_enabled = 1, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(body.secret, user.sub).run();

  return c.json({ success: true, data: { message: '2FA etkinleştirildi' } });
});

// POST /api/auth/2fa/disable - Disable 2FA (requires password)
auth.post('/2fa/disable', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{ password: string }>();

  if (!body.password) {
    return c.json({ success: false, error: 'Şifre gerekli' }, 400);
  }

  const userRecord = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
    .bind(user.sub).first<{ password_hash: string }>();

  if (!userRecord) {
    return c.json({ success: false, error: 'Kullanıcı bulunamadı' }, 404);
  }

  const validPassword = await verifyPassword(body.password, userRecord.password_hash);
  if (!validPassword) {
    return c.json({ success: false, error: 'Şifre hatalı' }, 401);
  }

  // Clear secret and disable 2FA
  await c.env.DB.prepare('UPDATE users SET totp_secret = NULL, totp_enabled = 0, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(user.sub).run();

  return c.json({ success: true, data: { message: '2FA devre dışı bırakıldı' } });
});

// ---- Password Reset ----

// POST /api/auth/forgot-password — request password reset email (public)
auth.post('/forgot-password', async (c) => {
  const body = await c.req.json<{ email: string }>();
  if (!body.email) return c.json({ success: false, error: 'E-posta gerekli' }, 400);

  const email = body.email.toLowerCase().trim();
  const user = await c.env.DB.prepare('SELECT id, email, display_name FROM users WHERE email = ?')
    .bind(email).first<{ id: number; email: string; display_name: string }>();

  // Always return success to prevent email enumeration
  if (!user) return c.json({ success: true, message: 'Eğer bu e-posta kayıtlıysa sıfırlama bağlantısı gönderildi' });

  // Generate reset token (random hex, 64 chars)
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Store token with 1-hour expiry
  const expiresAt = new Date(Date.now() + 3600000).toISOString();
  await c.env.DB.prepare(
    `INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`
  ).bind(`pwd_reset_${token}`, JSON.stringify({ userId: user.id, expiresAt }), JSON.stringify({ userId: user.id, expiresAt })).run();

  // Send email
  try {
    const mailSettings = await getMailSettings(c.env.DB, c.env.RESEND_API_KEY);
    if (mailSettings.enabled && mailSettings.onPasswordReset && mailSettings.apiKey) {
      const adminDomain = c.env.ADMIN_DOMAIN || 'workercms.com';
      await sendTemplatedEmail(c.env.DB, mailSettings, 'password_reset', user.email, {
        user_name: user.display_name,
        user_email: user.email,
        reset_url: `https://${adminDomain}/admin/reset-password?token=${token}`,
        site_name: 'Worker CMS',
      });
    }
  } catch (e) {
    console.error('[Auth] Password reset email error:', e);
  }

  return c.json({ success: true, message: 'Eğer bu e-posta kayıtlıysa sıfırlama bağlantısı gönderildi' });
});

// POST /api/auth/reset-password — reset password with token (public)
auth.post('/reset-password', async (c) => {
  const body = await c.req.json<{ token: string; password: string }>();
  if (!body.token || !body.password) return c.json({ success: false, error: 'Token ve yeni şifre gerekli' }, 400);
  if (body.password.length < 8) return c.json({ success: false, error: 'Şifre en az 8 karakter olmalı' }, 400);

  // Look up token
  const row = await c.env.DB.prepare('SELECT value FROM global_settings WHERE key = ?')
    .bind(`pwd_reset_${body.token}`).first<{ value: string }>();

  if (!row) return c.json({ success: false, error: 'Geçersiz veya süresi dolmuş bağlantı' }, 400);

  let data: { userId: number; expiresAt: string };
  try {
    data = JSON.parse(row.value);
  } catch {
    return c.json({ success: false, error: 'Geçersiz token' }, 400);
  }

  if (new Date(data.expiresAt) < new Date()) {
    // Clean up expired token
    await c.env.DB.prepare('DELETE FROM global_settings WHERE key = ?').bind(`pwd_reset_${body.token}`).run();
    return c.json({ success: false, error: 'Bu bağlantının süresi dolmuş' }, 400);
  }

  // Update password
  const passwordHash = await hashPassword(body.password);
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(passwordHash, data.userId).run();

  // Delete used token
  await c.env.DB.prepare('DELETE FROM global_settings WHERE key = ?').bind(`pwd_reset_${body.token}`).run();

  return c.json({ success: true, message: 'Şifreniz başarıyla değiştirildi' });
});

export default auth;
