import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';

const git = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /git/:idOrSlug - Resolve short URL and redirect
git.get('/:idOrSlug', async (c) => {
  const idOrSlug = c.req.param('idOrSlug');

  let shortUrl: { id: number; target_url: string } | null = null;

  // Try numeric ID first
  const numId = parseInt(idOrSlug);
  if (!isNaN(numId)) {
    shortUrl = await c.env.DB.prepare(
      'SELECT id, target_url FROM short_urls WHERE id = ?'
    ).bind(numId).first();
  }

  // If not found by ID, try slug
  if (!shortUrl) {
    shortUrl = await c.env.DB.prepare(
      'SELECT id, target_url FROM short_urls WHERE slug = ?'
    ).bind(idOrSlug).first();
  }

  if (!shortUrl) {
    return c.text('404 Not Found', 404);
  }

  // Increment click count (fire and forget)
  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      'UPDATE short_urls SET click_count = click_count + 1 WHERE id = ?'
    ).bind(shortUrl.id).run().catch(() => {})
  );

  return c.redirect(shortUrl.target_url, 302);
});

export default git;
