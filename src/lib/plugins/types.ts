import type { Post, Media, Comment, Site, Widget } from '../../types';

export type HookType = 'filter' | 'action';

export interface PluginHookDefinition {
  name: string;
  type: HookType;
  description: string;
}

// All available hook points in the system
export interface PluginHooks {
  'post.beforeSave': (post: Partial<Post>) => Partial<Post> | Promise<Partial<Post>>;
  'post.afterSave': (post: Post) => void | Promise<void>;
  'post.beforeDelete': (postId: number) => void | Promise<void>;
  'post.beforeRender': (html: string, post: Post) => string | Promise<string>;
  'media.afterUpload': (media: Media) => void | Promise<void>;
  'media.beforeServe': (url: string) => string | Promise<string>;
  'comment.beforeSave': (comment: Partial<Comment>) => Partial<Comment> | Promise<Partial<Comment>>;
  'comment.afterSave': (comment: Comment) => void | Promise<void>;
  'page.head': (html: string, site: Site) => string | Promise<string>;
  'page.bodyStart': (html: string, site: Site) => string | Promise<string>;
  'page.bodyEnd': (html: string, site: Site) => string | Promise<string>;
  'api.response': (data: any, endpoint: string) => any | Promise<any>;
}

export type HookName = keyof PluginHooks;

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
