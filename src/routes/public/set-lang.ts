import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import type { Bindings, Variables } from '../../types';

/**
 * Language selection route — `GET /set-lang/:lang?next=<path>`.
 *
 * Persists the visitor's manual language choice in the `cms_lang`
 * cookie, then 302-redirects back to where they came from. The i18n
 * middleware (src/middleware/i18n.ts) reads this cookie at priority 3,
 * above `Accept-Language`, so once a visitor clicks a flag their choice
 * sticks across the whole site and overrides the browser language.
 *
 * No JavaScript is involved — the flags are plain links, so the switch
 * works without hydration and never triggers a React mismatch.
 */

const SUPPORTED = new Set(['tr', 'en']);

// One year — long enough that a returning visitor keeps their choice.
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Only allow same-origin absolute paths as the redirect target so the
 * `next` param can't be abused as an open redirect. Anything that isn't
 * a single-slash-prefixed path (rejecting `//evil.com` and absolute
 * URLs) falls back to the site root.
 */
function safeNext(next: string | undefined): string {
  if (!next) return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}

const setLangRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

setLangRoute.get('/:lang', (c) => {
  const lang = c.req.param('lang');
  const next = safeNext(c.req.query('next'));

  if (!SUPPORTED.has(lang)) {
    // Unknown language — don't set anything, just bounce home.
    return c.redirect(next, 302);
  }

  setCookie(c, 'cms_lang', lang, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'Lax',
    httpOnly: false,
  });

  return c.redirect(next, 302);
});

export default setLangRoute;
