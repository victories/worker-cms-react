import type { ReactNode } from 'react';
import type { Post, Media, Comment, Site } from '../../types';

/**
 * Post context passed to per-post plugin slot hooks. Both the admin
 * API (full `Post` row) and the public-db `PublicPost` shape need to
 * flow through the slot collectors — plugins only read common fields
 * (`id`, `title`, `slug`, `content`, `post_type`), so we expose the
 * structural subset every call site can satisfy.
 */
export interface PluginPostContext {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  post_type: string;
  language: string;
  excerpt: string | null;
  status: string;
}

/**
 * Plugin hook surface — v2 (React SSR native).
 *
 * The v1 HTML-string hooks (`page.head`, `page.bodyStart`, `page.bodyEnd`,
 * `post.beforeRender`) were deleted in Faz 7. Every render-path hook now
 * takes and returns `ReactNode[]` — plugins push their own nodes into the
 * accumulator and the route handler drops the final array into `<Shell>`
 * or `<PublisherLayout>` props.
 *
 * Data hooks (`post.beforeSave`, `media.afterUpload`, ...) are unchanged
 * because they operate on rows, not markup.
 */

export type HookType = 'filter' | 'action';

export interface PluginHookDefinition {
  name: string;
  type: HookType;
  description: string;
}

// All available hook points in the system
export interface PluginHooks {
  // ── Data hooks (unchanged from v1) ──
  'post.beforeSave': (post: Partial<Post>) => Partial<Post> | Promise<Partial<Post>>;
  'post.afterSave': (post: Post) => void | Promise<void>;
  'post.beforeDelete': (postId: number) => void | Promise<void>;
  'media.afterUpload': (media: Media) => void | Promise<void>;
  'media.beforeServe': (url: string) => string | Promise<string>;
  'comment.beforeSave': (comment: Partial<Comment>) => Partial<Comment> | Promise<Partial<Comment>>;
  'comment.afterSave': (comment: Comment) => void | Promise<void>;
  'api.response': (data: any, endpoint: string) => any | Promise<any>;

  // ── Document-level render hooks (ReactNode[]) ──
  // Each handler receives the running accumulator and returns a new array.
  // Route handlers pass the final array to `<Shell head={...} />` etc.
  'ui.head': (nodes: ReactNode[], site: Site) => ReactNode[] | Promise<ReactNode[]>;
  'ui.bodyStart': (nodes: ReactNode[], site: Site) => ReactNode[] | Promise<ReactNode[]>;
  'ui.bodyEnd': (nodes: ReactNode[], site: Site) => ReactNode[] | Promise<ReactNode[]>;

  // ── Layout slot hooks (ReactNode[]) ──
  // `ui.slot.*` hooks live at specific mounting points inside
  // `<PublisherLayout>`. Site-scoped slots receive the `Site` row; the
  // per-post slots receive the `Post` row instead so plugins can
  // inspect title / tags / featured image when emitting their nodes.
  'ui.slot.headerRight':   (nodes: ReactNode[], site: Site) => ReactNode[] | Promise<ReactNode[]>;
  'ui.slot.sidebarTop':    (nodes: ReactNode[], site: Site) => ReactNode[] | Promise<ReactNode[]>;
  'ui.slot.sidebarBottom': (nodes: ReactNode[], site: Site) => ReactNode[] | Promise<ReactNode[]>;
  'ui.slot.footerStart':   (nodes: ReactNode[], site: Site) => ReactNode[] | Promise<ReactNode[]>;
  'ui.slot.footerEnd':     (nodes: ReactNode[], site: Site) => ReactNode[] | Promise<ReactNode[]>;
  'ui.slot.postHeader':    (nodes: ReactNode[], post: PluginPostContext) => ReactNode[] | Promise<ReactNode[]>;
  'ui.slot.postFooter':    (nodes: ReactNode[], post: PluginPostContext) => ReactNode[] | Promise<ReactNode[]>;
}

export type HookName = keyof PluginHooks;

/** Convenience tuple of every site-scoped layout slot, used by the
 *  route handler collector wiring and the manifest validator. */
export const SITE_LAYOUT_SLOT_HOOKS = [
  'ui.slot.headerRight',
  'ui.slot.sidebarTop',
  'ui.slot.sidebarBottom',
  'ui.slot.footerStart',
  'ui.slot.footerEnd',
] as const satisfies readonly HookName[];

export const POST_LAYOUT_SLOT_HOOKS = [
  'ui.slot.postHeader',
  'ui.slot.postFooter',
] as const satisfies readonly HookName[];

export interface PluginRegistration {
  pluginSlug: string;
  hook: HookName;
  handler: (...args: any[]) => any;
  priority: number;
}

export type PluginPermission =
  | 'posts:read' | 'posts:write'
  | 'media:read' | 'media:write'
  | 'settings:read' | 'settings:write'
  | 'comments:read' | 'comments:write'
  | 'http:fetch'
  | 'page:inject';

export interface PluginManifest {
  slug: string;
  name: string;
  version: string;
  description: string;
  author: string;
  hooks: HookName[];
  settings: Record<string, {
    type: string;
    default: any;
    label?: string;
    description?: string;
  }>;
  permissions: PluginPermission[];
}
