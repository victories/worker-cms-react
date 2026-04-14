import { registerShortcode } from '../registry';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Extract first image src from HTML content
function extractFirstImageSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

registerShortcode('son-yazilar', async (params, _inner, ctx) => {
  const count = parseInt(params.sayi || params.count || '6');
  const format = params.format || 'kart'; // kart | liste | mini
  const catSlug = params.kategori || params.category || '';

  let catFilter = '';
  let binds: any[] = [ctx.siteId, 'publish', 'post', ctx.lang];

  if (catSlug) {
    catFilter = `AND p.id IN (
      SELECT pt.post_id FROM post_taxonomies pt
      JOIN taxonomies t ON pt.taxonomy_id = t.id
      WHERE t.site_id = ? AND t.slug = ? AND t.type = 'category'
    )`;
    binds.push(ctx.siteId, catSlug);
  }

  // Always order by published_at DESC (newest first), no sticky priority in shortcodes
  const needsContent = format === 'kart' || format === 'card';
  const sql = `
    SELECT p.id, p.title, p.slug, p.excerpt, p.published_at, p.og_image_r2_key,
           ${needsContent ? 'p.content,' : ''}
           m.r2_key as featured_image_r2_key,
           u.display_name as author_name
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN media m ON p.featured_image_id = m.id
    WHERE p.site_id = ? AND p.status = ? AND p.post_type = ? AND p.language = ?
    ${catFilter}
    ORDER BY p.published_at DESC
    LIMIT ?
  `;
  binds.push(count);

  const result = await ctx.db.prepare(sql).bind(...binds).all<any>();
  const posts = result.results || [];

  if (posts.length === 0) {
    return `<div class="sc-empty">${ctx.lang === 'tr' ? 'Henuz yazi yok' : 'No posts yet'}</div>`;
  }

  const lp = ctx.langPrefix;

  if (format === 'liste' || format === 'list') {
    const items = posts.map((p: any) => {
      const date = p.published_at ? new Date(p.published_at).toLocaleDateString(ctx.lang === 'tr' ? 'tr-TR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      return `<li class="sc-list-item"><a href="${lp}/${esc(p.slug)}">${esc(p.title)}</a><span class="sc-date">${date}</span></li>`;
    }).join('');
    return `<div class="sc-posts-list"><ul>${items}</ul></div>`;
  }

  if (format === 'mini') {
    const items = posts.map((p: any) => {
      return `<a href="${lp}/${esc(p.slug)}" class="sc-mini-item">${esc(p.title)}</a>`;
    }).join('');
    return `<div class="sc-posts-mini">${items}</div>`;
  }

  // Default: kart / card format — horizontal with thumbnail
  const cards = posts.map((p: any, pIdx: number) => {
    // 1st priority: og_image_r2_key or featured_image_r2_key from DB
    let imgUrl = '';
    const imgKey = p.og_image_r2_key || p.featured_image_r2_key;
    if (imgKey) {
      imgUrl = `${ctx.origin}/uploads/${imgKey.replace(`sites/${ctx.siteId}/uploads/`, `s/${ctx.siteId}/`)}`;
    }

    // 2nd priority: extract first image from post content
    if (!imgUrl && p.content) {
      const contentImg = extractFirstImageSrc(p.content);
      if (contentImg) {
        // If it's a relative URL, make it absolute
        imgUrl = contentImg.startsWith('/') ? `${ctx.origin}${contentImg}` : contentImg;
      }
    }

    const hasThumb = !!imgUrl;
    const imgHtml = hasThumb ? `<div class="card-thumb"><img class="featured-img" src="${esc(imgUrl)}" alt="${esc(p.title)}"${pIdx === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}/></div>` : '';
    const excerpt = p.excerpt ? `<p class="post-excerpt">${esc(p.excerpt)}</p>` : '';
    const date = p.published_at ? new Date(p.published_at).toLocaleDateString(ctx.lang === 'tr' ? 'tr-TR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

    return `<div class="post-card${hasThumb ? ' has-thumb' : ''}">
      ${imgHtml}
      <div class="card-body">
        <h2><a href="${lp}/${esc(p.slug)}">${esc(p.title)}</a></h2>
        <div class="post-meta"><span class="author">${esc(p.author_name || '')}</span><span class="sep">&middot;</span><span>${date}</span></div>
        ${excerpt}
        <a href="${lp}/${esc(p.slug)}" class="read-more">${ctx.lang === 'tr' ? 'Devamini oku' : 'Read more'} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
      </div>
    </div>`;
  }).join('\n');

  return `<div class="sc-posts-list-view">${cards}</div>`;
});
