// System-status data layer.
//
// Pulls component health from Cloudflare's official status feed
// (https://www.cloudflarestatus.com — a public Atlassian Statuspage) and
// caches a snapshot in D1 (`global_settings.status_snapshot`). The status
// page (/legal/durum) reads that snapshot; the cron handler and a lazy
// on-request refresh keep it fresh (~5 min). Components we don't pull from
// Cloudflare (admin panel, payment infrastructure, email) are reported as
// operational — the worker answering the request already proves the app
// layer is up.

import type { Bindings } from '../types';

export type StatusLevel = 'operational' | 'degraded' | 'partial' | 'outage';

export interface StatusComponent {
  key: string;
  status: StatusLevel;
}

export interface StatusSnapshot {
  /** ISO timestamp of when the snapshot was fetched. */
  checked_at: string;
  overall: StatusLevel;
  components: StatusComponent[];
  source: 'cloudflare';
  /** Whether the last fetch succeeded. */
  ok: boolean;
}

export interface StatusComponentDef {
  key: string;
  name_tr: string;
  name_en: string;
  /** 'cloudflare' = pulled from the feed via `match`; 'self' = always operational. */
  source: 'cloudflare' | 'self';
  /** Matches a Cloudflare component name (lower-cased) when source === 'cloudflare'. */
  match?: (name: string) => boolean;
}

// Ordered list of components shown on the status page.
export const STATUS_COMPONENTS: readonly StatusComponentDef[] = [
  {
    key: 'web',
    name_tr: 'Web',
    name_en: 'Web',
    source: 'cloudflare',
    // Cloudflare's component is named exactly "Workers" (distinct from
    // "Workers KV", "Workers AI", "Workers Assets", …).
    match: (n) => n === 'workers',
  },
  {
    key: 'db',
    name_tr: 'Veritabanı (D1)',
    name_en: 'Database (D1)',
    source: 'cloudflare',
    match: (n) => n === 'd1',
  },
  {
    key: 'media',
    name_tr: 'Medya (R2)',
    name_en: 'Media (R2)',
    source: 'cloudflare',
    match: (n) => n === 'r2',
  },
  {
    key: 'admin',
    name_tr: 'Yönetim Paneli',
    name_en: 'Admin Panel',
    source: 'self',
  },
  {
    key: 'payments',
    name_tr: 'Ödeme altyapısı',
    name_en: 'Payment infrastructure',
    source: 'self',
  },
  {
    key: 'email',
    name_tr: 'E-posta',
    name_en: 'Email',
    source: 'self',
  },
];

export const STATUS_TTL_MS = 5 * 60 * 1000;
const STATUS_KEY = 'status_snapshot';
const SUMMARY_URL = 'https://www.cloudflarestatus.com/api/v2/summary.json';
const SEVERITY: Record<StatusLevel, number> = {
  operational: 0,
  degraded: 1,
  partial: 2,
  outage: 3,
};

/** Map a Statuspage component status string to our enum. */
function mapStatus(raw: string | undefined): StatusLevel {
  switch (raw) {
    case 'major_outage':
      return 'outage';
    case 'partial_outage':
      return 'partial';
    case 'degraded_performance':
    case 'under_maintenance':
      return 'degraded';
    default:
      return 'operational';
  }
}

/** Worst status across a list (drives the overall banner). */
function worst(levels: StatusLevel[]): StatusLevel {
  return levels.reduce<StatusLevel>(
    (acc, l) => (SEVERITY[l] > SEVERITY[acc] ? l : acc),
    'operational'
  );
}

/** All-operational, self-reported fallback used before the first fetch. */
export function defaultSnapshot(checkedAt: string): StatusSnapshot {
  return {
    checked_at: checkedAt,
    overall: 'operational',
    components: STATUS_COMPONENTS.map((c) => ({ key: c.key, status: 'operational' })),
    source: 'cloudflare',
    ok: false,
  };
}

/** Read the cached snapshot from D1; null when none exists yet. */
export async function getStatusSnapshot(env: Bindings): Promise<StatusSnapshot | null> {
  try {
    const row = await env.DB.prepare(
      "SELECT value FROM global_settings WHERE key = ?"
    )
      .bind(STATUS_KEY)
      .first<{ value: string }>();
    if (!row?.value) return null;
    return JSON.parse(row.value) as StatusSnapshot;
  } catch {
    return null;
  }
}

export function isStale(snapshot: StatusSnapshot | null, ttlMs = STATUS_TTL_MS): boolean {
  if (!snapshot) return true;
  const t = Date.parse(snapshot.checked_at);
  if (Number.isNaN(t)) return true;
  return Date.now() - t > ttlMs;
}

/**
 * Fetch Cloudflare's status feed, map to our components, and persist the
 * snapshot to D1. On any failure the previous snapshot is left untouched
 * (we never overwrite good data with an error).
 */
export async function refreshStatusSnapshot(env: Bindings): Promise<StatusSnapshot | null> {
  let data: any;
  try {
    const res = await fetch(SUMMARY_URL, {
      headers: { accept: 'application/json' },
      // Let Cloudflare's edge cache de-dupe upstream hits across colos.
      cf: { cacheTtl: 60, cacheEverything: true },
    } as RequestInit);
    if (!res.ok) throw new Error(`status feed HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.error('[status] fetch failed:', err);
    return null; // keep last good snapshot
  }

  const cfComponents: Array<{ name?: string; status?: string }> = Array.isArray(
    data?.components
  )
    ? data.components
    : [];

  const components: StatusComponent[] = STATUS_COMPONENTS.map((def) => {
    if (def.source === 'self') return { key: def.key, status: 'operational' as StatusLevel };
    const hit = cfComponents.find((c) => def.match!((c.name || '').toLowerCase()));
    return { key: def.key, status: mapStatus(hit?.status) };
  });

  const snapshot: StatusSnapshot = {
    checked_at: new Date().toISOString(),
    overall: worst(components.map((c) => c.status)),
    components,
    source: 'cloudflare',
    ok: true,
  };

  try {
    await env.DB.prepare(
      "INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)"
    )
      .bind(STATUS_KEY, JSON.stringify(snapshot))
      .run();
  } catch (err) {
    console.error('[status] persist failed:', err);
  }
  return snapshot;
}
