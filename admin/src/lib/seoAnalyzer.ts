// ─── SEO Analyzer ───────────────────────────────────────
// Client-side, real-time SEO analysis for posts and pages.
// Returns a score (0-100) and actionable recommendations.

export type SeoStatus = 'good' | 'warning' | 'error';

export interface SeoCheck {
  id: string;
  label: string;
  status: SeoStatus;
  message: string;
  score: number;   // 0-10 per check
  maxScore: number; // max possible for this check
}

export interface SeoResult {
  score: number;        // 0-100
  checks: SeoCheck[];
}

interface SeoInput {
  title: string;
  content: string;        // HTML content
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;    // comma-separated
  slug: string;
  lang: string;           // 'tr' | 'en'
}

// ─── Helpers ─────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

function turkishLower(str: string): string {
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase();
}

function normalizeForSearch(str: string, lang: string): string {
  const s = lang === 'tr' ? turkishLower(str) : str.toLowerCase();
  return s.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function getKeywords(raw: string): string[] {
  return raw.split(',').map(k => k.trim()).filter(Boolean);
}

// ─── Checks ──────────────────────────────────────────────

function checkTitleLength(input: SeoInput): SeoCheck {
  const tr = input.lang === 'tr';
  const effectiveTitle = input.seoTitle || input.title;
  const len = effectiveTitle.length;

  if (len === 0) {
    return {
      id: 'title-length',
      label: tr ? 'Başlık uzunluğu' : 'Title length',
      status: 'error',
      message: tr ? 'Başlık girilmemiş.' : 'No title provided.',
      score: 0, maxScore: 10,
    };
  }
  if (len >= 30 && len <= 60) {
    return {
      id: 'title-length',
      label: tr ? 'Başlık uzunluğu' : 'Title length',
      status: 'good',
      message: tr ? `Başlık uzunluğu ideal (${len} karakter).` : `Title length is ideal (${len} chars).`,
      score: 10, maxScore: 10,
    };
  }
  if (len < 30) {
    return {
      id: 'title-length',
      label: tr ? 'Başlık uzunluğu' : 'Title length',
      status: 'warning',
      message: tr ? `Başlık çok kısa (${len} karakter). 30-60 karakter önerilir.` : `Title is too short (${len} chars). 30-60 chars recommended.`,
      score: 5, maxScore: 10,
    };
  }
  return {
    id: 'title-length',
    label: tr ? 'Başlık uzunluğu' : 'Title length',
    status: 'warning',
    message: tr ? `Başlık çok uzun (${len} karakter). 60 karakteri geçmemeli.` : `Title is too long (${len} chars). Keep under 60 chars.`,
    score: 6, maxScore: 10,
  };
}

function checkMetaDescription(input: SeoInput): SeoCheck {
  const tr = input.lang === 'tr';
  const len = input.seoDescription.length;

  if (len === 0) {
    return {
      id: 'meta-desc',
      label: tr ? 'Meta açıklama' : 'Meta description',
      status: 'error',
      message: tr ? 'Meta açıklama girilmemiş. 120-160 karakter önerilir.' : 'No meta description. 120-160 chars recommended.',
      score: 0, maxScore: 10,
    };
  }
  if (len >= 120 && len <= 160) {
    return {
      id: 'meta-desc',
      label: tr ? 'Meta açıklama' : 'Meta description',
      status: 'good',
      message: tr ? `Meta açıklama ideal (${len} karakter).` : `Meta description is ideal (${len} chars).`,
      score: 10, maxScore: 10,
    };
  }
  if (len < 120) {
    return {
      id: 'meta-desc',
      label: tr ? 'Meta açıklama' : 'Meta description',
      status: 'warning',
      message: tr ? `Meta açıklama kısa (${len} karakter). 120-160 karakter önerilir.` : `Meta description is short (${len} chars). 120-160 recommended.`,
      score: 5, maxScore: 10,
    };
  }
  return {
    id: 'meta-desc',
    label: tr ? 'Meta açıklama' : 'Meta description',
    status: 'warning',
    message: tr ? `Meta açıklama uzun (${len} karakter). 160 karakteri geçmemeli.` : `Meta description is too long (${len} chars). Keep under 160.`,
    score: 6, maxScore: 10,
  };
}

function checkKeywordsProvided(input: SeoInput): SeoCheck {
  const tr = input.lang === 'tr';
  const kws = getKeywords(input.seoKeywords);

  if (kws.length === 0) {
    return {
      id: 'keywords-set',
      label: tr ? 'Anahtar kelimeler' : 'Focus keywords',
      status: 'error',
      message: tr ? 'Anahtar kelime girilmemiş. En az 1 anahtar kelime ekleyin.' : 'No keywords set. Add at least 1 focus keyword.',
      score: 0, maxScore: 5,
    };
  }
  if (kws.length >= 1 && kws.length <= 5) {
    return {
      id: 'keywords-set',
      label: tr ? 'Anahtar kelimeler' : 'Focus keywords',
      status: 'good',
      message: tr ? `${kws.length} anahtar kelime belirlendi.` : `${kws.length} focus keyword(s) set.`,
      score: 5, maxScore: 5,
    };
  }
  return {
    id: 'keywords-set',
    label: tr ? 'Anahtar kelimeler' : 'Focus keywords',
    status: 'warning',
    message: tr ? `Çok fazla anahtar kelime (${kws.length}). 1-5 arası önerilir.` : `Too many keywords (${kws.length}). 1-5 recommended.`,
    score: 3, maxScore: 5,
  };
}

function checkKeywordInTitle(input: SeoInput): SeoCheck {
  const tr = input.lang === 'tr';
  const kws = getKeywords(input.seoKeywords);
  if (kws.length === 0) {
    return {
      id: 'kw-title',
      label: tr ? 'Başlıkta anahtar kelime' : 'Keyword in title',
      status: 'warning',
      message: tr ? 'Anahtar kelime olmadan kontrol edilemiyor.' : 'Cannot check without keywords.',
      score: 0, maxScore: 10,
    };
  }

  const effectiveTitle = normalizeForSearch(input.seoTitle || input.title, input.lang);
  const found = kws.some(kw => effectiveTitle.includes(normalizeForSearch(kw, input.lang)));

  return {
    id: 'kw-title',
    label: tr ? 'Başlıkta anahtar kelime' : 'Keyword in title',
    status: found ? 'good' : 'error',
    message: found
      ? (tr ? 'Anahtar kelime başlıkta bulundu.' : 'Focus keyword found in title.')
      : (tr ? 'Anahtar kelime başlıkta yok. Başlığa ekleyin.' : 'Focus keyword not in title. Add it to your title.'),
    score: found ? 10 : 0, maxScore: 10,
  };
}

function checkKeywordInDescription(input: SeoInput): SeoCheck {
  const tr = input.lang === 'tr';
  const kws = getKeywords(input.seoKeywords);
  if (kws.length === 0 || !input.seoDescription) {
    return {
      id: 'kw-desc',
      label: tr ? 'Açıklamada anahtar kelime' : 'Keyword in description',
      status: 'warning',
      message: tr ? 'Kontrol için açıklama ve anahtar kelime gerekli.' : 'Need description and keywords to check.',
      score: 0, maxScore: 8,
    };
  }

  const desc = normalizeForSearch(input.seoDescription, input.lang);
  const found = kws.some(kw => desc.includes(normalizeForSearch(kw, input.lang)));

  return {
    id: 'kw-desc',
    label: tr ? 'Açıklamada anahtar kelime' : 'Keyword in description',
    status: found ? 'good' : 'warning',
    message: found
      ? (tr ? 'Anahtar kelime açıklamada bulundu.' : 'Focus keyword found in description.')
      : (tr ? 'Anahtar kelimeyi meta açıklamaya ekleyin.' : 'Add focus keyword to meta description.'),
    score: found ? 8 : 2, maxScore: 8,
  };
}

function checkKeywordInContent(input: SeoInput): SeoCheck {
  const tr = input.lang === 'tr';
  const kws = getKeywords(input.seoKeywords);
  const plainContent = stripHtml(input.content);

  if (kws.length === 0 || !plainContent) {
    return {
      id: 'kw-content',
      label: tr ? 'İçerikte anahtar kelime' : 'Keyword in content',
      status: 'warning',
      message: tr ? 'Kontrol için içerik ve anahtar kelime gerekli.' : 'Need content and keywords to check.',
      score: 0, maxScore: 10,
    };
  }

  const normalized = normalizeForSearch(plainContent, input.lang);
  const primaryKw = normalizeForSearch(kws[0], input.lang);
  const words = countWords(normalized);

  // Count keyword occurrences
  let count = 0;
  let idx = normalized.indexOf(primaryKw);
  while (idx !== -1) {
    count++;
    idx = normalized.indexOf(primaryKw, idx + 1);
  }

  // Keyword density: ideal 1-3%
  const density = words > 0 ? (count / words) * 100 : 0;

  if (count === 0) {
    return {
      id: 'kw-content',
      label: tr ? 'İçerikte anahtar kelime' : 'Keyword in content',
      status: 'error',
      message: tr ? 'Anahtar kelime içerikte bulunamadı.' : 'Focus keyword not found in content.',
      score: 0, maxScore: 10,
    };
  }
  if (density > 0 && density <= 3) {
    return {
      id: 'kw-content',
      label: tr ? 'İçerikte anahtar kelime' : 'Keyword in content',
      status: 'good',
      message: tr ? `Anahtar kelime ${count} kez kullanılmış (yoğunluk: %${density.toFixed(1)}).` : `Keyword used ${count} times (density: ${density.toFixed(1)}%).`,
      score: 10, maxScore: 10,
    };
  }
  return {
    id: 'kw-content',
    label: tr ? 'İçerikte anahtar kelime' : 'Keyword in content',
    status: 'warning',
    message: density > 3
      ? (tr ? `Anahtar kelime çok fazla kullanılmış (%${density.toFixed(1)}). Doğal tutun.` : `Keyword overused (${density.toFixed(1)}%). Keep it natural.`)
      : (tr ? `Anahtar kelime ${count} kez kullanılmış.` : `Keyword used ${count} times.`),
    score: 6, maxScore: 10,
  };
}

function checkContentLength(input: SeoInput): SeoCheck {
  const tr = input.lang === 'tr';
  const words = countWords(stripHtml(input.content));

  if (words === 0) {
    return {
      id: 'content-length',
      label: tr ? 'İçerik uzunluğu' : 'Content length',
      status: 'error',
      message: tr ? 'İçerik henüz girilmemiş.' : 'No content yet.',
      score: 0, maxScore: 12,
    };
  }
  if (words >= 300) {
    return {
      id: 'content-length',
      label: tr ? 'İçerik uzunluğu' : 'Content length',
      status: 'good',
      message: tr ? `İçerik yeterli uzunlukta (${words} kelime).` : `Content length is good (${words} words).`,
      score: 12, maxScore: 12,
    };
  }
  if (words >= 150) {
    return {
      id: 'content-length',
      label: tr ? 'İçerik uzunluğu' : 'Content length',
      status: 'warning',
      message: tr ? `İçerik biraz kısa (${words} kelime). En az 300 kelime önerilir.` : `Content is short (${words} words). 300+ words recommended.`,
      score: 7, maxScore: 12,
    };
  }
  return {
    id: 'content-length',
    label: tr ? 'İçerik uzunluğu' : 'Content length',
    status: 'error',
    message: tr ? `İçerik çok kısa (${words} kelime). En az 300 kelime yazın.` : `Content is too short (${words} words). Write at least 300 words.`,
    score: 3, maxScore: 12,
  };
}

function checkHeadings(input: SeoInput): SeoCheck {
  const tr = input.lang === 'tr';
  const h2Count = (input.content.match(/<h2[\s>]/gi) || []).length;
  const h3Count = (input.content.match(/<h3[\s>]/gi) || []).length;
  const hasSubheadings = h2Count + h3Count > 0;
  const words = countWords(stripHtml(input.content));

  if (words < 100) {
    return {
      id: 'headings',
      label: tr ? 'Alt başlıklar' : 'Subheadings',
      status: 'good',
      message: tr ? 'Kısa içerik, alt başlık gerekmez.' : 'Short content, subheadings not needed.',
      score: 8, maxScore: 8,
    };
  }

  if (hasSubheadings) {
    return {
      id: 'headings',
      label: tr ? 'Alt başlıklar' : 'Subheadings',
      status: 'good',
      message: tr ? `${h2Count} H2, ${h3Count} H3 alt başlık bulundu.` : `Found ${h2Count} H2, ${h3Count} H3 subheadings.`,
      score: 8, maxScore: 8,
    };
  }
  return {
    id: 'headings',
    label: tr ? 'Alt başlıklar' : 'Subheadings',
    status: 'warning',
    message: tr ? 'Alt başlık (H2/H3) yok. Okunabilirlik için ekleyin.' : 'No subheadings (H2/H3). Add them for readability.',
    score: 2, maxScore: 8,
  };
}

function checkImages(input: SeoInput): SeoCheck {
  const tr = input.lang === 'tr';
  const imgTags = input.content.match(/<img[^>]*>/gi) || [];
  const imgCount = imgTags.length;

  if (imgCount === 0) {
    const words = countWords(stripHtml(input.content));
    if (words < 100) {
      return {
        id: 'images',
        label: tr ? 'Görseller' : 'Images',
        status: 'good',
        message: tr ? 'Kısa içerik, görsel zorunlu değil.' : 'Short content, images optional.',
        score: 7, maxScore: 7,
      };
    }
    return {
      id: 'images',
      label: tr ? 'Görseller' : 'Images',
      status: 'warning',
      message: tr ? 'İçerikte görsel yok. En az 1 görsel ekleyin.' : 'No images in content. Add at least 1 image.',
      score: 2, maxScore: 7,
    };
  }

  // Check alt tags
  const withAlt = imgTags.filter(tag => /alt\s*=\s*"[^"]+"/i.test(tag) || /alt\s*=\s*'[^']+'/i.test(tag)).length;
  const missingAlt = imgCount - withAlt;

  if (missingAlt === 0) {
    return {
      id: 'images',
      label: tr ? 'Görseller' : 'Images',
      status: 'good',
      message: tr ? `${imgCount} görsel, hepsinin alt etiketi var.` : `${imgCount} image(s), all have alt tags.`,
      score: 7, maxScore: 7,
    };
  }
  return {
    id: 'images',
    label: tr ? 'Görseller' : 'Images',
    status: 'warning',
    message: tr ? `${missingAlt}/${imgCount} görselin alt etiketi eksik.` : `${missingAlt}/${imgCount} image(s) missing alt tags.`,
    score: 4, maxScore: 7,
  };
}

function checkLinks(input: SeoInput): SeoCheck {
  const tr = input.lang === 'tr';
  const linkTags = input.content.match(/<a[^>]*href[^>]*>/gi) || [];
  const linkCount = linkTags.length;
  const words = countWords(stripHtml(input.content));

  if (words < 100) {
    return {
      id: 'links',
      label: tr ? 'Bağlantılar' : 'Links',
      status: 'good',
      message: tr ? 'Kısa içerik, bağlantı zorunlu değil.' : 'Short content, links optional.',
      score: 5, maxScore: 5,
    };
  }

  if (linkCount > 0) {
    return {
      id: 'links',
      label: tr ? 'Bağlantılar' : 'Links',
      status: 'good',
      message: tr ? `${linkCount} bağlantı bulundu.` : `${linkCount} link(s) found.`,
      score: 5, maxScore: 5,
    };
  }
  return {
    id: 'links',
    label: tr ? 'Bağlantılar' : 'Links',
    status: 'warning',
    message: tr ? 'İçerikte hiç bağlantı yok. Dahili/harici link ekleyin.' : 'No links in content. Add internal/external links.',
    score: 1, maxScore: 5,
  };
}

function checkSlug(input: SeoInput): SeoCheck {
  const tr = input.lang === 'tr';
  const kws = getKeywords(input.seoKeywords);

  if (!input.slug) {
    return {
      id: 'slug',
      label: tr ? 'URL yapısı' : 'URL slug',
      status: 'warning',
      message: tr ? 'Slug henüz belirlenmemiş (otomatik oluşturulacak).' : 'Slug not set yet (will be auto-generated).',
      score: 3, maxScore: 5,
    };
  }

  if (kws.length === 0) {
    const isClean = /^[a-z0-9-]+$/.test(input.slug);
    return {
      id: 'slug',
      label: tr ? 'URL yapısı' : 'URL slug',
      status: isClean ? 'good' : 'warning',
      message: isClean
        ? (tr ? 'Slug temiz.' : 'Clean slug.')
        : (tr ? 'Slug özel karakter içeriyor.' : 'Slug contains special characters.'),
      score: isClean ? 5 : 3, maxScore: 5,
    };
  }

  const slugNorm = input.slug.toLowerCase().replace(/-/g, ' ');
  const found = kws.some(kw => slugNorm.includes(normalizeForSearch(kw, input.lang)));

  return {
    id: 'slug',
    label: tr ? 'URL yapısı' : 'URL slug',
    status: found ? 'good' : 'warning',
    message: found
      ? (tr ? 'Slug anahtar kelime içeriyor.' : 'Slug contains focus keyword.')
      : (tr ? 'Anahtar kelimeyi slug\'a eklemeyi deneyin.' : 'Try adding focus keyword to slug.'),
    score: found ? 5 : 2, maxScore: 5,
  };
}

// ─── Main Analyzer ───────────────────────────────────────

export function analyzeSeo(input: SeoInput): SeoResult {
  const checks: SeoCheck[] = [
    checkTitleLength(input),
    checkMetaDescription(input),
    checkKeywordsProvided(input),
    checkKeywordInTitle(input),
    checkKeywordInDescription(input),
    checkKeywordInContent(input),
    checkContentLength(input),
    checkHeadings(input),
    checkImages(input),
    checkLinks(input),
    checkSlug(input),
  ];

  const totalScore = checks.reduce((s, c) => s + c.score, 0);
  const maxTotal = checks.reduce((s, c) => s + c.maxScore, 0);
  const score = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;

  return { score, checks };
}
