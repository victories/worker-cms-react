// Shortcode processing engine
// Replaces [shortcode_name] patterns in content with their defined values

export interface Shortcode {
  id: number;
  site_id: number | null;
  name: string;
  content: string;
  is_active: number;
}

/**
 * Load all active shortcodes for a site (site-specific + global)
 * Site-specific shortcodes override global ones with the same name
 */
export async function loadShortcodes(db: D1Database, siteId: number): Promise<Map<string, string>> {
  const result = await db.prepare(
    `SELECT name, content, site_id FROM shortcodes
     WHERE is_active = 1 AND (site_id IS NULL OR site_id = ?)
     ORDER BY site_id ASC`
  ).bind(siteId).all<{ name: string; content: string; site_id: number | null }>();

  const map = new Map<string, string>();

  // Global shortcodes first (site_id IS NULL comes first due to ASC ordering of NULLs in SQLite)
  // Then site-specific shortcodes override globals with same name
  for (const row of result.results) {
    map.set(row.name, row.content);
  }

  return map;
}

/**
 * Process content by replacing [shortcode_name] patterns
 * Supports nested shortcodes (one level deep)
 */
export function processShortcodes(content: string, shortcodes: Map<string, string>): string {
  if (!content || shortcodes.size === 0) return content;

  // Match [word] patterns - only alphanumeric, underscore, hyphen allowed in names
  const pattern = /\[([a-zA-Z0-9_-]+)\]/g;

  let processed = content.replace(pattern, (match, name) => {
    const replacement = shortcodes.get(name);
    return replacement !== undefined ? replacement : match;
  });

  // Second pass for any shortcodes that were inside other shortcodes' content
  processed = processed.replace(pattern, (match, name) => {
    const replacement = shortcodes.get(name);
    return replacement !== undefined ? replacement : match;
  });

  return processed;
}
