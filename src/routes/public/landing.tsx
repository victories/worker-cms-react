/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';

const landingRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Icon SVGs keyed by name
const icons: Record<string, string> = {
  zap: '<path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
  arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
};

function renderIcon(name: string, size = 24, color = 'currentColor') {
  const d = icons[name] || icons.zap;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

function renderLandingHTML(config: any) {
  const c = config.colors || {};
  const primary = c.primary || '#2563eb';
  const accent = c.accent || '#dc2626';
  const bgDark = c.bg_dark || '#09090b';
  const bgLight = c.bg_light || '#fafafa';
  const textLight = c.text_light || '#f4f4f5';
  const textDark = c.text_dark || '#18181b';
  const brand = config.brand || {};
  const hero = config.hero || {};
  const features = config.features || {};
  const pricing = config.pricing || {};
  const testimonials = config.testimonials || {};
  const cta = config.cta || {};
  const footer = config.footer || {};

  const heroTitle = (hero.title || '').replace(/\n/g, '<br/>');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${brand.name || 'WorkerCms'} — ${brand.tagline || ''}</title>
<meta name="description" content="${hero.subtitle || ''}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --primary:${primary};--accent:${accent};
  --bg-dark:${bgDark};--bg-light:${bgLight};
  --text-light:${textLight};--text-dark:${textDark};
  --font-head:'Syne',sans-serif;--font-body:'DM Sans',sans-serif;
}
html{scroll-behavior:smooth}
body{font-family:var(--font-body);color:var(--text-dark);background:var(--bg-dark);-webkit-font-smoothing:antialiased;overflow-x:hidden}
/* --- NAV --- */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:0 24px;transition:background .3s,backdrop-filter .3s}
.nav.scrolled{background:rgba(9,9,11,.85);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06)}
.nav-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:72px}
.nav-brand{font-family:var(--font-head);font-weight:800;font-size:1.5rem;color:var(--text-light);text-decoration:none;display:flex;align-items:center;gap:10px}
.nav-brand .mark{width:36px;height:36px;background:var(--primary);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:.9rem;font-weight:800}
.nav-links{display:flex;align-items:center;gap:8px}
.nav-links a{color:rgba(244,244,245,.7);text-decoration:none;font-size:.875rem;font-weight:500;padding:8px 16px;border-radius:8px;transition:all .2s}
.nav-links a:hover{color:var(--text-light);background:rgba(255,255,255,.06)}
.btn{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-body);font-weight:600;font-size:.875rem;padding:10px 22px;border-radius:10px;text-decoration:none;transition:all .25s;border:none;cursor:pointer}
.btn-primary{background:var(--primary);color:#fff;box-shadow:0 0 0 0 rgba(37,99,235,.4)}
.btn-primary:hover{background:#3b82f6;box-shadow:0 0 30px 4px rgba(37,99,235,.3);transform:translateY(-1px)}
.btn-accent{background:var(--accent);color:#fff}
.btn-accent:hover{background:#ef4444;transform:translateY(-1px)}
.btn-outline{background:transparent;color:var(--text-light);border:1.5px solid rgba(255,255,255,.2)}
.btn-outline:hover{border-color:rgba(255,255,255,.5);background:rgba(255,255,255,.04)}
.btn-dark{background:var(--bg-dark);color:var(--text-light)}
.btn-dark:hover{background:#18181b}
/* --- HERO --- */
.hero{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 24px 80px;overflow:hidden}
.hero::before{content:'';position:absolute;top:-40%;left:-20%;width:600px;height:600px;background:radial-gradient(circle,rgba(37,99,235,.15) 0%,transparent 70%);pointer-events:none}
.hero::after{content:'';position:absolute;bottom:-30%;right:-15%;width:500px;height:500px;background:radial-gradient(circle,rgba(220,38,38,.1) 0%,transparent 70%);pointer-events:none}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:100px;padding:6px 20px 6px 8px;font-size:.8rem;color:rgba(244,244,245,.7);margin-bottom:32px;backdrop-filter:blur(10px)}
.hero-badge .dot{width:8px;height:8px;border-radius:50%;background:var(--primary);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.hero h1{font-family:var(--font-head);font-weight:800;font-size:clamp(2.5rem,7vw,5.5rem);line-height:1.05;color:var(--text-light);max-width:900px;margin:0 auto 24px;letter-spacing:-0.03em}
.hero h1 .highlight{background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{font-size:clamp(1rem,2vw,1.25rem);color:rgba(244,244,245,.55);max-width:600px;line-height:1.7;margin:0 auto 48px;font-weight:400}
.hero-actions{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}
.hero-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:32px;margin-top:80px;max-width:700px;width:100%}
.hero-stat{text-align:center}
.hero-stat .val{font-family:var(--font-head);font-size:2rem;font-weight:800;color:var(--text-light)}
.hero-stat .lbl{font-size:.8rem;color:rgba(244,244,245,.4);margin-top:4px;text-transform:uppercase;letter-spacing:.08em}
/* Decorative grid */
.grid-bg{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:64px 64px;pointer-events:none;mask-image:radial-gradient(ellipse 60% 60% at 50% 50%,#000 20%,transparent 100%)}
/* --- FEATURES --- */
.features{background:var(--bg-light);padding:120px 24px;position:relative}
.features::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(37,99,235,.3),transparent)}
.section-header{text-align:center;max-width:600px;margin:0 auto 64px}
.section-header h2{font-family:var(--font-head);font-size:clamp(1.8rem,4vw,3rem);font-weight:800;color:var(--text-dark);letter-spacing:-0.02em;margin-bottom:16px}
.section-header p{font-size:1.05rem;color:rgba(24,24,27,.55);line-height:1.7}
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1100px;margin:0 auto}
.feature-card{background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:16px;padding:32px;transition:all .3s;position:relative;overflow:hidden}
.feature-card:hover{transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,.08);border-color:rgba(37,99,235,.15)}
.feature-card .icon-wrap{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;background:linear-gradient(135deg,rgba(37,99,235,.08),rgba(37,99,235,.04))}
.feature-card h3{font-family:var(--font-head);font-size:1.15rem;font-weight:700;margin-bottom:10px;color:var(--text-dark)}
.feature-card p{font-size:.9rem;color:rgba(24,24,27,.55);line-height:1.65}
/* --- PRICING --- */
.pricing{background:var(--bg-dark);padding:120px 24px;position:relative}
.pricing .section-header h2{color:var(--text-light)}
.pricing .section-header p{color:rgba(244,244,245,.45)}
.pricing-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:24px;max-width:1200px;margin:0 auto}
.plan-card{flex:0 1 calc(33.333% - 18px);min-width:260px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px 32px;transition:all .3s;position:relative;box-sizing:border-box}
.plan-card.highlighted{background:rgba(37,99,235,.06);border-color:rgba(37,99,235,.3);transform:scale(1.03)}
.plan-card.highlighted::before{content:'';position:absolute;top:-1px;left:20%;right:20%;height:3px;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:0 0 4px 4px}
.plan-badge{display:inline-block;background:var(--primary);color:#fff;font-size:.7rem;font-weight:700;padding:4px 12px;border-radius:100px;margin-bottom:16px;text-transform:uppercase;letter-spacing:.06em}
.plan-name{font-family:var(--font-head);font-size:1.25rem;font-weight:700;color:var(--text-light);margin-bottom:8px}
.plan-desc{font-size:.85rem;color:rgba(244,244,245,.4);margin-bottom:24px;line-height:1.5}
.plan-price{display:flex;align-items:baseline;gap:4px;margin-bottom:8px}
.plan-price .currency{font-size:1.2rem;color:rgba(244,244,245,.5);font-weight:600}
.plan-price .amount{font-family:var(--font-head);font-size:3.5rem;font-weight:800;color:var(--text-light);line-height:1}
.plan-price .period{font-size:.9rem;color:rgba(244,244,245,.4)}
.plan-features{list-style:none;margin:28px 0 36px;display:flex;flex-direction:column;gap:12px}
.plan-features li{display:flex;align-items:center;gap:10px;font-size:.875rem;color:rgba(244,244,245,.65)}
.plan-features li svg{flex-shrink:0;color:var(--primary)}
.plan-card .btn{width:100%;justify-content:center}
.plan-card.enterprise{background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.15)}
.plan-card.enterprise .plan-price{margin-bottom:24px}
.plan-card.enterprise .enterprise-icon{width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;background:linear-gradient(135deg,rgba(37,99,235,.12),rgba(37,99,235,.06))}
.plan-card.enterprise .btn{background:transparent;border:1px solid rgba(255,255,255,.2);color:var(--text-light)}
.plan-card.enterprise .btn:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.3)}
/* --- TESTIMONIALS --- */
.testimonials{background:var(--bg-light);padding:120px 24px}
.testimonials-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1100px;margin:0 auto}
.testimonial-card{background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:16px;padding:32px;position:relative}
.testimonial-card .quote-icon{color:var(--primary);opacity:.3;margin-bottom:16px}
.testimonial-card blockquote{font-size:.95rem;color:rgba(24,24,27,.7);line-height:1.7;margin-bottom:24px;font-style:italic}
.testimonial-card .author{display:flex;align-items:center;gap:12px}
.testimonial-card .avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.85rem;flex-shrink:0}
.testimonial-card .author-info .name{font-weight:600;font-size:.875rem;color:var(--text-dark)}
.testimonial-card .author-info .role{font-size:.8rem;color:rgba(24,24,27,.45)}
/* --- CTA --- */
.cta-section{background:var(--bg-dark);padding:120px 24px;text-align:center;position:relative;overflow:hidden}
.cta-section::before{content:'';position:absolute;top:50%;left:50%;width:800px;height:400px;transform:translate(-50%,-50%);background:radial-gradient(ellipse,rgba(37,99,235,.12) 0%,transparent 70%);pointer-events:none}
.cta-section h2{font-family:var(--font-head);font-size:clamp(2rem,4vw,3.5rem);font-weight:800;color:var(--text-light);max-width:600px;margin:0 auto 16px;letter-spacing:-0.02em;position:relative}
.cta-section p{font-size:1.05rem;color:rgba(244,244,245,.45);margin-bottom:40px;position:relative}
.cta-section .btn{position:relative}
/* --- FOOTER --- */
.site-footer{background:var(--bg-dark);border-top:1px solid rgba(255,255,255,.06);padding:32px 24px;text-align:center}
.footer-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
.footer-text{font-size:.8rem;color:rgba(244,244,245,.3)}
.footer-links{display:flex;gap:20px}
.footer-links a{font-size:.8rem;color:rgba(244,244,245,.35);text-decoration:none;transition:color .2s}
.footer-links a:hover{color:var(--text-light)}
/* --- ANIMATIONS --- */
@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.fade-up{animation:fadeUp .7s ease both}
.fade-up-d1{animation-delay:.1s}.fade-up-d2{animation-delay:.2s}.fade-up-d3{animation-delay:.3s}.fade-up-d4{animation-delay:.4s}
/* --- RESPONSIVE --- */
@media(max-width:900px){
  .features-grid,.testimonials-grid{grid-template-columns:1fr}
  .plan-card{flex:0 1 100%}
  .hero-stats{grid-template-columns:repeat(2,1fr);gap:24px}
  .plan-card.highlighted{transform:none}
  .nav-links .hide-mobile{display:none}
  .footer-inner{flex-direction:column}
}
@media(max-width:600px){
  .hero h1{font-size:2.2rem}
  .hero-actions{flex-direction:column;width:100%;max-width:320px;margin:0 auto}
  .hero-actions .btn{width:100%;justify-content:center}
  .hero-stats{grid-template-columns:repeat(2,1fr);gap:16px}
}
</style>
</head>
<body>

<!-- NAV -->
<nav class="nav" id="nav">
  <div class="nav-inner">
    <a href="/" class="nav-brand">
      <span class="mark">W</span>
      ${brand.name || 'WorkerCms'}
    </a>
    <div class="nav-links">
      <a href="#features" class="hide-mobile">Özellikler</a>
      <a href="#pricing" class="hide-mobile">Fiyatlar</a>
      <a href="/admin/login" class="hide-mobile" style="opacity:.8">Giriş Yap</a>
      <a href="/admin/register" class="btn btn-primary">Ücretsiz Başla</a>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="grid-bg"></div>
  ${hero.badge ? `<div class="hero-badge fade-up"><span class="dot"></span>${hero.badge}</div>` : ''}
  <h1 class="fade-up fade-up-d1">${heroTitle}</h1>
  <p class="hero-sub fade-up fade-up-d2">${hero.subtitle || ''}</p>
  <div class="hero-actions fade-up fade-up-d3">
    ${hero.cta_text ? `<a href="${hero.cta_url || '#'}" class="btn btn-primary">${hero.cta_text} ${renderIcon('arrow', 16)}</a>` : ''}
    ${hero.secondary_cta_text ? `<a href="${hero.secondary_cta_url || '#'}" class="btn btn-outline">${hero.secondary_cta_text}</a>` : ''}
  </div>
  ${hero.stats && hero.stats.length ? `
  <div class="hero-stats fade-up fade-up-d4">
    ${hero.stats.map((s: any) => `
    <div class="hero-stat">
      <div class="val">${s.value}</div>
      <div class="lbl">${s.label}</div>
    </div>`).join('')}
  </div>` : ''}
</section>

<!-- FEATURES -->
<section class="features" id="features">
  <div class="section-header">
    <h2>${features.title || ''}</h2>
    <p>${features.subtitle || ''}</p>
  </div>
  <div class="features-grid">
    ${(features.items || []).map((f: any, i: number) => `
    <div class="feature-card fade-up fade-up-d${(i % 3) + 1}">
      <div class="icon-wrap">${renderIcon(f.icon || 'zap', 22, primary)}</div>
      <h3>${f.title}</h3>
      <p>${f.desc}</p>
    </div>`).join('')}
  </div>
</section>

<!-- PRICING -->
<section class="pricing" id="pricing">
  <div class="section-header">
    <h2>${pricing.title || ''}</h2>
    <p>${pricing.subtitle || ''}</p>
  </div>
  <div class="pricing-grid">
    ${(pricing.plans || []).map((plan: any) => plan.isEnterprise ? `
    <div class="plan-card enterprise">
      <div class="enterprise-icon">${renderIcon('building', 28, primary)}</div>
      <div class="plan-name">${plan.name}</div>
      <div class="plan-desc">${plan.desc || ''}</div>
      <div class="plan-price"></div>
      <ul class="plan-features">
        ${(plan.features || []).map((f: string) => `<li>${renderIcon('check', 16, primary)} ${f}</li>`).join('')}
      </ul>
      <a href="${plan.cta_url || '#'}" class="btn btn-outline">${plan.cta_text || 'İletişim'}</a>
    </div>` : `
    <div class="plan-card${plan.highlighted ? ' highlighted' : ''}">
      ${plan.highlighted ? '<div class="plan-badge">Popüler</div>' : ''}
      <div class="plan-name">${plan.name}</div>
      <div class="plan-desc">${plan.desc || ''}</div>
      <div class="plan-price">
        ${plan.currency ? `<span class="currency">${plan.currency}</span>` : ''}
        <span class="amount">${plan.price}</span>
        ${plan.period ? `<span class="period">${plan.period}</span>` : ''}
      </div>
      <ul class="plan-features">
        ${(plan.features || []).map((f: string) => `<li>${renderIcon('check', 16, primary)} ${f}</li>`).join('')}
      </ul>
      <a href="${plan.cta_url || '#'}" class="btn ${plan.highlighted ? 'btn-primary' : 'btn-outline'}">${plan.cta_text || 'Seç'}</a>
    </div>`).join('')}
  </div>
</section>

<!-- TESTIMONIALS -->
${testimonials.items && testimonials.items.length ? `
<section class="testimonials" id="testimonials">
  <div class="section-header">
    <h2>${testimonials.title || ''}</h2>
  </div>
  <div class="testimonials-grid">
    ${testimonials.items.map((t: any) => `
    <div class="testimonial-card">
      <div class="quote-icon">${renderIcon('quote', 28)}</div>
      <blockquote>${t.text}</blockquote>
      <div class="author">
        <div class="avatar">${(t.author || 'A')[0].toUpperCase()}</div>
        <div class="author-info">
          <div class="name">${t.author}</div>
          <div class="role">${t.role || ''}</div>
        </div>
      </div>
    </div>`).join('')}
  </div>
</section>` : ''}

<!-- CTA -->
<section class="cta-section">
  <h2>${cta.title || ''}</h2>
  <p>${cta.subtitle || ''}</p>
  <a href="${cta.button_url || '#'}" class="btn btn-accent">${cta.button_text || 'Başla'} ${renderIcon('arrow', 16)}</a>
</section>

<!-- FOOTER -->
<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-text">${footer.text || ''}</div>
    <div class="footer-links">
      ${(footer.links || []).map((l: any) => `<a href="${l.url}">${l.text}</a>`).join('')}
    </div>
  </div>
</footer>

<script>
// Scroll-triggered nav background
const nav=document.getElementById('nav');
window.addEventListener('scroll',()=>{nav.classList.toggle('scrolled',window.scrollY>40)});
// Intersection Observer for fade-up
const obs=new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting){e.target.style.animationPlayState='running';obs.unobserve(e.target)}})},{threshold:.15});
document.querySelectorAll('.fade-up').forEach(el=>{el.style.animationPlayState='paused';obs.observe(el)});
// Smooth scroll for hash links
document.querySelectorAll('a[href^="#"]').forEach(a=>{a.addEventListener('click',e=>{e.preventDefault();const t=document.querySelector(a.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth'})})});
</script>
</body>
</html>`;
}

async function serveLanding(c: any) {
  const result = await c.env.DB.prepare(
    "SELECT value FROM global_settings WHERE key = 'landing_config'"
  ).first<{ value: string }>();

  let config: any;
  try {
    config = result?.value ? JSON.parse(result.value) : null;
  } catch {
    config = null;
  }

  if (!config || !config.enabled) {
    return null; // Not enabled, let other routes handle
  }

  // Fetch active packages from DB and merge into pricing section
  try {
    const pkgResult = await c.env.DB.prepare(
      'SELECT * FROM packages WHERE is_active = 1 ORDER BY sort_order ASC, price_monthly ASC'
    ).all();

    if (pkgResult.results && pkgResult.results.length > 0) {
      const adminDomain = (c.env.ADMIN_DOMAIN || '').replace(/:\d+$/, '');
      const registerUrl = adminDomain ? `https://${adminDomain}/admin/register` : '/admin/register';

      config.pricing = config.pricing || {};
      config.pricing.title = config.pricing.title || 'Fiyatlandırma';
      config.pricing.subtitle = config.pricing.subtitle || 'İhtiyacınıza uygun planı seçin';
      config.pricing.plans = pkgResult.results.map((pkg: any) => {
        let features: string[] = [];
        try { features = pkg.features ? JSON.parse(pkg.features) : []; } catch {}
        return {
          name: pkg.name,
          desc: pkg.description || '',
          currency: '$',
          price: pkg.price_monthly,
          period: '/ay',
          features,
          cta_text: 'Başla',
          cta_url: registerUrl,
          highlighted: false,
        };
      });
      // Highlight middle plan if 3+ plans
      if (config.pricing.plans.length >= 3) {
        config.pricing.plans[Math.floor(config.pricing.plans.length / 2)].highlighted = true;
      } else if (config.pricing.plans.length === 2) {
        config.pricing.plans[1].highlighted = true;
      }
      // Add enterprise/contact card at the end
      config.pricing.plans.push({
        name: 'Kurumsal',
        desc: 'Daha fazlasına mı ihtiyacınız var? Size özel çözüm sunalım.',
        currency: '',
        price: '',
        period: '',
        features: ['Özel altyapı', 'Öncelikli destek', 'SLA garantisi', 'Özel entegrasyonlar'],
        cta_text: 'Bizimle İletişime Geçin',
        cta_url: '/iletisim',
        highlighted: false,
        isEnterprise: true,
      });
    }
  } catch (err) {
    console.error('Failed to fetch packages for landing:', err);
  }

  const html = renderLandingHTML(config);
  return c.html(html);
}

// Serve at /landing (always accessible)
landingRoute.get('/landing', async (c) => {
  const res = await serveLanding(c);
  return res || c.notFound();
});

export default landingRoute;
export { serveLanding };
