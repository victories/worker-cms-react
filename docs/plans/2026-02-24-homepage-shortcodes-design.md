# Dinamik Shortcode Sistemi + Sabit Sayfa Ana Sayfa

**Tarih:** 2026-02-24

## Özet

WordPress'teki ana sayfa mantığını uyguluyoruz: admin panelden bir sabit sayfayı ana sayfa olarak seçebilme ve shortcode'lar ile sayfayı bloklar halinde tasarlayabilme.

## Mimari

### Akış

```
Admin panelde sayfa oluştur →
  İçeriğe shortcode'lar yaz: [slider], [son-yazilar sayi=3], [yazi id=5] →
  Ayarlar → Genel'den bu sayfayı "ana sayfa" olarak seç →
  Ziyaretçi siteye girdiğinde home.tsx sayfayı çeker →
  Shortcode engine içeriği işler (DB'den veri çekip HTML üretir) →
  Sayfa render edilir
```

### Ana Sayfa Ayarı

Settings tablosuna 2 yeni key:
- `show_on_front`: `"posts"` (varsayılan) veya `"page"`
- `page_on_front`: sayfa ID'si (ör: `"42"`)

Home.tsx'te:
- `show_on_front === "posts"` → mevcut yazı listesi (değişiklik yok)
- `show_on_front === "page"` → `page_on_front` ID'li sayfayı çek, shortcode'ları işle, render et

## Dahili Shortcode'lar (Geniş Set - 14 adet)

| Shortcode | Parametreler | Açıklama |
|-----------|-------------|----------|
| `[son-yazilar]` | `sayi=6`, `format=kart\|liste\|mini`, `kategori=slug` | Son yazıları listeler |
| `[yazi]` | `id=5`, `format=kisa\|tam\|kart` | Belirli bir yazıyı gösterir |
| `[kategori]` | `slug=teknoloji`, `sayi=4`, `format=kart\|liste` | Kategoriden yazılar |
| `[slider]` | — | Hero slider bileşeni (mevcut) |
| `[menu]` | `location=header\|footer`, `slug=ana-menu` | Menü render |
| `[ozel-html]...[/ozel-html]` | İç HTML | Serbest HTML bloğu |
| `[bosluk]` | `yukseklik=40` (px) | Dikey boşluk |
| `[ayirici]` | `renk=#eee`, `margin=20` | Yatay çizgi |
| `[arama-formu]` | — | Arama kutusu |
| `[widget]` | `alan=sidebar` | Widget alanı |
| `[iletisim-formu]` | — | İletişim formu (plugin) |
| `[sosyal-medya]` | — | Sosyal medya ikonları |
| `[galeri]` | `ids=1,2,3`, `kolonlar=3` | Resim galerisi |
| `[video]` | `url=https://...` | Video embed |

## Shortcode Parser

Mevcut `[isim]` → sabit HTML sistemi korunur. Üstüne parametre destekli parser eklenir:

```
[shortcode-adi param1=deger1 param2=deger2]
[shortcode-adi]icerik[/shortcode-adi]
```

Öncelik sırası:
1. Dahili shortcode'lar (DB sorgusu ile dinamik HTML üretir)
2. Kullanıcı tanımlı shortcode'lar (statik replace)

## Dosya Yapısı

```
src/lib/shortcodes/
  ├── parser.ts             # Parametre destekli parser
  ├── registry.ts           # Dahili shortcode kayıt sistemi
  ├── renderers/
  │   ├── son-yazilar.ts
  │   ├── yazi.ts
  │   ├── kategori.ts
  │   ├── slider.ts
  │   ├── menu.ts
  │   ├── ozel-html.ts
  │   ├── bosluk.ts
  │   ├── ayirici.ts
  │   ├── arama-formu.ts
  │   ├── widget.ts
  │   ├── galeri.ts
  │   ├── video.ts
  │   └── sosyal-medya.ts
  └── index.ts              # Ana export

src/routes/public/home.tsx   # Sabit sayfa desteği eklenir
admin/.../General.tsx        # Ana sayfa ayarı bölümü eklenir
```

## Admin Panel Değişiklikleri

Ayarlar → Genel sayfasına:
- "Ana Sayfa Görünümü" bölümü
- Radio: "Son yazılar" / "Sabit bir sayfa"
- Dropdown: yayınlanmış sayfalar listesi
