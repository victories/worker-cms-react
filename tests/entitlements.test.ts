import { describe, it, expect } from 'vitest';
import { computeEntitlements } from '../src/lib/entitlements';

describe('computeEntitlements', () => {
  it('returns the package base when there are no add-ons', () => {
    const r = computeEntitlements({ packageMaxSites: 10, packageWhiteLabel: false, addons: [] });
    expect(r.maxSites).toBe(10);
    expect(r.features).toEqual([]);
  });

  it('adds active unit add-on units to max_sites', () => {
    const r = computeEntitlements({
      packageMaxSites: 10, packageWhiteLabel: false,
      addons: [{ type: 'unit', feature_key: 'extra_site', units: 10, status: 'active' }],
    });
    expect(r.maxSites).toBe(20);
  });

  it('ignores non-active add-ons', () => {
    const r = computeEntitlements({
      packageMaxSites: 10, packageWhiteLabel: false,
      addons: [{ type: 'unit', feature_key: 'extra_site', units: 5, status: 'cancelled' }],
    });
    expect(r.maxSites).toBe(10);
  });

  it('grants a feature from an active feature add-on', () => {
    const r = computeEntitlements({
      packageMaxSites: 10, packageWhiteLabel: false,
      addons: [{ type: 'feature', feature_key: 'white_label', units: 1, status: 'active' }],
    });
    expect(r.features).toContain('white_label');
  });

  it('grants white_label from the package even without an add-on', () => {
    const r = computeEntitlements({ packageMaxSites: 10, packageWhiteLabel: true, addons: [] });
    expect(r.features).toContain('white_label');
  });

  it('sums multiple unit add-ons and dedups features', () => {
    const r = computeEntitlements({
      packageMaxSites: 10, packageWhiteLabel: true,
      addons: [
        { type: 'unit', feature_key: 'extra_site', units: 5, status: 'active' },
        { type: 'unit', feature_key: 'extra_site', units: 5, status: 'active' },
        { type: 'feature', feature_key: 'white_label', units: 1, status: 'active' },
      ],
    });
    expect(r.maxSites).toBe(20);
    expect(r.features).toEqual(['white_label']);
  });
});
