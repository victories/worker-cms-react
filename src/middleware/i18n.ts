import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables } from '../types';

const SUPPORTED_LANGUAGES = ['tr', 'en'];
// Global product default. Turkish visitors are detected via Accept-Language
// (priority 4) before this fallback applies; tenant sites override it with
// their own `site.default_language` (priority 5). For the management site
// (workercms.com), which sells globally, English is the safe default when a
// client advertises no recognisable language preference.
const DEFAULT_LANGUAGE = 'en';

export const i18nMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  // Priority: URL path > query param > cookie > Accept-Language header > site default > global default
  const url = new URL(c.req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  let lang: string | null = null;

  // 1. Check URL path (e.g., /en/posts/...)
  if (pathParts[0] && SUPPORTED_LANGUAGES.includes(pathParts[0])) {
    lang = pathParts[0];
  }

  // 2. Check query param
  if (!lang) {
    const queryLang = url.searchParams.get('lang');
    if (queryLang && SUPPORTED_LANGUAGES.includes(queryLang)) {
      lang = queryLang;
    }
  }

  // 3. Check cookie
  if (!lang) {
    const cookie = c.req.header('cookie');
    if (cookie) {
      const match = cookie.match(/cms_lang=([a-z]{2})/);
      if (match && SUPPORTED_LANGUAGES.includes(match[1])) {
        lang = match[1];
      }
    }
  }

  // 4. Check Accept-Language header
  if (!lang) {
    const acceptLang = c.req.header('Accept-Language');
    if (acceptLang) {
      for (const supported of SUPPORTED_LANGUAGES) {
        if (acceptLang.toLowerCase().includes(supported)) {
          lang = supported;
          break;
        }
      }
    }
  }

  // 5. Site default
  if (!lang) {
    const site = c.get('site');
    if (site) {
      lang = site.default_language;
    }
  }

  // 6. Global default
  c.set('lang', lang || DEFAULT_LANGUAGE);
  await next();
});
