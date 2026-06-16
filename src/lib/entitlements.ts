import type { D1Database } from '@cloudflare/workers-types';

export interface EntitlementAddon {
  type: 'unit' | 'feature';
  feature_key: string | null;
  units: number;
  status: string;
}
export interface EntitlementInput {
  packageMaxSites: number;
  packageWhiteLabel: boolean;
  addons: EntitlementAddon[];
}
export interface Entitlements {
  maxSites: number;
  features: string[];
}

// The unit add-on that grants extra sites is identified by this feature key.
export const EXTRA_SITE_KEY = 'extra_site';

export function computeEntitlements(input: EntitlementInput): Entitlements {
  const active = input.addons.filter((a) => a.status === 'active');
  const extraSites = active
    .filter((a) => a.type === 'unit' && a.feature_key === EXTRA_SITE_KEY)
    .reduce((sum, a) => sum + (a.units || 0), 0);
  const features = new Set<string>();
  if (input.packageWhiteLabel) features.add('white_label');
  for (const a of active) {
    if (a.type === 'feature' && a.feature_key) features.add(a.feature_key);
  }
  return { maxSites: input.packageMaxSites + extraSites, features: [...features] };
}

// Recompute a user's effective entitlements from their active package
// subscription + active add-ons, and cache max_sites onto users.max_sites
// (existing site-creation enforcement reads that column). Returns features.
export async function recomputeUserEntitlements(db: D1Database, userId: number): Promise<Entitlements> {
  const pkg = await db.prepare(
    `SELECT p.max_sites, p.white_label FROM subscriptions s
     JOIN packages p ON p.id = s.package_id
     WHERE s.user_id = ? AND s.status = 'active'
     ORDER BY s.created_at DESC LIMIT 1`
  ).bind(userId).first<{ max_sites: number; white_label: number }>();

  const rows = await db.prepare(
    `SELECT a.type, a.feature_key, ua.units, ua.status
     FROM user_addons ua JOIN addons a ON a.id = ua.addon_id
     WHERE ua.user_id = ? AND ua.status = 'active'`
  ).bind(userId).all<EntitlementAddon>();

  const ent = computeEntitlements({
    packageMaxSites: pkg?.max_sites ?? 1,
    packageWhiteLabel: pkg?.white_label === 1,
    addons: rows.results || [],
  });

  await db.prepare("UPDATE users SET max_sites = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(ent.maxSites, userId).run();
  return ent;
}

export async function getUserFeatures(db: D1Database, userId: number): Promise<string[]> {
  return (await recomputeUserEntitlements(db, userId)).features;
}
