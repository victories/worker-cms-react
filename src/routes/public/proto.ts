import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';

/**
 * TEMPORARY visual-proof prototypes for the Site Templates feature
 * (Faz 0 — go/no-go). Three magazine homepage identities served at
 *   /__proto/magazine/editorial
 *   /__proto/magazine/portal
 *   /__proto/magazine/dark
 * and an index at /__proto. Self-contained static HTML (Tailwind Play CDN
 * + Google Fonts + picsum placeholder photos). Delete once a direction is
 * chosen and the real template is built.
 */
const proto = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const HEAD = (title: string, fonts: string) => `<!DOCTYPE html><html lang="tr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fonts}" rel="stylesheet">`;

const CATS = ['Gündem', 'Teknoloji', 'Yaşam', 'Kültür', 'Seyahat', 'Spor'];
const img = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

// ─────────────────────────────────────────────────────────────────────
// Variant A — Modern Editorial (light, airy, serif headlines)
// ─────────────────────────────────────────────────────────────────────
proto.get('/magazine/editorial', (c) =>
  c.html(`${HEAD('MECRA — Modern Editorial', 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap')}
<style>body{font-family:'Inter',sans-serif;color:#1a1a1a}.serif{font-family:'Fraunces',serif}.eyebrow{letter-spacing:.12em}</style>
</head><body class="bg-white">
<div class="max-w-[1180px] mx-auto px-6">
  <header class="flex items-center justify-between py-6 border-b border-neutral-200">
    <div class="text-xs text-neutral-500 hidden sm:block">17 Haziran 2026 · Salı</div>
    <a href="#" class="serif text-3xl font-semibold tracking-tight">Mecra</a>
    <button class="text-sm text-neutral-700 hover:text-black">Ara ⌕</button>
  </header>
  <nav class="flex items-center justify-center gap-7 py-4 text-sm text-neutral-600 border-b border-neutral-200">
    ${CATS.map((x, i) => `<a href="#" class="hover:text-black ${i === 0 ? 'text-black font-medium' : ''}">${x}</a>`).join('')}
  </nav>

  <!-- Hero -->
  <section class="grid md:grid-cols-2 gap-10 items-center py-12">
    <div class="order-2 md:order-1">
      <div class="eyebrow text-[11px] uppercase text-amber-700 font-semibold mb-3">Kapak · Kültür</div>
      <h1 class="serif text-4xl md:text-5xl leading-[1.1] font-semibold mb-4">Şehrin sessiz avlularında kaybolan bir nesil sanat</h1>
      <p class="text-neutral-600 text-lg leading-relaxed mb-5">Eski hanların gölgesinde büyüyen yeni kuşak zanaatkârlar, geleneği modern tasarımla buluşturuyor. Bir kuşağın hikâyesi.</p>
      <div class="flex items-center gap-3 text-sm text-neutral-500">
        <img src="${img('author1', 80, 80)}" class="w-8 h-8 rounded-full object-cover"><span>Defne Aksoy</span><span>·</span><span>8 dk okuma</span>
      </div>
    </div>
    <img src="${img('hero-ed', 1200, 1000)}" class="order-1 md:order-2 w-full aspect-[6/5] object-cover rounded-lg">
  </section>

  <!-- 3-col grid -->
  <section class="grid md:grid-cols-3 gap-9 py-12 border-t border-neutral-200">
    ${[['Teknoloji', 'Yapay zekâ stüdyolara girdi, peki yaratıcılık kime ait?', 'tech1'], ['Seyahat', 'Akdeniz’in unutulmuş limanlarında 10 gün', 'trav1'], ['Yaşam', 'Yavaş yaşamın şehirdeki küçük ritüelleri', 'life1']]
      .map(([cat, title, s]) => `<article class="group">
        <img src="${img(s, 700, 500)}" class="w-full aspect-[7/5] object-cover rounded-lg mb-4">
        <div class="eyebrow text-[11px] uppercase text-amber-700 font-semibold mb-2">${cat}</div>
        <h3 class="serif text-xl font-semibold leading-snug mb-2 group-hover:text-amber-800">${title}</h3>
        <p class="text-neutral-600 text-sm leading-relaxed">Kısa bir özet metni; okuyucuyu içeriğe çeken giriş cümlesi burada yer alır.</p>
      </article>`).join('')}
  </section>

  <!-- Editor's picks list -->
  <section class="grid md:grid-cols-3 gap-10 py-12 border-t border-neutral-200">
    <div class="md:col-span-1">
      <h2 class="serif text-2xl font-semibold mb-2">Editörün Seçimi</h2>
      <p class="text-neutral-500 text-sm">Bu hafta okumadan geçmeyin.</p>
    </div>
    <div class="md:col-span-2 divide-y divide-neutral-200">
      ${[['Kültür', 'Bir fotoğrafçının 30 yıllık İstanbul arşivi', 'p1'], ['Spor', 'Maraton koşmak neden bir meditasyon biçimi?', 'p2'], ['Teknoloji', 'Veri merkezleri ve sessiz enerji devrimi', 'p3']]
        .map(([cat, title, s], i) => `<a href="#" class="flex items-center gap-5 py-4 group">
          <span class="serif text-2xl text-neutral-300 w-6">${i + 1}</span>
          <div class="flex-1">
            <div class="eyebrow text-[10px] uppercase text-amber-700 font-semibold mb-1">${cat}</div>
            <h4 class="serif text-lg font-medium group-hover:text-amber-800">${title}</h4>
          </div>
          <img src="${img(s, 200, 200)}" class="w-16 h-16 rounded object-cover">
        </a>`).join('')}
    </div>
  </section>

  <!-- Newsletter -->
  <section class="my-12 rounded-2xl bg-neutral-900 text-white px-8 py-12 text-center">
    <h2 class="serif text-3xl font-semibold mb-3">Haftalık bülten</h2>
    <p class="text-neutral-300 mb-6 max-w-md mx-auto">En iyi yazıları her cuma kutunuza getiriyoruz. Reklam yok, sadece okuma.</p>
    <div class="flex max-w-md mx-auto gap-2"><input class="flex-1 rounded-md px-4 py-2.5 text-neutral-900" placeholder="E-posta adresiniz"><button class="bg-amber-500 text-neutral-900 font-semibold px-5 rounded-md">Katıl</button></div>
  </section>

  <footer class="border-t border-neutral-200 py-10 text-sm text-neutral-500 flex flex-wrap justify-between gap-4">
    <span class="serif text-xl text-neutral-900">Mecra</span>
    <div class="flex gap-6">${CATS.map((x) => `<a href="#" class="hover:text-black">${x}</a>`).join('')}</div>
    <span>© 2026 Mecra</span>
  </footer>
</div></body></html>`)
);

// ─────────────────────────────────────────────────────────────────────
// Variant B — Dense News Portal (light, busy, red accent)
// ─────────────────────────────────────────────────────────────────────
proto.get('/magazine/portal', (c) =>
  c.html(`${HEAD('MECRA — Haber Portalı', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap')}
<style>body{font-family:'Inter',sans-serif;color:#16181d}.red{color:#d6232a}.bg-red{background:#d6232a}</style>
</head><body class="bg-neutral-100">
<div class="bg-white border-b border-neutral-200 text-[12px] text-neutral-500"><div class="max-w-[1200px] mx-auto px-4 py-1.5 flex justify-between"><span>Salı, 17 Haziran 2026</span><span class="hidden sm:block">İstanbul 24°C · Dolar 39,12 · BIST 11.240</span></div></div>
<header class="bg-white"><div class="max-w-[1200px] mx-auto px-4 py-4 flex items-center justify-between">
  <a href="#" class="text-3xl font-extrabold tracking-tight">MECRA<span class="red">.</span></a>
  <div class="flex gap-2"><input class="border border-neutral-300 rounded px-3 py-1.5 text-sm w-44" placeholder="Haber ara…"><button class="bg-red text-white text-sm font-semibold px-4 rounded">Abone Ol</button></div>
</div></header>
<nav class="bg-neutral-900 text-white text-sm"><div class="max-w-[1200px] mx-auto px-4 flex gap-1 overflow-x-auto">
  ${['SON DAKİKA', ...CATS, 'Ekonomi', 'Dünya'].map((x, i) => `<a href="#" class="px-3 py-2.5 whitespace-nowrap ${i === 0 ? 'bg-red font-bold' : 'hover:bg-neutral-800'}">${x}</a>`).join('')}
</div></nav>
<div class="bg-red/5 border-y border-red/20"><div class="max-w-[1200px] mx-auto px-4 py-2 flex items-center gap-3 text-sm"><span class="bg-red text-white text-[11px] font-bold px-2 py-0.5 rounded">SON DAKİKA</span><span class="truncate">Merkez bankası faiz kararını açıkladı; piyasalarda ilk tepki olumlu →</span></div></div>

<main class="max-w-[1200px] mx-auto px-4 py-6 grid lg:grid-cols-[1fr_320px] gap-6">
  <div>
    <!-- Lead + secondary -->
    <div class="grid md:grid-cols-[1.6fr_1fr] gap-4 mb-6">
      <a href="#" class="group relative rounded-lg overflow-hidden">
        <img src="${img('lead', 900, 560)}" class="w-full aspect-[16/10] object-cover">
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        <div class="absolute bottom-0 p-5 text-white"><span class="bg-red text-[11px] font-bold px-2 py-0.5 rounded">GÜNDEM</span>
          <h1 class="text-2xl md:text-3xl font-extrabold leading-tight mt-2">Yeni ulaşım hattı açıldı: şehirde 45 dakikalık devrim</h1></div>
      </a>
      <div class="flex flex-col gap-4">
        ${[['Teknoloji', 'Yerli işlemci kitlesel üretime geçti', 's1'], ['Spor', 'Derbi öncesi kadro belli oldu', 's2']].map(([cat, t, s]) => `<a href="#" class="group flex gap-3"><img src="${img(s, 240, 200)}" class="w-28 h-24 object-cover rounded flex-shrink-0"><div><span class="text-[11px] font-bold red">${cat}</span><h3 class="font-bold leading-snug group-hover:red">${t}</h3></div></a>`).join('')}
        <div class="bg-white rounded-lg border border-neutral-200 p-4"><h4 class="text-[11px] font-bold uppercase text-neutral-400 mb-2">Editör notu</h4><p class="text-sm font-medium leading-snug">Şehirleşme yazı dizimizin üçüncü bölümü yayında.</p></div>
      </div>
    </div>

    <!-- Category strips -->
    ${[['Teknoloji', '#d6232a'], ['Yaşam', '#1769aa']].map(([cat]) => `
    <section class="mb-6">
      <div class="flex items-center gap-2 mb-3 border-b-2 border-neutral-900 pb-1"><h2 class="text-lg font-extrabold">${cat}</h2><span class="red text-sm font-bold">Tümü →</span></div>
      <div class="grid sm:grid-cols-3 gap-4">
        ${[1, 2, 3].map((n) => `<a href="#" class="group bg-white rounded-lg overflow-hidden border border-neutral-200"><img src="${img(cat + n, 400, 260)}" class="w-full aspect-[3/2] object-cover"><div class="p-3"><h3 class="font-bold text-[15px] leading-snug group-hover:red">${cat} alanında bu hafta öne çıkan gelişme ${n}</h3><p class="text-xs text-neutral-500 mt-1">2 saat önce</p></div></a>`).join('')}
      </div>
    </section>`).join('')}
  </div>

  <!-- Sidebar -->
  <aside class="space-y-6">
    <div class="bg-white rounded-lg border border-neutral-200 p-4">
      <h3 class="font-extrabold text-lg mb-3 border-b-2 border-red pb-1 inline-block">En Çok Okunanlar</h3>
      <ol class="space-y-3">
        ${['Dolar kuru güne nasıl başladı?', 'O dizinin finali sosyal medyayı salladı', 'Yapay zekâ ile iş arama rehberi', '10 maddede yeni vergi düzenlemesi', 'Yaz tatili için 7 sakin koy'].map((t, i) => `<li class="flex gap-3"><span class="text-2xl font-extrabold ${i === 0 ? 'red' : 'text-neutral-300'}">${i + 1}</span><a href="#" class="text-sm font-medium leading-snug hover:red">${t}</a></li>`).join('')}
      </ol>
    </div>
    <div class="bg-neutral-900 text-white rounded-lg p-5 text-center"><h3 class="font-bold text-lg mb-2">Bültene katıl</h3><p class="text-sm text-neutral-300 mb-3">Günün özeti her sabah.</p><input class="w-full rounded px-3 py-2 text-neutral-900 text-sm mb-2" placeholder="E-posta"><button class="w-full bg-red text-white font-semibold py-2 rounded text-sm">Abone Ol</button></div>
  </aside>
</main>
<footer class="bg-neutral-900 text-neutral-400 text-sm"><div class="max-w-[1200px] mx-auto px-4 py-8 flex flex-wrap justify-between gap-4"><span class="text-white text-xl font-extrabold">MECRA<span class="red">.</span></span><div class="flex flex-wrap gap-5">${CATS.map((x) => `<a href="#" class="hover:text-white">${x}</a>`).join('')}</div><span>© 2026</span></div></footer>
</body></html>`)
);

// ─────────────────────────────────────────────────────────────────────
// Variant C — Dark Premium Magazine (dark, gold accent, cinematic)
// ─────────────────────────────────────────────────────────────────────
proto.get('/magazine/dark', (c) =>
  c.html(`${HEAD('MECRA — Premium', 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500&display=swap')}
<style>body{font-family:'Inter',sans-serif;background:#0c0c0e;color:#e7e7ea}.serif{font-family:'Fraunces',serif}.gold{color:#f5a524}.eyebrow{letter-spacing:.18em}</style>
</head><body>
<div class="max-w-[1180px] mx-auto px-6">
  <header class="flex items-center justify-between py-6 border-b border-white/10">
    <nav class="hidden md:flex gap-6 text-sm text-neutral-400">${CATS.slice(0, 3).map((x) => `<a href="#" class="hover:text-white">${x}</a>`).join('')}</nav>
    <a href="#" class="serif text-3xl font-semibold gold tracking-tight">MECRA</a>
    <nav class="hidden md:flex gap-6 text-sm text-neutral-400">${CATS.slice(3).map((x) => `<a href="#" class="hover:text-white">${x}</a>`).join('')}</nav>
  </header>

  <!-- Cinematic hero -->
  <section class="relative my-8 rounded-2xl overflow-hidden">
    <img src="${img('dark-hero', 1400, 760)}" class="w-full aspect-[16/9] object-cover opacity-80">
    <div class="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/40 to-transparent"></div>
    <div class="absolute bottom-0 p-8 md:p-12 max-w-3xl">
      <div class="eyebrow text-[11px] uppercase gold font-semibold mb-4">Kapak Dosyası · Kültür</div>
      <h1 class="serif text-4xl md:text-6xl leading-[1.05] font-semibold mb-4">Gecenin içinden geçen ışık: modern mimarinin sessiz şiiri</h1>
      <p class="text-neutral-300 text-lg max-w-xl">Cam ve betonun arasındaki boşlukta, şehrin yeni siluetini kuran mimarlarla konuştuk.</p>
    </div>
  </section>

  <!-- Featured grid -->
  <section class="grid md:grid-cols-3 gap-8 py-10 border-t border-white/10">
    ${[['Teknoloji', 'Sessiz devrim: çiplerin yeni çağı', 'd1'], ['Seyahat', 'Kuzey ışıkları altında bir hafta', 'd2'], ['Yaşam', 'Lüksün yeni tanımı: zaman', 'd3']]
      .map(([cat, title, s]) => `<article class="group">
        <div class="overflow-hidden rounded-xl mb-4"><img src="${img(s, 700, 520)}" class="w-full aspect-[7/5] object-cover group-hover:scale-105 transition-transform duration-500"></div>
        <div class="eyebrow text-[10px] uppercase gold font-semibold mb-2">${cat}</div>
        <h3 class="serif text-2xl font-medium leading-snug mb-2 group-hover:gold transition-colors">${title}</h3>
        <p class="text-neutral-400 text-sm leading-relaxed">Derinlemesine bir dosya; okuyucuyu içine çeken zarif bir giriş.</p>
      </article>`).join('')}
  </section>

  <!-- Numbered highlights -->
  <section class="grid md:grid-cols-2 gap-x-12 gap-y-2 py-10 border-t border-white/10">
    ${[['Sanat', 'Bir koleksiyonerin gizli odası'], ['Spor', 'Zaferin ardındaki sessiz disiplin'], ['Kültür', 'Plaklar geri döndü, peki neden?'], ['Gündem', 'Şehrin geleceği kimin elinde?']]
      .map(([cat, title], i) => `<a href="#" class="flex items-center gap-5 py-4 border-b border-white/10 group">
        <span class="serif text-4xl gold/70 w-10">0${i + 1}</span>
        <div><div class="eyebrow text-[10px] uppercase text-neutral-500 font-semibold mb-1">${cat}</div><h4 class="serif text-xl group-hover:gold transition-colors">${title}</h4></div>
      </a>`).join('')}
  </section>

  <section class="my-12 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-8 py-12 text-center">
    <h2 class="serif text-3xl font-semibold mb-3">Ayrıcalıklı üyelik</h2>
    <p class="text-neutral-300 mb-6 max-w-md mx-auto">Reklamsız okuma, özel dosyalar ve dijital arşiv. Ayda bir kahve fiyatına.</p>
    <button class="bg-amber-500 text-neutral-900 font-semibold px-7 py-3 rounded-md">Üye Ol</button>
  </section>

  <footer class="border-t border-white/10 py-10 text-sm text-neutral-500 flex flex-wrap justify-between gap-4">
    <span class="serif text-xl gold">MECRA</span>
    <div class="flex gap-6">${CATS.map((x) => `<a href="#" class="hover:text-white">${x}</a>`).join('')}</div>
    <span>© 2026 Mecra</span>
  </footer>
</div></body></html>`)
);

// Index linking the three
proto.get('/', (c) =>
  c.html(`${HEAD('Şablon Önizlemeleri', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap')}
<style>body{font-family:'Inter',sans-serif;background:#f5f5f4;color:#1a1a1a}</style></head>
<body class="min-h-screen flex items-center justify-center p-8"><div class="max-w-md w-full">
  <h1 class="text-2xl font-semibold mb-2">Magazin şablonu — 3 yön</h1>
  <p class="text-neutral-500 mb-6 text-sm">Üçünü de aç, beğendiğini söyle; onu gerçek şablona dönüştürelim.</p>
  <div class="space-y-3">
    ${[['editorial', 'Modern Editoryal', 'Açık, ferah, serif başlıklar'], ['portal', 'Haber Portalı', 'Yoğun, kırmızı vurgu, çok bölüm'], ['dark', 'Koyu / Premium', 'Koyu zemin, altın vurgu, sinematik']]
      .map(([slug, t, d]) => `<a href="/__proto/magazine/${slug}" target="_blank" class="block bg-white rounded-xl border border-neutral-200 p-5 hover:border-neutral-400 transition-colors"><div class="font-semibold mb-1">${t} →</div><div class="text-sm text-neutral-500">${d}</div></a>`).join('')}
  </div>
</div></body></html>`)
);

export default proto;
