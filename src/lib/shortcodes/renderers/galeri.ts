import { registerShortcode } from '../registry';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

registerShortcode('galeri', async (params, _inner, ctx) => {
  const ids = params.idler || params.ids || '';
  const columns = parseInt(params.sutun || params.columns || '3');
  const count = parseInt(params.sayi || params.count || '12');

  let mediaItems: any[] = [];

  if (ids) {
    // Fetch specific media by IDs
    const idList = ids.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => id > 0);
    if (idList.length === 0) return '<!-- [galeri] gecersiz id listesi -->';

    const placeholders = idList.map(() => '?').join(',');
    const result = await ctx.db.prepare(
      `SELECT id, r2_key, filename, alt_text, caption FROM media
       WHERE site_id = ? AND id IN (${placeholders}) AND mime_type LIKE 'image/%'
       ORDER BY created_at DESC`
    ).bind(ctx.siteId, ...idList).all<any>();
    mediaItems = result.results || [];
  } else {
    // Fetch latest images
    const result = await ctx.db.prepare(
      `SELECT id, r2_key, filename, alt_text, caption FROM media
       WHERE site_id = ? AND mime_type LIKE 'image/%'
       ORDER BY created_at DESC LIMIT ?`
    ).bind(ctx.siteId, count).all<any>();
    mediaItems = result.results || [];
  }

  if (mediaItems.length === 0) return `<!-- [galeri] gorsel yok -->`;

  const items = mediaItems.map((m: any) => {
    const imgUrl = `${ctx.origin}/uploads/${m.r2_key.replace(`sites/${ctx.siteId}/uploads/`, `s/${ctx.siteId}/`)}`;
    const alt = m.alt_text || m.filename || '';
    const caption = m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : '';
    return `<figure class="sc-gallery-item">
      <a href="${esc(imgUrl)}" target="_blank"><img src="${esc(imgUrl)}" alt="${esc(alt)}" loading="lazy"/></a>
      ${caption}
    </figure>`;
  }).join('');

  return `<div class="sc-gallery sc-gallery-cols-${columns}">${items}</div>`;
});

// English alias
registerShortcode('gallery', async (params, _inner, ctx) => {
  const ids = params.ids || params.idler || '';
  const columns = parseInt(params.columns || params.sutun || '3');
  const count = parseInt(params.count || params.sayi || '12');

  let mediaItems: any[] = [];

  if (ids) {
    const idList = ids.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => id > 0);
    if (idList.length === 0) return '<!-- [gallery] invalid id list -->';

    const placeholders = idList.map(() => '?').join(',');
    const result = await ctx.db.prepare(
      `SELECT id, r2_key, filename, alt_text, caption FROM media
       WHERE site_id = ? AND id IN (${placeholders}) AND mime_type LIKE 'image/%'
       ORDER BY created_at DESC`
    ).bind(ctx.siteId, ...idList).all<any>();
    mediaItems = result.results || [];
  } else {
    const result = await ctx.db.prepare(
      `SELECT id, r2_key, filename, alt_text, caption FROM media
       WHERE site_id = ? AND mime_type LIKE 'image/%'
       ORDER BY created_at DESC LIMIT ?`
    ).bind(ctx.siteId, count).all<any>();
    mediaItems = result.results || [];
  }

  if (mediaItems.length === 0) return `<!-- [gallery] no images -->`;

  const items = mediaItems.map((m: any) => {
    const imgUrl = `${ctx.origin}/uploads/${m.r2_key.replace(`sites/${ctx.siteId}/uploads/`, `s/${ctx.siteId}/`)}`;
    const alt = m.alt_text || m.filename || '';
    const caption = m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : '';
    return `<figure class="sc-gallery-item">
      <a href="${esc(imgUrl)}" target="_blank"><img src="${esc(imgUrl)}" alt="${esc(alt)}" loading="lazy"/></a>
      ${caption}
    </figure>`;
  }).join('');

  return `<div class="sc-gallery sc-gallery-cols-${columns}">${items}</div>`;
});
