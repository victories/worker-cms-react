-- Migration 011: Global AI Settings (Master Admin)
-- Global providers and prompts that persist across site deletions.
-- When a site is deleted, only site-scoped ai_providers/ai_prompts are removed.
-- If a site has no own provider config, the global provider is used as fallback.

-- Global AI Provider Configurations (NOT site-scoped, managed by super_admin)
CREATE TABLE IF NOT EXISTS global_ai_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  api_key TEXT,
  default_model TEXT,
  endpoint_url TEXT,
  extra_config TEXT,
  is_enabled INTEGER DEFAULT 0,
  max_tokens INTEGER DEFAULT 4096,
  temperature REAL DEFAULT 0.7,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Global AI Prompt Templates (NOT site-scoped, managed by super_admin)
CREATE TABLE IF NOT EXISTS global_ai_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  variables TEXT,
  default_provider_slug TEXT,
  default_model TEXT,
  default_word_count INTEGER DEFAULT 1000,
  default_language TEXT DEFAULT 'tr',
  default_tone TEXT DEFAULT 'professional',
  is_active INTEGER DEFAULT 1,
  image_enabled INTEGER DEFAULT 0,
  image_model TEXT,
  image_style TEXT DEFAULT 'photographic',
  image_count INTEGER DEFAULT 0,
  image_layout TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Seed 3 global prompt templates
INSERT INTO global_ai_prompts (name, description, system_prompt, user_prompt, default_word_count, default_language, default_tone) VALUES
(
  'Blog Yazisi Olusturucu',
  'SEO uyumlu, detayli blog yazisi olusturur',
  'Sen profesyonel bir icerik yazarisin. SEO uyumlu, ozgun ve bilgilendirici blog yazilari yaziyorsun. Yazilarinda HTML formati kullan (h2, h3, p, ul, li etiketleri). Basliga h1 etiketi koyma, sadece icerik basliklarinda h2 ve h3 kullan. Icerik akici, okuyucu dostu ve bilgilendirici olmali.',
  '{{konu}} hakkinda detayli bir blog yazisi yaz. Yazi {{dil}} dilinde ve {{ton}} bir tonda olmali. Yaklasik {{kelime_sayisi}} kelime olmali. Icerik SEO uyumlu olmali, uygun basliklar ve alt basliklar icermeli.',
  1000,
  'tr',
  'professional'
),
(
  'Urun Tanitim Yazisi',
  'E-ticaret urunleri icin ikna edici tanitim metni olusturur',
  'Sen deneyimli bir e-ticaret icerik yazarisin. Urun tanitim metinleri yaziyorsun. Metinlerinde urunun ozelliklerini, avantajlarini ve kullanim alanlarini vurgula. HTML formati kullan. Okuyucuyu satin almaya tesvik eden bir dil kullan.',
  '{{urun_adi}} icin bir tanitim yazisi yaz. Urunun ozellikleri: {{ozellikler}}. Hedef kitle: {{hedef_kitle}}. Yazi {{dil}} dilinde ve ikna edici bir tonda olmali. Yaklasik {{kelime_sayisi}} kelime olmali.',
  500,
  'tr',
  'persuasive'
),
(
  'Haber / Makale Yazisi',
  'Haber tarzinda, nesnel ve bilgilendirici makale olusturur',
  'Sen deneyimli bir gazetecisin. Nesnel, tarafsiz ve bilgilendirici haber/makale yazilari yaziyorsun. 5N1K kuralina (Ne, Nerede, Ne zaman, Nasil, Neden, Kim) uygun yaz. HTML formati kullan. Basliklarda h2 ve h3 etiketleri kullan.',
  '{{konu}} hakkinda bir haber/makale yazisi yaz. Yazi {{dil}} dilinde, nesnel ve bilgilendirici bir tonda olmali. Yaklasik {{kelime_sayisi}} kelime olmali. Guncel bilgiler ve detaylar icermeli.',
  800,
  'tr',
  'neutral'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_global_ai_providers_slug ON global_ai_providers(provider_slug);
CREATE INDEX IF NOT EXISTS idx_global_ai_prompts_active ON global_ai_prompts(is_active);
