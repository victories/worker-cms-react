/**
 * Styled error pages for public-facing routes.
 * Self-contained HTML — no external CSS/JS dependencies.
 */

interface ErrorPageOptions {
  statusCode: number;
  lang?: string;
  siteName?: string;
  homeUrl?: string;
}

const ERROR_META: Record<number, { en: { title: string; message: string; sub: string }; tr: { title: string; message: string; sub: string }; icon: string }> = {
  403: {
    en: { title: 'Access Denied', message: 'You don\'t have permission to view this page.', sub: 'If you believe this is a mistake, please contact the site administrator.' },
    tr: { title: 'Erişim Engellendi', message: 'Bu sayfayı görüntüleme izniniz bulunmuyor.', sub: 'Bunun bir hata olduğunu düşünüyorsanız, lütfen site yöneticisiyle iletişime geçin.' },
    icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>`,
  },
  404: {
    en: { title: 'Page Not Found', message: 'The page you\'re looking for doesn\'t exist or has been moved.', sub: 'Check the URL or navigate back to the homepage.' },
    tr: { title: 'Sayfa Bulunamadı', message: 'Aradığınız sayfa bulunamadı veya taşınmış olabilir.', sub: 'URL\'yi kontrol edin veya ana sayfaya dönün.' },
    icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  },
  410: {
    en: { title: 'Gone', message: 'This content has been permanently removed.', sub: 'The resource you requested is no longer available and won\'t be coming back.' },
    tr: { title: 'Kalıcı Olarak Kaldırıldı', message: 'Bu içerik kalıcı olarak kaldırılmıştır.', sub: 'İstediğiniz kaynak artık mevcut değil ve geri gelmeyecek.' },
    icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  },
  500: {
    en: { title: 'Server Error', message: 'Something went wrong on our end.', sub: 'We\'re working on it. Please try again in a few moments.' },
    tr: { title: 'Sunucu Hatası', message: 'Sunucu tarafında bir sorun oluştu.', sub: 'Üzerinde çalışıyoruz. Lütfen birkaç dakika sonra tekrar deneyin.' },
    icon: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  },
};

export function renderErrorPage(opts: ErrorPageOptions): string {
  const { statusCode, lang = 'en', siteName = 'WP-CMS', homeUrl = '/' } = opts;
  const meta = ERROR_META[statusCode] || ERROR_META[404];
  const t = lang === 'tr' ? meta.tr : meta.en;
  const backText = lang === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Homepage';
  const code = String(statusCode);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${code} — ${t.title} | ${esc(siteName)}</title>
<meta name="robots" content="noindex,nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;400;500;700&family=Space+Mono:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}

:root{
  --bg:#0c0e13;
  --surface:rgba(255,255,255,0.03);
  --border:rgba(255,255,255,0.06);
  --text:#e2e8f0;
  --text-dim:#64748b;
  --accent:#6366f1;
  --accent-glow:rgba(99,102,241,0.15);
  --code-color:#f8fafc;
}

body{
  font-family:'DM Sans',system-ui,sans-serif;
  background:var(--bg);
  color:var(--text);
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  overflow:hidden;
  position:relative;
}

/* Atmospheric gradient orbs */
body::before,body::after{
  content:'';position:fixed;border-radius:50%;filter:blur(120px);opacity:0.4;pointer-events:none;
  animation:float 20s ease-in-out infinite alternate;
}
body::before{
  width:600px;height:600px;
  background:radial-gradient(circle,rgba(99,102,241,0.15),transparent 70%);
  top:-200px;right:-150px;
}
body::after{
  width:500px;height:500px;
  background:radial-gradient(circle,rgba(14,165,233,0.1),transparent 70%);
  bottom:-200px;left:-100px;
  animation-delay:-10s;
}

/* Subtle grid pattern */
.grid-bg{
  position:fixed;inset:0;
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);
  background-size:60px 60px;
  mask-image:radial-gradient(ellipse 60% 60% at 50% 50%,black,transparent);
  pointer-events:none;
}

.container{
  position:relative;z-index:1;
  text-align:center;
  padding:2rem;
  max-width:540px;
  animation:fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both;
}

/* Giant status code */
.error-code{
  font-family:'Space Mono',monospace;
  font-size:clamp(7rem,20vw,11rem);
  font-weight:700;
  line-height:1;
  letter-spacing:-0.04em;
  color:transparent;
  background:linear-gradient(135deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0.04) 100%);
  -webkit-background-clip:text;
  background-clip:text;
  position:relative;
  margin-bottom:0.5rem;
  animation:fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both;
  user-select:none;
}

/* Glowing accent line behind the code */
.error-code::after{
  content:'';position:absolute;
  left:50%;top:50%;
  width:120px;height:3px;
  background:var(--accent);
  transform:translate(-50%,-50%);
  border-radius:2px;
  box-shadow:0 0 30px var(--accent),0 0 60px var(--accent-glow);
  animation:pulse 3s ease-in-out infinite;
}

.icon-wrap{
  display:inline-flex;
  align-items:center;justify-content:center;
  width:72px;height:72px;
  border-radius:20px;
  background:var(--surface);
  border:1px solid var(--border);
  color:var(--accent);
  margin-bottom:1.5rem;
  animation:fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both;
}

h1{
  font-family:'DM Sans',sans-serif;
  font-size:1.5rem;
  font-weight:700;
  letter-spacing:-0.02em;
  margin-bottom:0.75rem;
  color:var(--code-color);
  animation:fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s both;
}

.message{
  font-size:1.05rem;
  line-height:1.6;
  color:var(--text-dim);
  margin-bottom:0.5rem;
  animation:fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both;
}

.sub-message{
  font-size:0.875rem;
  color:rgba(100,116,139,0.7);
  margin-bottom:2.5rem;
  animation:fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.25s both;
}

.back-btn{
  display:inline-flex;align-items:center;gap:0.5rem;
  padding:0.75rem 1.75rem;
  border-radius:12px;
  background:var(--surface);
  border:1px solid var(--border);
  color:var(--text);
  font-family:'DM Sans',sans-serif;
  font-size:0.9rem;
  font-weight:500;
  text-decoration:none;
  transition:all 0.3s cubic-bezier(0.16,1,0.3,1);
  animation:fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.35s both;
}
.back-btn:hover{
  background:var(--accent-glow);
  border-color:rgba(99,102,241,0.3);
  color:#fff;
  transform:translateY(-2px);
  box-shadow:0 8px 30px rgba(99,102,241,0.15);
}
.back-btn svg{
  width:16px;height:16px;
  transition:transform 0.3s ease;
}
.back-btn:hover svg{
  transform:translateX(-3px);
}

.site-badge{
  position:fixed;
  bottom:2rem;
  left:50%;transform:translateX(-50%);
  font-size:0.75rem;
  color:rgba(100,116,139,0.4);
  letter-spacing:0.05em;
  animation:fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s both;
}

/* Noise overlay */
.noise{
  position:fixed;inset:0;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events:none;opacity:0.5;
  mix-blend-mode:overlay;
}

@keyframes fadeUp{
  from{opacity:0;transform:translateY(20px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes float{
  0%{transform:translate(0,0) scale(1)}
  100%{transform:translate(30px,-40px) scale(1.1)}
}
@keyframes pulse{
  0%,100%{opacity:0.6;width:120px}
  50%{opacity:1;width:180px}
}

@media(max-width:640px){
  .error-code{font-size:6rem}
  .icon-wrap{width:60px;height:60px;border-radius:16px}
  .icon-wrap svg{width:36px;height:36px}
  h1{font-size:1.25rem}
  .message{font-size:0.95rem}
}
</style>
</head>
<body>
  <div class="noise"></div>
  <div class="grid-bg"></div>

  <div class="container">
    <div class="error-code">${code}</div>
    <div class="icon-wrap">${meta.icon}</div>
    <h1>${esc(t.title)}</h1>
    <p class="message">${esc(t.message)}</p>
    <p class="sub-message">${esc(t.sub)}</p>
    <a href="${esc(homeUrl)}" class="back-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      ${esc(backText)}
    </a>
  </div>

  <div class="site-badge">${esc(siteName)}</div>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
