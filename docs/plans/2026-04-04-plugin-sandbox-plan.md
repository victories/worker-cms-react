# Plugin Sandbox Isolation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add permissions-based sandbox for built-in plugins + Workers for Platforms isolation for 3rd party plugins + execution logging with admin UI.

**Architecture:** Two-layer sandbox: (1) SandboxedPluginContext wraps plugin engine with permission checks, timing, and error handling for built-in plugins. (2) Dispatch namespace integration for 3rd party plugins running in isolated V8 isolates. All plugin executions logged to DB.

**Tech Stack:** Hono, Cloudflare Workers, D1, Workers for Platforms (dispatch namespaces), TypeScript

**Backward Compat:** DISPATCHER and CACHE bindings are optional. Missing permissions default to permissive. Built-in plugins stay in static registry. No breaking changes.

---

### Task 1: Database Migration

**Files:**
- Create: `src/db/migrations/020_plugin_sandbox.sql`
- Modify: `src/db/schema.sql` (add new columns and table)

**Step 1: Create migration file**

```sql
-- 020_plugin_sandbox.sql
-- Plugin sandbox: permissions, allowed_domains, execution logging

-- Add permissions column to plugins table
ALTER TABLE plugins ADD COLUMN permissions TEXT;

-- Add allowed_domains for outbound control (Workers for Platforms)
ALTER TABLE plugins ADD COLUMN allowed_domains TEXT;

-- Update existing built-in plugins with their required permissions
UPDATE plugins SET permissions = '["posts:read","posts:write","page:inject"]' WHERE slug = 'seo-optimizer';
UPDATE plugins SET permissions = '["posts:read","page:inject"]' WHERE slug = 'social-share';
UPDATE plugins SET permissions = '["posts:read","page:inject","http:fetch"]' WHERE slug = 'contact-form';
UPDATE plugins SET permissions = '["page:inject"]' WHERE slug = 'hero-slider';

-- Plugin execution logs
CREATE TABLE IF NOT EXISTS plugin_execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  plugin_slug TEXT NOT NULL,
  hook TEXT NOT NULL,
  duration_ms INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plugin_logs_lookup ON plugin_execution_logs(site_id, plugin_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_logs_cleanup ON plugin_execution_logs(created_at);
```

**Step 2: Update schema.sql**

Add `permissions TEXT` and `allowed_domains TEXT` to the plugins CREATE TABLE block (after `settings_schema`).

Add the `plugin_execution_logs` CREATE TABLE and indexes to schema.sql.

**Step 3: Run migration**

```bash
npx wrangler d1 execute cms-db --remote -c wrangler.workercms.toml --file=src/db/migrations/020_plugin_sandbox.sql
```

**Step 4: Commit**

```bash
git add src/db/migrations/020_plugin_sandbox.sql src/db/schema.sql
git commit -m "feat: add plugin sandbox migration - permissions, execution logs"
```

---

### Task 2: Permission Definitions

**Files:**
- Create: `src/lib/plugins/permissions.ts`
- Modify: `src/lib/plugins/types.ts`

**Step 1: Add PluginPermission type to types.ts**

After the `PluginManifest` interface (line 50), the `permissions` field already exists as `string[]`. Add the type:

```typescript
export type PluginPermission =
  | 'posts:read' | 'posts:write'
  | 'media:read' | 'media:write'
  | 'settings:read' | 'settings:write'
  | 'comments:read' | 'comments:write'
  | 'http:fetch'
  | 'page:inject';
```

Update `PluginManifest.permissions` type from `string[]` to `PluginPermission[]`.

**Step 2: Create permissions.ts**

```typescript
// src/lib/plugins/permissions.ts
import type { HookName, PluginPermission } from './types';

// Which permissions are required for each hook
export const HOOK_REQUIRED_PERMISSIONS: Record<HookName, PluginPermission[]> = {
  'post.beforeSave': ['posts:read', 'posts:write'],
  'post.afterSave': ['posts:read'],
  'post.beforeDelete': ['posts:read'],
  'post.beforeRender': ['posts:read'],
  'media.afterUpload': ['media:read'],
  'media.beforeServe': ['media:read'],
  'comment.beforeSave': ['comments:read', 'comments:write'],
  'comment.afterSave': ['comments:read'],
  'page.head': ['page:inject'],
  'page.bodyStart': ['page:inject'],
  'page.bodyEnd': ['page:inject'],
  'api.response': ['settings:read'],
};

// Human-readable descriptions for admin UI
export const PERMISSION_DESCRIPTIONS: Record<PluginPermission, string> = {
  'posts:read': 'Yaziları okuyabilir',
  'posts:write': 'Yaziları düzenleyebilir',
  'media:read': 'Medya dosyalarini okuyabilir',
  'media:write': 'Medya dosyalarini düzenleyebilir',
  'settings:read': 'Site ayarlarini okuyabilir',
  'settings:write': 'Site ayarlarini düzenleyebilir',
  'comments:read': 'Yorumlari okuyabilir',
  'comments:write': 'Yorumlari düzenleyebilir',
  'http:fetch': 'Dis sunuculara HTTP istegi yapabilir',
  'page:inject': 'Sayfalara HTML enjekte edebilir',
};

// Validate that permissions array contains only valid values
export function validatePermissions(perms: string[]): { valid: boolean; invalid: string[] } {
  const validSet = new Set(Object.keys(PERMISSION_DESCRIPTIONS));
  const invalid = perms.filter(p => !validSet.has(p));
  return { valid: invalid.length === 0, invalid };
}

// Check if a plugin has all required permissions for a hook
export function hasPermissionForHook(
  pluginPermissions: PluginPermission[],
  hook: HookName
): boolean {
  const required = HOOK_REQUIRED_PERMISSIONS[hook];
  if (!required || required.length === 0) return true;
  return required.every(p => pluginPermissions.includes(p));
}
```

**Step 3: Commit**

```bash
git add src/lib/plugins/permissions.ts src/lib/plugins/types.ts
git commit -m "feat: add plugin permission definitions and hook mapping"
```

---

### Task 3: SandboxedPluginContext

**Files:**
- Create: `src/lib/plugins/sandbox.ts`

**Step 1: Create sandbox.ts**

```typescript
// src/lib/plugins/sandbox.ts
import type { HookName, PluginPermission } from './types';
import { pluginEngine } from './engine';
import { hasPermissionForHook } from './permissions';

export class SandboxedPluginContext {
  private pluginSlug: string;
  private permissions: PluginPermission[];
  private siteId: number;
  private db: D1Database | null;

  constructor(
    pluginSlug: string,
    permissions: PluginPermission[],
    siteId: number,
    db: D1Database | null = null
  ) {
    this.pluginSlug = pluginSlug;
    this.permissions = permissions;
    this.siteId = siteId;
    this.db = db;
  }

  register(slug: string, hook: string, handler: Function, priority?: number): void {
    const hookName = hook as HookName;

    // Permission check (empty permissions = permissive for backward compat)
    if (this.permissions.length > 0 && !hasPermissionForHook(this.permissions, hookName)) {
      console.warn(
        `[Sandbox] Plugin "${this.pluginSlug}" denied hook "${hook}" - missing permissions`
      );
      return;
    }

    // Wrap handler with safety + logging
    const safeHandler = this.createSafeHandler(hookName, handler);
    pluginEngine.register(slug, hookName, safeHandler, priority);
  }

  private createSafeHandler(hook: HookName, handler: Function): (...args: any[]) => any {
    const pluginSlug = this.pluginSlug;
    const siteId = this.siteId;
    const db = this.db;

    return async (...args: any[]): Promise<any> => {
      const start = Date.now();
      let status: 'success' | 'error' | 'timeout' = 'success';
      let errorMessage: string | undefined;

      try {
        const result = await handler(...args);
        return result;
      } catch (err: any) {
        status = 'error';
        errorMessage = err?.message || String(err);
        console.error(`[Sandbox] Plugin "${pluginSlug}" error in hook "${hook}":`, errorMessage);
        // Return first arg as fallback (original value for filters)
        return args[0];
      } finally {
        const durationMs = Date.now() - start;
        // Log execution asynchronously (don't block response)
        if (db) {
          try {
            db.prepare(
              `INSERT INTO plugin_execution_logs (site_id, plugin_slug, hook, duration_ms, status, error_message) VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(siteId, pluginSlug, hook, durationMs, status, errorMessage || null).run();
          } catch {
            // Silently fail logging - don't break plugin execution
          }
        }
      }
    };
  }
}

export function createPluginSandbox(
  pluginSlug: string,
  permissions: PluginPermission[],
  siteId: number,
  db: D1Database | null = null
): SandboxedPluginContext {
  return new SandboxedPluginContext(pluginSlug, permissions, siteId, db);
}
```

**Step 2: Commit**

```bash
git add src/lib/plugins/sandbox.ts
git commit -m "feat: add SandboxedPluginContext with permission checks and logging"
```

---

### Task 4: Middleware Integration

**Files:**
- Modify: `src/middleware/pluginHooks.ts` (lines 15-17 registry type, lines 56-65 plugin loop)

**Step 1: Update pluginRegistry type**

Change line 15-18 from:
```typescript
const pluginRegistry: Record<
  string,
  { register: (engine: typeof pluginEngine, settings: Record<string, any>) => void }
> = {};
```
To:
```typescript
const pluginRegistry: Record<
  string,
  { register: (engine: { register: (slug: string, hook: string, handler: Function, priority?: number) => void }, settings: Record<string, any>) => void }
> = {};
```

**Step 2: Update registerBuiltinPlugin signature**

Change line 21-26 from:
```typescript
export function registerBuiltinPlugin(
  entryPoint: string,
  module: { register: (engine: typeof pluginEngine, settings: Record<string, any>) => void }
) {
```
To:
```typescript
export function registerBuiltinPlugin(
  entryPoint: string,
  module: { register: (engine: { register: (slug: string, hook: string, handler: Function, priority?: number) => void }, settings: Record<string, any>) => void }
) {
```

**Step 3: Add sandbox import and update plugin registration loop**

Add import at top:
```typescript
import { createPluginSandbox } from '../lib/plugins/sandbox';
import type { PluginPermission } from '../lib/plugins/types';
```

Change lines 56-65 (the plugin registration loop) from:
```typescript
    for (const plugin of result.results as any[]) {
      const mod = pluginRegistry[plugin.entry_point];
      if (mod) {
        try {
          const settings = plugin.site_settings ? JSON.parse(plugin.site_settings) : {};
          mod.register(pluginEngine, settings);
        } catch (e) {
          console.error(`Failed to register plugin ${plugin.slug}:`, e);
        }
      }
    }
```
To:
```typescript
    for (const plugin of result.results as any[]) {
      const mod = pluginRegistry[plugin.entry_point];
      if (mod) {
        try {
          const settings = plugin.site_settings ? JSON.parse(plugin.site_settings) : {};
          const permissions: PluginPermission[] = plugin.permissions ? JSON.parse(plugin.permissions) : [];
          const sandbox = createPluginSandbox(plugin.slug, permissions, siteId, c.env.DB);
          mod.register(sandbox, settings);
        } catch (e) {
          console.error(`Failed to register plugin ${plugin.slug}:`, e);
        }
      }
    }
```

**Step 4: Commit**

```bash
git add src/middleware/pluginHooks.ts
git commit -m "feat: integrate sandbox into plugin middleware - permission checks + logging"
```

---

### Task 5: Plugin API Updates

**Files:**
- Modify: `src/routes/api/plugins.ts`

**Step 1: Add permissions to POST endpoint**

Update the POST endpoint body type (line 29-31) to include `permissions`:
```typescript
const body = await c.req.json<{
  slug: string; name: string; description?: string; version: string;
  author?: string; entry_point: string; hooks?: string[]; settings_schema?: Record<string, any>;
  permissions?: string[];
}>();
```

Update the INSERT query (line 38-45) to include permissions:
```typescript
const result = await c.env.DB.prepare(
  'INSERT INTO plugins (slug, name, description, version, author, entry_point, hooks, settings_schema, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *'
).bind(
  body.slug, body.name, body.description || null, body.version,
  body.author || null, body.entry_point,
  body.hooks ? JSON.stringify(body.hooks) : null,
  body.settings_schema ? JSON.stringify(body.settings_schema) : null,
  body.permissions ? JSON.stringify(body.permissions) : null
).first();
```

**Step 2: Add execution logs endpoint**

After the settings PUT endpoint (line 113), add:
```typescript
// GET /api/plugins/:slug/logs - Get execution logs for a plugin
plugins.get('/:slug/logs', requireRole('admin'), requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const slug = c.req.param('slug');
  const days = parseInt(c.req.query('days') || '7');
  const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500);

  const logs = await c.env.DB.prepare(
    `SELECT id, hook, duration_ms, status, error_message, created_at
     FROM plugin_execution_logs
     WHERE site_id = ? AND plugin_slug = ? AND created_at >= datetime('now', '-${days} days')
     ORDER BY created_at DESC
     LIMIT ?`
  ).bind(siteId, slug, limit).all();

  // Summary stats
  const stats = await c.env.DB.prepare(
    `SELECT
       COUNT(*) as total_calls,
       AVG(duration_ms) as avg_duration_ms,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
       SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) as timeout_count
     FROM plugin_execution_logs
     WHERE site_id = ? AND plugin_slug = ? AND created_at >= datetime('now', '-${days} days')`
  ).bind(siteId, slug).first();

  return c.json({
    success: true,
    data: {
      logs: logs.results,
      stats: {
        total_calls: stats?.total_calls || 0,
        avg_duration_ms: Math.round((stats?.avg_duration_ms as number) || 0),
        error_count: stats?.error_count || 0,
        timeout_count: stats?.timeout_count || 0,
        error_rate: stats?.total_calls
          ? Math.round(((stats.error_count as number) / (stats.total_calls as number)) * 100)
          : 0,
      },
    },
  });
});
```

**Step 3: Commit**

```bash
git add src/routes/api/plugins.ts
git commit -m "feat: add permissions to plugin API + execution logs endpoint"
```

---

### Task 6: Cron Cleanup for Execution Logs

**Files:**
- Modify: `src/index.ts` (lines 470-486, scheduled handler)

**Step 1: Add log cleanup to scheduled handler**

After `ctx.waitUntil(expireSubscriptions(env.DB));` (line 485), add:
```typescript
    // Cleanup old plugin execution logs (30 days retention)
    ctx.waitUntil(
      env.DB.prepare(
        "DELETE FROM plugin_execution_logs WHERE created_at < datetime('now', '-30 days')"
      ).run()
    );
```

**Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: add 30-day plugin execution log cleanup cron"
```

---

### Task 7: Workers for Platforms - Bindings

**Files:**
- Modify: `wrangler.workercms.toml`
- Modify: `src/types.ts` (line 1-12, Bindings interface)

**Step 1: Add dispatch namespace to wrangler config**

After the `[site]` section in `wrangler.workercms.toml`, add:
```toml
# Plugin sandbox - Workers for Platforms dispatch namespace
# [[dispatch_namespaces]]
# binding = "DISPATCHER"
# namespace = "plugins"
```
(Commented out until dispatch namespace is created via CF API)

**Step 2: Add DISPATCHER to Bindings interface**

In `src/types.ts`, add to Bindings (after `__STATIC_CONTENT`):
```typescript
  DISPATCHER?: any; // Workers for Platforms dispatch namespace (optional)
```
Use `any` because `DispatchNamespace` type needs `@cloudflare/workers-types` which may not have this yet. Will be typed properly when WfP is activated.

**Step 3: Commit**

```bash
git add wrangler.workercms.toml src/types.ts
git commit -m "feat: add Workers for Platforms dispatcher binding (commented, ready to activate)"
```

---

### Task 8: Dispatcher Module

**Files:**
- Create: `src/lib/plugins/dispatcher.ts`

**Step 1: Create dispatcher.ts**

```typescript
// src/lib/plugins/dispatcher.ts
// Workers for Platforms dispatch layer for 3rd party plugins

interface DispatchLimits {
  cpuMs: number;
  subRequests: number;
}

// Sanitize args before sending to untrusted plugin worker
function sanitizeArgs(hook: string, args: any[]): any[] {
  return args.map(arg => {
    if (typeof arg !== 'object' || arg === null) return arg;
    // Strip sensitive fields from post objects
    const { password_hash, totp_secret, email, ...safe } = arg;
    return safe;
  });
}

export async function dispatchToPlugin(
  dispatcher: any, // DispatchNamespace
  pluginSlug: string,
  hook: string,
  args: any[],
  settings: Record<string, any>,
  limits: DispatchLimits
): Promise<any> {
  try {
    const worker = dispatcher.get(`plugin-${pluginSlug}`, {}, { limits });
    const response = await worker.fetch(new Request('https://plugin.internal/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hook,
        args: sanitizeArgs(hook, args),
        settings,
      }),
    }));

    if (!response.ok) {
      throw new Error(`Plugin ${pluginSlug} returned ${response.status}`);
    }

    const data = await response.json() as { result: any };
    return data.result;
  } catch (err: any) {
    console.error(`[Dispatcher] Plugin "${pluginSlug}" dispatch error:`, err.message);
    // Fallback: return original first arg (passthrough)
    return args[0];
  }
}

// Register all hooks for a dispatched plugin
export function registerDispatchedPlugin(
  engine: { register: (slug: string, hook: string, handler: Function, priority?: number) => void },
  dispatcher: any,
  plugin: { slug: string; hooks?: string; permissions?: string },
  settings: Record<string, any>,
  limits: DispatchLimits
): void {
  const hooks: string[] = plugin.hooks ? JSON.parse(plugin.hooks) : [];

  for (const hook of hooks) {
    engine.register(plugin.slug, hook, async (...args: any[]) => {
      return dispatchToPlugin(dispatcher, plugin.slug, hook, args, settings, limits);
    });
  }
}

// Get resource limits based on subscription plan
export function getPluginLimits(plan?: string): DispatchLimits {
  switch (plan) {
    case 'enterprise': return { cpuMs: 50, subRequests: 50 };
    case 'pro': return { cpuMs: 20, subRequests: 5 };
    default: return { cpuMs: 10, subRequests: 0 };
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/plugins/dispatcher.ts
git commit -m "feat: add Workers for Platforms dispatch layer for 3rd party plugins"
```

---

### Task 9: Plugin Worker Template + Validator

**Files:**
- Create: `src/lib/plugins/worker-template.ts`
- Create: `src/lib/plugins/validator.ts`

**Step 1: Create worker-template.ts**

```typescript
// src/lib/plugins/worker-template.ts
// Reference template for 3rd party plugin workers

export const PLUGIN_WORKER_TEMPLATE = `
// Plugin Worker Template - runs in isolated V8 isolate
// Available: standard Web APIs, fetch (if permitted)
// NOT available: D1, R2, KV, or any main worker bindings

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { hook, args, settings } = await request.json();

    try {
      const result = await handleHook(hook, args, settings);
      return Response.json({ result });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }
};

async function handleHook(hook, args, settings) {
  switch (hook) {
    // Filter hooks: return modified value
    case 'post.beforeRender':
      return processContent(args[0], args[1], settings);
    case 'page.head':
      return injectHead(args[0], args[1], settings);
    case 'page.bodyEnd':
      return injectBodyEnd(args[0], args[1], settings);

    // Action hooks: return null (void)
    case 'post.afterSave':
      await onPostSaved(args[0], settings);
      return null;

    default:
      return args[0]; // passthrough
  }
}

// ===== Implement your plugin logic below =====

function processContent(html, post, settings) {
  return html;
}

function injectHead(html, site, settings) {
  return html;
}

function injectBodyEnd(html, site, settings) {
  return html;
}

async function onPostSaved(post, settings) {
  // fire-and-forget side effects
}
`;
```

**Step 2: Create validator.ts**

```typescript
// src/lib/plugins/validator.ts
// Pre-deploy validation for 3rd party plugin code

const FORBIDDEN_PATTERNS = [
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /import\s*\(/,          // dynamic import
  /require\s*\(/,
  /globalThis\b/,
  /process\b/,
  /Deno\b/,
];

const MAX_CODE_SIZE = 1024 * 1024; // 1MB

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePluginCode(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Size check
  if (code.length > MAX_CODE_SIZE) {
    errors.push(`Plugin kodu cok buyuk: ${(code.length / 1024).toFixed(0)}KB (max: 1024KB)`);
  }

  // Forbidden pattern check
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      errors.push(`Yasakli kod deseni: ${pattern.source}`);
    }
  }

  // Must export default handler
  if (!code.includes('export default')) {
    errors.push('Plugin "export default" ile bir fetch handler export etmelidir');
  }

  // Check for fetch handler
  if (!code.includes('fetch')) {
    warnings.push('Plugin fetch handler icermiyor - hook\'lar calismaYabilir');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

**Step 3: Commit**

```bash
git add src/lib/plugins/worker-template.ts src/lib/plugins/validator.ts
git commit -m "feat: add plugin worker template and pre-deploy code validator"
```

---

### Task 10: Dispatch Integration in Middleware

**Files:**
- Modify: `src/middleware/pluginHooks.ts`

**Step 1: Add dispatcher import and 3rd party plugin handling**

Add import at top:
```typescript
import { registerDispatchedPlugin, getPluginLimits } from '../lib/plugins/dispatcher';
```

In the plugin registration loop (after the built-in plugin `if (mod)` block), add an `else if` for dispatched plugins:

```typescript
    for (const plugin of result.results as any[]) {
      const mod = pluginRegistry[plugin.entry_point];
      if (mod) {
        // Built-in plugin: register via sandbox (same process, fast)
        try {
          const settings = plugin.site_settings ? JSON.parse(plugin.site_settings) : {};
          const permissions: PluginPermission[] = plugin.permissions ? JSON.parse(plugin.permissions) : [];
          const sandbox = createPluginSandbox(plugin.slug, permissions, siteId, c.env.DB);
          mod.register(sandbox, settings);
        } catch (e) {
          console.error(`Failed to register plugin ${plugin.slug}:`, e);
        }
      } else if (c.env.DISPATCHER) {
        // 3rd party plugin: dispatch to isolated V8 isolate
        try {
          const settings = plugin.site_settings ? JSON.parse(plugin.site_settings) : {};
          const limits = getPluginLimits(); // TODO: pass site plan
          registerDispatchedPlugin(pluginEngine, c.env.DISPATCHER, plugin, settings, limits);
        } catch (e) {
          console.error(`Failed to register dispatched plugin ${plugin.slug}:`, e);
        }
      }
    }
```

**Step 2: Commit**

```bash
git add src/middleware/pluginHooks.ts
git commit -m "feat: add Workers for Platforms dispatch support to plugin middleware"
```

---

### Task 11: Deploy/Undeploy API Endpoints

**Files:**
- Modify: `src/routes/api/plugins.ts`

**Step 1: Add deploy endpoint**

After the logs endpoint, add:
```typescript
// POST /api/plugins/deploy - Deploy a 3rd party plugin to dispatch namespace
plugins.post('/deploy', requireRole('super_admin'), async (c) => {
  const body = await c.req.json<{
    slug: string;
    name: string;
    code: string;
    hooks: string[];
    permissions?: string[];
    description?: string;
    version?: string;
  }>();

  if (!body.slug || !body.code || !body.hooks?.length) {
    return c.json({ success: false, error: 'slug, code ve hooks gerekli' }, 400);
  }

  // Validate plugin code
  const { validatePluginCode } = await import('../lib/plugins/validator');
  const validation = validatePluginCode(body.code);
  if (!validation.valid) {
    return c.json({ success: false, error: 'Plugin validasyonu basarisiz', details: validation.errors }, 400);
  }

  // Note: Actual CF API deploy requires ACCOUNT_ID and API_TOKEN env vars
  // For now, register in DB and return template instructions
  const result = await c.env.DB.prepare(
    `INSERT INTO plugins (slug, name, description, version, author, entry_point, hooks, permissions)
     VALUES (?, ?, ?, ?, 'third-party', ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       name = excluded.name, version = excluded.version,
       hooks = excluded.hooks, permissions = excluded.permissions
     RETURNING *`
  ).bind(
    body.slug, body.name, body.description || null, body.version || '1.0.0',
    `dispatch:plugin-${body.slug}`,
    JSON.stringify(body.hooks),
    body.permissions ? JSON.stringify(body.permissions) : null
  ).first();

  return c.json({
    success: true,
    data: result,
    warnings: validation.warnings,
    deploy_note: 'Plugin DB\'ye kaydedildi. CF dispatch namespace\'e deploy icin: wrangler dispatch upload komutu gerekli.',
  }, 201);
});

// DELETE /api/plugins/:slug/undeploy - Remove 3rd party plugin from dispatch
plugins.delete('/:slug/undeploy', requireRole('super_admin'), async (c) => {
  const slug = c.req.param('slug');

  await c.env.DB.prepare('DELETE FROM plugins WHERE slug = ?').bind(slug).run();
  // Also cleanup any site_plugins references
  await c.env.DB.prepare(
    'DELETE FROM site_plugins WHERE plugin_id NOT IN (SELECT id FROM plugins)'
  ).run();

  return c.json({ success: true, data: { message: `Plugin "${slug}" kaldirildi` } });
});
```

**Step 2: Commit**

```bash
git add src/routes/api/plugins.ts
git commit -m "feat: add plugin deploy/undeploy API endpoints for 3rd party plugins"
```

---

### Task 12: Admin UI - Permission Badges on Plugin List

**Files:**
- Modify: `admin/src/pages/plugins/PluginList.tsx`
- Modify: `admin/src/lib/api.ts`

**Step 1: Update API client**

Add to `admin/src/lib/api.ts`:
```typescript
export async function getPluginLogs(slug: string, days = 7) {
  return fetchAPI(`/api/plugins/${slug}/logs?days=${days}`);
}

export async function deployPlugin(data: { slug: string; name: string; code: string; hooks: string[]; permissions?: string[] }) {
  return fetchAPI('/api/plugins/deploy', { method: 'POST', body: JSON.stringify(data) });
}

export async function undeployPlugin(slug: string) {
  return fetchAPI(`/api/plugins/${slug}/undeploy`, { method: 'DELETE' });
}
```

**Step 2: Add permission badges to PluginList**

In `PluginList.tsx`, find where each plugin is rendered and add permission badges. After the plugin description/version info:

```tsx
{/* Permission Badges */}
{plugin.permissions && (() => {
  const perms = JSON.parse(plugin.permissions);
  const colorMap: Record<string, string> = {
    'read': 'bg-blue-100 text-blue-800',
    'write': 'bg-amber-100 text-amber-800',
    'fetch': 'bg-orange-100 text-orange-800',
    'inject': 'bg-purple-100 text-purple-800',
  };
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {perms.map((p: string) => {
        const suffix = p.split(':')[1] || p;
        const color = colorMap[suffix] || 'bg-gray-100 text-gray-800';
        return (
          <span key={p} className={`text-xs px-1.5 py-0.5 rounded ${color}`}>
            {p}
          </span>
        );
      })}
    </div>
  );
})()}
```

**Step 3: Commit**

```bash
git add admin/src/pages/plugins/PluginList.tsx admin/src/lib/api.ts
git commit -m "feat: add permission badges to plugin list + API methods for logs/deploy"
```

---

### Task 13: Admin UI - Plugin Execution Logs Page

**Files:**
- Create: `admin/src/pages/plugins/PluginLogs.tsx`
- Modify: `admin/src/App.tsx` (add route)

**Step 1: Create PluginLogs.tsx**

```tsx
// admin/src/pages/plugins/PluginLogs.tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPluginLogs } from '../../lib/api';

interface LogEntry {
  id: number;
  hook: string;
  duration_ms: number;
  status: 'success' | 'error' | 'timeout';
  error_message: string | null;
  created_at: string;
}

interface LogStats {
  total_calls: number;
  avg_duration_ms: number;
  error_count: number;
  timeout_count: number;
  error_rate: number;
}

export default function PluginLogs() {
  const { slug } = useParams<{ slug: string }>();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getPluginLogs(slug, days).then((res: any) => {
      if (res.success) {
        setLogs(res.data.logs);
        setStats(res.data.stats);
      }
    }).finally(() => setLoading(false));
  }, [slug, days]);

  const statusColor: Record<string, string> = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    timeout: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{slug} - Calisma Loglari</h1>
          <Link to="/settings/plugins" className="text-sm text-blue-600 hover:underline">
            ← Eklentilere Don
          </Link>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value={1}>Son 1 gun</option>
          <option value={7}>Son 7 gun</option>
          <option value={30}>Son 30 gun</option>
        </select>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Toplam Cagri</div>
            <div className="text-2xl font-bold">{stats.total_calls}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Ort. Sure</div>
            <div className="text-2xl font-bold">{stats.avg_duration_ms}ms</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Hata Sayisi</div>
            <div className="text-2xl font-bold text-red-600">{stats.error_count}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Hata Orani</div>
            <div className="text-2xl font-bold">{stats.error_rate}%</div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Yukleniyor...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Henuz log yok</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Tarih</th>
                <th className="text-left px-4 py-2">Hook</th>
                <th className="text-left px-4 py-2">Sure</th>
                <th className="text-left px-4 py-2">Durum</th>
                <th className="text-left px-4 py-2">Hata</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-600">
                    {new Date(log.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{log.hook}</td>
                  <td className="px-4 py-2">{log.duration_ms}ms</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColor[log.status] || ''}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-red-600 text-xs truncate max-w-xs">
                    {log.error_message || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add route in App.tsx**

Find the plugin-related routes and add:
```tsx
<Route path="/settings/plugins/:slug/logs" element={<PluginLogs />} />
```

Import at top:
```tsx
import PluginLogs from './pages/plugins/PluginLogs';
```

**Step 3: Add "Loglar" link in PluginList.tsx**

In each plugin's action buttons area, add a link:
```tsx
<Link to={`/settings/plugins/${plugin.slug}/logs`} className="text-xs text-gray-500 hover:text-gray-700">
  Loglar
</Link>
```

**Step 4: Commit**

```bash
git add admin/src/pages/plugins/PluginLogs.tsx admin/src/App.tsx admin/src/pages/plugins/PluginList.tsx
git commit -m "feat: add plugin execution logs page with stats and filtering"
```

---

### Task 14: Verify and Build

**Step 1: TypeScript check**

```bash
cd C:/Users/Administrator/CLAUDECODE/WP-WORKER && npx tsc --noEmit
```
Expected: No errors. Fix any type issues.

**Step 2: Build admin panel**

```bash
cd admin && npm run build
```
Expected: Successful build.

**Step 3: Deploy and test**

```bash
cd .. && npx wrangler deploy -c wrangler.workercms.toml
```

**Step 4: Run migration on remote DB**

```bash
npx wrangler d1 execute cms-db --remote -c wrangler.workercms.toml --file=src/db/migrations/020_plugin_sandbox.sql
```

**Step 5: Verification checklist**

1. Open admin panel -> Settings -> Plugins
2. Each plugin should show permission badges (blue/amber/purple)
3. Activate a plugin -> visit a public page -> check plugin_execution_logs has entries
4. Click "Loglar" link on a plugin -> see execution log page with stats
5. Deactivate all plugins -> visit page -> no new logs created
6. Built-in plugins still function identically (SEO meta, social share buttons, etc.)

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete plugin sandbox - permissions, execution logging, admin UI"
```
