import { defineConfig } from 'vitest/config';

// Vitest runs in plain node — the modules under test (sanitize, totp,
// shortcode parser, the Stripe HMAC helper) only touch Web Crypto + the
// HTML string surface, both of which Node 20+ exposes natively. The
// Cloudflare Workers integration tests (D1, R2, KV) belong in a
// separate `@cloudflare/vitest-pool-workers` config and are out of
// scope for this initial battery.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
