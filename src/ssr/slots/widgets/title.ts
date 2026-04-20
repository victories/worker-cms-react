/**
 * Resolve a widget slot's title against the user's intent:
 *   - `undefined` (key missing in props)  → use the localised default
 *   - `''` (key set to empty string)     → caller should hide the header
 *   - any other string                    → use as-is
 *
 * Returns `null` to signal "no header"; widget slots check for null
 * and skip rendering CardHeader entirely.
 */
export function resolveTitle(raw: unknown, fallback: string): string | null {
  if (typeof raw !== 'string') return fallback;
  return raw.length > 0 ? raw : null;
}
