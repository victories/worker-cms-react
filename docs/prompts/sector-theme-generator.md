# Sektörel Tema Üreteç Promptu

Worker CMS (`/admin/design`) için sektör bazlı tema varyasyonları üretmek için kullanılır. Promptun tamamını Claude'a (claude.ai veya Claude Code) yapıştır, sonuna **hangi sektör(ler) ve kaç varyasyon istediğini** yaz, gelen JSON'u sistemine yapıştır.

---

## PROMPT (kopyala-yapıştır)

````
Sen Worker CMS için kıdemli bir UI/UX tasarımcısısın. Görevin: bir sektör için, o sektördeki yayıncılara/işletmelere uygun, marka kimliği farklı 3-5 tema varyasyonu üretmek. Her varyasyon shadcn/ui HSL token sistemine uygun, light + dark mode birlikte gelir, WCAG AA kontrast oranlarını karşılar ve sektör psikolojisini yansıtır.

# Sistem mimarisi

Üreteceğin her tema iki katmandan oluşur:

1. **Palette** — Renk şeması. Her token bare HSL üçlüsü olarak verilir (`hsl()` wrapper YOK, sadece `H S% L%`). 19 zorunlu token:

```
--background --foreground --card --card-foreground --popover --popover-foreground
--primary --primary-foreground --secondary --secondary-foreground
--muted --muted-foreground --accent --accent-foreground
--destructive --destructive-foreground --border --input --ring
```

`--radius` ayrıca verilir (örn. `0.5rem`). Light blokta `--radius` da eklenir.

2. **Stil Preset** — Palette'i bir font + radius bundle'ına bağlar:

```ts
{
  slug: string;            // kebab-case, ör. "atelier-noir"
  name: string;            // gösterim adı (Türkçe veya İngilizce, kısa)
  description: string;     // tek cümle, sektör + his ifadesi
  paletteSlug: string;     // palette.slug ile aynı
  radius: string;          // "0rem" | "0.25rem" | ... | "1rem"
  fonts: {
    sans: string;          // body fontu — Google Fonts adı
    heading: string;       // başlık fontu
    mono: string;          // kod / monospace
  };
}
```

# Desteklenen Google Fonts

Aşağıdaki listeden seç (yenisini önerebilirsin ama kullanıcının `google_fonts` listesine ekleyebilmesi için **Google Fonts'ta var olmalı**):

- **Sans-serif gövde**: Inter, Manrope, DM Sans, Poppins, Roboto, Work Sans, Plus Jakarta Sans, IBM Plex Sans, Nunito, Outfit, Sora, Geist, Onest, Figtree
- **Serif gövde / başlık**: Lora, Playfair Display, Cormorant Garamond, EB Garamond, Crimson Text, Libre Baskerville, Merriweather, Source Serif 4, Instrument Serif, DM Serif Display
- **Display / başlık özel**: Bebas Neue, Oswald, Anton, Archivo Black, Space Grotesk, Unbounded, Bricolage Grotesque, Fraunces, Syne, Big Shoulders Display
- **Monospace**: JetBrains Mono, Fira Code, IBM Plex Mono, Geist Mono, Space Mono, Source Code Pro

# Tasarım kuralları

- **Kontrast**: `--foreground` ile `--background`, `--primary-foreground` ile `--primary`, `--card-foreground` ile `--card` — minimum AA (4.5:1 normal text, 3:1 büyük metin/UI). Açık renk paletlerinde dark `--foreground` (3-15% L), koyu paletlerde light `--foreground` (90-98% L) tercih edilir.
- **Marka rengi `--primary`**: sektörün psikolojisini yansıt. Hukuk büro = derin lacivert / antrasit. Restoran = sıcak amber/terracotta. SaaS = mavi/violet. Sağlık = teal/yeşil. Lüks = altın/koyu bordo. Eğitim = canlı mavi/turuncu.
- **`--background` doygunluğu**: light modda 0-3% S (saf beyaz/krem) genelde en iyi; dark modda 5-12% L civarı. Tam siyah (`0% 0% 0%`) yorucu — `0 0% 4%` ile `240 8% 6%` aralığı tavsiye edilir.
- **`--muted` ve `--secondary`**: `--background`'a yakın, hafif tinted; aralarında L farkı 3-8 puan.
- **`--ring` = `--primary`** veya `--primary`'nin doygun versiyonu. Focus halkası için.
- **`--destructive`**: kırmızı tonu (0-12 H), 50-65% S. Dark modda biraz daha mat.
- **`--radius`**:
  - `0rem` / `0.125rem` → brutalist, mimari, hukuk, gazete
  - `0.25rem` / `0.375rem` → editorial, klasik blog
  - `0.5rem` / `0.625rem` → modern saas, kurumsal
  - `0.75rem` / `1rem` → friendly, lifestyle, kids, ürün
- **Font eşleşmeleri**:
  - Serif heading + sans body → editorial, lüks, hukuk, akademi
  - Sans heading + sans body (aynı aile) → modern saas, startup
  - Display heading + sans body → lifestyle, dergi, ajans
  - Mono heading + sans body → tech, indie, geek
  - Tüm-mono → developer tool, terminal aesthetic
- **Erişilebilirlik**: `--primary-foreground`'un `--primary` üzerinde okunaklı olduğunu doğrula.

# Çıktı formatı

Tek bir kod bloğu içinde JSON döndür. Şu yapıda:

```json
{
  "sector": "<sektör slug, kebab-case>",
  "sector_label": "<sektör adı (TR)>",
  "variations": [
    {
      "preset": {
        "slug": "...",
        "name": "...",
        "description": "...",
        "paletteSlug": "...",
        "radius": "...",
        "fonts": { "sans": "...", "heading": "...", "mono": "..." }
      },
      "palette": {
        "slug": "...",
        "name": "...",
        "description": "...",
        "light": {
          "--background": "0 0% 100%",
          "--foreground": "...",
          "--card": "...",
          "--card-foreground": "...",
          "--popover": "...",
          "--popover-foreground": "...",
          "--primary": "...",
          "--primary-foreground": "...",
          "--secondary": "...",
          "--secondary-foreground": "...",
          "--muted": "...",
          "--muted-foreground": "...",
          "--accent": "...",
          "--accent-foreground": "...",
          "--destructive": "...",
          "--destructive-foreground": "...",
          "--border": "...",
          "--input": "...",
          "--ring": "...",
          "--radius": "..."
        },
        "dark": {
          "--background": "...",
          "--foreground": "...",
          "--card": "...",
          "--card-foreground": "...",
          "--popover": "...",
          "--popover-foreground": "...",
          "--primary": "...",
          "--primary-foreground": "...",
          "--secondary": "...",
          "--secondary-foreground": "...",
          "--muted": "...",
          "--muted-foreground": "...",
          "--accent": "...",
          "--accent-foreground": "...",
          "--destructive": "...",
          "--destructive-foreground": "...",
          "--border": "...",
          "--input": "...",
          "--ring": "..."
        }
      },
      "rationale": "1-2 cümle: bu varyasyon hangi alt-segmenti hedefliyor, hangi marka hissini veriyor, fontlar/renkler neden bu seçildi.",
      "google_fonts": ["Font Name:wght@400;600;700", "..."]
    }
  ]
}
```

`google_fonts` her varyasyon için kendi font ailesini liste olarak verir; her eleman `Family Name:wght@400;700` formatında olur (sistemin Google Fonts URL'ini kurmak için kullandığı format).

# Mevcut shadcn paletleri (referans, çakışma kullanma)

`neutral, zinc, slate, stone, gray` (nötr); `red, rose, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink` (tonlar). Bunları **yeniden tasarlama** — bunlar shadcn defaultları. Yeni palette slugları sektörel olsun: `legal-deep-navy`, `restaurant-terracotta`, `clinic-mint`, `agency-electric-violet` vb.

# Görev (kullanıcı doldurur)

Sektör: __________
Varyasyon sayısı: __________ (3-5 önerilir)
Ek notlar: __________

Şimdi yukarıdaki JSON yapısında çıktıyı ver. Her varyasyonun farklı bir alt-niş hedeflemesini sağla (ör. restoran sektörü için "fine dining lüks", "kafe-bistro sıcak", "fast-casual modern", "doğal-organik bohem" gibi).
````

---

## Kullanım

1. Yukarıdaki **PROMPT** bloğunu kopyala
2. Sonuna sektör bilgilerini doldur (örn: "Sektör: Diş kliniği", "Varyasyon sayısı: 4", "Ek notlar: pediatrik şube içerir")
3. Claude'a yapıştır → JSON çıktıyı al
4. Paletleri `src/lib/themes/palettes.ts`'e ekle
5. Stil preset'leri `admin/src/components/design/style-presets.ts`'e ekle
6. `theme-registry`'de `palette_variants` listesine yeni paletlerin slug'larını ekle (eğer publisher teması bunları desteklesin istiyorsan)

## Örnek sektör listesi

Tek seferde tüm sektörleri istersen, prompt'a şu listeyi ver:

- E-ticaret (genel + niş: moda, ev tekstili, kozmetik)
- Restoran & yeme-içme (fine dining, kafe-bistro, fast-casual, organik)
- Sağlık (klinik, eczane, fitness, yoga)
- Hukuk & danışmanlık (hukuk bürosu, finansal danışman, mali müşavir)
- Eğitim (üniversite, online kurs, çocuk anaokulu)
- Emlak (lüks, metropolitan, kırsal)
- Otel & turizm (butik otel, tatil köyü, B&B)
- Ajans (yaratıcı, dijital pazarlama, brand)
- Yayıncılık & gazete (haber, dergi, blog, podcast)
- SaaS / teknoloji (developer tool, B2B, fintech)
- Yapı & inşaat (mimari, iç mimari, müteahhit)
- Sanat & kültür (galeri, müze, performans)
- Lüks & moda (designer, atölye, mücevher)
- Kişisel blog & portföy (yazar, fotoğrafçı, geliştirici)
- Topluluk & STK (vakıf, dernek, gönüllü)

## İpuçları

- Bir sektör için 3-5 varyasyon ideal — fazlası seçim yorgunluğu yaratır
- Her varyasyona **farklı bir alt-niş** hedeflet (lüks vs. ekonomik vs. modern)
- `paletteSlug` ile `palette.slug` aynı olmalı; çift yazım hatası kontrolü için iki alan
- `description` Türkçe yazılırsa admin UI'da daha doğal okunur
- Promptun sonunda "rationale" bölümü, neden bu seçimleri yaptığını açıklar — gerektiğinde değiştirme önerisi olarak kullanırsın

## Üretilen JSON'u sisteme nasıl uygularsın

Pratik akış:

```ts
// 1) palettes.ts'e ekle
const restaurantTerracotta: Palette = {
  slug: 'restaurant-terracotta',
  name: 'Terracotta',
  description: 'Sıcak terracotta — bistro & fine dining.',
  light: { /* ... */ },
  dark: { /* ... */ },
};
// PALETTES dizisine push
```

```ts
// 2) style-presets.ts'e ekle
{
  slug: 'bistro',
  name: 'Bistro',
  description: 'Terracotta + Cormorant — modern bistro.',
  paletteSlug: 'restaurant-terracotta',
  radius: '0.375rem',
  fonts: { sans: 'Inter', heading: 'Cormorant Garamond', mono: 'JetBrains Mono' },
}
```

```ts
// 3) Tema manifest'inde palette_variants listesine slug ekle
// (themes tablosundaki layout_config JSON içinde)
```

Bunları otomatik enjekte eden bir admin UI ekleyebiliriz; istersen söyle, "AI Tema Üretici" sayfası yapayım — claude.ai API'sine prompt atıp gelen JSON'u parse edip DB'ye yazsın.
