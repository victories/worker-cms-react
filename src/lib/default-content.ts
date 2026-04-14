/**
 * Creates default demo content for newly created sites.
 * Called from both super admin site creation and domain setup onboarding.
 */

export async function createDefaultContent(
  db: D1Database,
  siteId: number,
  authorId: number,
  siteName: string,
  lang: string = 'tr'
) {
  const now = new Date().toISOString();

  // 1. Create categories
  const techCat = await db.prepare(
    `INSERT INTO taxonomies (site_id, name, slug, type, language, description) VALUES (?, ?, ?, 'category', ?, ?) RETURNING id`
  ).bind(siteId, 'Teknoloji', 'teknoloji', lang, 'Teknoloji ile ilgili yazılar').first<{ id: number }>();

  const newsCat = await db.prepare(
    `INSERT INTO taxonomies (site_id, name, slug, type, language, description) VALUES (?, ?, ?, 'category', ?, ?) RETURNING id`
  ).bind(siteId, 'Haberler', 'haberler', lang, 'Güncel haberler ve duyurular').first<{ id: number }>();

  // Get existing "Genel" category
  const genelCat = await db.prepare(
    `SELECT id FROM taxonomies WHERE site_id = ? AND slug = 'genel' AND type = 'category'`
  ).bind(siteId).first<{ id: number }>();

  // 2. Create tags
  await db.prepare(
    `INSERT INTO taxonomies (site_id, name, slug, type, language) VALUES (?, 'WorkerCms', 'workercms', 'tag', ?), (?, 'Demo', 'demo', 'tag', ?), (?, 'Başlangıç', 'baslangic', 'tag', ?)`
  ).bind(siteId, lang, siteId, lang, siteId, lang).run();

  // 3. Create "Hakkımızda" (About) page
  const aboutContent = `<div style="max-width:700px;margin:0 auto">
<p style="font-size:1.125rem;line-height:1.8;color:#475569">
<strong>${siteName}</strong>, modern ve hızlı bir web sitesidir. İçeriklerimizle sizlere değer katmayı hedefliyoruz.
</p>

<h2>Misyonumuz</h2>
<p>Kaliteli, özgün ve faydalı içerikler üreterek okuyucularımıza en iyi deneyimi sunmak.</p>

<h2>Vizyonumuz</h2>
<p>Dijital dünyada güvenilir bir bilgi kaynağı olmak ve topluluğumuzu sürekli büyütmek.</p>

<h2>Bize Ulaşın</h2>
<p>Sorularınız, önerileriniz veya iş birliği talepleriniz için <a href="/iletisim">iletişim sayfamızı</a> ziyaret edebilirsiniz.</p>
</div>`;

  const aboutPage = await db.prepare(
    `INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, created_at, updated_at, seo_title, seo_description)
     VALUES (?, ?, 'hakkimizda', ?, ?, 'publish', 'page', ?, ?, 'closed', ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    siteId, 'Hakkımızda', aboutContent,
    `${siteName} hakkında bilgi edinin.`,
    authorId, lang, now, now, now,
    `Hakkımızda | ${siteName}`,
    `${siteName} hakkında detaylı bilgi. Misyonumuz, vizyonumuz ve iletişim bilgileri.`
  ).first<{ id: number }>();

  // 4. Create "İletişim" (Contact) page with contact form shortcode
  const contactContent = `<div style="max-width:700px;margin:0 auto">
<p style="font-size:1.125rem;line-height:1.8;color:#475569">
Bizimle iletişime geçmek için aşağıdaki formu doldurabilirsiniz. En kısa sürede size dönüş yapacağız.
</p>

[iletisim-formu baslik="Bize Yazın"]
</div>`;

  const contactPage = await db.prepare(
    `INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, created_at, updated_at, seo_title, seo_description)
     VALUES (?, ?, 'iletisim', ?, ?, 'publish', 'page', ?, ?, 'closed', ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    siteId, 'İletişim', contactContent,
    'Bizimle iletişime geçin.',
    authorId, lang, now, now, now,
    `İletişim | ${siteName}`,
    `${siteName} ile iletişime geçin. Sorularınız ve önerileriniz için bize yazın.`
  ).first<{ id: number }>();

  // 5. Create "Gizlilik Politikası" page
  const privacyContent = `<div style="max-width:700px;margin:0 auto">
<p>Bu gizlilik politikası, <strong>${siteName}</strong> web sitesinin kişisel verilerin korunması konusundaki yaklaşımını açıklamaktadır.</p>

<h2>Toplanan Veriler</h2>
<p>Sitemizi ziyaret ettiğinizde, iletişim formu aracılığıyla paylaştığınız ad, e-posta adresi gibi bilgiler toplanabilir. Ayrıca tarayıcı bilgileri ve IP adresi gibi teknik veriler otomatik olarak kaydedilebilir.</p>

<h2>Verilerin Kullanımı</h2>
<p>Toplanan veriler yalnızca sizinle iletişim kurmak, hizmet kalitemizi artırmak ve yasal yükümlülüklerimizi yerine getirmek amacıyla kullanılır.</p>

<h2>Çerezler</h2>
<p>Sitemizde kullanıcı deneyimini iyileştirmek için çerezler kullanılmaktadır. Tarayıcı ayarlarınızdan çerezleri yönetebilirsiniz.</p>

<h2>İletişim</h2>
<p>Gizlilik politikamız hakkında sorularınız için <a href="/iletisim">iletişim sayfamızdan</a> bize ulaşabilirsiniz.</p>
</div>`;

  await db.prepare(
    `INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, created_at, updated_at)
     VALUES (?, ?, 'gizlilik-politikasi', ?, ?, 'publish', 'page', ?, ?, 'closed', ?, ?, ?)`
  ).bind(
    siteId, 'Gizlilik Politikası', privacyContent,
    'Gizlilik politikamız hakkında bilgi edinin.',
    authorId, lang, now, now, now
  ).run();

  // 6. Create homepage (static page)
  const homepageContent = `<div style="max-width:900px;margin:0 auto">

<div style="text-align:center;padding:3rem 1rem 2rem">
<h1 style="font-size:2.5rem;font-weight:800;color:#0f172a;margin-bottom:0.75rem">${siteName}</h1>
<p style="font-size:1.25rem;color:#64748b;max-width:600px;margin:0 auto">Modern, hızlı ve güvenilir web sitenize hoş geldiniz. İçeriklerinizi kolayca yönetin, okuyucularınızla etkileşime geçin.</p>
</div>

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem;margin:2rem 0">
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1.5rem;text-align:center">
<div style="font-size:2rem;margin-bottom:0.5rem">📝</div>
<h3 style="font-size:1.1rem;font-weight:600;color:#1e293b;margin-bottom:0.5rem">Blog Yazıları</h3>
<p style="font-size:0.875rem;color:#64748b">Düzenli içeriklerle okuyucularınızı bilgilendirin ve etkileşimde kalın.</p>
</div>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1.5rem;text-align:center">
<div style="font-size:2rem;margin-bottom:0.5rem">💬</div>
<h3 style="font-size:1.1rem;font-weight:600;color:#1e293b;margin-bottom:0.5rem">Yorum Sistemi</h3>
<p style="font-size:0.875rem;color:#64748b">Okuyucularınız yazılarınıza yorum yapabilir, siz de yanıtlayabilirsiniz.</p>
</div>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1.5rem;text-align:center">
<div style="font-size:2rem;margin-bottom:0.5rem">📧</div>
<h3 style="font-size:1.1rem;font-weight:600;color:#1e293b;margin-bottom:0.5rem">İletişim Formu</h3>
<p style="font-size:0.875rem;color:#64748b">Ziyaretçileriniz size kolayca mesaj gönderebilir.</p>
</div>
</div>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:2.5rem 0"/>

<h2 style="text-align:center;font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:1.5rem">Son Yazılar</h2>
[son-yazilar sayi=3 format=kart]

<div style="text-align:center;margin:2rem 0">
<a href="/iletisim" style="display:inline-block;padding:0.75rem 2rem;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem">Bize Ulaşın →</a>
</div>

</div>`;

  const homepage = await db.prepare(
    `INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, created_at, updated_at, seo_title, seo_description)
     VALUES (?, ?, 'anasayfa', ?, ?, 'publish', 'page', ?, ?, 'closed', ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    siteId, 'Ana Sayfa', homepageContent,
    `${siteName} - Modern, hızlı ve güvenilir web sitesi.`,
    authorId, lang, now, now, now,
    siteName,
    `${siteName} - Modern, hızlı ve güvenilir web sitenize hoş geldiniz.`
  ).first<{ id: number }>();

  // 7. Set homepage as static front page
  if (homepage?.id) {
    await db.prepare(
      `INSERT INTO settings (site_id, key, value) VALUES (?, 'show_on_front', 'page'), (?, 'page_on_front', ?)`
    ).bind(siteId, siteId, String(homepage.id)).run();
  }

  // 8. Create a welcome blog post
  const welcomePostContent = `<p style="font-size:1.125rem;line-height:1.8;color:#475569">
Merhaba! <strong>${siteName}</strong>'e hoş geldiniz. Bu, sitenizin ilk blog yazısıdır. Yönetim panelinizden bu yazıyı düzenleyebilir veya yeni yazılar ekleyebilirsiniz.
</p>

<h2>Neler Yapabilirsiniz?</h2>

<ul style="line-height:2;color:#475569">
<li><strong>Yazı &amp; Sayfa Yönetimi</strong> — Blog yazıları ve statik sayfalar oluşturun, düzenleyin.</li>
<li><strong>Medya Kütüphanesi</strong> — Görselleri yükleyin ve yazılarınızda kullanın.</li>
<li><strong>Kategori &amp; Etiketler</strong> — İçeriklerinizi organize edin.</li>
<li><strong>Yorum Yönetimi</strong> — Okuyucu yorumlarını onaylayın veya yanıtlayın.</li>
<li><strong>SEO Araçları</strong> — Her yazı için meta başlık ve açıklama belirleyin.</li>
<li><strong>Tema Özelleştirme</strong> — Renkler, fontlar ve düzeni kişiselleştirin.</li>
<li><strong>İletişim Formu</strong> — Ziyaretçilerinizden mesaj alın.</li>
<li><strong>AMP Desteği</strong> — Mobilde hızlı yüklenen sayfalar.</li>
</ul>

<h2>Başlamak İçin</h2>

<p>Yönetim panelinize giriş yapın ve sol menüden istediğiniz bölüme geçin. Yeni bir yazı eklemek için <strong>Yazılar → Yeni Yazı</strong> yolunu izleyin.</p>

<p>Sorularınız mı var? <a href="/iletisim">İletişim sayfamızdan</a> bize ulaşabilirsiniz.</p>

<p><em>İyi yayınlar!</em></p>`;

  const welcomePost = await db.prepare(
    `INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, created_at, updated_at, seo_title, seo_description)
     VALUES (?, ?, 'hosgeldiniz', ?, ?, 'publish', 'post', ?, ?, 'open', ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    siteId, `${siteName}'e Hoş Geldiniz`, welcomePostContent,
    `${siteName}'e hoş geldiniz! Sitenizin ilk blog yazısı. Neler yapabileceğinizi keşfedin.`,
    authorId, lang, now, now, now,
    `${siteName}'e Hoş Geldiniz`,
    `${siteName} ilk blog yazısı. Site özellikleri ve başlangıç rehberi.`
  ).first<{ id: number }>();

  // Assign welcome post to "Genel" category
  if (welcomePost?.id && genelCat?.id) {
    await db.prepare(
      `INSERT INTO post_taxonomies (post_id, taxonomy_id) VALUES (?, ?)`
    ).bind(welcomePost.id, genelCat.id).run();

    // Update category count
    await db.prepare(
      `UPDATE taxonomies SET count = count + 1 WHERE id = ?`
    ).bind(genelCat.id).run();
  }

  // 9. Create a second blog post for richer demo
  const secondPostContent = `<p style="font-size:1.125rem;line-height:1.8;color:#475569">
WorkerCms, Cloudflare Workers üzerinde çalışan modern bir içerik yönetim sistemidir. İşte sitenizi öne çıkaracak bazı özellikler:
</p>

<h2>Hız ve Performans</h2>
<p>Siteniz dünya genelinde 300'den fazla Cloudflare lokasyonundan sunulur. Ziyaretçileriniz nerede olursa olsun, içeriğinize milisaniyeler içinde ulaşır.</p>

<h2>SEO Dostu</h2>
<p>Her yazı ve sayfa için özel meta başlık, açıklama ve anahtar kelimeler belirleyebilirsiniz. Otomatik sitemap ve RSS feed desteği ile arama motorlarında daha iyi sıralamalar elde edin.</p>

<h2>Mobil Uyumlu</h2>
<p>Tüm temalar responsive tasarıma sahiptir. AMP (Accelerated Mobile Pages) desteği sayesinde mobil cihazlarda şimşek hızında yüklenir.</p>

<h2>Güvenlik</h2>
<p>Cloudflare'in güvenlik altyapısı ile DDoS koruması, SSL sertifikası ve WAF (Web Application Firewall) otomatik olarak aktiftir.</p>

<p><em>Daha fazla bilgi için <a href="/hakkimizda">Hakkımızda</a> sayfamızı ziyaret edin.</em></p>`;

  const secondPost = await db.prepare(
    `INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, created_at, updated_at)
     VALUES (?, ?, 'site-ozelliklerinizi-kesfedin', ?, ?, 'publish', 'post', ?, ?, 'open', ?, ?, ?) RETURNING id`
  ).bind(
    siteId, 'Site Özelliklerinizi Keşfedin', secondPostContent,
    'WorkerCms ile sitenizi öne çıkaracak özellikler: hız, SEO, mobil uyum ve güvenlik.',
    authorId, lang, now, now, now
  ).first<{ id: number }>();

  // Assign second post to "Teknoloji" category
  if (secondPost?.id && techCat?.id) {
    await db.prepare(
      `INSERT INTO post_taxonomies (post_id, taxonomy_id) VALUES (?, ?)`
    ).bind(secondPost.id, techCat.id).run();

    await db.prepare(
      `UPDATE taxonomies SET count = count + 1 WHERE id = ?`
    ).bind(techCat.id).run();
  }

  // 10. Create a sample comment on welcome post
  if (welcomePost?.id) {
    await db.prepare(
      `INSERT INTO comments (post_id, author_name, author_email, content, status, created_at) VALUES (?, ?, ?, ?, 'approved', ?)`
    ).bind(
      welcomePost.id,
      'WorkerCms',
      'hello@workercms.com',
      'Siteniz başarıyla kuruldu! 🎉 Yönetim panelinizden içeriklerinizi yönetmeye başlayabilirsiniz.',
      now
    ).run();
  }

  // 11. Create primary navigation menu
  const menu = await db.prepare(
    `INSERT INTO menus (site_id, name, slug, location, language) VALUES (?, ?, 'ana-menu', 'primary', ?) RETURNING id`
  ).bind(siteId, 'Ana Menü', lang).first<{ id: number }>();

  if (menu?.id) {
    const menuItems = [
      ['Ana Sayfa', '/', 'custom', 0],
      ['Hakkımızda', '/hakkimizda', 'custom', 1],
      ['İletişim', '/iletisim', 'custom', 2],
    ] as const;

    for (const [title, url, itemType, position] of menuItems) {
      await db.prepare(
        `INSERT INTO menu_items (menu_id, title, url, item_type, position) VALUES (?, ?, ?, ?, ?)`
      ).bind(menu.id, title, url, itemType, position).run();
    }
  }

  // 12. Create footer navigation menu + widget
  const footerMenu = await db.prepare(
    `INSERT INTO menus (site_id, name, slug, location, language) VALUES (?, ?, 'footer-menu', 'footer', ?) RETURNING id`
  ).bind(siteId, 'Footer Menü', lang).first<{ id: number }>();

  if (footerMenu?.id) {
    const footerItems = [
      ['Hakkımızda', '/hakkimizda', 0],
      ['İletişim', '/iletisim', 1],
      ['Gizlilik Politikası', '/gizlilik-politikasi', 2],
    ] as const;

    for (const [title, url, position] of footerItems) {
      await db.prepare(
        `INSERT INTO menu_items (menu_id, title, url, item_type, position) VALUES (?, ?, ?, 'custom', ?)`
      ).bind(footerMenu.id, title, url, position).run();
    }

    // Add footer menu widget
    await db.prepare(
      `INSERT INTO widgets (site_id, area, widget_type, title, config, position, is_active, language) VALUES (?, 'footer-1', 'menu', 'Sayfalar', ?, 0, 1, ?)`
    ).bind(siteId, JSON.stringify({ menu_slug: 'footer-menu', style: 'vertical' }), lang).run();
  }

  return {
    pages: {
      homepage: homepage?.id,
      about: aboutPage?.id,
      contact: contactPage?.id,
    },
    posts: {
      welcome: welcomePost?.id,
      features: secondPost?.id,
    },
    menu: menu?.id,
    footerMenu: footerMenu?.id,
  };
}
