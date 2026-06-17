// Per-site feature gating from package.features.
//
// `packages.features` is a JSON array of feature slugs. A site has a
// feature if any of its owners (rows in `user_sites`) has an active
// subscription whose package's features array contains the slug.
//
// Used by paid features like Cloudflare Image Transformations: the
// helper checks once per request, then routes either emit transformed
// URLs (`/cdn-cgi/image/...`) or pass the originals through.

const FEATURE_CACHE = new Map<string, { value: boolean; expires: number }>();
const TTL_MS = 60_000; // 1 minute — short so admins see plan upgrades fast

/**
 * Returns `true` if any active owner of `siteId` has a subscription
 * whose package's `features` JSON array contains `featureSlug`.
 *
 * Result is memoised per-process for ~1 minute. The Workers runtime
 * recycles isolates frequently, so this is a best-effort cache rather
 * than a hard dependency for correctness.
 */
export async function siteHasFeature(
  db: D1Database,
  siteId: number,
  featureSlug: string
): Promise<boolean> {
  const cacheKey = `${siteId}:${featureSlug}`;
  const now = Date.now();
  const cached = FEATURE_CACHE.get(cacheKey);
  if (cached && cached.expires > now) return cached.value;

  let value = false;
  try {
    const rows = await db
      .prepare(
        `SELECT p.features
           FROM packages p
           JOIN subscriptions s ON s.package_id = p.id
           JOIN user_sites us ON us.user_id = s.user_id
          WHERE us.site_id = ?
            AND s.status = 'active'
            AND p.is_active = 1`
      )
      .bind(siteId)
      .all<{ features: string | null }>();

    const target = featureSlug.toLowerCase().replace(/[\s_]+/g, '-');
    for (const row of rows.results || []) {
      if (!row.features) continue;
      let arr: unknown;
      try {
        arr = JSON.parse(row.features);
      } catch {
        continue;
      }
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        if (typeof item !== 'string') continue;
        const norm = item.toLowerCase().replace(/[\s_]+/g, '-');
        if (norm === target || norm.includes(target)) {
          value = true;
          break;
        }
      }
      if (value) break;
    }
  } catch {
    // DB read failures fail-closed — paid features off by default.
    value = false;
  }

  FEATURE_CACHE.set(cacheKey, { value, expires: now + TTL_MS });
  return value;
}

/**
 * Returns `true` if the site belongs to a *paid* account: it is the
 * management site, an owner is a super_admin, or any owner has an active
 * subscription to a package whose price is greater than zero. Free
 * accounts (no active paid subscription) return `false`.
 *
 * Used to gate fair-use limits such as the per-image upload cap. Cached
 * per-process for ~1 minute (same TTL as feature lookups) and shares the
 * `invalidateSiteFeatures` invalidation via the `:__paid__` cache key.
 */
export async function siteIsPaidAccount(db: D1Database, siteId: number): Promise<boolean> {
  const cacheKey = `${siteId}:__paid__`;
  const now = Date.now();
  const cached = FEATURE_CACHE.get(cacheKey);
  if (cached && cached.expires > now) return cached.value;

  let value = false;
  try {
    const row = await db
      .prepare(
        `SELECT
           (SELECT 1 FROM sites WHERE id = ? AND is_management = 1) AS mgmt,
           (SELECT 1 FROM user_sites us JOIN users u ON u.id = us.user_id
              WHERE us.site_id = ? AND u.role = 'super_admin' LIMIT 1) AS sa,
           (SELECT 1 FROM user_sites us
              JOIN subscriptions s ON s.user_id = us.user_id
              JOIN packages p ON p.id = s.package_id
              WHERE us.site_id = ? AND s.status = 'active'
                AND (p.price_monthly > 0 OR p.price_yearly > 0) LIMIT 1) AS paid`
      )
      .bind(siteId, siteId, siteId)
      .first<{ mgmt: number | null; sa: number | null; paid: number | null }>();
    value = !!(row && (row.mgmt || row.sa || row.paid));
  } catch {
    // DB read failures fail-OPEN here: never block a legitimate upload
    // because of a transient query error. The 50MB hard cap still applies.
    value = true;
  }

  FEATURE_CACHE.set(cacheKey, { value, expires: now + TTL_MS });
  return value;
}

/** Drop the cached lookup for a site so admins see plan changes immediately. */
export function invalidateSiteFeatures(siteId: number) {
  for (const key of FEATURE_CACHE.keys()) {
    if (key.startsWith(`${siteId}:`)) FEATURE_CACHE.delete(key);
  }
}

// Canonical feature slugs (use these everywhere — typos fall through
// silently otherwise).
export const FEATURE_IMAGE_TRANSFORMS = 'image-transforms';
