import { tr } from './tr';
import { en } from './en';

export type TranslationKey = keyof typeof tr;

const translations: Record<string, Record<string, string>> = { tr, en };

export function t(lang: string, key: TranslationKey, params?: Record<string, string | number>): string {
  const dict = translations[lang] || translations['tr'];
  let text = dict[key] || translations['tr'][key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{{${k}}}`, String(v));
    }
  }

  return text;
}

export function getAvailableLanguages(): string[] {
  return Object.keys(translations);
}
