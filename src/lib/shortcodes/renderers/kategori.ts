import { registerShortcode } from '../registry';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

registerShortcode('kategori', async (params, _inner, ctx) => {
  const slug = params.slug || '';
  const count = parseInt(params.sayi || params.count || '4');
  const format = params.format || 'kart';

  if (!slug) return '<!-- [kategori] slug gerekli -->';

  // Find taxonomy
  const cat = await ctx.db.prepare(
    `SELECT id, name, slug FROM taxonomies WHERE site_id = ? AND slug = ? AND type = 'category' AND language = ?`
  ).bind(ctx.siteId, slug, ctx.lang).first<any>();

  if (!cat) return `<!-- [kategori] bulunamadi: ${esc(slug)} -->`;

  // Get posts in this category
  const result = await ctx.db.prepare(
    `SELECT p.id, p.title, p.slug, p.excerpt, p.published_at, p.og_image_r2_key,
            m.r2_key as featured_image_r2_key,
            u.display_name as author_name
     FROM posts p
     LEFT JOIN users u ON p.author_id = u.id
     LEFT JOIN media m ON p.featured_image_id = m.id
     JOIN post_taxonomies pt ON p.id = pt.post_id
     WHERE pt.taxonomy_id = ? AND p.site_id = ? AND p.status = 'publish' AND p.post_type = 'post' AND p.language = ?
     ORDER BY p.published_at DESC
     LIMIT ?`
  ).bind(cat.id, ctx.siteId, ctx.lang, count).all<any>();

  const posts = result.results || [];
  if (posts.length === 0) return `<!-- [kategori] ${esc(slug)}: yazi yok -->`;

  const lp = ctx.langPrefix;
  const header = `<div class="sc-category-header"><h2><a href="${lp}/category/${esc(cat.slug)}">${esc(cat.name)}</a></h2></div>`;

  if (format === 'liste' || format === 'list') {
    const items = posts.map((p: any) => {
      const date = p.published_at ? new Date(p.published_at).toLocaleDateString(ctx.lang === 'tr' ? 'tr-TR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      return `<li class="sc-list-item"><a href="${lp}/${esc(p.slug)}">${esc(p.title)}</a><span class="sc-date">${date}</span></li>`;
    }).join('');
    return `<div class="sc-category-block">${header}<ul class="sc-posts-list">${items}</ul></div>`;
  }

  // Default: kart — horizontal with thumbnail
  const cards = posts.map((p: any, pIdx: number) => {
    const imgKey = p.og_image_r2_key || p.featured_image_r2_key;
    const imgUrl = imgKey ? `${ctx.origin}/uploads/${imgKey.replace(`sites/${ctx.siteId}/uploads/`, `s/${ctx.siteId}/`)}` : '';
    const hasThumb = !!imgUrl;
    const imgHtml = hasThumb ? `<div class="card-thumb"><img class="featured-img" src="${esc(imgUrl)}" alt="${esc(p.title)}"${pIdx === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}/></div>` : '';
    const excerpt = p.excerpt ? `<p class="post-excerpt">${esc(p.excerpt)}</p>` : '';

    return `<div class="post-card${hasThumb ? ' has-thumb' : ''}">${imgHtml}<div class="card-body"><h2><a href="${lp}/${esc(p.slug)}">${esc(p.title)}</a></h2>${excerpt}</div></div>`;
  }).join('\n');

  return `<div class="sc-category-block">${header}<div class="sc-posts-list-view">${cards}</div></div>`;
});
