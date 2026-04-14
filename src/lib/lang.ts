// Language URL prefix helper
// Default language has no prefix: /merhaba-dunya
// Non-default languages get prefix: /en/hello-world

export function langPrefix(lang: string, defaultLang: string): string {
  return lang === defaultLang ? '' : `/${lang}`;
}
