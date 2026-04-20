import type { Context, Next } from 'hono';
import type { Bindings, Variables } from '../types';
import { loadActiveTheme } from '../lib/themes/engine';
import { loadActiveDesign } from '../lib/themes/design';

export async function themeResolverMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  // Only resolve for public routes (not /api/*, not /admin/*)
  const path = c.req.path;
  if (path.startsWith('/api/') || path.startsWith('/admin')) {
    return next();
  }

  const siteId = c.get('siteId');
  if (!siteId) {
    return next();
  }

  const db = c.env.DB;

  try {
    const activeTheme = await loadActiveTheme(db, siteId);
    if (activeTheme) {
      c.set('activeTheme', activeTheme);
    }
  } catch (e) {
    // Don't break the request if theme loading fails
    console.error('Theme resolver error:', e);
  }

  try {
    const activeDesign = await loadActiveDesign(db, siteId);
    c.set('activeDesign', activeDesign);
  } catch (e) {
    console.error('Design resolver error:', e);
  }

  return next();
}
