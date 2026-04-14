import { registerShortcode } from '../registry';
import { fetchHeaderAdEmbed, splitEmbedForAMP } from '../../public-db';

/**
 * [reklam-kodu domain="example.com"]
 * [ad-embed domain="example.com"]
 *
 * Fetches the aurora embed for the given domain and renders it inline.
 * Works in both desktop and AMP contexts:
 *   - Desktop: renders full HTML including styles and scripts
 *   - AMP: convertToAMP() in amp routes strips scripts, converts <img> to <amp-img>
 *
 * When no domain is given, falls back to site's header_ad_domain setting.
 */

async function resolveAndRender(params: Record<string, string>, ctx: any): Promise<string> {
  // Strip any HTML tags that editors may have injected into the domain param
  const rawDomain = params.domain || params.alan || '';
  const domain = rawDomain.replace(/<[^>]*>/g, '').trim();

  let resolvedDomain = domain;
  if (!resolvedDomain) {
    // Fallback: use site's header_ad_domain setting
    const setting = await ctx.db.prepare(
      "SELECT value FROM settings WHERE site_id = ? AND key = 'theme_header_ad_domain'"
    ).bind(ctx.siteId).first<{ value: string }>();
    resolvedDomain = setting?.value || '';
  }

  if (!resolvedDomain) {
    return '<!-- [reklam-kodu] domain belirtilmedi -->';
  }

  const rawHtml = await fetchHeaderAdEmbed(resolvedDomain);
  if (!rawHtml) return `<!-- [reklam-kodu] ${resolvedDomain} icin icerik bulunamadi -->`;

  // Aurora embed is already responsive — just render it inside a constrained container
  return `<div class="sc-ad-embed">${rawHtml}</div>`;
}

registerShortcode('reklam-kodu', async (params, _inner, ctx) => {
  return resolveAndRender(params, ctx);
});

// English alias
registerShortcode('ad-embed', async (params, _inner, ctx) => {
  return resolveAndRender(params, ctx);
});
