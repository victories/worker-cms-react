import type { D1Database } from '@cloudflare/workers-types';

// Creem.io config (api key, webhook secret, test mode) lives in
// global_settings. Test mode hits the sandbox API; live hits production.
export async function getCreemConfig(db: D1Database) {
  const rows = await db.prepare(
    "SELECT key, value FROM global_settings WHERE key IN ('creem_api_key','creem_webhook_secret','creem_test_mode')"
  ).all<{ key: string; value: string }>();
  const map: Record<string, string> = {};
  for (const r of rows.results || []) map[r.key] = r.value;
  const testMode = map.creem_test_mode === '1' || map.creem_test_mode === 'true';
  return {
    apiKey: map.creem_api_key || '',
    webhookSecret: map.creem_webhook_secret || '',
    testMode,
    baseUrl: testMode ? 'https://test-api.creem.io' : 'https://api.creem.io',
  };
}

// Create a recurring Creem product and return its id (prod_...). Creem
// product prices are immutable, so callers create a new product whenever
// the admin changes a price; existing subscribers keep their price until
// renewal. Throws on API failure (callers treat as a non-fatal warning).
export async function ensureCreemProduct(
  cfg: { apiKey: string; baseUrl: string },
  opts: { name: string; description?: string; priceCents: number; billingPeriod: 'every-month' | 'every-year'; currency?: string }
): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/v1/products`, {
    method: 'POST',
    headers: { 'x-api-key': cfg.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: opts.name,
      description: opts.description || opts.name,
      price: opts.priceCents,
      currency: opts.currency || 'USD',
      billing_type: 'recurring',
      billing_period: opts.billingPeriod,
      tax_category: 'saas',
      tax_mode: 'inclusive',
    }),
  });
  const data = (await res.json()) as any;
  if (!res.ok || !data?.id) throw new Error(data?.message || 'Creem product create failed');
  return data.id as string;
}

// Ensure both monthly & yearly Creem products exist for a priced entity,
// (re)creating them when the price changed or the id is missing. Returns
// the (possibly updated) product ids. Skips a period when its price is 0.
export async function syncCreemProducts(
  db: D1Database,
  args: {
    name: string;
    priceMonthly: number; priceYearly: number;
    prevPriceMonthly?: number; prevPriceYearly?: number;
    monthlyId?: string | null; yearlyId?: string | null;
  }
): Promise<{ monthlyId: string | null; yearlyId: string | null; warning?: string }> {
  const cfg = await getCreemConfig(db);
  if (!cfg.apiKey) return { monthlyId: args.monthlyId ?? null, yearlyId: args.yearlyId ?? null, warning: 'Creem yapılandırılmamış' };
  let monthlyId = args.monthlyId ?? null;
  let yearlyId = args.yearlyId ?? null;
  let warning: string | undefined;
  try {
    if (args.priceMonthly > 0 && (!monthlyId || args.priceMonthly !== args.prevPriceMonthly)) {
      monthlyId = await ensureCreemProduct(cfg, { name: `${args.name} (Monthly)`, priceCents: Math.round(args.priceMonthly * 100), billingPeriod: 'every-month' });
    }
    if (args.priceYearly > 0 && (!yearlyId || args.priceYearly !== args.prevPriceYearly)) {
      yearlyId = await ensureCreemProduct(cfg, { name: `${args.name} (Yearly)`, priceCents: Math.round(args.priceYearly * 100), billingPeriod: 'every-year' });
    }
  } catch (e: any) {
    warning = `Creem ürün senkronu başarısız: ${e?.message || e}`;
  }
  return { monthlyId, yearlyId, warning };
}
