import { Hono } from 'hono';
import type { Bindings, Variables, Comment } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { sanitizeHtml } from '../../lib/sanitize';
import { parsePagination, paginate, countRows, buildMeta } from '../../lib/db';
import { pluginEngine } from '../../lib/plugins/engine';
import { verifyRecaptcha, getRecaptchaSettings } from '../../lib/recaptcha';
import { getMailSettings, sendEmailViaResend, buildCommentNotificationEmail } from '../../lib/email';

const comments = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ──────────────────────────────────────────────────
// PUBLIC: POST /api/comments/submit — Submit comment (no auth)
// ──────────────────────────────────────────────────
comments.post('/submit', async (c) => {
  const siteId = c.get('siteId');
  if (!siteId) {
    return c.json({ success: false, error: 'Site not found' }, 400);
  }

  let body: {
    post_id?: number;
    author_name?: string;
    author_email?: string;
    author_url?: string;
    content?: string;
    parent_id?: number;
    recaptcha_token?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON' }, 400);
  }

  const postId = body.post_id;
  const authorName = body.author_name?.trim();
  const authorEmail = body.author_email?.trim();
  const content = body.content?.trim();

  if (!postId || !authorName || !content) {
    return c.json({ success: false, error: 'Post ID, name and comment are required' }, 400);
  }

  if (authorEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authorEmail)) {
      return c.json({ success: false, error: 'Invalid email address' }, 400);
    }
  }

  // Check if post exists and comments are open
  const post = await c.env.DB.prepare(
    'SELECT id, comment_status, site_id FROM posts WHERE id = ? AND site_id = ? AND status = ?'
  ).bind(postId, siteId, 'publish').first<{ id: number; comment_status: string; site_id: number }>();

  if (!post) {
    return c.json({ success: false, error: 'Post not found' }, 404);
  }

  // Check site-wide comment setting
  const siteCommentSetting = await c.env.DB.prepare(
    "SELECT value FROM settings WHERE site_id = ? AND key = 'comments_enabled'"
  ).bind(siteId).first<{ value: string }>();

  if (siteCommentSetting?.value === 'false') {
    return c.json({ success: false, error: 'Comments are disabled on this site' }, 403);
  }

  if (post.comment_status !== 'open') {
    return c.json({ success: false, error: 'Comments are closed for this post' }, 403);
  }

  // reCAPTCHA v3 verification
  const recaptcha = await getRecaptchaSettings(c.env.DB, siteId);
  if (recaptcha.enabled && recaptcha.onComments && recaptcha.secretKey) {
    const token = body.recaptcha_token;
    if (!token) {
      return c.json({ success: false, error: 'reCAPTCHA token is required' }, 400);
    }
    const result = await verifyRecaptcha(recaptcha.secretKey, token, recaptcha.scoreThreshold);
    if (!result.success) {
      return c.json({ success: false, error: 'reCAPTCHA verification failed' }, 403);
    }
  }

  // Check if moderation is required
  const moderationSetting = await c.env.DB.prepare(
    "SELECT value FROM settings WHERE site_id = ? AND key = 'comment_moderation'"
  ).bind(siteId).first<{ value: string }>();

  const requireModeration = moderationSetting?.value !== 'false'; // default: moderation on
  const commentStatus = requireModeration ? 'pending' : 'approved';

  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null;

  // Sanitize content (strip HTML from user comments)
  const safeContent = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const result = await c.env.DB.prepare(
    `INSERT INTO comments (post_id, parent_id, author_name, author_email, author_url, author_ip, content, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    postId,
    body.parent_id || null,
    authorName,
    authorEmail || null,
    body.author_url?.trim() || null,
    ip,
    safeContent,
    commentStatus
  ).first<{ id: number }>();

  // Send comment notification email (fire and forget)
  c.executionCtx.waitUntil((async () => {
    try {
      const mailSettings = await getMailSettings(c.env.DB, c.env.RESEND_API_KEY);
      if (!mailSettings.enabled || !mailSettings.onComment || !mailSettings.apiKey || !mailSettings.adminEmail) return;

      // Get post title for the notification
      const postInfo = await c.env.DB.prepare(
        'SELECT title, slug FROM posts WHERE id = ?'
      ).bind(postId).first<{ title: string; slug: string }>();

      const site = await c.env.DB.prepare('SELECT name FROM sites WHERE id = ?')
        .bind(siteId).first<{ name: string }>();

      const fromDisplay = mailSettings.fromName
        ? `${mailSettings.fromName} <${mailSettings.fromAddress}>`
        : mailSettings.fromAddress;

      const html = buildCommentNotificationEmail({
        authorName: authorName!,
        authorEmail: authorEmail || null,
        content: safeContent,
        postTitle: postInfo?.title || `Post #${postId}`,
        siteName: site?.name,
      });

      await sendEmailViaResend(mailSettings.apiKey, {
        to: mailSettings.adminEmail,
        from: fromDisplay,
        subject: `💬 Yeni Yorum: ${postInfo?.title || `Post #${postId}`}`,
        html,
      });
    } catch (err: any) {
      console.error('[Comments] Email notification failed:', err.message);
    }
  })());

  return c.json({
    success: true,
    data: {
      id: result?.id,
      status: commentStatus,
      message: requireModeration
        ? 'Yorumunuz onay bekliyor'
        : 'Yorumunuz yayınlandı',
    },
  });
});

// ──────────────────────────────────────────────────
// ADMIN: All below require auth
// ──────────────────────────────────────────────────
comments.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// GET /api/comments
comments.get('/', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const url = new URL(c.req.url);
  const pagination = parsePagination(url);
  const { limit, offset } = paginate(pagination);
  const status = url.searchParams.get('status');
  const postId = url.searchParams.get('post_id');

  let where = 'c.post_id IN (SELECT id FROM posts WHERE site_id = ?)';
  const params: unknown[] = [siteId];

  if (status) {
    where += ' AND c.status = ?';
    params.push(status);
  }
  if (postId) {
    where += ' AND c.post_id = ?';
    params.push(parseInt(postId));
  }

  const total = await countRows(c.env.DB, 'comments c', where, params);

  const result = await c.env.DB.prepare(
    `SELECT c.*, p.title as post_title FROM comments c LEFT JOIN posts p ON c.post_id = p.id WHERE ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return c.json({ success: true, data: result.results, meta: buildMeta(total, pagination) });
});

// PUT /api/comments/:id - Update status (approve/reject/spam)
comments.put('/:id', requireRole('editor', 'admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ status: string }>();

  if (!['approved', 'pending', 'spam', 'trash'].includes(body.status)) {
    return c.json({ success: false, error: 'Geçersiz durum' }, 400);
  }

  const result = await c.env.DB.prepare(
    'UPDATE comments SET status = ? WHERE id = ? RETURNING *'
  ).bind(body.status, id).first();

  if (!result) {
    return c.json({ success: false, error: 'Yorum bulunamadı' }, 404);
  }

  // Run comment.afterSave action
  await pluginEngine.executeAction('comment.afterSave', result as unknown as Comment);

  return c.json({ success: true, data: result });
});

// DELETE /api/comments/:id
comments.delete('/:id', requireRole('editor', 'admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
  return c.json({ success: true, data: { message: 'Yorum silindi' } });
});

export default comments;
