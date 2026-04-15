# Plugin Development — worker-cms-react Plugin API v2

This document describes the **v2 plugin API**, which shipped as part
of the Faz 7 React SSR migration. It is the only API — the v1
HTML-string hooks (`page.head`, `page.bodyStart`, `page.bodyEnd`,
`post.beforeRender`) were removed and have no backwards-compat shim.

If you are writing or porting a plugin, you need to produce ReactNodes.
There is no HTML-string path.

---

## 1. Plugin anatomy

A plugin is:

1. A **module** (`src/plugins/<slug>/index.tsx`) that exports a
   `register()` function.
2. A **manifest** (`src/plugins/<slug>/manifest.json`) that lists the
   plugin's slug, version, settings schema, and the hooks it uses.
3. A **row in the `plugins` table**, seeded from `src/db/seed.sql`
   (or created through the admin API).
4. Optional per-site activation records in `site_plugins` with a JSON
   `settings` column.

The main Cloudflare Worker imports every bundled plugin statically
through `src/middleware/pluginHooks.ts`:

```ts
import * as seoOptimizer from '../plugins/seo-optimizer/index';

registerBuiltinPlugin('plugins/seo-optimizer', seoOptimizer);
```

For every incoming request the middleware clears the plugin engine
registry, queries `site_plugins`, and calls each active plugin's
`register(sandbox, settings)` function.

## 2. The `register()` function

```ts
export function register(
  engine: {
    register: (
      slug: string,
      hook: string,
      handler: Function,
      priority?: number
    ) => void;
  },
  settings: Record<string, any>
): void {
  const SLUG = 'my-plugin';

  engine.register(SLUG, 'ui.head', (nodes, site) => {
    return [
      ...nodes,
      <meta key="my-plugin-gen" name="my-plugin" content="v1" />,
    ];
  }, 10);
}
```

`register()` is called once per request per site. The `engine`
parameter is a sandbox that checks permissions and logs execution
before delegating to `pluginEngine.register()`.

The optional `priority` argument defaults to `10`; lower values run
earlier in the filter chain.

## 3. Hook reference

### 3.1 Data hooks (unchanged from v1)

| Hook | Signature |
|------|-----------|
| `post.beforeSave` | `(post: Partial<Post>) => Partial<Post> \| Promise<Partial<Post>>` |
| `post.afterSave` | `(post: Post) => void \| Promise<void>` |
| `post.beforeDelete` | `(postId: number) => void \| Promise<void>` |
| `media.afterUpload` | `(media: Media) => void \| Promise<void>` |
| `media.beforeServe` | `(url: string) => string \| Promise<string>` |
| `comment.beforeSave` | `(comment: Partial<Comment>) => Partial<Comment> \| Promise<Partial<Comment>>` |
| `comment.afterSave` | `(comment: Comment) => void \| Promise<void>` |
| `api.response` | `(data: any, endpoint: string) => any \| Promise<any>` |

These hooks deal with rows, not markup. They are unchanged from v1.

### 3.2 Document-level render hooks

| Hook | Signature |
|------|-----------|
| `ui.head` | `(nodes: ReactNode[], site: Site) => ReactNode[] \| Promise<ReactNode[]>` |
| `ui.bodyStart` | `(nodes: ReactNode[], site: Site) => ReactNode[] \| Promise<ReactNode[]>` |
| `ui.bodyEnd` | `(nodes: ReactNode[], site: Site) => ReactNode[] \| Promise<ReactNode[]>` |

Each handler receives the running accumulator and returns a new
`ReactNode[]`. The route handler collects the final array via
`collectDocumentSlots()` and drops it into `<Shell>` like this:

```tsx
<Shell
  head={<>{themeStyles}{seoHead}{pluginSlots.head}</>}
  bodyStart={<>{pluginSlots.bodyStart}</>}
  bodyEnd={<>{pluginSlots.bodyEnd}{publisherClientScript}</>}
>
  ...
</Shell>
```

Handlers should always give their top-level node a stable `key` prop
so React doesn't emit a missing-key warning when multiple plugins
contribute to the same slot.

### 3.3 Layout slot hooks

Layout slots mount into specific points inside `<PublisherLayout>`.
Site-scoped slots receive the `Site` row; per-post slots receive a
`PluginPostContext` (common fields across `Post` and `PublicPost`).

| Hook | Scope | Rendered at |
|------|-------|-------------|
| `ui.slot.headerRight` | `Site` | Header tools area, right of the nav |
| `ui.slot.sidebarTop` | `Site` | Above widget list in right sidebar |
| `ui.slot.sidebarBottom` | `Site` | Below widget list in right sidebar |
| `ui.slot.footerStart` | `Site` | Above the footer widget grid |
| `ui.slot.footerEnd` | `Site` | Below the copyright line |
| `ui.slot.postHeader` | `PluginPostContext` | Above the post title row |
| `ui.slot.postFooter` | `PluginPostContext` | Below the post body / tags, above comments |

All slot hooks use the same `(nodes, context) => ReactNode[]` filter
shape as the document-level hooks.

Route handlers pre-fetch slot content via `collectSiteLayoutSlots()`
and `collectPostLayoutSlots()` before calling `renderPage()`, so
React's synchronous SSR pass never blocks on a hook.

## 4. Permissions

Permissions are declared in `manifest.json` and enforced at
`sandbox.register()` time. A plugin that tries to register a hook for
which it lacks permission is silently dropped with a `[Sandbox]`
warning in the logs.

| Permission | Required for |
|------------|--------------|
| `posts:read` | `post.beforeSave`, `post.afterSave`, `post.beforeDelete` |
| `posts:write` | `post.beforeSave` |
| `media:read` | `media.afterUpload`, `media.beforeServe` |
| `comments:read` | `comment.afterSave` |
| `comments:write` | `comment.beforeSave` |
| `page:inject` | Every `ui.*` hook (head, body, layout slots) |
| `settings:read` | `api.response` |
| `http:fetch` | — (reserved for dispatched plugins making outbound requests) |

## 5. Client-side behaviour

Plugins that need interactivity have two options:

1. **Inline boot scripts** — emit a `<script>` node in `ui.bodyEnd`.
   Keep the script self-contained; it runs at parse time with no
   bundler. Good for social-share button rewriting, contact form
   submission, hero slider autoplay, etc.
2. **Islands** — hydrate a React component into a server-rendered
   placeholder. The publisher client entry (`src/client/publisher-entry.tsx`)
   walks `[data-island]` elements on load. To add a new island you
   also need to register it in `island-registry.ts` and rebuild
   `publisher-client.ts` via `npm run build:client`.

Most plugins should prefer inline boot scripts — islands only pay for
themselves when the interactive surface needs React state and
lifecycle.

## 6. Shortcodes

Shortcodes live in `src/lib/shortcodes/` and are independent of the
plugin system. A plugin that wants to expose an inline tag like
`[my-widget attr="..."]` should register a renderer there:

```ts
// src/lib/shortcodes/renderers/my-widget.ts
import { registerShortcode } from '../registry';

registerShortcode('my-widget', async (params, _inner, ctx) => {
  return `<div class="my-widget">${params.attr}</div>`;
});
```

The public route handlers call `processAllShortcodes()` on post
content before handing the HTML to `<PostContent>`. Shortcodes run
before React rendering, so they return strings — no React hooks.

The `contact-form` plugin is a good example of this pattern: the
form HTML is produced by the `[iletisim-formu]` / `[contact-form]`
shortcode in `src/lib/shortcodes/renderers/iletisim-formu.ts`, the
plugin module itself is a no-op. The plugin exists only to carry
settings (recipient email, form title) that `/api/contact` reads
server-side when delivering submissions.

## 7. Minimum viable plugin

```tsx
// src/plugins/hello-world/index.tsx
/** @jsxImportSource react */
import type { ReactNode } from 'react';
import type { Site } from '../../types';

export function register(
  engine: { register: (slug: string, hook: string, handler: Function, priority?: number) => void },
  _settings: Record<string, any>
): void {
  engine.register('hello-world', 'ui.head', (nodes: ReactNode[], _site: Site) => {
    return [
      ...nodes,
      <meta key="hello-world-gen" name="hello-world" content="active" />,
    ];
  }, 10);
}
```

```json
// src/plugins/hello-world/manifest.json
{
  "slug": "hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "description": "Demonstrates the minimum plugin shape",
  "author": "you",
  "hooks": ["ui.head"],
  "settings": {},
  "permissions": ["page:inject"]
}
```

Wire it into `src/middleware/pluginHooks.ts`:

```ts
import * as helloWorld from '../plugins/hello-world/index';
registerBuiltinPlugin('plugins/hello-world', helloWorld);
```

Insert a row into the `plugins` table (through `seed.sql` or the
admin UI) with `entry_point = 'plugins/hello-world'` and activate it
on a site via `site_plugins`. Done — next request will pick it up.

## 8. Removed v1 hooks

| v1 | v2 replacement |
|----|----------------|
| `page.head` string filter | `ui.head` ReactNode[] filter |
| `page.bodyStart` string filter | `ui.bodyStart` ReactNode[] filter |
| `page.bodyEnd` string filter | `ui.bodyEnd` ReactNode[] filter |
| `post.beforeRender` string filter | Move markup into a shortcode renderer, or use `ui.slot.postHeader` / `ui.slot.postFooter` for surrounding chrome. |

The migration rule of thumb: if your v1 handler called `.replace()`
on an HTML string to inject new markup, it should become either a
shortcode renderer or a `ui.slot.*` filter. If it concatenated
markup onto the end of a slot, it should become a `ui.*` filter that
pushes a ReactNode onto the accumulator.
