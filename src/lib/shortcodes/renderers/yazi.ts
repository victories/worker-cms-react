import { registerShortcode } from '../registry';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

registerShortcode('yazi', async (params, _inner, ctx) => {
  const postId = parseInt(params.id || '0');
  const slug = params.slug || '';
  const format = params.format || 'kart'; // kisa | tam | kart

  if (!postId && !slug) return '<!-- [yazi] id veya slug gerekli -->';

  let post: any = null;

  if (postId) {
    post = await ctx.db.prepare(
      `SELECT p.id, p.title, p.slug, p.content, p.excerpt, p.published_at, p.og_image_r2_key,
              m.r2_key as featured_image_r2_key,
              u.display_name as author_name
       FROM posts p LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
       WHERE p.id = ? AND p.site_id = ? AND p.status = 'publish'`
    ).bind(postId, ctx.siteId).first();
  } else {
    post = await ctx.db.prepare(
      `SELECT p.id, p.title, p.slug, p.content, p.excerpt, p.published_at, p.og_image_r2_key,
              m.r2_key as featured_image_r2_key,
              u.display_name as author_name
       FROM posts p LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
       WHERE p.slug = ? AND p.site_id = ? AND p.language = ? AND p.status = 'publish'`
    ).bind(slug, ctx.siteId, ctx.lang).first();
  }

  if (!post) return `<!-- [yazi] bulunamadi: id=${postId} slug=${slug} -->`;

  const lp = ctx.langPrefix;
  const imgKey = post.og_image_r2_key || post.featured_image_r2_key;
  const imgUrl = imgKey ? `${ctx.origin}/uploads/${imgKey.replace(`sites/${ctx.siteId}/uploads/`, `s/${ctx.siteId}/`)}` : '';
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString(ctx.lang === 'tr' ? 'tr-TR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  if (format === 'kisa' || format === 'short') {
    return `<div class="sc-post-short">
      <h3><a href="${lp}/${esc(post.slug)}">${esc(post.title)}</a></h3>
      <p class="post-meta"><span>${date}</span></p>
      <p class="post-excerpt">${esc(post.excerpt || '')}</p>
    </div>`;
  }

  if (format === 'tam' || format === 'full') {
    const imgHtml = imgUrl ? `<img class="featured-img" src="${esc(imgUrl)}" alt="${esc(post.title)}" style="width:100%;border-radius:0.75rem;margin-bottom:1.5rem"/>` : '';
    return `<article class="sc-post-full">
      <h2><a href="${lp}/${esc(post.slug)}">${esc(post.title)}</a></h2>
      <div class="post-meta"><span class="author">${esc(post.author_name || '')}</span><span class="sep">&middot;</span><span>${date}</span></div>
      ${imgHtml}
      <div class="post-content">${post.content || ''}</div>
    </article>`;
  }

  // Default: kart / card
  const imgHtml = imgUrl ? `<div class="card-img-wrap"><img class="featured-img" src="${esc(imgUrl)}" alt="${esc(post.title)}" loading="lazy"/></div>` : '';
  const excerpt = post.excerpt ? `<p class="post-excerpt">${esc(post.excerpt)}</p>` : '';

  return `<div class="post-card">
    ${imgHtml}
    <div class="card-body">
      <h2><a href="${lp}/${esc(post.slug)}">${esc(post.title)}</a></h2>
      <div class="post-meta"><span class="author">${esc(post.author_name || '')}</span><span class="sep">&middot;</span><span>${date}</span></div>
      ${excerpt}
      <a href="${lp}/${esc(post.slug)}" class="read-more">${ctx.lang === 'tr' ? 'Devamini oku' : 'Read more'} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
    </div>
  </div>`;
});
