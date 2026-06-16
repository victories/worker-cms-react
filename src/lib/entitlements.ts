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
