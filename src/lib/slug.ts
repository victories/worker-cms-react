// Turkish character map for slug generation
const charMap: Record<string, string> = {
  'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G',
  'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O',
  'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U',
  'â': 'a', 'Â': 'A', 'î': 'i', 'Î': 'I',
  'û': 'u', 'Û': 'U',
  // Common European characters
  'à': 'a', 'á': 'a', 'ä': 'a', 'è': 'e', 'é': 'e', 'ë': 'e',
  'ì': 'i', 'í': 'i', 'ï': 'i', 'ò': 'o', 'ó': 'o',
  'ù': 'u', 'ú': 'u', 'ñ': 'n', 'ß': 'ss',
};

export function createSlug(text: string): string {
  let slug = text.toLowerCase();

  // Replace special characters
  slug = slug.replace(/[^\x00-\x7F]/g, (char) => charMap[char] || '');

  // Replace non-alphanumeric with hyphens
  slug = slug.replace(/[^a-z0-9]+/g, '-');

  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  return slug || 'untitled';
}

export async function ensureUniqueSlug(
  db: D1Database,
  table: string,
  slug: string,
  siteId: number,
  language: string = 'tr',
  excludeId?: number
): Promise<string> {
  let candidate = slug;
  let counter = 1;

  while (true) {
    let query = `SELECT id FROM ${table} WHERE site_id = ? AND slug = ? AND language = ?`;
    const params: unknown[] = [siteId, candidate, language];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const existing = await db.prepare(query).bind(...params).first();
    if (!existing) return candidate;

    counter++;
    candidate = `${slug}-${counter}`;
  }
}
