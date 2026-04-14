# KV Caching Layer Design

## Context

Every public page request makes 8-10+ D1 queries (getSiteTheme, getSidebarData, getAnalyticsSettings, getRichSnippetsSettings + content queries). Most of these return identical data across requests for the same site. Adding a KV cache layer dramatically reduces DB load and improves response times.

## Approach: KV Cache-Aside Wrapper

A simple `cached()` function wraps existing public-db functions. On cache hit, returns KV value. On miss, calls the original DB query, stores result in KV with TTL, returns it. KV binding is optional - system works without it.

## Cache Key Patterns and TTLs

| Function | Key | TTL | Rationale |
|----------|-----|-----|-----------|
| getSiteTheme() | `site:{id}:theme` | 60min | Theme rarely changes |
| getSidebarData() | `site:{id}:{lang}:sidebar` | 30min | Widgets/menus change occasionally |
| getAnalyticsSettings() | `site:{id}:analytics` | 60min | Settings rarely change |
| getRichSnippetsSettings() | `site:{id}:richsnippets` | 60min | Settings rarely change |
| getPublicPosts() | `site:{id}:{lang}:posts:{page}` | 5min | Content changes more often |
| getPostBySlug() | `site:{id}:{lang}:post:{slug}` | 5min | Content changes more often |

## Invalidation Strategy

**Site-wide purge:** When any content/config changes for a site, purge ALL cache keys for that site using KV list API with prefix `site:{siteId}:`.

Invalidation triggers (API routes):
- posts.ts POST/PUT/DELETE
- settings.ts PUT
- menus.ts POST/PUT/DELETE
- themes.ts PUT
- widgets.ts POST/PUT/DELETE

## New Files

| File | Purpose |
|------|---------|
| `src/lib/cache.ts` | cached() wrapper, cachePurgeSite() |

## Modified Files

| File | Change |
|------|--------|
| `wrangler.workercms.toml` | KV namespace binding |
| `src/types.ts` | CACHE?: KVNamespace |
| `src/lib/public-db.ts` | Wrap 6 functions with cached() |
| `src/routes/api/posts.ts` | cachePurgeSite on write ops |
| `src/routes/api/settings.ts` | cachePurgeSite on PUT |
| `src/routes/api/menus.ts` | cachePurgeSite on write ops |
| `src/routes/api/themes.ts` | cachePurgeSite on PUT |
| `src/routes/api/widgets.ts` | cachePurgeSite on write ops |

## Backward Compatibility

- CACHE binding is optional (`CACHE?: KVNamespace`)
- If KV not configured, `cached()` calls fetcher directly (no-op)
- No breaking changes to API responses or behavior
- Existing functionality identical with or without cache
