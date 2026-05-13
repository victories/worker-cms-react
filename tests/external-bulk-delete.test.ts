import { describe, it, expect, beforeEach } from 'vitest';
import external from '../src/routes/api/external';
import { hashApiKey } from '../src/lib/auth';

// Minimal D1 stub. The bulk-delete handler needs:
//   1. api_keys lookup (userApiKeyAuth middleware)
//   2. site access lookup (super_admin bypass, so trivial)
//   3. last_used UPDATE (waitUntil — fire and forget)
//   4. SELECT id FROM posts WHERE id IN (...) AND site_id = ?
//   5. batch() of 5 statements per delete chunk
//
// We don't exercise the actual deletion logic past the response shape
// — that belongs in a workers-pool integration test. Here we lock down
// the contract: validation errors, success shape, failed-list shape.

type Row = Record<string, unknown>;

interface QueryRecorder {
  sql: string;
  bindings: unknown[];
}

function makeDb(opts: {
  apiKeyRow?: Row | null;
  ownedPostIds?: number[]; // ids that "exist" in the posts table for site=1
  batchChanges?: number; // changes returned from the posts DELETE statement
}) {
  const calls: QueryRecorder[] = [];
  const owned = new Set(opts.ownedPostIds ?? []);
  const apiKeyRow = opts.apiKeyRow === undefined
    ? {
        id: 1,
        scope: 'user',
        site_id: null,
        user_id: 7,
        expires_at: null,
        permissions: 'read,write',
        email: 'test@example.com',
        role: 'super_admin',
        display_name: 'Test',
      }
    : opts.apiKeyRow;
  const batchChanges = opts.batchChanges ?? 0;

  const db = {
    prepare(sql: string) {
      const stmt = {
        _bindings: [] as unknown[],
        bind(...args: unknown[]) {
          this._bindings = args;
          return this;
        },
        async first<T = Row>() {
          calls.push({ sql, bindings: this._bindings });
          if (sql.startsWith('SELECT k.id, k.scope, k.site_id')) {
            return apiKeyRow as T | null;
          }
          return null;
        },
        async all<T = Row>() {
          calls.push({ sql, bindings: this._bindings });
          if (/SELECT id FROM posts WHERE id IN/.test(sql)) {
            // last bind is site_id, the rest are ids
            const ids = this._bindings.slice(0, -1) as number[];
            const results = ids.filter((id) => owned.has(id)).map((id) => ({ id }));
            return { results } as { results: T[] };
          }
          return { results: [] } as { results: T[] };
        },
        async run() {
          calls.push({ sql, bindings: this._bindings });
          return { meta: { changes: 0 } };
        },
      };
      return stmt;
    },
    async batch(stmts: any[]) {
      // Each statement was already recorded when .bind() was chained
      // off prepare(); to simulate D1 batch we just return per-statement
      // meta. Posts DELETE is the 5th (index 4) — wire batchChanges
      // there so the handler's `affected` counter matches.
      return stmts.map((_s: any, i: number) => ({
        meta: { changes: i === 4 ? batchChanges : 0 },
      }));
    },
  };

  return { db, calls };
}

function makeEnv(db: any) {
  return {
    DB: db,
    R2: {} as any,
    JWT_SECRET: 'test',
    ADMIN_DOMAIN: 'test.local',
    RESEND_API_KEY: '',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    GITHUB_CLIENT_ID: '',
    GITHUB_CLIENT_SECRET: '',
    __STATIC_CONTENT: {} as any,
    CACHE: undefined,
  };
}

const VALID_KEY = 'wcms_' + 'a'.repeat(64);

async function callBulkDelete(
  db: any,
  siteId: string | number,
  body: unknown,
  apiKey: string = VALID_KEY,
) {
  const req = new Request(`http://localhost/sites/${siteId}/posts/bulk`, {
    method: 'DELETE',
    headers: {
      'X-API-Key': apiKey,
      'content-type': 'application/json',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return external.fetch(req, makeEnv(db), {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as any);
}

describe('DELETE /sites/:id/posts/bulk', () => {
  let validApiKeyHash: string;
  beforeEach(async () => {
    validApiKeyHash = await hashApiKey(VALID_KEY);
  });

  it('rejects missing API key with 401', async () => {
    const { db } = makeDb({});
    const req = new Request('http://localhost/sites/1/posts/bulk', {
      method: 'DELETE',
      body: '{"post_ids":[1]}',
      headers: { 'content-type': 'application/json' },
    });
    const res = await external.fetch(req, makeEnv(db), {
      waitUntil: () => {},
      passThroughOnException: () => {},
    } as any);
    expect(res.status).toBe(401);
  });

  it('rejects invalid JSON body with 400', async () => {
    const { db } = makeDb({});
    const res = await callBulkDelete(db, 1, 'not-json{');
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/JSON/i);
  });

  it('rejects missing post_ids with 400', async () => {
    const { db } = makeDb({});
    const res = await callBulkDelete(db, 1, {});
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/post_ids/i);
  });

  it('rejects non-array post_ids with 400', async () => {
    const { db } = makeDb({});
    const res = await callBulkDelete(db, 1, { post_ids: 'oops' });
    expect(res.status).toBe(400);
  });

  it('rejects empty post_ids array with 400', async () => {
    const { db } = makeDb({});
    const res = await callBulkDelete(db, 1, { post_ids: [] });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/boş/);
  });

  it('rejects oversized post_ids (>200) with 400', async () => {
    const { db } = makeDb({});
    const ids = Array.from({ length: 201 }, (_, i) => i + 1);
    const res = await callBulkDelete(db, 1, { post_ids: ids });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/200/);
  });

  it('rejects invalid site id with 400', async () => {
    const { db } = makeDb({});
    const res = await callBulkDelete(db, 'abc', { post_ids: [1] });
    expect(res.status).toBe(400);
  });

  it('returns deleted=0 with failed list when none match', async () => {
    const { db } = makeDb({ ownedPostIds: [], batchChanges: 0 });
    const res = await callBulkDelete(db, 1, { post_ids: [42, 43] });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      data: { deleted: number; failed: Array<{ id: number; reason: string }> };
    };
    expect(json.success).toBe(true);
    expect(json.data.deleted).toBe(0);
    expect(json.data.failed).toHaveLength(2);
    expect(json.data.failed[0]).toMatchObject({ reason: 'not_found' });
  });

  it('returns deleted count + empty failed when all match', async () => {
    const { db } = makeDb({ ownedPostIds: [10, 11], batchChanges: 2 });
    const res = await callBulkDelete(db, 1, { post_ids: [10, 11] });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      data: { deleted: number; failed: Array<{ id: number; reason: string }> };
    };
    expect(json.success).toBe(true);
    expect(json.data.deleted).toBe(2);
    expect(json.data.failed).toEqual([]);
  });

  it('flags invalid id types in failed list', async () => {
    const { db } = makeDb({ ownedPostIds: [5], batchChanges: 1 });
    const res = await callBulkDelete(db, 1, { post_ids: [5, 'bad', -1, 0] });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      data: { deleted: number; failed: Array<{ id: number; reason: string }> };
    };
    expect(json.data.deleted).toBe(1);
    const reasons = json.data.failed.map((f) => f.reason);
    expect(reasons.filter((r) => r === 'invalid_id').length).toBe(3);
  });

  it('rejects site-scoped key that does not match URL site_id with 403', async () => {
    const { db } = makeDb({
      apiKeyRow: {
        id: 2,
        scope: 'site',
        site_id: 5, // key bound to site 5
        user_id: 7,
        expires_at: null,
        permissions: 'read,write',
        email: 'test@example.com',
        role: 'editor',
        display_name: 'Test',
      },
    });
    // try to bulk-delete on site 1 with a site-5 key
    const res = await callBulkDelete(db, 1, { post_ids: [1] });
    expect(res.status).toBe(403);
  });

  // Reference the hash so the import isn't dead — keeps the test
  // file honest about what userApiKeyAuth would actually do.
  it('hashes the api key deterministically', async () => {
    expect(validApiKeyHash).toBe(await hashApiKey(VALID_KEY));
  });
});
