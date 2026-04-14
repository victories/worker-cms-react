import { registerShortcode } from '../registry';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

registerShortcode('slider', async (_params, _inner, ctx) => {
  // Fetch hero slider settings from the plugin settings (site_plugins table)
  const pluginRow = await ctx.db.prepare(
    `SELECT sp.settings FROM site_plugins sp
     JOIN plugins p ON sp.plugin_id = p.id
     WHERE sp.site_id = ? AND p.slug = 'hero-slider' AND sp.is_active = 1`
  ).bind(ctx.siteId).first<{ settings: string }>();

  if (!pluginRow || !pluginRow.settings) return '<!-- [slider] hero-slider eklentisi aktif degil -->';

  let config: any;
  try { config = JSON.parse(pluginRow.settings); } catch { return '<!-- [slider] ayar parse hatasi -->'; }

  const slides = config.slides || [];
  if (slides.length === 0) return '<!-- [slider] slayt yok -->';

  const autoplay = config.autoplay !== false;
  const interval = config.interval || 5000;
  const height = config.height || 400;

  const slidesHtml = slides.map((slide: any, i: number) => {
    const bg = slide.image ? `background-image:url('${esc(slide.image)}')` : `background:${slide.bgColor || '#1e293b'}`;
    const btnHtml = slide.buttonText && slide.buttonUrl
      ? `<a href="${esc(slide.buttonUrl)}" class="hero-btn">${esc(slide.buttonText)}</a>` : '';
    return `<div class="hero-slide${i === 0 ? ' active' : ''}" style="${bg};background-size:cover;background-position:center">
      <div class="hero-overlay">
        <div class="hero-content">
          ${slide.title ? `<h2 class="hero-title">${esc(slide.title)}</h2>` : ''}
          ${slide.subtitle ? `<p class="hero-subtitle">${esc(slide.subtitle)}</p>` : ''}
          ${btnHtml}
        </div>
      </div>
    </div>`;
  }).join('');

  const dotsHtml = slides.length > 1
    ? `<div class="hero-dots">${slides.map((_: any, i: number) => `<button class="hero-dot${i === 0 ? ' active' : ''}" data-slide="${i}"></button>`).join('')}</div>`
    : '';

  const navHtml = slides.length > 1
    ? `<button class="hero-nav hero-prev"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>
       <button class="hero-nav hero-next"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>`
    : '';

  return `<div class="hero-slider-wrap">
    <div class="hero-slider" style="height:${height}px" data-autoplay="${autoplay}" data-interval="${interval}">
      ${slidesHtml}
      ${navHtml}
      ${dotsHtml}
    </div>
  </div>
  <script>
  (function(){var s=document.querySelector('.hero-slider');if(!s)return;var slides=s.querySelectorAll('.hero-slide'),dots=s.querySelectorAll('.hero-dot'),cur=0,timer;
  function go(n){slides[cur].classList.remove('active');if(dots[cur])dots[cur].classList.remove('active');cur=(n+slides.length)%slides.length;slides[cur].classList.add('active');if(dots[cur])dots[cur].classList.add('active')}
  var prev=s.querySelector('.hero-prev'),next=s.querySelector('.hero-next');
  if(prev)prev.onclick=function(){go(cur-1);resetAuto()};if(next)next.onclick=function(){go(cur+1);resetAuto()};
  dots.forEach(function(d,i){d.onclick=function(){go(i);resetAuto()}});
  function resetAuto(){clearInterval(timer);if(s.dataset.autoplay==='true')timer=setInterval(function(){go(cur+1)},parseInt(s.dataset.interval)||5000)}
  resetAuto()})();
  <\/script>`;
});
