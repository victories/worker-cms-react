/**
 * Settings inheritance utility.
 * Resolution order: site_settings[key] → global_settings[key] → hardcoded default
 */

export interface EffectiveSettingsResult {
  /** Resolved key-value pairs (site value if exists, else global value, else default) */
  values: Record<string, string>;
  /** Keys whose values came from global_settings (no site-level override) */
  inherited: string[];
}

/**
 * Resolve multiple settings keys with inheritance.
 * If keys is empty/undefined, returns ALL settings (site + global merged).
 */
export async function getEffectiveSettings(
  db: D1Database,
  siteId: number,
  keys?: string[]
): Promise<EffectiveSettingsResult> {
  let siteRows: { key: string; value: string }[];
  let globalRows: { key: string; value: string }[];

  if (keys && keys.length > 0) {
    const placeholders = keys.map(() => '?').join(',');
    const [siteResult, globalResult] = await Promise.all([
      db.prepare(
        `SELECT key, value FROM settings WHERE site_id = ? AND key IN (${placeholders})`
      ).bind(siteId, ...keys).all(),
      db.prepare(
        `SELECT key, value FROM global_settings WHERE key IN (${placeholders})`
      ).bind(...keys).all(),
    ]);
    siteRows = siteResult.results as any[];
    globalRows = globalResult.results as any[];
  } else {
    const [siteResult, globalResult] = await Promise.all([
      db.prepare('SELECT key, value FROM settings WHERE site_id = ?').bind(siteId).all(),
      db.prepare('SELECT key, value FROM global_settings').all(),
    ]);
    siteRows = siteResult.results as any[];
    globalRows = globalResult.results as any[];
  }

  const siteMap = new Map(siteRows.map(r => [r.key, r.value]));
  const globalMap = new Map(globalRows.map(r => [r.key, r.value]));

  const values: Record<string, string> = {};
  const inherited: string[] = [];

  // Merge: global first, then site overrides
  for (const [k, v] of globalMap) {
    if (siteMap.has(k)) {
      values[k] = siteMap.get(k)!;
    } else {
      values[k] = v;
      inherited.push(k);
    }
  }

  // Add site-only keys (not in global)
  for (const [k, v] of siteMap) {
    if (!(k in values)) {
      values[k] = v;
    }
  }

  return { values, inherited };
}

/**
 * Resolve a single setting key with inheritance.
 */
export async function getEffectiveSetting(
  db: D1Database,
  siteId: number,
  key: string,
  defaultValue: string = ''
): Promise<{ value: string; inherited: boolean }> {
  const siteRow = await db.prepare(
    'SELECT value FROM settings WHERE site_id = ? AND key = ?'
  ).bind(siteId, key).first<{ value: string }>();

  if (siteRow) {
    return { value: siteRow.value, inherited: false };
  }

  const globalRow = await db.prepare(
    'SELECT value FROM global_settings WHERE key = ?'
  ).bind(key).first<{ value: string }>();

  if (globalRow) {
    return { value: globalRow.value, inherited: true };
  }

  return { value: defaultValue, inherited: false };
}
