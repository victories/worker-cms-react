// Default legal/policy page content shipped with the platform.
//
// These render under `/legal/:slug` for every site. They are intentionally
// generic; once a site admin wants custom copy they can publish a regular
// page with the same slug from the CMS. The product/brand name is kept as a
// `{{brand}}` placeholder — replaced at render time with the site name.
//
// LEGAL FRAMEWORK (2026-06-04): the operating company is now COMPANY NAME
// LTD, a company registered in England and Wales (company no. YOUR_COMPANY_NUMBER,
// registered office YOUR REGISTERED OFFICE ADDRESS).
// The product sells globally and accepts card subscriptions, so the
// contracts are written under the laws of England and Wales:
//   - Data protection: UK GDPR + Data Protection Act 2018 (and EU GDPR for
//     visitors in the EU). KVKK is kept as a secondary notice for users in
//     Turkey only.
//   - Consumer / distance selling: Consumer Rights Act 2015 + the Consumer
//     Contracts (Information, Cancellation and Additional Charges)
//     Regulations 2013 — including the digital-content exception to the
//     14-day cancellation right.
// English (`content_en`) is the authoritative copy; Turkish is a
// translation. The VAT number is a placeholder until COMPANY NAME LTD is
// VAT-registered. Legal-counsel review is recommended before launch.

// Operating company details, reused across pages.
const COMPANY = {
  name: 'COMPANY NAME LTD',
  number: 'YOUR_COMPANY_NUMBER',
  addressLine: 'YOUR REGISTERED OFFICE ADDRESS',
  jurisdiction: 'England and Wales',
};

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
<p>Son güncellenme: <time>2026-06-04</time></p>

<h2>1. Veri Sorumlusu</h2>
<p>{{brand}}, ${COMPANY.name} tarafından işletilen bir hizmettir. ${COMPANY.name}, ${COMPANY.jurisdiction} hukukuna göre kurulmuş bir şirkettir (şirket no. ${COMPANY.number}, kayıtlı adres: ${COMPANY.addressLine}). Bu Gizlilik Politikası, Birleşik Krallık Genel Veri Koruma Tüzüğü (UK GDPR) ve 2018 Veri Koruma Kanunu (Data Protection Act 2018) çerçevesinde — Avrupa Birliği'ndeki kullanıcılar için ayrıca AB GDPR uyarınca — hangi bilgileri topladığımızı, neden topladığımızı ve nasıl koruduğumuzu açıklar.</p>

<h2>2. Topladığımız Bilgiler</h2>
<ul>
  <li><strong>Hesap bilgileri:</strong> Ad, e-posta, şifre (hash'lenmiş halde saklanır).</li>
  <li><strong>İçerik:</strong> Platforma yüklediğiniz yazı, görsel, yorum.</li>
  <li><strong>Teknik veri:</strong> IP adresi, tarayıcı bilgisi, çerezler aracılığıyla toplanan kullanım istatistikleri.</li>
  <li><strong>Ödeme bilgileri:</strong> Ücretli paketler için, ödeme sağlayıcımız (Stripe) üzerinden işlenir; kart bilgileri sunucularımızda saklanmaz.</li>
</ul>

<h2>3. İşleme Amaçları ve Hukuki Dayanak</h2>
<p>Verilerinizi UK GDPR madde 6 kapsamında şu hukuki dayanaklarla işleriz:</p>
<ul>
  <li>Sözleşmenin ifası — hizmeti sağlamak, hesabınızı ve faturalandırmayı yönetmek</li>
  <li>Meşru menfaat — güvenlik, dolandırıcılık önleme, hizmet iyileştirme</li>
  <li>Yasal yükümlülük — muhasebe, vergi ve hukuki taleplere yanıt</li>
  <li>Açık rıza — yalnızca rızanız varsa pazarlama ve isteğe bağlı çerezler</li>
</ul>

<h2>4. Verilerin Üçüncü Kişilerle Paylaşımı</h2>
<p>Kişisel verilerinizi yalnızca aşağıdaki durumlarda paylaşırız:</p>
<ul>
  <li>Yasal zorunluluk gereği (mahkeme kararı, yetkili merci talebi)</li>
  <li>Hizmet sağlayıcılarımız (barındırma — Cloudflare, ödeme — Stripe, e-posta — Resend) ile yalnızca hizmetin gerektirdiği ölçüde</li>
  <li>Açık rızanızla</li>
</ul>

<h2>5. Uluslararası Veri Aktarımı</h2>
<p>Verileriniz Birleşik Krallık veya AB dışına aktarıldığında, UK GDPR'ın gerektirdiği güvenceleri (yeterlilik kararları, Standart Sözleşme Maddeleri / Uluslararası Veri Aktarım Anlaşması — IDTA) uygularız.</p>

<h2>6. Veri Güvenliği ve Saklama</h2>
<p>Şifreler PBKDF2-SHA256 (100.000 iterasyon) ile hash'lenir. İletişim TLS 1.3 ile şifrelenir. Yedekler şifreli saklanır. Verileri yalnızca bu politikada belirtilen amaçlar için gerekli olduğu sürece tutarız.</p>

<h2>7. Haklarınız</h2>
<p>UK GDPR kapsamında: verilerinize erişim, düzeltme, silme, işlemeyi kısıtlama, taşınabilirlik ve itiraz haklarına sahipsiniz. Taleplerinizi <a href="/legal/iletisim">iletişim sayfası</a>ndan iletebilirsiniz. Ayrıca veri işleme uygulamalarımızdan memnun değilseniz Birleşik Krallık denetim makamı olan Bilgi Komiserliği Ofisi'ne (ICO — <a href="https://ico.org.uk" rel="nofollow noopener" target="_blank">ico.org.uk</a>) şikâyette bulunma hakkınız vardır.</p>

<h2>8. Çerezler</h2>
<p>Çerez kullanımı için ayrıntılı bilgi <a href="/legal/cerez-politikasi">Çerez Politikası</a> sayfamızdadır.</p>

<h2>9. Politika Değişiklikleri</h2>
<p>Bu politikayı güncellediğimizde sayfanın üst kısmındaki tarihi yenileriz. Önemli değişikliklerde kayıtlı e-posta adresinize bildirim göndeririz.</p>
`.trim(),
    content_en: `
<p>Last updated: <time>2026-06-04</time></p>

<h2>1. Data Controller</h2>
<p>{{brand}} is a service operated by ${COMPANY.name}, a company registered in ${COMPANY.jurisdiction} (company no. ${COMPANY.number}), with its registered office at ${COMPANY.addressLine}. This Privacy Policy explains what we collect, why, and how we protect it under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018 — and, for users in the EU, the EU GDPR.</p>

<h2>2. Information We Collect</h2>
<ul>
  <li><strong>Account data:</strong> name, email, password (stored as a hash).</li>
  <li><strong>Content:</strong> posts, images, and comments you upload.</li>
  <li><strong>Technical data:</strong> IP address, browser info, usage analytics via cookies.</li>
  <li><strong>Payment data:</strong> processed by our payment provider (Stripe); card details are never stored on our servers.</li>
</ul>

<h2>3. Purposes and Lawful Bases</h2>
<p>We process your data under Article 6 of the UK GDPR on these lawful bases:</p>
<ul>
  <li>Performance of a contract — to provide the service and manage your account and billing</li>
  <li>Legitimate interests — security, fraud prevention, service improvement</li>
  <li>Legal obligation — accounting, tax, and responding to legal requests</li>
  <li>Consent — marketing and optional cookies only where you have consented</li>
</ul>

<h2>4. Sharing With Third Parties</h2>
<p>We share personal data only when:</p>
<ul>
  <li>Required by law (court order or request from a competent authority)</li>
  <li>With our service providers (hosting — Cloudflare, payments — Stripe, email — Resend) — only as needed for the service</li>
  <li>With your explicit consent</li>
</ul>

<h2>5. International Transfers</h2>
<p>Where data is transferred outside the UK or EU, we apply the safeguards required by the UK GDPR (adequacy decisions, Standard Contractual Clauses / the International Data Transfer Agreement).</p>

<h2>6. Security and Retention</h2>
<p>Passwords are hashed with PBKDF2-SHA256 (100,000 iterations). Traffic is encrypted with TLS 1.3. Backups are stored encrypted. We keep data only for as long as necessary for the purposes set out in this policy.</p>

<h2>7. Your Rights</h2>
<p>Under the UK GDPR you have the rights of access, rectification, erasure, restriction, portability, and objection. Contact us via the <a href="/legal/iletisim">contact page</a> to exercise these rights. You also have the right to lodge a complaint with the UK supervisory authority, the Information Commissioner's Office (ICO — <a href="https://ico.org.uk" rel="nofollow noopener" target="_blank">ico.org.uk</a>), if you are unhappy with how we handle your data.</p>

<h2>8. Cookies</h2>
<p>See our <a href="/legal/cerez-politikasi">Cookie Policy</a> for details on cookie usage.</p>

<h2>9. Policy Changes</h2>
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
<p>Son güncellenme: <time>2026-06-04</time></p>

<h2>1. Taraflar</h2>
<p>Bu sözleşme {{brand}} hizmetini işleten ${COMPANY.name} (${COMPANY.jurisdiction}, şirket no. ${COMPANY.number}; bundan sonra "Hizmet Sağlayıcı") ile hizmeti kullanan gerçek veya tüzel kişi (bundan sonra "Kullanıcı") arasındadır.</p>

<h2>2. Hizmet Tanımı</h2>
<p>Hizmet Sağlayıcı, web tabanlı içerik yönetimi platformu sunar. Kullanıcı, kayıt olarak hizmete erişir ve içerik yayınlayabilir.</p>

<h2>3. Kullanım Şartları</h2>
<ul>
  <li>Kullanıcı, hesap bilgilerinin gizliliğinden sorumludur.</li>
  <li>Kullanıcı, yürürlükteki yasalara, kamu düzenine ve genel ahlaka aykırı içerik yayınlamaz.</li>
  <li>Telif hakkı ihlali, kişilik haklarına saldırı, nefret söylemi, şiddet, terör propagandası ve çocuk istismarı içerikleri kesinlikle yasaktır.</li>
  <li>Spam, kötü amaçlı yazılım ve phishing içerikleri yayınlanamaz.</li>
  <li>Hizmetin teknik altyapısına zarar verecek (DoS, brute-force, scraping) eylemler yasaktır.</li>
</ul>

<h2>4. Fikri Mülkiyet</h2>
<p>Kullanıcının yüklediği içerik kendisine aittir; ancak Hizmet Sağlayıcı'ya bu içeriği barındırma ve son kullanıcılara dağıtma konusunda dünya çapında, telifsiz, devredilemez bir lisans verir.</p>

<h2>5. Hesap Askıya Alma ve Sonlandırma</h2>
<p>Bu koşulları ihlal eden hesaplar önceden bildirimsiz askıya alınabilir veya silinebilir. Yasalara aykırı içerik ilgili mercilere bildirilebilir.</p>

<h2>6. Ücretlendirme</h2>
<p>Ücretli paketler için ödeme koşulları <a href="/legal/mesafeli-satis-sozlesmesi">Satış Koşulları</a>nda belirtilir.</p>

<h2>7. Sorumluluğun Sınırlandırılması</h2>
<p>Hizmet Sağlayıcı, %99.9 erişilebilirlik hedefler ancak kesintisiz hizmet garantisi vermez. Üçüncü kişi içeriğinden, veri kaybından veya dolaylı zararlardan sorumlu değildir. Sorumluluk her halükarda son 12 ayda Kullanıcı tarafından ödenen ücretle sınırlıdır. Bu madde, ihmalden kaynaklanan ölüm/bedensel zarar veya yasayla sınırlandırılamayan sorumlulukları kapsamaz.</p>

<h2>8. Uygulanacak Hukuk</h2>
<p>Bu sözleşme ${COMPANY.jurisdiction} (İngiltere ve Galler) hukukuna tabidir ve İngiltere ve Galler mahkemeleri yetkilidir.</p>

<h2>9. Değişiklikler</h2>
<p>Bu koşullar zaman zaman güncellenebilir. Değişiklikler bu sayfada yayınlandığı an yürürlüğe girer; önemli değişiklikler için kayıtlı e-postaya bildirim gönderilir.</p>
`.trim(),
    content_en: `
<p>Last updated: <time>2026-06-04</time></p>

<h2>1. Parties</h2>
<p>This agreement is between ${COMPANY.name} (registered in ${COMPANY.jurisdiction}, company no. ${COMPANY.number}), which operates {{brand}} ("Provider"), and the individual or entity using the service ("User").</p>

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
<p>Payment terms for paid plans are in the <a href="/legal/mesafeli-satis-sozlesmesi">Terms of Sale</a>.</p>

<h2>7. Limitation of Liability</h2>
<p>Provider targets 99.9% uptime but does not guarantee uninterrupted service. Provider is not responsible for third-party content, data loss, or indirect damages. Total liability is in any case capped at the fees paid by User in the preceding 12 months. Nothing in these terms limits liability for death or personal injury caused by negligence, or any other liability that cannot be limited by law.</p>

<h2>8. Governing Law</h2>
<p>These terms are governed by the laws of ${COMPANY.jurisdiction}, and the courts of England and Wales have jurisdiction.</p>

<h2>9. Changes</h2>
<p>These terms may be updated. Changes take effect when published; material changes are also notified to your registered email.</p>
`.trim(),
  },
  {
    slug: 'kvkk',
    title_tr: 'KVKK Aydınlatma Metni (Türkiye)',
    title_en: 'KVKK Notice (Turkey)',
    description_tr: 'Türkiye’deki kullanıcılar için 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.',
    description_en: 'KVKK (Turkish data-protection law) notice for users in Turkey.',
    footer_label_tr: 'KVKK',
    footer_label_en: 'KVKK',
    content_tr: `
<p>Son güncellenme: <time>2026-06-04</time></p>

<p><em>Bu metin, Türkiye'de bulunan kullanıcılarımız için 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında hazırlanmıştır. Birincil veri koruma çerçevemiz UK GDPR olup ayrıntılar <a href="/legal/gizlilik">Gizlilik Politikası</a>'ndadır.</em></p>

<h2>Veri Sorumlusu</h2>
<p>{{brand}} hizmetini işleten ${COMPANY.name} (${COMPANY.jurisdiction}, şirket no. ${COMPANY.number}, kayıtlı adres: ${COMPANY.addressLine}), KVKK uyarınca veri sorumlusu sıfatıyla hareket eder. Bu metin KVKK md. 10 kapsamındaki aydınlatma yükümlülüğümüzü yerine getirir.</p>

<h2>İşlenen Kişisel Veri Kategorileri</h2>
<ul>
  <li><strong>Kimlik:</strong> ad-soyad, kullanıcı adı</li>
  <li><strong>İletişim:</strong> e-posta, telefon (opsiyonel)</li>
  <li><strong>Müşteri işlem:</strong> abonelik geçmişi, fatura bilgileri</li>
  <li><strong>İşlem güvenliği:</strong> IP, oturum logları, 2FA kayıtları</li>
  <li><strong>Pazarlama:</strong> açık rıza varsa kampanya tercihleri</li>
</ul>

<h2>İşleme Amaçları ve Hukuki Sebepler</h2>
<ul>
  <li>Sözleşmenin ifası (hizmetin sağlanması)</li>
  <li>Yasal yükümlülüğün yerine getirilmesi</li>
  <li>Veri sorumlusunun meşru menfaati (dolandırıcılık önleme, hizmet iyileştirme)</li>
  <li>Açık rıza (pazarlama, kişiselleştirme, çerez)</li>
</ul>
<p>Hukuki sebepler: KVKK md. 5/2(c), 5/2(ç), 5/2(e), 5/2(f) ve gerekli hallerde md. 5/1 (açık rıza).</p>

<h2>Verilerin Aktarımı ve Yurt Dışına Aktarım</h2>
<p>Kişisel verileriniz; yetkili kamu kurumlarına yasal zorunluluk halinde, hizmet sağlayıcılarımıza (barındırma — Cloudflare, ödeme — Stripe, e-posta — Resend) hizmetin gerektirdiği ölçüde ve açık rızanız varsa diğer alıcılara aktarılabilir. Hizmet sağlayıcılarımızın bir kısmı yurt dışında bulunduğundan, yurt dışına aktarımda KVKK md. 9 hükümleri ve KVK Kurulu'nun ilgili kararları gözetilir.</p>

<h2>İlgili Kişinin Hakları (KVKK md. 11)</h2>
<ul>
  <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme ve buna ilişkin bilgi talep etme</li>
  <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
  <li>Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme</li>
  <li>Eksik/yanlış işlenmişse düzeltilmesini, KVKK md. 7 çerçevesinde silinmesini/yok edilmesini isteme</li>
  <li>Bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
  <li>Otomatik analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme</li>
  <li>Hukuka aykırı işleme nedeniyle zararın giderilmesini talep etme</li>
</ul>

<h2>Başvuru Yöntemi</h2>
<p>KVKK md. 13 kapsamındaki taleplerinizi <a href="/legal/iletisim">iletişim sayfası</a>ndaki kanallardan iletebilirsiniz. Başvurunuza en geç 30 gün içinde yanıt verilir.</p>
`.trim(),
    content_en: `
<p>Last updated: <time>2026-06-04</time></p>

<p><em>This notice is provided for our users in Turkey under Law No. 6698 on the Protection of Personal Data ("KVKK"). Our primary data-protection framework is the UK GDPR; see the <a href="/legal/gizlilik">Privacy Policy</a> for full details.</em></p>

<h2>Data Controller</h2>
<p>${COMPANY.name} (registered in ${COMPANY.jurisdiction}, company no. ${COMPANY.number}, registered office ${COMPANY.addressLine}), which operates {{brand}}, acts as data controller under KVKK. This notice fulfils our information obligation under KVKK Article 10.</p>

<h2>Categories of Personal Data Processed</h2>
<ul>
  <li><strong>Identity:</strong> name, username</li>
  <li><strong>Contact:</strong> email, phone (optional)</li>
  <li><strong>Customer transactions:</strong> subscription history, billing info</li>
  <li><strong>Security:</strong> IP, session logs, 2FA records</li>
  <li><strong>Marketing:</strong> with explicit consent, campaign preferences</li>
</ul>

<h2>Purposes and Lawful Bases</h2>
<ul>
  <li>Performance of contract (service delivery)</li>
  <li>Compliance with legal obligations</li>
  <li>Legitimate interests of the data controller (fraud prevention, service improvement)</li>
  <li>Explicit consent (marketing, personalisation, cookies)</li>
</ul>

<h2>Transfers, Including Abroad</h2>
<p>Personal data may be shared with authorised public authorities where legally required, with our service providers (hosting — Cloudflare, payments — Stripe, email — Resend) as needed, and with other recipients with your explicit consent. As some providers are located abroad, international transfers follow KVKK Article 9 and decisions of the KVK Board.</p>

<h2>Data Subject Rights (KVKK Article 11)</h2>
<p>You have the rights of access, information, rectification, erasure, restriction, objection to automated decisions, and to seek damages for unlawful processing. Submit requests via the <a href="/legal/iletisim">contact page</a>. We respond within 30 days.</p>
`.trim(),
  },
  {
    // The /legal/durum route renders the live StatusPageView component
    // (see src/routes/public/legal.ts), so this body is not used — the
    // entry stays only for its title/description/footer label.
    slug: 'durum',
    title_tr: 'Sistem Durumu',
    title_en: 'System Status',
    description_tr: '{{brand}} altyapısının canlı durum sayfası.',
    description_en: 'Live status of {{brand}} infrastructure.',
    footer_label_tr: 'Durum',
    footer_label_en: 'Status',
    content_tr: '<p>Canlı sistem durumu sayfası.</p>',
    content_en: '<p>Live system status page.</p>',
  },
  {
    slug: 'mesafeli-satis-sozlesmesi',
    title_tr: 'Satış Koşulları (Mesafeli Sözleşme)',
    title_en: 'Terms of Sale',
    description_tr: 'Birleşik Krallık tüketici mevzuatı uyarınca dijital abonelik satış koşulları.',
    description_en: 'Terms of sale for digital subscriptions under UK consumer law.',
    footer_label_tr: 'Satış Koşulları',
    footer_label_en: 'Terms of Sale',
    content_tr: `
<p>Son güncellenme: <time>2026-06-04</time></p>

<h2>1. Taraflar</h2>
<p><strong>Satıcı:</strong> ${COMPANY.name} ({{brand}} hizmetini işleten; ${COMPANY.jurisdiction}, şirket no. ${COMPANY.number}, kayıtlı adres: ${COMPANY.addressLine}).<br>
<strong>Alıcı:</strong> Sipariş veren kullanıcı (üyelik bilgilerinde belirtilen kişi/tüzel kişi).</p>

<h2>2. Konu</h2>
<p>İşbu sözleşme, Alıcı'nın {{brand}} platformundan satın aldığı dijital hizmet/abonelik paketi için tarafların hak ve yükümlülüklerini düzenler. Sözleşme; Consumer Rights Act 2015 ve Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 dâhil İngiltere ve Galler tüketici mevzuatına tabidir.</p>

<h2>3. Hizmet Bilgisi</h2>
<p>Satın alınan paket, satın alma akışı sırasında Alıcı'ya gösterilen sayfadaki özelliklere sahiptir. Fiyatlar, varsa vergiler dâhil olarak gösterilir.</p>

<h2>4. Ödeme</h2>
<ul>
  <li>Ödeme kredi kartı veya banka kartı ile yapılır.</li>
  <li>Ödeme işlemleri PCI-DSS sertifikalı ödeme sağlayıcısı (Stripe) üzerinden yürütülür. Kart bilgileri Satıcı sunucularında saklanmaz.</li>
  <li>Aylık veya yıllık abonelikler otomatik yenilenir; Alıcı dilediği zaman iptal edebilir.</li>
</ul>

<h2>5. Hizmetin İfası</h2>
<p>Ödeme onayının ardından paket Alıcı'nın hesabına anında aktif edilir. Dijital hizmet kesintisiz sunulur (planlı bakım hariç).</p>

<h2>6. 14 Günlük Cayma Hakkı ve Dijital İçerik İstisnası</h2>
<p>Consumer Contracts Regulations 2013 uyarınca tüketicinin normalde 14 günlük cayma hakkı vardır. Ancak aynı düzenlemenin 37. maddesi gereği, <strong>Alıcı'nın açık onayıyla ve cayma hakkını kaybedeceğini kabul ettiğini beyan etmesiyle</strong> ifasına başlanan dijital içerik/hizmetlerde bu hak sona erer. Alıcı, satın alma akışında bu konuda açıkça bilgilendirilir ve onay verir.</p>
<p>Buna rağmen Satıcı, ilk 14 gün içinde hizmeti hiç kullanmamış (hiçbir yazı yayınlamamış, medya yüklememiş, site oluşturmamış) Alıcılara talepleri üzerine tam iade yapma hakkını saklı tutar. Ayrıntılar <a href="/legal/iade-politikasi">İade Politikası</a>'ndadır.</p>

<h2>7. Abonelik Yenileme ve İptal</h2>
<ul>
  <li>Abonelikler dönem sonunda otomatik yenilenir.</li>
  <li>İptal, hesap ayarları > abonelik sayfasından tek tıklama ile yapılır.</li>
  <li>İptal, mevcut dönemin sonunda etkili olur; kalan süre içinde hizmet kullanılmaya devam edebilir.</li>
  <li>Otomatik yenilenmeden önce kayıtlı e-postaya hatırlatma gönderilir.</li>
</ul>

<h2>8. Yasal Haklar ve Uyuşmazlık Çözümü</h2>
<p>Bu sözleşme, tüketici olarak Consumer Rights Act 2015 kapsamındaki yasal haklarınızı etkilemez. Şikâyetlerinizi öncelikle <a href="/legal/iletisim">iletişim sayfası</a>ndan iletmelisiniz.</p>

<h2>9. Uygulanacak Hukuk ve Yetki</h2>
<p>İşbu sözleşme ${COMPANY.jurisdiction} (İngiltere ve Galler) hukukuna tabidir ve İngiltere ve Galler mahkemeleri yetkilidir.</p>

<h2>10. Yürürlük</h2>
<p>Alıcı, satın alma akışında bu sözleşmeyi okuyup onayladığını beyan eder. Sözleşme onaylandığı an yürürlüğe girer.</p>
`.trim(),
    content_en: `
<p>Last updated: <time>2026-06-04</time></p>

<h2>1. Parties</h2>
<p><strong>Seller:</strong> ${COMPANY.name} (operator of {{brand}}; registered in ${COMPANY.jurisdiction}, company no. ${COMPANY.number}, registered office ${COMPANY.addressLine}).<br>
<strong>Buyer:</strong> the user placing the order (as identified in their account).</p>

<h2>2. Subject</h2>
<p>This agreement governs the rights and obligations of the parties regarding the digital service/subscription package purchased on {{brand}}. It is subject to the consumer law of England and Wales, including the Consumer Rights Act 2015 and the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013.</p>

<h2>3. Service Description</h2>
<p>The purchased package has the features shown to the Buyer during checkout. Prices are displayed inclusive of any applicable tax.</p>

<h2>4. Payment</h2>
<ul>
  <li>Payment is by credit card or bank card.</li>
  <li>Transactions go through a PCI-DSS compliant provider (Stripe). Card details are never stored on Seller's servers.</li>
  <li>Monthly or yearly subscriptions renew automatically; the Buyer may cancel any time.</li>
</ul>

<h2>5. Delivery</h2>
<p>The package activates instantly upon payment confirmation. The digital service is offered continuously (excepting scheduled maintenance).</p>

<h2>6. 14-Day Cancellation Right and Digital-Content Exception</h2>
<p>Under the Consumer Contracts Regulations 2013 a consumer normally has a 14-day right to cancel. However, under regulation 37, that right is lost for digital content/services whose supply has begun <strong>with the Buyer's express consent and acknowledgement that the right to cancel will be lost</strong>. The Buyer is clearly informed of this and gives that consent at checkout.</p>
<p>Even so, Seller reserves the right to fully refund Buyers who, within the first 14 days, have not used the service at all (no posts published, no media uploaded, no sites created), upon request. See the <a href="/legal/iade-politikasi">Refund Policy</a>.</p>

<h2>7. Renewal and Cancellation</h2>
<ul>
  <li>Subscriptions auto-renew at the end of each period.</li>
  <li>Cancellation is one-click in Account → Subscription.</li>
  <li>Cancellation takes effect at the end of the current period; service may be used until then.</li>
  <li>A reminder email is sent before auto-renewal.</li>
</ul>

<h2>8. Statutory Rights and Disputes</h2>
<p>This agreement does not affect your statutory rights as a consumer under the Consumer Rights Act 2015. Please raise complaints first via the <a href="/legal/iletisim">contact page</a>.</p>

<h2>9. Governing Law and Jurisdiction</h2>
<p>This agreement is governed by the laws of ${COMPANY.jurisdiction}, and the courts of England and Wales have jurisdiction.</p>

<h2>10. Effectiveness</h2>
<p>The Buyer declares to have read and approved this agreement at checkout; it takes effect upon approval.</p>
`.trim(),
  },
  {
    slug: 'iade-politikasi',
    title_tr: 'İade Politikası',
    title_en: 'Refund Policy',
    description_tr: 'Ücretli paketler için iade ve iptal koşulları.',
    description_en: 'Refund and cancellation terms for paid plans.',
    footer_label_tr: 'İade Politikası',
    footer_label_en: 'Refunds',
    content_tr: `
<p>Son güncellenme: <time>2026-06-04</time></p>

<h2>1. Genel</h2>
<p>{{brand}}, ${COMPANY.name} tarafından sunulan dijital bir CMS platformudur. İade ve iptal koşulları, İngiltere ve Galler tüketici mevzuatı (Consumer Rights Act 2015 ve Consumer Contracts Regulations 2013) çerçevesinde aşağıda açıklanmıştır.</p>

<h2>2. Yasal Cayma Hakkı ve Dijital İçerik İstisnası</h2>
<p>Consumer Contracts Regulations 2013 uyarınca normalde 14 günlük cayma hakkınız vardır. Ancak açık onayınızla ve cayma hakkınızı kaybedeceğinizi kabul ederek ifasına başlanan dijital hizmetlerde bu hak sona erer (reg. 37). Bu durum satın alma akışında açıkça belirtilir.</p>

<h2>3. Memnuniyet Garantisi (İlk 14 Gün)</h2>
<p>Yasal cayma hakkı uygulanmasa dahi, satın alma tarihinden itibaren ilk 14 gün içinde:</p>
<ul>
  <li>Hesabınızda hiç yazı yayınlamadıysanız,</li>
  <li>Hiç medya yüklemediyseniz,</li>
  <li>Hiç site oluşturmadıysanız,</li>
</ul>
<p>iade talebinde bulunabilirsiniz. Talep onaylanırsa ödeme aynı yöntemle 5-14 iş günü içinde iade edilir.</p>

<h2>4. Abonelik İptali (İade Olmaksızın)</h2>
<p>14 günü geçen abonelikler iptal edilebilir ancak otomatik iade yapılmaz. İptal mevcut dönem sonunda etkili olur — kalan süre boyunca hizmet kullanılmaya devam edebilir.</p>

<h2>5. Kısmi/Tam İade Halleri</h2>
<ul>
  <li>Hizmette 24 saati aşan ve önceden duyurulmamış kesinti</li>
  <li>Faturalandırma hatası (iki kez tahsilat, yanlış tutar)</li>
  <li>Hizmetin sözleşmede tanımlanan özelliklere materyal olarak uymadığı kanıtlanan durumlar (Consumer Rights Act 2015 kapsamındaki yasal haklarınız saklıdır)</li>
</ul>

<h2>6. İade Yöntemi</h2>
<p>İadeler her zaman orijinal ödeme yöntemine (kredi/banka kartı) yapılır. Banka tarafındaki yansıma süresi 5-14 iş günü olabilir.</p>

<h2>7. Talep Süreci</h2>
<p>İade talepleri için <a href="/legal/iletisim">iletişim sayfası</a>ndan bize ulaşın. Talepler 5 iş günü içinde değerlendirilir ve sonuç e-posta ile bildirilir.</p>
`.trim(),
    content_en: `
<p>Last updated: <time>2026-06-04</time></p>

<h2>1. Overview</h2>
<p>{{brand}} is a digital CMS service provided by ${COMPANY.name}. The refund and cancellation terms below apply under the consumer law of England and Wales (Consumer Rights Act 2015 and Consumer Contracts Regulations 2013).</p>

<h2>2. Statutory Cancellation Right and Digital-Content Exception</h2>
<p>Under the Consumer Contracts Regulations 2013 you normally have a 14-day right to cancel. However, that right is lost for digital services whose supply has begun with your express consent and acknowledgement that the right to cancel will be lost (reg. 37). This is disclosed at checkout.</p>

<h2>3. 14-Day Satisfaction Refund</h2>
<p>Even though the statutory cancellation right does not apply, you may request a refund within 14 days of purchase if:</p>
<ul>
  <li>You have not published any posts,</li>
  <li>You have not uploaded any media,</li>
  <li>You have not created any sites.</li>
</ul>
<p>Approved refunds return to the original payment method within 5-14 business days.</p>

<h2>4. Subscription Cancellation (No Refund)</h2>
<p>After 14 days you can cancel any time, but no automatic refund is issued. Cancellation takes effect at the end of the current period; you may use the service until then.</p>

<h2>5. Partial / Full Refunds</h2>
<ul>
  <li>Service outage exceeding 24 hours without prior notice</li>
  <li>Billing errors (double charge, wrong amount)</li>
  <li>Demonstrable material discrepancy between the contracted and delivered service (your statutory rights under the Consumer Rights Act 2015 are unaffected)</li>
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
<p>Son güncellenme: <time>2026-06-04</time></p>

<h2>Çerez Nedir?</h2>
<p>Çerez, ziyaret ettiğiniz web siteleri tarafından tarayıcınıza yerleştirilen küçük metin dosyalarıdır. Çerezler, sitenin daha iyi çalışmasını, tercihlerinizin hatırlanmasını ve kullanım istatistiklerinin toplanmasını sağlar. Çerez kullanımımız, Birleşik Krallık PECR (Privacy and Electronic Communications Regulations) ve UK GDPR kapsamındadır.</p>

<h2>Kullandığımız Çerez Türleri</h2>
<ul>
  <li><strong>Zorunlu çerezler:</strong> Oturum yönetimi, güvenlik, dil tercihi (cms_lang) ve ödeme akışı için. Bu çerezler olmadan site çalışmaz; rıza gerekmez.</li>
  <li><strong>Tercih çerezleri:</strong> Dil, tema, arayüz seçenekleri.</li>
  <li><strong>Analitik çerezler:</strong> Anonim sayfa görüntüleme, oturum süresi gibi istatistikler. Açık rızanızla.</li>
  <li><strong>Pazarlama çerezleri:</strong> Yalnızca açık rızanızla, kampanya/yeniden hedefleme amaçlı.</li>
</ul>

<h2>Üçüncü Taraf Çerezleri</h2>
<ul>
  <li>Cloudflare — performans ve güvenlik (zorunlu)</li>
  <li>Google Analytics — anonim istatistik (rızanızla)</li>
  <li>Stripe — ödeme akışı (zorunlu)</li>
  <li>YouTube / Vimeo / Twitter — gömülü içerik (sayfaya yerleştirildiğinde)</li>
</ul>

<h2>Çerezleri Yönetme</h2>
<p>Tarayıcınızın ayarlarından çerezleri silebilir, engelleyebilir veya bildirim alacak şekilde ayarlayabilirsiniz. Zorunlu çerezleri devre dışı bırakırsanız site bazı işlevlerini kaybeder (oturum açamama, ödeme yapamama gibi).</p>

<h2>Daha Fazla Bilgi</h2>
<p><a href="/legal/gizlilik">Gizlilik Politikası</a>nda kişisel veri işleme hakkında ek bilgi bulabilirsiniz.</p>
`.trim(),
    content_en: `
<p>Last updated: <time>2026-06-04</time></p>

<h2>What Is a Cookie?</h2>
<p>A cookie is a small text file a website places in your browser. Cookies help the site work better, remember your preferences, and collect usage statistics. Our use of cookies is governed by the UK Privacy and Electronic Communications Regulations (PECR) and the UK GDPR.</p>

<h2>Cookies We Use</h2>
<ul>
  <li><strong>Strictly necessary:</strong> session management, security, language preference (cms_lang) and payments. The site cannot function without these; no consent required.</li>
  <li><strong>Preference:</strong> language, theme, UI choices.</li>
  <li><strong>Analytics:</strong> anonymous page views, session length — with your explicit consent.</li>
  <li><strong>Marketing:</strong> only with explicit consent, for campaigns/retargeting.</li>
</ul>

<h2>Third-Party Cookies</h2>
<ul>
  <li>Cloudflare — performance and security (essential)</li>
  <li>Google Analytics — anonymous statistics (with consent)</li>
  <li>Stripe — payment flow (essential)</li>
  <li>YouTube / Vimeo / Twitter — embedded content</li>
</ul>

<h2>Managing Cookies</h2>
<p>You can delete or block cookies from your browser settings. Disabling essential cookies will break parts of the site (login, payments).</p>

<h2>More Information</h2>
<p>See our <a href="/legal/gizlilik">Privacy Policy</a> for additional details on personal data processing.</p>
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

<p>Aşağıdaki kanallar üzerinden bizimle iletişime geçebilirsiniz. Genel sorular için 1-2 iş günü, veri koruma talepleri için 30 günlük yanıt süresini hedefliyoruz.</p>

<h2>E-posta</h2>
<ul>
  <li><strong>Genel destek:</strong> <a href="mailto:info@example.com">info@example.com</a></li>
  <li><strong>Faturalandırma:</strong> <a href="mailto:billing@workercms.com">billing@workercms.com</a></li>
  <li><strong>Veri koruma (UK GDPR / KVKK):</strong> <a href="mailto:privacy@workercms.com">privacy@workercms.com</a></li>
  <li><strong>Güvenlik açıkları:</strong> <a href="mailto:security@workercms.com">security@workercms.com</a> (responsible disclosure)</li>
</ul>

<h2>Şirket Bilgileri</h2>
<p>
  <strong>${COMPANY.name}</strong><br>
  ${COMPANY.jurisdiction}'da kayıtlı özel limited şirket<br>
  Şirket No (Companies House): ${COMPANY.number}<br>
  Kayıtlı adres: ${COMPANY.addressLine}<br>
  KDV (VAT) No: <em>(VAT kaydı tamamlandığında eklenecektir)</em>
</p>
`.trim(),
    content_en: `
<h2>Get in Touch</h2>

<p>You can reach us through the channels below. We aim to reply to general questions within 1-2 business days, and to data-protection requests within 30 days.</p>

<h2>Email</h2>
<ul>
  <li><strong>General support:</strong> <a href="mailto:info@example.com">info@example.com</a></li>
  <li><strong>Billing:</strong> <a href="mailto:billing@workercms.com">billing@workercms.com</a></li>
  <li><strong>Data protection (UK GDPR / KVKK):</strong> <a href="mailto:privacy@workercms.com">privacy@workercms.com</a></li>
  <li><strong>Security vulnerabilities:</strong> <a href="mailto:security@workercms.com">security@workercms.com</a> (responsible disclosure)</li>
</ul>

<h2>Company Details</h2>
<p>
  <strong>${COMPANY.name}</strong><br>
  A private limited company registered in ${COMPANY.jurisdiction}<br>
  Company number (Companies House): ${COMPANY.number}<br>
  Registered office: ${COMPANY.addressLine}<br>
  VAT number: <em>(to be added once VAT-registered)</em>
</p>
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
