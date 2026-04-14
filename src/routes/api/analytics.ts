import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';

const analytics = new Hono<{ Bindings: Bindings; Variables: Variables }>();

analytics.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// GET /api/analytics/overview
analytics.get('/overview', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;

  const [totalViews, todayViews, totalPosts, totalPages, totalComments, totalMedia] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM page_views WHERE site_id = ?').bind(siteId).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM page_views WHERE site_id = ? AND viewed_at >= date('now')").bind(siteId).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM posts WHERE site_id = ? AND post_type = 'post' AND status = 'publish'").bind(siteId).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM posts WHERE site_id = ? AND post_type = 'page' AND status = 'publish'").bind(siteId).first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id IN (SELECT id FROM posts WHERE site_id = ?)').bind(siteId).first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM media WHERE site_id = ?').bind(siteId).first<{ count: number }>(),
  ]);

  return c.json({
    success: true,
    data: {
      total_views: totalViews?.count || 0,
      today_views: todayViews?.count || 0,
      total_posts: totalPosts?.count || 0,
      total_pages: totalPages?.count || 0,
      total_comments: totalComments?.count || 0,
      total_media: totalMedia?.count || 0,
    },
  });
});

// GET /api/analytics/views?days=30
analytics.get('/views', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const days = parseInt(c.req.query('days') || '30');

  const result = await c.env.DB.prepare(
    `SELECT date(viewed_at) as date, COUNT(*) as views
     FROM page_views
     WHERE site_id = ? AND viewed_at >= date('now', '-${days} days')
     GROUP BY date(viewed_at)
     ORDER BY date ASC`
  ).bind(siteId).all();

  return c.json({ success: true, data: result.results });
});

// GET /api/analytics/popular
analytics.get('/popular', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const days = parseInt(c.req.query('days') || '30');

  // Group by path (tracking doesn't always set post_id)
  const result = await c.env.DB.prepare(
    `SELECT path, COUNT(*) as views
     FROM page_views
     WHERE site_id = ? AND viewed_at >= date('now', '-${days} days')
       AND path != '/'
     GROUP BY path
     ORDER BY views DESC
     LIMIT 20`
  ).bind(siteId).all();

  const items = result.results as { path: string; views: number }[];

  // Extract unique slugs from paths to match with posts
  const slugSet = new Set<string>();
  for (const item of items) {
    const segments = item.path.split('/').filter(Boolean);
    const lastSeg = segments[segments.length - 1];
    if (lastSeg && !['search', 'feed', 'sitemap.xml'].includes(lastSeg)) {
      slugSet.add(lastSeg);
    }
  }

  // Batch fetch matching posts by slug
  const postMap = new Map<string, { id: number; title: string; slug: string }>();
  if (slugSet.size > 0) {
    const slugArr = Array.from(slugSet);
    const placeholders = slugArr.map(() => '?').join(',');
    const postsResult = await c.env.DB.prepare(
      `SELECT id, title, slug FROM posts WHERE site_id = ? AND slug IN (${placeholders}) AND status = 'publish'`
    ).bind(siteId, ...slugArr).all();
    for (const p of postsResult.results as any[]) {
      postMap.set(p.slug, p);
    }
  }

  // Enrich results with post titles where available
  const enriched = items.map((item) => {
    const segments = item.path.split('/').filter(Boolean);
    const lastSeg = segments[segments.length - 1];
    const post = lastSeg ? postMap.get(lastSeg) : undefined;
    return {
      path: item.path,
      views: item.views,
      id: post?.id || null,
      title: post?.title || null,
      slug: post?.slug || lastSeg || item.path,
    };
  });

  return c.json({ success: true, data: enriched });
});

// GET /api/analytics/referrers
analytics.get('/referrers', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const days = parseInt(c.req.query('days') || '30');

  const result = await c.env.DB.prepare(
    `SELECT referrer, COUNT(*) as count
     FROM page_views
     WHERE site_id = ? AND referrer IS NOT NULL AND referrer != ''
     AND viewed_at >= date('now', '-${days} days')
     GROUP BY referrer
     ORDER BY count DESC
     LIMIT 20`
  ).bind(siteId).all();

  return c.json({ success: true, data: result.results });
});

export default analytics;
