-- ============================================================
-- TechPulse Demo Seed Data
-- Teknoloji blog: Yazılar, sayfalar, kategoriler, etiketler,
-- menü, widget, yorum, slider, tema ayarları, eklenti aktivasyonu
-- ============================================================
-- NOT: Bu dosya seed.sql SONRASI çalıştırılmalıdır.
-- site_id=1, author_id=1 (Super Admin) kullanır.
-- ============================================================

-- ── Site bilgilerini güncelle ──
UPDATE sites SET name = 'TechPulse', description = 'Teknoloji, Yapay Zeka ve Yazılım Dünyası' WHERE id = 1;

-- ── Kategoriler (Türkçe) ──
-- Genel (id=1) zaten seed.sql'de var; ek kategoriler ekle
INSERT INTO taxonomies (site_id, name, slug, type, description, language, count) VALUES
  (1, 'Yapay Zeka', 'yapay-zeka', 'category', 'Makine öğrenmesi, derin öğrenme ve AI haberleri', 'tr', 3),
  (1, 'Web Geliştirme', 'web-gelistirme', 'category', 'Frontend, backend ve full-stack geliştirme', 'tr', 2),
  (1, 'Mobil', 'mobil', 'category', 'iOS, Android ve cross-platform mobil geliştirme', 'tr', 1),
  (1, 'Siber Güvenlik', 'siber-guvenlik', 'category', 'Güvenlik açıkları, pentest ve savunma stratejileri', 'tr', 1),
  (1, 'Bulut Bilişim', 'bulut-bilisim', 'category', 'AWS, Azure, GCP ve serverless mimariler', 'tr', 1);
-- IDs: Genel=1, Yapay Zeka=3, Web Geliştirme=4, Mobil=5, Siber Güvenlik=6, Bulut Bilişim=7
-- (id=2 = General EN from seed.sql)

-- ── Etiketler (Türkçe) ──
INSERT INTO taxonomies (site_id, name, slug, type, language, count) VALUES
  (1, 'Python', 'python', 'tag', 'tr', 2),
  (1, 'JavaScript', 'javascript', 'tag', 'tr', 2),
  (1, 'React', 'react', 'tag', 'tr', 1),
  (1, 'TypeScript', 'typescript', 'tag', 'tr', 1),
  (1, 'Docker', 'docker', 'tag', 'tr', 1),
  (1, 'ChatGPT', 'chatgpt', 'tag', 'tr', 2),
  (1, 'Linux', 'linux', 'tag', 'tr', 1),
  (1, 'API', 'api', 'tag', 'tr', 1),
  (1, 'Performans', 'performans', 'tag', 'tr', 1),
  (1, 'Cloudflare', 'cloudflare', 'tag', 'tr', 1);
-- IDs: Python=8, JavaScript=9, React=10, TypeScript=11, Docker=12, ChatGPT=13, Linux=14, API=15, Performans=16, Cloudflare=17

-- ── Yazılar (8 adet, Türkçe, published) ──

-- Post 1: Yapay Zeka (Sticky)
INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, is_sticky, published_at, seo_title, seo_description, seo_keywords, created_at, updated_at)
VALUES (1,
  '2026''da Yapay Zeka: Büyük Dil Modelleri Nereye Gidiyor?',
  '2026-yapay-zeka-buyuk-dil-modelleri',
  '<p>Yapay zeka alanında son yıllarda yaşanan gelişmeler, teknoloji dünyasını kökten değiştirmeye devam ediyor. 2026 yılı itibarıyla büyük dil modelleri (LLM) artık sadece metin üretmekle kalmıyor; kod yazıyor, görüntü analizi yapıyor ve karmaşık muhakeme görevlerini başarıyla tamamlıyor.</p>

<h2>Multimodal Modellerin Yükselişi</h2>
<p>Günümüzde en gelişmiş AI modelleri artık multimodal çalışabiliyor. Metin, görüntü, ses ve video gibi farklı veri türlerini aynı anda işleyebilen bu modeller, kullanıcı deneyimini tamamen yeniden tanımlıyor. Özellikle sağlık, eğitim ve finans sektörlerinde devrim niteliğinde uygulamalar ortaya çıkıyor.</p>

<h2>Edge AI ve Yerel İşleme</h2>
<p>Bulut tabanlı AI çözümlerinin yanı sıra, cihaz üzerinde çalışan (on-device) modeller de hızla gelişiyor. Küçültülmüş model boyutları ve optimize edilmiş donanımlar sayesinde, akıllı telefonlardan IoT cihazlarına kadar geniş bir yelpazede AI yetenekleri kullanılabiliyor.</p>

<h2>Etik ve Düzenleme</h2>
<p>AI teknolojilerinin yaygınlaşmasıyla birlikte etik sorunlar ve düzenleme ihtiyacı da artıyor. Avrupa Birliği''nin AI Yasası ve diğer uluslararası düzenlemeler, yapay zeka kullanımını şekillendirmeye başladı. Şeffaflık, önyargı kontrolü ve veri gizliliği gibi konular artık her AI projesinin temel bileşenleri arasında yer alıyor.</p>

<p>Sonuç olarak, 2026 yılı yapay zeka için bir dönüm noktası olmaya devam ediyor. Geliştiriciler, işletmeler ve bireyler olarak bu teknolojiyi sorumlu bir şekilde benimsemek, geleceği şekillendirmemizde kritik önem taşıyor.</p>',
  'Büyük dil modelleri, multimodal AI ve edge computing: 2026 yapay zeka trendlerinin kapsamlı analizi.',
  'publish', 'post', 1, 'tr', 'open', 1,
  '2026-02-20 09:00:00',
  '2026 Yapay Zeka Trendleri: LLM, Multimodal AI ve Edge Computing',
  'Büyük dil modelleri, multimodal AI ve edge computing gibi 2026 yapay zeka trendlerini keşfedin.',
  'yapay zeka, LLM, AI, multimodal, edge AI, 2026',
  '2026-02-20 09:00:00', '2026-02-20 09:00:00');

-- Post 2: Web Geliştirme
INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, seo_keywords, created_at, updated_at)
VALUES (1,
  'Cloudflare Workers ile Edge-First Web Uygulamaları Geliştirmek',
  'cloudflare-workers-edge-first-web',
  '<p>Geleneksel sunucu mimarileri yerini giderek edge computing''e bırakıyor. Cloudflare Workers, V8 izolasyonları üzerinde çalışan hafif fonksiyonlarla küresel ölçekte düşük gecikmeli uygulamalar oluşturmayı mümkün kılıyor.</p>

<h2>Neden Edge Computing?</h2>
<p>Edge computing''in en büyük avantajı, kullanıcıya en yakın noktada çalışmasıdır. Bu yaklaşım, geleneksel merkezi sunuculara kıyasla önemli ölçüde düşük gecikme süreleri ve daha iyi kullanıcı deneyimi sağlar. Cold start süreleri milisaniye seviyesindedir ve otomatik ölçeklendirme altyapı yönetimini ortadan kaldırır.</p>

<h2>Hono Framework ile Geliştirme</h2>
<p>Hono, Cloudflare Workers için optimize edilmiş ultrafast bir web framework''tür. Express.js benzeri bir API sunarken, JSX/TSX desteği sayesinde sunucu tarafı render (SSR) yapabilir. D1 veritabanı ve R2 nesne depolama ile entegre çalışarak tam bir full-stack çözüm oluşturur.</p>

<h3>Temel Mimari</h3>
<p>Bir Workers uygulamasının temel bileşenleri şunlardır:</p>
<ul>
<li><strong>Hono Router:</strong> URL eşleme ve middleware zinciri</li>
<li><strong>D1 Database:</strong> Edge''de çalışan SQLite veritabanı</li>
<li><strong>R2 Storage:</strong> S3-uyumlu nesne depolama</li>
<li><strong>KV Store:</strong> Küresel key-value önbellek</li>
</ul>

<p>Bu bileşenleri bir araya getirerek, geleneksel sunucuya ihtiyaç duymadan tam işlevli web uygulamaları oluşturabilirsiniz.</p>',
  'Cloudflare Workers, D1 veritabanı ve Hono framework kullanarak küresel ölçekte hızlı web uygulamaları nasıl geliştirilir.',
  'publish', 'post', 1, 'tr', 'open',
  '2026-02-18 14:30:00',
  'Cloudflare Workers, edge computing, Hono, D1, serverless',
  '2026-02-18 14:30:00', '2026-02-18 14:30:00');

-- Post 3: Yapay Zeka
INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, created_at, updated_at)
VALUES (1,
  'ChatGPT ve Ötesi: AI Asistanları Günlük Hayatımızı Nasıl Değiştiriyor?',
  'chatgpt-ai-asistanlar-gunluk-hayat',
  '<p>AI asistanları artık sadece basit soru-cevap araçları değil. Kod yazma, e-posta hazırlama, araştırma yapma ve hatta yaratıcı içerik üretme gibi karmaşık görevleri yerine getirebiliyorlar.</p>

<h2>İş Hayatında AI Asistanlar</h2>
<p>Yazılım geliştirmeden pazarlamaya, müşteri hizmetlerinden veri analizine kadar birçok alanda AI asistanlar iş süreçlerini hızlandırıyor. Copilot tarzı araçlar, geliştiricilerin üretkenliğini önemli ölçüde artırıyor.</p>

<h2>Kişisel Kullanım Senaryoları</h2>
<p>Günlük hayatta AI asistanları planlama, alışveriş listeleri oluşturma, seyahat planlama ve öğrenme gibi konularda destek sağlıyor. Sesli asistanlar ve akıllı ev entegrasyonları ile doğal bir etkileşim deneyimi sunuyorlar.</p>

<h2>Geleceğe Bakış</h2>
<p>Otonom AI ajanları — kendi başlarına kararlar alabilen ve çok adımlı görevleri tamamlayabilen sistemler — yakın geleceğin en heyecan verici gelişmesi olarak öne çıkıyor. Bu ajanlar, email yönetiminden proje koordinasyonuna kadar birçok görevi bağımsız olarak yürütebilecek.</p>',
  'AI asistanların iş hayatı ve günlük yaşamdaki rolü, ChatGPT ile gelen dönüşüm ve otonom ajanların geleceği.',
  'publish', 'post', 1, 'tr', 'open',
  '2026-02-16 11:00:00',
  '2026-02-16 11:00:00', '2026-02-16 11:00:00');

-- Post 4: Siber Güvenlik
INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, created_at, updated_at)
VALUES (1,
  'Zero Trust Güvenlik Modeli: Modern Siber Savunma Stratejileri',
  'zero-trust-guvenlik-modeli-siber-savunma',
  '<p>Geleneksel ağ güvenliği yaklaşımı olan "güven ama doğrula" modeli, modern tehdit ortamında yetersiz kalmaktadır. Zero Trust (Sıfır Güven) modeli, her erişim talebinin doğrulanmasını gerektirerek güvenlik seviyesini önemli ölçüde artırmaktadır.</p>

<h2>Zero Trust Prensipleri</h2>
<ul>
<li><strong>Her Zaman Doğrula:</strong> Kimlik, cihaz ve konum bilgilerini sürekli kontrol et</li>
<li><strong>En Az Yetki:</strong> Kullanıcılara yalnızca ihtiyaç duydukları erişimi ver</li>
<li><strong>İhlal Varsay:</strong> Her zaman bir saldırı olabileceğini kabul ederek tasarla</li>
</ul>

<h2>Uygulama Stratejileri</h2>
<p>Zero Trust uygulaması adım adım gerçekleştirilmelidir. Önce kimlik yönetimini güçlendirin, ardından ağ segmentasyonu yapın ve son olarak uygulama bazlı erişim kontrollerini devreye alın. Cloudflare Access, Google BeyondCorp ve Microsoft Entra gibi çözümler bu geçişi kolaylaştırmaktadır.</p>

<p>Supply chain saldırıları ve ransomware tehditleri göz önüne alındığında, Zero Trust artık bir tercih değil, zorunluluktur.</p>',
  'Zero Trust güvenlik modeli nedir? Modern siber savunma stratejileri ve uygulama rehberi.',
  'publish', 'post', 1, 'tr', 'open',
  '2026-02-14 08:15:00',
  '2026-02-14 08:15:00', '2026-02-14 08:15:00');

-- Post 5: Web Geliştirme + JavaScript
INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, created_at, updated_at)
VALUES (1,
  'React 20 ve Yeni Nesil Frontend: Server Components Devrimi',
  'react-20-server-components-frontend',
  '<p>React ekosistemi sürekli evrilmeye devam ediyor. Server Components kavramının olgunlaşmasıyla birlikte, frontend geliştirme paradigması köklü bir dönüşüm geçiriyor.</p>

<h2>Server Components Nedir?</h2>
<p>Server Components, React bileşenlerinin sunucu tarafında render edilmesini sağlar. Bu yaklaşım, istemci tarafına gönderilen JavaScript miktarını önemli ölçüde azaltarak sayfa yükleme hızını artırır. Veritabanı sorguları ve API çağrıları doğrudan bileşen içinde yapılabilir.</p>

<h2>Streaming ve Suspense</h2>
<p>React''ın streaming mimarisi, sayfanın hazır olan bölümlerinin anında gösterilmesini sağlar. Suspense boundary''leri ile yükleme durumları zarif bir şekilde yönetilir ve kullanıcı en kısa sürede etkileşimli bir deneyim yaşar.</p>

<h2>Performans Karşılaştırması</h2>
<p>Server Components kullanan uygulamalar, geleneksel istemci taraflı uygulamalara kıyasla Time to First Byte (TTFB) ve Largest Contentful Paint (LCP) metriklerinde kayda değer iyileşmeler göstermektedir. Bundle boyutlarındaki azalma, özellikle mobil cihazlarda belirgin bir hız artışı sağlar.</p>',
  'React Server Components, streaming SSR ve modern frontend performans optimizasyonu hakkında kapsamlı bir inceleme.',
  'publish', 'post', 1, 'tr', 'open',
  '2026-02-12 16:45:00',
  '2026-02-12 16:45:00', '2026-02-12 16:45:00');

-- Post 6: Mobil
INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, created_at, updated_at)
VALUES (1,
  'Cross-Platform Mobil Geliştirme: Flutter, React Native ve KMP Karşılaştırması',
  'cross-platform-mobil-flutter-react-native-kmp',
  '<p>Tek kod tabanından hem iOS hem Android uygulaması geliştirmek, mobil dünyada uzun süredir hayal edilen bir hedefti. 2026''da üç büyük oyuncu bu alanda rekabet ediyor: Flutter, React Native ve Kotlin Multiplatform (KMP).</p>

<h2>Flutter</h2>
<p>Google''ın Dart dili üzerine kurulu framework''ü Flutter, özel render motoru Impeller ile yüksek performanslı UI deneyimi sunar. Material 3 ve Cupertino widget''ları ile native görünümü yakalayabiliyor. En büyük avantajı pixel-perfect tutarlılık, dezavantajı ise Dart ekosisteminin nispeten küçük olması.</p>

<h2>React Native</h2>
<p>Meta''nın React Native''i, yeni Fabric mimarisi ile performansını önemli ölçüde artırdı. JavaScript/TypeScript bilgisi ile mobil uygulama geliştirilebiliyor. Web geliştiriciler için öğrenme eğrisi düşük, ancak bazı native özellikler için bridge katmanı gerekebiliyor.</p>

<h2>Kotlin Multiplatform (KMP)</h2>
<p>JetBrains''in KMP''si, iş mantığını paylaşırken UI katmanını native bırakma yaklaşımıyla öne çıkıyor. Kotlin''in güçlü tip sistemi ve coroutine desteği ile sağlam uygulamalar geliştirmek mümkün. Compose Multiplatform ile UI paylaşımı da artık seçenek.</p>',
  'Flutter, React Native ve Kotlin Multiplatform karşılaştırması: Hangisi projeleriniz için en uygun?',
  'publish', 'post', 1, 'tr', 'open',
  '2026-02-10 10:30:00',
  '2026-02-10 10:30:00', '2026-02-10 10:30:00');

-- Post 7: Yapay Zeka + Python
INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, created_at, updated_at)
VALUES (1,
  'Python ile RAG Sistemi Kurmak: Adım Adım Rehber',
  'python-rag-sistemi-adim-adim-rehber',
  '<p>Retrieval-Augmented Generation (RAG), büyük dil modellerinin kendi bilgi tabanlarıyla zenginleştirilmesini sağlayan güçlü bir mimaridir. Bu rehberde Python kullanarak sıfırdan bir RAG sistemi kuracağız.</p>

<h2>RAG Mimarisi</h2>
<p>RAG sistemi üç temel bileşenden oluşur:</p>
<ol>
<li><strong>Vektör Veritabanı:</strong> Belgelerin embedding vektörlerini depolar (ChromaDB, Pinecone, Weaviate)</li>
<li><strong>Retriever:</strong> Kullanıcı sorgusuna en benzer belge parçalarını bulur</li>
<li><strong>Generator:</strong> Bulunan bağlamla birlikte LLM''e sorgu gönderir</li>
</ol>

<h2>Gerekli Kütüphaneler</h2>
<p>Projemiz için LangChain, ChromaDB, OpenAI Python SDK ve sentence-transformers kütüphanelerini kullanacağız. LangChain, RAG pipeline''ını oluşturmak için güçlü bir soyutlama katmanı sağlar.</p>

<h2>Chunking Stratejileri</h2>
<p>Belgeleri vektör veritabanına eklemeden önce parçalara ayırmak (chunking) kritik bir adımdır. Recursive character splitting, semantic chunking ve sentence-based splitting gibi farklı stratejiler kullanılabilir. Chunk boyutu ve örtüşme (overlap) parametreleri, arama kalitesini doğrudan etkiler.</p>

<p>Bu temel yapıyı kurduktan sonra, re-ranking, hybrid search ve multi-query retrieval gibi ileri tekniklerle sisteminizi daha da güçlendirebilirsiniz.</p>',
  'Python, LangChain ve ChromaDB ile sıfırdan RAG sistemi kurma rehberi: Vektör veritabanı, chunking ve retrieval stratejileri.',
  'publish', 'post', 1, 'tr', 'open',
  '2026-02-08 13:20:00',
  '2026-02-08 13:20:00', '2026-02-08 13:20:00');

-- Post 8: Bulut Bilişim
INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, published_at, created_at, updated_at)
VALUES (1,
  'Serverless Mimari ile Maliyet Optimizasyonu: Gerçek Dünya Deneyimleri',
  'serverless-mimari-maliyet-optimizasyonu',
  '<p>Serverless mimari, doğru uygulandığında altyapı maliyetlerini dramatik şekilde düşürebilir. Ancak yanlış kullanımda beklenmedik faturalarla karşılaşmak da mümkün. Bu yazıda gerçek dünya deneyimlerinden yola çıkarak serverless maliyet optimizasyonu stratejilerini inceliyoruz.</p>

<h2>Ne Zaman Serverless?</h2>
<p>Serverless, değişken iş yükü olan, sporadik trafik alan ve hızlı ölçeklenmesi gereken uygulamalar için idealdir. Sabit ve yüksek trafik alan uygulamalarda ise dedicated sunucular daha ekonomik olabilir.</p>

<h2>Maliyet Tuzakları</h2>
<ul>
<li><strong>Cold Start Maliyeti:</strong> Sık cold start yaşayan fonksiyonlar hem performans hem maliyet açısından sorunludur</li>
<li><strong>Gereksiz Çağrılar:</strong> Event-driven mimarilerde cascade tetiklemeler fatura şişirebilir</li>
<li><strong>Veri Transferi:</strong> Bölgeler arası veri transferi gizli bir maliyet kaynağıdır</li>
</ul>

<h2>Optimizasyon İpuçları</h2>
<p>Fonksiyon boyutlarını minimize edin, bağlantı havuzlarını yeniden kullanın, provisioned concurrency''yi doğru ayarlayın ve monitoring araçlarıyla maliyetleri sürekli takip edin. Cloudflare Workers gibi edge-first platformlar, cold start sorununu ortadan kaldırarak hem performans hem maliyet avantajı sağlar.</p>',
  'Serverless mimari maliyet optimizasyonu: Cold start, veri transferi tuzakları ve gerçek dünya optimizasyon stratejileri.',
  'publish', 'post', 1, 'tr', 'open',
  '2026-02-06 07:45:00',
  '2026-02-06 07:45:00', '2026-02-06 07:45:00');

-- ── Sayfalar ──

-- Hakkında Sayfası
INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, menu_order, published_at, created_at, updated_at)
VALUES (1,
  'Hakkımızda',
  'hakkimizda',
  '<h2>TechPulse Hakkında</h2>
<p>TechPulse, teknoloji tutkunları ve yazılım geliştiricileri için oluşturulmuş bağımsız bir bilgi platformudur. Amacımız, hızla değişen teknoloji dünyasındaki gelişmeleri anlaşılır ve derinlikli içeriklerle okuyucularımıza ulaştırmaktır.</p>

<h3>Misyonumuz</h3>
<p>Yapay zeka, web geliştirme, siber güvenlik ve bulut bilişim gibi alanlardaki en güncel trendleri, pratik rehberler ve analitik içeriklerle sunmak. Her seviyeden okuyucunun faydalanabileceği, teknik doğruluğu yüksek içerikler üretmek.</p>

<h3>Ekibimiz</h3>
<p>TechPulse, alanında deneyimli yazılım mühendisleri, güvenlik araştırmacıları ve teknoloji analistlerinden oluşan bir ekip tarafından yönetilmektedir.</p>

<h3>İletişim</h3>
<p>Sorularınız ve önerileriniz için bize <a href="/iletisim">iletişim sayfamız</a> üzerinden ulaşabilirsiniz.</p>',
  'TechPulse: Teknoloji tutkunları için bağımsız bilgi platformu.',
  'publish', 'page', 1, 'tr', 'closed', 1,
  '2026-02-01 10:00:00',
  '2026-02-01 10:00:00', '2026-02-01 10:00:00');

-- İletişim Sayfası
INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, comment_status, menu_order, published_at, created_at, updated_at)
VALUES (1,
  'İletişim',
  'iletisim',
  '<h2>Bize Ulaşın</h2>
<p>Yazılarımız hakkında geri bildirimlerinizi, işbirliği tekliflerinizi veya teknik sorularınızı bize iletebilirsiniz.</p>

<h3>E-posta</h3>
<p>Genel sorular: <strong>info@techpulse.dev</strong></p>
<p>Editör: <strong>editor@techpulse.dev</strong></p>

<h3>Sosyal Medya</h3>
<ul>
<li>Twitter/X: <a href="#">@techpulse_dev</a></li>
<li>GitHub: <a href="#">github.com/techpulse</a></li>
<li>LinkedIn: <a href="#">TechPulse</a></li>
</ul>

<p>Yazarlık başvuruları için lütfen özgeçmişiniz ve örnek yazılarınızla birlikte editor@techpulse.dev adresine mail gönderin.</p>',
  'TechPulse iletişim bilgileri ve sosyal medya hesapları.',
  'publish', 'page', 1, 'tr', 'closed', 2,
  '2026-02-01 10:00:00',
  '2026-02-01 10:00:00', '2026-02-01 10:00:00');

-- ── Yazı-Kategori İlişkileri (slug-based lookup) ──
INSERT INTO post_taxonomies (post_id, taxonomy_id) VALUES
  ((SELECT id FROM posts WHERE slug='2026-yapay-zeka-buyuk-dil-modelleri' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='yapay-zeka' AND site_id=1 AND type='category')),
  ((SELECT id FROM posts WHERE slug='cloudflare-workers-edge-first-web' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='web-gelistirme' AND site_id=1 AND type='category')),
  ((SELECT id FROM posts WHERE slug='cloudflare-workers-edge-first-web' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='bulut-bilisim' AND site_id=1 AND type='category')),
  ((SELECT id FROM posts WHERE slug='chatgpt-ai-asistanlar-gunluk-hayat' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='yapay-zeka' AND site_id=1 AND type='category')),
  ((SELECT id FROM posts WHERE slug='zero-trust-guvenlik-modeli-siber-savunma' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='siber-guvenlik' AND site_id=1 AND type='category')),
  ((SELECT id FROM posts WHERE slug='react-20-server-components-frontend' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='web-gelistirme' AND site_id=1 AND type='category')),
  ((SELECT id FROM posts WHERE slug='cross-platform-mobil-flutter-react-native-kmp' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='mobil' AND site_id=1 AND type='category')),
  ((SELECT id FROM posts WHERE slug='python-rag-sistemi-adim-adim-rehber' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='yapay-zeka' AND site_id=1 AND type='category')),
  ((SELECT id FROM posts WHERE slug='serverless-mimari-maliyet-optimizasyonu' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='bulut-bilisim' AND site_id=1 AND type='category'));

-- ── Yazı-Etiket İlişkileri (slug-based lookup) ──
INSERT INTO post_taxonomies (post_id, taxonomy_id) VALUES
  ((SELECT id FROM posts WHERE slug='2026-yapay-zeka-buyuk-dil-modelleri' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='chatgpt' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='cloudflare-workers-edge-first-web' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='javascript' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='cloudflare-workers-edge-first-web' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='typescript' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='cloudflare-workers-edge-first-web' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='cloudflare' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='chatgpt-ai-asistanlar-gunluk-hayat' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='chatgpt' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='chatgpt-ai-asistanlar-gunluk-hayat' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='api' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='zero-trust-guvenlik-modeli-siber-savunma' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='linux' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='react-20-server-components-frontend' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='javascript' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='react-20-server-components-frontend' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='react' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='react-20-server-components-frontend' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='performans' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='cross-platform-mobil-flutter-react-native-kmp' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='react' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='python-rag-sistemi-adim-adim-rehber' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='python' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='python-rag-sistemi-adim-adim-rehber' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='api' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='serverless-mimari-maliyet-optimizasyonu' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='docker' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='serverless-mimari-maliyet-optimizasyonu' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='cloudflare' AND site_id=1 AND type='tag')),
  ((SELECT id FROM posts WHERE slug='serverless-mimari-maliyet-optimizasyonu' AND site_id=1), (SELECT id FROM taxonomies WHERE slug='performans' AND site_id=1 AND type='tag'));

-- ── Yorumlar (bazı yazılara) ──

-- AI 2026 yorumları
INSERT INTO comments (post_id, author_name, author_email, content, status, created_at) VALUES
  ((SELECT id FROM posts WHERE slug='2026-yapay-zeka-buyuk-dil-modelleri' AND site_id=1), 'Ahmet Yılmaz', 'ahmet@example.com', 'Harika bir analiz olmuş! Özellikle Edge AI kısmı çok aydınlatıcıydı. Küçük cihazlarda çalışan modellerin gelişimi gerçekten heyecan verici.', 'approved', '2026-02-20 12:30:00'),
  ((SELECT id FROM posts WHERE slug='2026-yapay-zeka-buyuk-dil-modelleri' AND site_id=1), 'Elif Kaya', 'elif@example.com', 'Etik ve düzenleme konusunda daha fazla içerik görmek isterim. EU AI Act Türkiye''yi nasıl etkileyecek acaba?', 'approved', '2026-02-21 09:15:00'),
  ((SELECT id FROM posts WHERE slug='2026-yapay-zeka-buyuk-dil-modelleri' AND site_id=1), 'Mehmet Demir', 'mehmet@example.com', 'Multimodal modeller konusunda hangi kütüphaneleri önerirsiniz? Bir proje başlatmak istiyorum.', 'approved', '2026-02-21 14:45:00');

-- Cloudflare Workers yorumları
INSERT INTO comments (post_id, author_name, author_email, content, status, created_at) VALUES
  ((SELECT id FROM posts WHERE slug='cloudflare-workers-edge-first-web' AND site_id=1), 'Selin Arslan', 'selin@example.com', 'Workers ile bir CMS geliştirdik, gerçekten çok hızlı. D1 veritabanının SQLite uyumluluğu büyük avantaj.', 'approved', '2026-02-19 16:20:00'),
  ((SELECT id FROM posts WHERE slug='cloudflare-workers-edge-first-web' AND site_id=1), 'Burak Öztürk', 'burak@example.com', 'Cold start olmaması en büyük artısı. Lambda ile karşılaştırıldığında fark çok belirgin.', 'approved', '2026-02-20 08:00:00');

-- ChatGPT yorumları
INSERT INTO comments (post_id, author_name, author_email, content, status, created_at) VALUES
  ((SELECT id FROM posts WHERE slug='chatgpt-ai-asistanlar-gunluk-hayat' AND site_id=1), 'Zeynep Koç', 'zeynep@example.com', 'Otonom ajanlar konusunda çok meraklıyım. Claude Code gibi araçlar zaten bu yöne gidiyor.', 'approved', '2026-02-17 11:30:00');

-- RAG yorumları
INSERT INTO comments (post_id, author_name, author_email, content, status, created_at) VALUES
  ((SELECT id FROM posts WHERE slug='python-rag-sistemi-adim-adim-rehber' AND site_id=1), 'Can Aydın', 'can@example.com', 'Chunking stratejisi seçimi gerçekten çok önemli. Semantic chunking ile recursive splitting arasındaki farkı pratikte gördüm.', 'approved', '2026-02-09 10:00:00'),
  ((SELECT id FROM posts WHERE slug='python-rag-sistemi-adim-adim-rehber' AND site_id=1), 'Deniz Yıldız', 'deniz@example.com', 'LangChain yerine LlamaIndex kullanmayı da düşündünüz mü? Bazı senaryolarda daha pratik olabiliyor.', 'approved', '2026-02-09 15:30:00');

-- ── Menü Güncelle (mevcut menüyü genişlet) ──
-- Mevcut menü: id=1, Ana Sayfa item id=1
-- Ek menü öğeleri ekle
INSERT INTO menu_items (menu_id, title, url, item_type, position) VALUES
  (1, 'Yapay Zeka', '/category/yapay-zeka', 'custom', 1),
  (1, 'Web Geliştirme', '/category/web-gelistirme', 'custom', 2),
  (1, 'Mobil', '/category/mobil', 'custom', 3),
  (1, 'Siber Güvenlik', '/category/siber-guvenlik', 'custom', 4),
  (1, 'Hakkımızda', '/hakkimizda', 'custom', 5),
  (1, 'İletişim', '/iletisim', 'custom', 6);

-- ── Widget'lar (Sidebar) ──
INSERT INTO widgets (site_id, area, widget_type, title, config, position, is_active, language) VALUES
  (1, 'sidebar', 'categories', 'Kategoriler', '{"showCount":true}', 0, 1, 'tr'),
  (1, 'sidebar', 'recent_posts', 'Son Yazılar', '{"count":5}', 1, 1, 'tr'),
  (1, 'sidebar', 'tags', 'Popüler Etiketler', '{"limit":10}', 2, 1, 'tr'),
  (1, 'sidebar', 'text', 'Hakkımızda', '{"content":"TechPulse, teknoloji ve yazılım dünyasındaki en güncel gelişmeleri takip etmenizi sağlayan bağımsız bir platformdur."}', 3, 1, 'tr');

-- ── Tema ve Site Ayarları ──
-- Mevcut ayarları güncelle + yeni ayarlar ekle
UPDATE settings SET value = 'TechPulse' WHERE site_id = 1 AND key = 'site_title';
UPDATE settings SET value = 'Teknoloji, Yapay Zeka ve Yazılım Dünyası' WHERE site_id = 1 AND key = 'site_description';
UPDATE settings SET value = '#6366f1' WHERE site_id = 1 AND key = 'theme_primary_color';
UPDATE settings SET value = 'DM Sans' WHERE site_id = 1 AND key = 'theme_font_family';

-- Ek tema ayarları
INSERT OR REPLACE INTO settings (site_id, key, value) VALUES
  (1, 'theme_site_tagline', 'Teknoloji, Yapay Zeka ve Yazılım Dünyası'),
  (1, 'theme_footer_text', '2026 TechPulse. Tüm hakları saklıdır.'),
  (1, 'theme_nav_style', 'gooey'),
  (1, 'theme_nav_particle_count', '20'),
  (1, 'theme_nav_animation_time', '600'),
  (1, 'theme_site_logo', ''),
  (1, 'posts_per_page', '6');

-- ── Hero Slider Plugin ──
-- Eklentiyi plugins tablosuna ekle (ID otomatik atanacak — muhtemelen 4)
INSERT INTO plugins (slug, name, description, version, author, entry_point, hooks, settings_schema)
VALUES (
  'hero-slider',
  'Hero Slider',
  'Full-width hero slider with title, description, and CTA button for homepage',
  '1.0.0',
  'WP-CMS',
  'plugins/hero-slider',
  '["page.head","page.bodyStart","page.bodyEnd"]',
  '{"slides":{"type":"json","default":"[]","label":"Slides","description":"Slider slides array"},"autoPlay":{"type":"boolean","default":true,"label":"Auto Play"},"interval":{"type":"number","default":5000,"label":"Interval (ms)"},"showDots":{"type":"boolean","default":true,"label":"Show Dots"},"showArrows":{"type":"boolean","default":true,"label":"Show Arrows"},"height":{"type":"string","default":"500px","label":"Height"},"overlayOpacity":{"type":"number","default":0.4,"label":"Overlay Opacity"}}'
);

-- Hero Slider eklentisini site 1 için aktifleştir (slayt verileriyle)
-- Plugin ID'yi slug'dan bularak insert yap
INSERT INTO site_plugins (site_id, plugin_id, is_active, settings, activated_at)
SELECT 1, id, 1,
  '{"autoPlay":true,"interval":5000,"showDots":true,"showArrows":true,"height":"500px","overlayOpacity":0.4,"slides":[{"id":1,"title":"Yapay Zeka ile Geleceği Keşfet","description":"Büyük dil modelleri, multimodal AI ve otonom ajanlarla teknolojinin sınırlarını zorluyoruz.","buttonText":"Yazıları Keşfet","buttonUrl":"/category/yapay-zeka","imageUrl":"https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&h=900&fit=crop","order":1},{"id":2,"title":"Modern Web Geliştirme","description":"Edge computing, serverless ve yeni nesil framework''lerle web uygulamalarınızı hızlandırın.","buttonText":"Daha Fazla","buttonUrl":"/category/web-gelistirme","imageUrl":"https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1600&h=900&fit=crop","order":2},{"id":3,"title":"Siber Güvenlikte Yeni Dönem","description":"Zero Trust, tehdit avcılığı ve modern savunma stratejileriyle güvenliğinizi güçlendirin.","buttonText":"Güvenlik Yazıları","buttonUrl":"/category/siber-guvenlik","imageUrl":"https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&h=900&fit=crop","order":3}]}',
  datetime('now')
FROM plugins WHERE slug = 'hero-slider';

-- ── Global ayarı güncelle ──
UPDATE global_settings SET value = '1' WHERE key = 'setup_complete';
