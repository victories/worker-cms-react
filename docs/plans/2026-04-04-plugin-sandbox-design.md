# Plugin Sandbox Isolation Design

## Context

Current plugin system runs all plugins in the main Worker process with no isolation. Plugins can access the full application scope, use unlimited CPU/memory, make arbitrary HTTP requests, and corrupt each other's data. This design adds two layers of sandbox protection.

## Architecture

### Layer 1: Permissions-Based Sandbox (built-in plugins)

Each plugin declares required permissions. Hook registration is gated by permission checks.

**Permission Types:**
- `posts:read`, `posts:write` - Post data access
- `media:read`, `media:write` - Media operations
- `settings:read`, `settings:write` - Site settings
- `comments:read`, `comments:write` - Comment operations
- `http:fetch` - External HTTP requests
- `page:inject` - HTML injection (head, body)

**Hook-to-Permission Mapping:**
- `post.beforeSave` -> `['posts:read', 'posts:write']`
- `post.afterSave` -> `['posts:read']`
- `post.beforeRender` -> `['posts:read']`
- `page.head/bodyStart/bodyEnd` -> `['page:inject']`
- `comment.beforeSave` -> `['comments:read', 'comments:write']`
- `media.afterUpload` -> `['media:read']`

**SandboxedPluginContext** wraps the plugin engine:
- `register(hook, handler, priority)` checks permissions before delegating
- `safeHandler` wrapper adds try/catch, timing measurement, execution logging
- If permission denied: log warning, skip registration (silent fail)

### Layer 2: Workers for Platforms (3rd party plugins)

Real V8 isolate isolation via Cloudflare dispatch namespaces.

**Flow:**
1. Plugin code deployed to dispatch namespace via CF API
2. Main worker calls `env.DISPATCHER.get("plugin-slug", {}, { limits })`
3. Plugin receives hook + args as JSON POST, returns result as JSON
4. Main worker validates and applies result

**Limits (plan-based):**
- Free: cpuMs=10, subRequests=0
- Pro: cpuMs=20, subRequests=5
- Enterprise: cpuMs=50, subRequests=50

**sanitizeArgs():** Strips sensitive fields (passwords, tokens, author PII) before sending to plugin.

### Layer 3: Execution Logging

Every plugin hook execution is logged to `plugin_execution_logs`:
- plugin_slug, hook, duration_ms, status (success/error/timeout), error_message
- 30-day retention (cron cleanup)
- Admin UI: per-plugin log table with filtering

## Database Changes (Migration 020)

```sql
-- Add permissions and allowed_domains to plugins table
ALTER TABLE plugins ADD COLUMN permissions TEXT;
ALTER TABLE plugins ADD COLUMN allowed_domains TEXT;

-- Execution logging
CREATE TABLE plugin_execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  plugin_slug TEXT NOT NULL,
  hook TEXT NOT NULL,
  duration_ms INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_plugin_logs_site ON plugin_execution_logs(site_id, plugin_slug, created_at DESC);
```

## New Files

| File | Purpose |
|------|---------|
| `src/lib/plugins/permissions.ts` | Permission definitions, hook->permission map, validation |
| `src/lib/plugins/sandbox.ts` | SandboxedPluginContext class, safeHandler wrapper |
| `src/lib/plugins/dispatcher.ts` | Workers for Platforms dispatch layer |
| `src/lib/plugins/validator.ts` | Pre-deploy code validation |
| `src/lib/plugins/worker-template.ts` | Plugin worker template |
| `src/db/migrations/020_plugin_sandbox.sql` | Schema changes |
| `admin/src/pages/plugins/PluginLogs.tsx` | Execution log UI |
| `admin/src/pages/plugins/PluginUpload.tsx` | Plugin deploy UI |

## Modified Files

| File | Change |
|------|--------|
| `src/middleware/pluginHooks.ts` | Two-mode: built-in via sandbox, 3rd party via dispatch |
| `src/routes/api/plugins.ts` | permissions field, deploy/undeploy endpoints, logs endpoint |
| `src/lib/plugins/types.ts` | PluginPermission type |
| `src/types.ts` | DISPATCHER binding |
| `wrangler.workercms.toml` | dispatch_namespaces binding |
| `src/plugins/*/index.ts` (x4) | Parameter type update |
| `admin/src/pages/plugins/PluginList.tsx` | Permission badges, deploy status |
| `admin/src/lib/api.ts` | New API methods |
| `src/index.ts` | Log cleanup cron |

## Backward Compatibility (KRITIK)

Mevcut aktif siteler HICBIR kesintiye ugramayacak:
- `DISPATCHER` binding optional (`env.DISPATCHER?`) - olmadan mevcut sistem aynen calisir
- `CACHE` binding optional - KV yoksa direkt DB'den okur
- `permissions` kolonu nullable - mevcut plugin'ler permissions olmadan da calisir
- SandboxedPluginContext, permissions bos ise tum hook'lara izin verir (permissive default)
- Built-in plugin'ler hala statik registry'den yuklenir (dispatch kullanmaz)
- Migration sadece ADD COLUMN ve yeni tablo yaratir, mevcut veriyi degistirmez

## Implementation Order

1. Migration (020_plugin_sandbox.sql)
2. permissions.ts + types.ts updates
3. sandbox.ts (SandboxedPluginContext)
4. pluginHooks.ts middleware update
5. Built-in plugin parameter type updates (x4)
6. Execution logging integration
7. plugins.ts API updates (permissions, logs endpoint)
8. Admin UI updates (badges, logs page)
9. dispatcher.ts (Workers for Platforms layer)
10. validator.ts + worker-template.ts
11. Deploy/undeploy API endpoints
12. PluginUpload.tsx UI

## Verification

1. Plugin without permission for a hook -> registration skipped
2. Plugin error -> caught, other plugins unaffected
3. Execution logs written to DB on every hook call
4. 30-day log cleanup via cron
5. Permission badges visible in admin panel
6. Workers for Platforms: dispatched plugin returns correct result
7. CPU limit exceeded -> exception, fallback to original value
8. Built-in plugins still work identically (regression test)
