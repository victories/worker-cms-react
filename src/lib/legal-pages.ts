// Default legal/policy page content shipped with the platform.
//
// These render under `/legal/:slug` for every site. They are intentionally
// generic placeholders — once we ship multi-tenant white-label, each site
// admin can override a slug by publishing a regular page with the same
// slug from the CMS. Marka/şirket bilgisi `{{brand}}` ile placeholder
// olarak tutuluyor — runtime'da render edilirken site adı ile değiştirilir.
//
// İçerik Türk Borçlar Kanunu + 4077 sayılı Tüketicinin Korunması Hakkında
// Kanun + KVKK + 6502 sayılı kanun + Mesafeli Sözleşmeler Yönetmeliği
// asgari gereksinimlerini karşılar. Avukat onayı şart değil ama tavsiye
// edilir; özellikle iletişim/şirket bilgileri ve banka bilgileri site
// sahibi tarafından doldurulmalı.

export interface LegalPage {
  slug: string;
  title_tr: string;
  title_en: string;
  description_tr: string;
  description_en: string;
  // HTML içerik — `{{brand}}` placeholder'ı render zamanında replace edilir.
  content_tr: string;
  content_en: string;
  // Footer'da gösterilecek kısa link metni
  footer_label_tr: string;
  footer_label_en: string;
}

export const LEGAL_PAGES: readonly LegalPage[] = [
  {
    slug: 'gizlilik',
    title_tr: 'Gizlilik Politikası',
    title_en: 'Privacy Policy',
    description_tr: '{{brand}} kişisel verilerinizi nasıl topladığını, kullandığını ve koruduğunu açıklayan gizlilik politikası.',
    description_en: 'How {{brand}} collects, uses and protects your personal data.',
    footer_label_tr: 'Gizlilik',
    footer_label_en: 'Privacy',
    content_tr: `
<p>Son güncellenme: <time>2026-05-13</time></p>

<h2>1. Genel</h2>
<p>{{brand}} (bundan sonra "biz", "platform") olarak kişisel verilerinizin gizliliğine önem veriyoruz. Bu Gizlilik Politikası, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve Genel Veri Koruma Tüzüğü (GDPR) çerçevesinde hangi bilgileri topladığımızı, neden topladığımızı ve nasıl koruduğumuzu açıklar.</p>

<h2>2. Topladığımız Bilgiler</h2>
<ul>
  <li><strong>Hesap bilgileri:</strong> Ad, e-posta, şifre (hash'lenmiş halde saklanır).</li>
  <li><strong>İçerik:</strong> Platforma yüklediğiniz yazı, görsel, yorum.</li>
  <li><strong>Teknik veri:</strong> IP adresi, tarayıcı bilgisi, çerezler aracılığıyla toplanan kullanım istatistikleri.</li>
  <li><strong>Ödeme bilgileri:</strong> Ücretli paketler için, ödeme sağlayıcımız (Stripe / iyzico) üzerinden işlenir; kart bilgileri sunucularımızda saklanmaz.</li>
</ul>

<h2>3. Verilerin Kullanım Amacı</h2>
<ul>
  <li>Hizmeti sağlamak ve sürdürmek</li>
  <li>Hesabınızı ve faturalandırmayı yönetmek</li>
  <li>Güvenlik ve dolandırıcılık önleme</li>
  <li>Yasal yükümlülükleri yerine getirmek</li>
  <li>İletişim kurmak (yalnızca açık rızanız varsa pazarlama amaçlı)</li>
</ul>

<h2>4. Verilerin Üçüncü Kişilerle Paylaşımı</h2>
<p>Kişisel verilerinizi yalnızca aşağıdaki durumlarda paylaşırız:</p>
<ul>
  <li>Yasal zorunluluk gereği (mahkeme kararı, savcılık talebi)</li>
  <li>Hizmet sağlayıcılarımız (barındırma, ödeme, e-posta gönderim) ile yalnızca hizmetin gerektirdiği ölçüde</li>
  <li>Açık rızanızla</li>
</ul>

<h2>5. Veri Güvenliği</h2>
<p>Şifreler PBKDF2-SHA256 (600.000 iterasyon) ile hash'lenir. İletişim TLS 1.3 ile şifrelenir. Yedekler şifreli olarak saklanır.</p>

<h2>6. Haklarınız</h2>
<p>KVKK madde 11 ve GDPR madde 15-22 kapsamında: verilerinize erişim, düzeltme, silme, işlemeyi kısıtlama, taşınabilirlik ve itiraz haklarına sahipsiniz. Talepleriniz için <a href="/legal/iletisim">iletişim sayfası</a>ndan bize ulaşabilirsiniz.</p>

<h2>7. Çerezler</h2>
<p>Çerez kullanımı için ayrıntılı bilgi <a href="/legal/cerez-politikasi">Çerez Politikası</a> sayfamızdadır.</p>

<h2>8. Politika Değişiklikleri</h2>
<p>Bu politikayı güncellediğimizde sayfanın üst kısmındaki tarihi yenileriz. Önemli değişikliklerde kayıtlı e-posta adresinize bildirim göndeririz.</p>
`.trim(),
    content_en: `
<p>Last updated: <time>2026-05-13</time></p>

<h2>1. Overview</h2>
<p>{{brand}} respects the privacy of your personal data. This Privacy Policy explains what we collect, why, and how we protect it under GDPR and Turkey's KVKK (Law No. 6698).</p>

<h2>2. Information We Collect</h2>
<ul>
  <li><strong>Account data:</strong> name, email, password (stored as a hash).</li>
  <li><strong>Content:</strong> posts, images, and comments you upload.</li>
  <li><strong>Technical data:</strong> IP address, browser info, usage analytics via cookies.</li>
  <li><strong>Payment data:</strong> processed by our payment provider (Stripe / iyzico); card details are never stored on our servers.</li>
</ul>

<h2>3. How We Use Your Data</h2>
<ul>
  <li>To provide and maintain the service</li>
  <li>To manage your account and billing</li>
  <li>For security and fraud prevention</li>
  <li>To meet legal obligations</li>
  <li>To communicate with you (marketing only with your explicit consent)</li>
</ul>

<h2>4. Sharing With Third Parties</h2>
<p>We share personal data only when:</p>
<ul>
  <li>Required by law (court order, prosecutor's request)</li>
  <li>With our service providers (hosting, payments, email) — only as needed for the service</li>
  <li>With your explicit consent</li>
</ul>

<h2>5. Data Security</h2>
<p>Passwords are hashed with PBKDF2-SHA256 (600,000 iterations). Traffic is encrypted with TLS 1.3. Backups are stored encrypted.</p>

<h2>6. Your Rights</h2>
<p>Under GDPR Articles 15-22 and KVKK Article 11 you have rights of access, rectification, erasure, restriction, portability, and objection. Contact us via the <a href="/legal/iletisim">contact page</a> to exercise these rights.</p>

<h2>7. Cookies</h2>
<p>See our <a href="/legal/cerez-politikasi">Cookie Policy</a> for details on cookie usage.</p>

<h2>8. Policy Changes</h2>
<p>When we update this policy we'll refresh the date at the top. For material changes, we'll notify you at your registered email.</p>
`.trim(),
  },
  {
    slug: 'kullanim-kosullari',
    title_tr: 'Kullanım Koşulları',
    title_en: 'Terms of Service',
    description_tr: '{{brand}} hizmetlerinin kullanımı için geçerli olan koşullar.',
    description_en: 'Terms governing your use of {{brand}}.',
    footer_label_tr: 'Kullanım Koşulları',
    footer_label_en: 'Terms',
    content_tr: `
<p>Son güncellenme: <time>2026-05-13</time></p>

<h2>1. Taraflar</h2>
<p>Bu sözleşme {{brand}} (bundan sonra "Hizmet Sağlayıcı") ile hizmeti kullanan gerçek veya tüzel kişi (bundan sonra "Kullanıcı") arasındadır.</p>

<h2>2. Hizmet Tanımı</h2>
<p>Hizmet Sağlayıcı, web tabanlı içerik yönetimi platformu sunar. Kullanıcı, kayıt olarak hizmete erişir ve içerik yayınlayabilir.</p>

<h2>3. Kullanım Şartları</h2>
<ul>
  <li>Kullanıcı, hesap bilgilerinin gizliliğinden sorumludur.</li>
  <li>Kullanıcı, yürürlükteki yasalara, kamu düzenine, genel ahlaka aykırı içerik yayınlamaz.</li>
  <li>Telif hakkı ihlali, kişilik haklarına saldırı, ırkçılık, şiddet, terör propagandası, çocuk istismarı içerikleri kesinlikle yasaktır.</li>
  <li>Spam, kötü amaçlı yazılım, phishing içerikleri yayınlanamaz.</li>
  <li>Hizmetin teknik altyapısına zarar verecek (DoS, brute-force, scraping) eylemler yasaktır.</li>
</ul>

<h2>4. Fikri Mülkiyet</h2>
<p>Kullanıcının yüklediği içerik kendisine aittir; ancak Hizmet Sağlayıcı'ya bu içeriği barındırma ve son kullanıcılara dağıtma konusunda dünya çapında, telifsiz, devredilemez bir lisans verir.</p>

<h2>5. Hesap Askıya Alma ve Sonlandırma</h2>
<p>Bu koşulları ihlal eden hesaplar önceden bildirimsiz askıya alınabilir veya silinebilir. Yasalara aykırı içerik ilgili mercilere bildirilebilir.</p>

<h2>6. Ücretlendirme</h2>
<p>Ücretli paketler için ödeme koşulları <a href="/legal/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</a>nde belirtilir.</p>

<h2>7. Sorumluluğun Sınırlandırılması</h2>
<p>Hizmet Sağlayıcı, %99.9 erişilebilirlik hedefler ancak kesintisiz hizmet garantisi vermez. Üçüncü kişi içeriğinden, veri kaybından veya dolaylı zararlardan sorumlu değildir. Sorumluluk her halükarda son 12 ayda Kullanıcı tarafından ödenen ücretle sınırlıdır.</p>

<h2>8. Uygulanacak Hukuk</h2>
<p>Bu sözleşme Türk hukukuna tabidir. Doğacak uyuşmazlıklarda İstanbul (Çağlayan) mahkemeleri ve icra daireleri yetkilidir.</p>

<h2>9. Değişiklikler</h2>
<p>Bu koşullar zaman zaman güncellenebilir. Değişiklikler bu sayfada yayınlandığı an yürürlüğe girer; önemli değişiklikler için kayıtlı e-postaya bildirim gönderilir.</p>
`.trim(),
    content_en: `
<p>Last updated: <time>2026-05-13</time></p>

<h2>1. Parties</h2>
<p>This agreement is between {{brand}} ("Provider") and the individual or entity using the service ("User").</p>

<h2>2. The Service</h2>
<p>Provider offers a web-based content management platform. Users register to access the service and publish content.</p>

<h2>3. Acceptable Use</h2>
<ul>
  <li>User is responsible for keeping account credentials confidential.</li>
  <li>No content may violate applicable laws, public order, or general morality.</li>
  <li>Copyright infringement, defamation, hate speech, terrorism, and child exploitation are strictly forbidden.</li>
  <li>Spam, malware, and phishing are prohibited.</li>
  <li>Attacks on the platform infrastructure (DoS, brute-force, scraping) are forbidden.</li>
</ul>

<h2>4. Intellectual Property</h2>
<p>User retains ownership of uploaded content but grants Provider a worldwide, royalty-free, non-transferable license to host and distribute that content to end users.</p>

<h2>5. Suspension and Termination</h2>
<p>Accounts violating these terms may be suspended or deleted without prior notice. Illegal content may be reported to authorities.</p>

<h2>6. Pricing</h2>
<p>Payment terms for paid plans are in the <a href="/legal/mesafeli-satis-sozlesmesi">Distance Sales Agreement</a>.</p>

<h2>7. Limitation of Liability</h2>
<p>Provider targets 99.9% uptime but does not guarantee uninterrupted service. Not responsible for third-party content, data loss, or indirect damages. Total liability is in any case capped at the fees paid by User in the preceding 12 months.</p>

<h2>8. Governing Law</h2>
<p>These terms are governed by Turkish law. Disputes are subject to the jurisdiction of Istanbul (Çağlayan) courts.</p>

<h2>9. Changes</h2>
<p>These terms may be updated. Changes take effect when published; material changes are also notified to your registered email.</p>
`.trim(),
  },
  {
    slug: 'kvkk',
    title_tr: 'KVKK Aydınlatma Metni',
    title_en: 'KVKK / GDPR Notice',
    description_tr: '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.',
    description_en: 'KVKK (Turkish Personal Data Protection Law) information notice.',
    footer_label_tr: 'KVKK',
    footer_label_en: 'KVKK',
    content_tr: `
<p>Son güncellenme: <time>2026-05-13</time></p>

<h2>Veri Sorumlusu</h2>
<p>{{brand}}, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca veri sorumlusu sıfatıyla hareket eder. Bu aydınlatma metni KVKK md. 10 kapsamındaki bilgilendirme yükümlülüğümüzü yerine getirmek üzere hazırlanmıştır.</p>

<h2>İşlenen Kişisel Veri Kategorileri</h2>
<ul>
  <li><strong>Kimlik:</strong> ad-soyad, kullanıcı adı</li>
  <li><strong>İletişim:</strong> e-posta, telefon (opsiyonel)</li>
  <li><strong>Müşteri işlem:</strong> abonelik geçmişi, fatura bilgileri</li>
  <li><strong>İşlem güvenliği:</strong> IP, oturum logları, 2FA kayıtları</li>
  <li><strong>Pazarlama:</strong> açık rıza varsa kampanya tercihleri</li>
</ul>

<h2>İşleme Amaçları</h2>
<ul>
  <li>Sözleşmenin ifası (hizmetin sağlanması)</li>
  <li>Yasal yükümlülüğün yerine getirilmesi (vergi, ticari iletişim, talep cevaplama)</li>
  <li>Veri sorumlusunun meşru menfaati (dolandırıcılık önleme, hizmet iyileştirme)</li>
  <li>Açık rıza alınması (pazarlama, kişiselleştirme, çerez)</li>
</ul>

<h2>Veri İşlemenin Hukuki Sebepleri</h2>
<p>KVKK md. 5/2(c), 5/2(ç), 5/2(e), 5/2(f) ve gerekli hallerde md. 5/1 (açık rıza).</p>

<h2>Verilerin Aktarımı</h2>
<p>Kişisel verileriniz yalnızca:</p>
<ul>
  <li>Yetkili kamu kurum ve kuruluşlarına, yasal zorunluluk halinde</li>
  <li>Hizmet sağlayıcılarımıza (barındırma — Cloudflare, ödeme — Stripe/iyzico, e-posta — Resend), hizmetin gerektirdiği ölçüde</li>
  <li>Açık rızanız varsa diğer alıcılara</li>
</ul>
<p>Yurt dışına aktarım söz konusu olduğunda, KVKK md. 9 hükümleri ve KVK Kurulu'nun ilgili kararları gözetilir.</p>

<h2>İlgili Kişinin Hakları (KVKK md. 11)</h2>
<p>Veri sahibi olarak şu haklara sahipsiniz:</p>
<ul>
  <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
  <li>İşlenmişse buna ilişkin bilgi talep etme</li>
  <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
  <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
  <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
  <li>KVKK md. 7'de öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme</li>
  <li>Düzeltme, silme, yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
  <li>Otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
  <li>Hukuka aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
</ul>

<h2>Başvuru Yöntemi</h2>
<p>KVKK md. 13 kapsamındaki taleplerinizi yazılı olarak veya Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ kapsamında <a href="/legal/iletisim">iletişim sayfası</a>ndaki adreslere iletebilirsiniz. Başvurunuza en geç 30 gün içinde yanıt verilir.</p>
`.trim(),
    content_en: `
<p>Last updated: <time>2026-05-13</time></p>

<h2>Data Controller</h2>
<p>{{brand}} acts as data controller under Turkey's Law No. 6698 on the Protection of Personal Data ("KVKK"). This notice fulfils our information obligation under KVKK Article 10.</p>

<h2>Categories of Personal Data Processed</h2>
<ul>
  <li><strong>Identity:</strong> name, username</li>
  <li><strong>Contact:</strong> email, phone (optional)</li>
  <li><strong>Customer transactions:</strong> subscription history, billing info</li>
  <li><strong>Security:</strong> IP, session logs, 2FA records</li>
  <li><strong>Marketing:</strong> with explicit consent, campaign preferences</li>
</ul>

<h2>Purpose of Processing</h2>
<ul>
  <li>Performance of contract (service delivery)</li>
  <li>Compliance with legal obligations</li>
  <li>Legitimate interests of the data controller (fraud prevention, service improvement)</li>
  <li>Where required, your explicit consent (marketing, personalisation, cookies)</li>
</ul>

<h2>Transfer of Data</h2>
<p>Personal data is shared only with:</p>
<ul>
  <li>Authorised public authorities, where legally required</li>
  <li>Our service providers (hosting — Cloudflare, payments — Stripe/iyzico, email — Resend), only as needed</li>
  <li>Other recipients with your explicit consent</li>
</ul>
<p>International transfers follow KVKK Article 9 and decisions of the KVK Board.</p>

<h2>Data Subject Rights</h2>
<p>You have the rights of access, rectification, erasure, restriction, portability, and objection, plus the right to know third-party transfers and to seek damages for unlawful processing. Submit requests via the <a href="/legal/iletisim">contact page</a>. We respond within 30 days.</p>
`.trim(),
  },
  {
    slug: 'durum',
    title_tr: 'Sistem Durumu',
    title_en: 'System Status',
    description_tr: '{{brand}} altyapısının canlı durum sayfası.',
    description_en: 'Live status of {{brand}} infrastructure.',
    footer_label_tr: 'Durum',
    footer_label_en: 'Status',
    content_tr: `
<p>Bu sayfa hizmetlerimizin anlık durumunu gösterir.</p>

<h2>Bileşenler</h2>
<ul>
  <li>✅ <strong>Web (Cloudflare Workers)</strong> — Operasyonel</li>
  <li>✅ <strong>Veritabanı (D1)</strong> — Operasyonel</li>
  <li>✅ <strong>Medya (R2)</strong> — Operasyonel</li>
  <li>✅ <strong>Admin Paneli</strong> — Operasyonel</li>
  <li>✅ <strong>E-posta gönderimi</strong> — Operasyonel</li>
  <li>✅ <strong>Ödeme (Stripe/iyzico)</strong> — Operasyonel</li>
</ul>

<h2>Bakım Pencereleri</h2>
<p>Planlı bakım yok.</p>

<h2>Geçmiş Olaylar</h2>
<p>Son 30 günde raporlanmış bir olay bulunmuyor.</p>

<h2>Bildirim ve Sorun Bildirme</h2>
<p>Hizmet sorunu fark ettiyseniz <a href="/legal/iletisim">iletişim sayfası</a>ndan bize ulaşabilirsiniz. Önemli kesintiler için kayıtlı e-postanıza bilgi verilir.</p>

<p><em>Not: Bu sayfa şu an statik olarak güncellenmektedir. Otomatik canlı izleme sayfası yakında devreye girecektir.</em></p>
`.trim(),
    content_en: `
<p>Live status of our services.</p>

<h2>Components</h2>
<ul>
  <li>✅ <strong>Web (Cloudflare Workers)</strong> — Operational</li>
  <li>✅ <strong>Database (D1)</strong> — Operational</li>
  <li>✅ <strong>Media (R2)</strong> — Operational</li>
  <li>✅ <strong>Admin Panel</strong> — Operational</li>
  <li>✅ <strong>Email delivery</strong> — Operational</li>
  <li>✅ <strong>Payments (Stripe/iyzico)</strong> — Operational</li>
</ul>

<h2>Maintenance</h2>
<p>No scheduled maintenance.</p>

<h2>Recent Incidents</h2>
<p>No incidents reported in the last 30 days.</p>

<h2>Reporting Issues</h2>
<p>If you notice a problem, please <a href="/legal/iletisim">contact us</a>. Major outages are also notified at your registered email.</p>

<p><em>Note: this page is currently maintained manually; an automated live status page is coming soon.</em></p>
`.trim(),
  },
  {
    slug: 'mesafeli-satis-sozlesmesi',
    title_tr: 'Mesafeli Satış Sözleşmesi',
    title_en: 'Distance Sales Agreement',
    description_tr: '6502 sayılı Tüketicinin Korunması Kanunu ve Mesafeli Sözleşmeler Yönetmeliği uyarınca mesafeli satış sözleşmesi.',
    description_en: 'Distance sales agreement per Turkish consumer law.',
    footer_label_tr: 'Mesafeli Satış',
    footer_label_en: 'Sales Agreement',
    content_tr: `
<p>Son güncellenme: <time>2026-05-13</time></p>

<h2>1. Taraflar</h2>
<p><strong>Satıcı:</strong> {{brand}}<br>
<strong>Alıcı:</strong> Sipariş veren kullanıcı (üyelik bilgilerinde belirtilen kişi/tüzel kişi).</p>

<h2>2. Konu</h2>
<p>İşbu sözleşme, Alıcı'nın {{brand}} platformundan satın aldığı dijital hizmet/abonelik paketi için 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca tarafların hak ve yükümlülüklerini düzenler.</p>

<h2>3. Hizmet Bilgisi</h2>
<p>Satın alınan paket, satın alma akışı sırasında Alıcı'ya gösterilen sayfada belirtilen özelliklere sahiptir. Paket fiyatı, vergiler dahil olarak gösterilir.</p>

<h2>4. Ödeme</h2>
<ul>
  <li>Ödeme kredi kartı veya banka kartı ile yapılır.</li>
  <li>Ödeme işlemleri PCI-DSS sertifikalı ödeme sağlayıcıları (Stripe, iyzico) üzerinden yürütülür. Kart bilgileri Satıcı sunucularında saklanmaz.</li>
  <li>Aylık veya yıllık abonelikler otomatik yenilenir; Alıcı dilediği zaman iptal edebilir.</li>
</ul>

<h2>5. Hizmetin İfası</h2>
<p>Ödeme onayının ardından paket Alıcı'nın hesabına anında aktif edilir. Dijital hizmet kesintisiz sunulur (planlı bakım hariç).</p>

<h2>6. Cayma Hakkı</h2>
<p>Mesafeli Sözleşmeler Yönetmeliği md. 15(1)(ğ) uyarınca, Alıcı'nın onayı ile ifasına başlanmış olan dijital içerik ve hizmetlere ilişkin sözleşmelerde cayma hakkı kullanılamaz. Alıcı satın alma akışı sırasında bu konuda açık şekilde bilgilendirilir.</p>
<p>Buna rağmen Satıcı, ilk 14 gün içinde hizmeti hiç kullanmamış (hiçbir yazı yayınlamamış, medya yüklememiş) Alıcılara talepleri üzerine tam iade yapma hakkını saklı tutar.</p>

<h2>7. Abonelik Yenileme ve İptal</h2>
<ul>
  <li>Abonelikler dönem sonunda otomatik yenilenir.</li>
  <li>İptal, hesap ayarları > abonelik sayfasından tek tıklama ile yapılır.</li>
  <li>İptal, mevcut dönemin sonunda etkili olur; kalan süre içinde hizmet kullanılmaya devam edilebilir.</li>
  <li>Otomatik yenilenmeden önce kayıtlı e-postaya hatırlatma gönderilir.</li>
</ul>

<h2>8. Uyuşmazlık Çözümü</h2>
<p>Alıcı şikayetlerini öncelikle <a href="/legal/iletisim">iletişim sayfası</a>ndan iletmelidir. Çözüme kavuşmayan uyuşmazlıklarda 6502 sayılı kanun md. 68'de belirtilen parasal sınırlar dahilinde Tüketici Hakem Heyetlerine veya Tüketici Mahkemelerine başvurulabilir.</p>

<h2>9. Yetki</h2>
<p>İşbu sözleşmeden doğan uyuşmazlıklarda İstanbul (Çağlayan) Tüketici Mahkemeleri ve İcra Daireleri yetkilidir.</p>

<h2>10. Yürürlük</h2>
<p>Alıcı, satın alma akışında bu sözleşmeyi okuyup onayladığını beyan eder. Sözleşme onaylandığı an yürürlüğe girer.</p>
`.trim(),
    content_en: `
<p>Last updated: <time>2026-05-13</time></p>

<h2>1. Parties</h2>
<p><strong>Seller:</strong> {{brand}}<br>
<strong>Buyer:</strong> the user placing the order (as identified in their account).</p>

<h2>2. Subject</h2>
<p>This agreement governs the rights and obligations of the parties regarding the digital service/subscription package purchased on {{brand}} under Turkey's Consumer Protection Law No. 6502 and the Distance Sales Regulation.</p>

<h2>3. Service Description</h2>
<p>The purchased package has the features shown to the Buyer during checkout. Prices are displayed inclusive of tax.</p>

<h2>4. Payment</h2>
<ul>
  <li>Payment is by credit card or bank card.</li>
  <li>Transactions go through PCI-DSS compliant providers (Stripe, iyzico). Card details are never stored on Seller's servers.</li>
  <li>Monthly or yearly subscriptions renew automatically; the Buyer may cancel any time.</li>
</ul>

<h2>5. Delivery</h2>
<p>The package activates instantly upon payment confirmation. The digital service is offered continuously (excepting scheduled maintenance).</p>

<h2>6. Right of Withdrawal</h2>
<p>Per Article 15(1)(ğ) of the Distance Sales Regulation, the right of withdrawal does not apply to digital content/services whose performance has begun with the Buyer's consent. The Buyer is clearly informed of this at checkout.</p>
<p>Nonetheless, Seller reserves the right to refund Buyers who within the first 14 days have not used the service at all (no posts published, no media uploaded), upon request.</p>

<h2>7. Renewal and Cancellation</h2>
<ul>
  <li>Subscriptions auto-renew at the end of each period.</li>
  <li>Cancellation is one-click in Account → Subscription.</li>
  <li>Cancellation takes effect at the end of the current period; service may be used until then.</li>
  <li>A reminder email is sent before auto-renewal.</li>
</ul>

<h2>8. Dispute Resolution</h2>
<p>Buyers should first contact Seller via the <a href="/legal/iletisim">contact page</a>. Unresolved disputes may be brought to Turkish consumer arbitration boards or consumer courts as per Law No. 6502, Article 68.</p>

<h2>9. Jurisdiction</h2>
<p>Istanbul (Çağlayan) consumer courts and enforcement offices have jurisdiction.</p>

<h2>10. Effectiveness</h2>
<p>The Buyer declares to have read and approved this agreement at checkout; it takes effect upon approval.</p>
`.trim(),
  },
  {
    slug: 'iade-politikasi',
    title_tr: 'İade Politikası',
    title_en: 'Refund Policy',
    description_tr: 'Ücretli paketler için iade ve cayma koşulları.',
    description_en: 'Refund and withdrawal terms for paid plans.',
    footer_label_tr: 'İade Politikası',
    footer_label_en: 'Refunds',
    content_tr: `
<p>Son güncellenme: <time>2026-05-13</time></p>

<h2>1. Genel</h2>
<p>{{brand}} dijital hizmet sunan bir CMS platformudur. İade ve cayma koşulları aşağıda açıklanmıştır.</p>

<h2>2. Yasal Cayma Hakkı</h2>
<p>Mesafeli Sözleşmeler Yönetmeliği md. 15(1)(ğ) uyarınca, Alıcı'nın açık rızasıyla ifasına başlanmış dijital içerik ve hizmetler için cayma hakkı kullanılamaz. Bu durum satın alma akışında açıkça belirtilmektedir.</p>

<h2>3. Memnuniyet Garantisi (İlk 14 Gün)</h2>
<p>Yasal cayma hakkı uygulanmasa dahi, satın alma tarihinden itibaren ilk 14 gün içinde:</p>
<ul>
  <li>Hesabınızda hiç yazı yayınlamadıysanız,</li>
  <li>Hiç medya yüklemediyseniz,</li>
  <li>Hiç site oluşturmadıysanız,</li>
</ul>
<p>iade talebinde bulunabilirsiniz. Talep onaylanırsa ödeme aynı yöntemle 5-14 iş günü içinde iade edilir.</p>

<h2>4. Abonelik İptali (İade Olmaksızın)</h2>
<p>14 günü geçen abonelikler iptal edilebilir ancak otomatik iade yapılmaz. İptal mevcut dönem sonunda etkili olur — kalan süre boyunca hizmet kullanılmaya devam edilebilir.</p>

<h2>5. Kısmi İade Halleri</h2>
<p>Aşağıdaki durumlarda kısmi veya tam iade değerlendirilir:</p>
<ul>
  <li>Hizmette 24 saati aşan ve önceden duyurulmamış kesinti</li>
  <li>Faturalandırma hatası (iki kez tahsilat, yanlış tutar)</li>
  <li>Hizmetin reklamlardaki/sözleşmedeki özelliklere materyal olarak uymadığı kanıtlanan durumlar</li>
</ul>

<h2>6. İade Yöntemi</h2>
<p>İadeler her zaman orijinal ödeme yöntemine (kredi kartı / banka kartı) yapılır. Banka tarafındaki yansıma süresi 5-14 iş günü olabilir.</p>

<h2>7. Talep Süreci</h2>
<p>İade talepleri için <a href="/legal/iletisim">iletişim sayfası</a>ndan bizimle iletişime geçin. Talepler 5 iş günü içinde değerlendirilir ve sonuç e-posta ile bildirilir.</p>
`.trim(),
    content_en: `
<p>Last updated: <time>2026-05-13</time></p>

<h2>1. Overview</h2>
<p>{{brand}} is a digital CMS service. The refund and withdrawal terms below apply.</p>

<h2>2. Statutory Right of Withdrawal</h2>
<p>Under Turkey's Distance Sales Regulation Article 15(1)(ğ), the right of withdrawal does not apply to digital content/services whose performance has begun with the Buyer's consent. This is disclosed at checkout.</p>

<h2>3. 14-Day Satisfaction Refund</h2>
<p>Even though the statutory right of withdrawal does not apply, you may request a refund within 14 days of purchase if:</p>
<ul>
  <li>You have not published any posts,</li>
  <li>You have not uploaded any media,</li>
  <li>You have not created any sites.</li>
</ul>
<p>Approved refunds return to the original payment method within 5-14 business days.</p>

<h2>4. Subscription Cancellation (No Refund)</h2>
<p>After 14 days you can cancel any time, but no automatic refund is issued. Cancellation takes effect at the end of the current period; you may use the service until then.</p>

<h2>5. Partial Refunds</h2>
<p>We consider partial or full refunds in the following cases:</p>
<ul>
  <li>Service outage exceeding 24 hours without prior notice</li>
  <li>Billing errors (double charge, wrong amount)</li>
  <li>Demonstrable material discrepancy between advertised and delivered service</li>
</ul>

<h2>6. Refund Method</h2>
<p>Refunds always go back to the original payment method (credit/debit card). Bank settlement may take 5-14 business days.</p>

<h2>7. Submitting a Request</h2>
<p>Contact us via the <a href="/legal/iletisim">contact page</a>. Requests are reviewed within 5 business days; the outcome is communicated by email.</p>
`.trim(),
  },
  {
    slug: 'cerez-politikasi',
    title_tr: 'Çerez Politikası',
    title_en: 'Cookie Policy',
    description_tr: 'Web sitesinde kullanılan çerez ve benzeri teknolojiler hakkında bilgilendirme.',
    description_en: 'Information about cookies and similar technologies used on our site.',
    footer_label_tr: 'Çerez Politikası',
    footer_label_en: 'Cookies',
    content_tr: `
<p>Son güncellenme: <time>2026-05-13</time></p>

<h2>Çerez Nedir?</h2>
<p>Çerez, ziyaret ettiğiniz web siteleri tarafından tarayıcınıza yerleştirilen küçük metin dosyalarıdır. Çerezler, sitenin daha iyi çalışmasını, tercihlerinizin hatırlanmasını ve kullanım istatistiklerinin toplanmasını sağlar.</p>

<h2>Kullandığımız Çerez Türleri</h2>
<ul>
  <li><strong>Zorunlu çerezler:</strong> Oturum yönetimi, güvenlik, ödeme akışı için. Bu çerezler olmadan site çalışmaz; rıza gerekmez.</li>
  <li><strong>Tercih çerezleri:</strong> Dil, tema (aydınlık/karanlık), arayüz seçenekleri.</li>
  <li><strong>Analitik çerezler:</strong> Anonim sayfa görüntüleme, oturum süresi, hangi sayfaların popüler olduğu gibi istatistikler. Açık rızanızla.</li>
  <li><strong>Pazarlama çerezleri:</strong> Yalnızca açık rızanızla, kampanya/yeniden hedefleme amaçlı.</li>
</ul>

<h2>Üçüncü Taraf Çerezleri</h2>
<p>Aşağıdaki üçüncü tarafların çerezlerini kullanabiliriz:</p>
<ul>
  <li>Cloudflare — performans ve güvenlik (zorunlu)</li>
  <li>Google Analytics — anonim istatistik (rızanızla)</li>
  <li>Stripe / iyzico — ödeme akışı (zorunlu)</li>
  <li>YouTube / Vimeo / Twitter — gömülü içerik (sayfaya yerleştirildiğinde)</li>
</ul>

<h2>Çerezleri Yönetme</h2>
<p>Tarayıcınızın ayarlarından çerezleri silebilir, engelleyebilir veya bildirim alacak şekilde ayarlayabilirsiniz. Zorunlu çerezleri devre dışı bırakırsanız site bazı işlevlerini kaybeder (oturum açamama, ödeme yapamama gibi).</p>

<h2>İzin Geri Çekme</h2>
<p>Açık rıza verdiğiniz çerezler için izinlerinizi dilediğiniz zaman geri çekebilirsiniz. Çerez tercih merkezimiz site alt çubuğundan erişilebilir (yakında devreye girecektir).</p>

<h2>Daha Fazla Bilgi</h2>
<p><a href="/legal/gizlilik">Gizlilik Politikası</a>nda ve <a href="/legal/kvkk">KVKK Aydınlatma Metni</a>nde kişisel veri işleme hakkında ek bilgi bulabilirsiniz.</p>
`.trim(),
    content_en: `
<p>Last updated: <time>2026-05-13</time></p>

<h2>What Is a Cookie?</h2>
<p>A cookie is a small text file a website places in your browser. Cookies help the site work better, remember your preferences, and collect usage statistics.</p>

<h2>Cookies We Use</h2>
<ul>
  <li><strong>Strictly necessary:</strong> session management, security, payments. The site cannot function without these; no consent required.</li>
  <li><strong>Preference:</strong> language, theme (light/dark), UI choices.</li>
  <li><strong>Analytics:</strong> anonymous page views, session length, popular pages — with your explicit consent.</li>
  <li><strong>Marketing:</strong> only with explicit consent, for campaigns/retargeting.</li>
</ul>

<h2>Third-Party Cookies</h2>
<ul>
  <li>Cloudflare — performance and security (essential)</li>
  <li>Google Analytics — anonymous statistics (with consent)</li>
  <li>Stripe / iyzico — payment flow (essential)</li>
  <li>YouTube / Vimeo / Twitter — embedded content</li>
</ul>

<h2>Managing Cookies</h2>
<p>You can delete or block cookies from your browser settings. Disabling essential cookies will break parts of the site (login, payments).</p>

<h2>Withdrawing Consent</h2>
<p>You may withdraw consent at any time. A cookie preference centre will be accessible from the site footer (coming soon).</p>

<h2>More Information</h2>
<p>See our <a href="/legal/gizlilik">Privacy Policy</a> and <a href="/legal/kvkk">KVKK Notice</a> for additional details on personal data processing.</p>
`.trim(),
  },
  {
    slug: 'iletisim',
    title_tr: 'İletişim',
    title_en: 'Contact',
    description_tr: '{{brand}} ile iletişime geçin.',
    description_en: 'Get in touch with {{brand}}.',
    footer_label_tr: 'İletişim',
    footer_label_en: 'Contact',
    content_tr: `
<h2>Bize Ulaşın</h2>

<p>Aşağıdaki kanallar üzerinden bizimle iletişime geçebilirsiniz. Genel sorular için 1-2 iş günü, yasal/KVKK talepler için 30 günlük yanıt süresini hedefliyoruz.</p>

<h2>E-posta</h2>
<ul>
  <li><strong>Genel destek:</strong> <a href="mailto:destek@workercms.com">destek@workercms.com</a></li>
  <li><strong>Faturalandırma:</strong> <a href="mailto:fatura@workercms.com">fatura@workercms.com</a></li>
  <li><strong>KVKK / veri sahibi başvuruları:</strong> <a href="mailto:kvkk@workercms.com">kvkk@workercms.com</a></li>
  <li><strong>Güvenlik açıkları:</strong> <a href="mailto:guvenlik@workercms.com">guvenlik@workercms.com</a> (responsible disclosure)</li>
</ul>

<h2>Şirket Bilgileri</h2>
<p>Şirket unvanı, adresi, vergi dairesi/no, MERSIS no ve telefon bilgilerinin admin panelinden site ayarları üzerinden eklenmesi gerekmektedir. Bu bilgi henüz tamamlanmamıştır.</p>

<h2>Yasal Bildirimler</h2>
<p>Resmi yazışmalar için yukarıdaki e-posta adresinden kayıtlı elektronik posta (KEP) adresimiz talep edilebilir.</p>
`.trim(),
    content_en: `
<h2>Get in Touch</h2>

<p>You can reach us through the channels below. We aim to reply to general questions within 1-2 business days, and to legal/data-subject requests within 30 days.</p>

<h2>Email</h2>
<ul>
  <li><strong>General support:</strong> <a href="mailto:support@workercms.com">support@workercms.com</a></li>
  <li><strong>Billing:</strong> <a href="mailto:billing@workercms.com">billing@workercms.com</a></li>
  <li><strong>KVKK / data-subject requests:</strong> <a href="mailto:kvkk@workercms.com">kvkk@workercms.com</a></li>
  <li><strong>Security vulnerabilities:</strong> <a href="mailto:security@workercms.com">security@workercms.com</a> (responsible disclosure)</li>
</ul>

<h2>Company Details</h2>
<p>Company name, address, tax office/number, MERSIS number and phone must be added by the site admin via site settings. This information is not yet complete.</p>

<h2>Official Notices</h2>
<p>For official correspondence you may request our KEP (registered electronic mail) address at the email above.</p>
`.trim(),
  },
];

export function findLegalPage(slug: string): LegalPage | null {
  return LEGAL_PAGES.find((p) => p.slug === slug) ?? null;
}

export function renderLegalContent(html: string, brand: string): string {
  return html.replace(/\{\{brand\}\}/g, brand);
}

export function legalFooterLinks(lang: 'tr' | 'en'): { text: string; url: string }[] {
  return LEGAL_PAGES.map((p) => ({
    text: lang === 'en' ? p.footer_label_en : p.footer_label_tr,
    url: `/legal/${p.slug}`,
  }));
}
