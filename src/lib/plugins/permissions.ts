import type { HookName, PluginPermission } from './types';

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

export const PERMISSION_DESCRIPTIONS: Record<PluginPermission, string> = {
  'posts:read': 'Yazilari okuyabilir',
  'posts:write': 'Yazilari duzenleyebilir',
  'media:read': 'Medya dosyalarini okuyabilir',
  'media:write': 'Medya dosyalarini duzenleyebilir',
  'settings:read': 'Site ayarlarini okuyabilir',
  'settings:write': 'Site ayarlarini duzenleyebilir',
  'comments:read': 'Yorumlari okuyabilir',
  'comments:write': 'Yorumlari duzenleyebilir',
  'http:fetch': 'Dis sunuculara HTTP istegi yapabilir',
  'page:inject': 'Sayfalara HTML enjekte edebilir',
};

export function validatePermissions(perms: string[]): { valid: boolean; invalid: string[] } {
  const validSet = new Set(Object.keys(PERMISSION_DESCRIPTIONS));
  const invalid = perms.filter(p => !validSet.has(p));
  return { valid: invalid.length === 0, invalid };
}

export function hasPermissionForHook(pluginPermissions: PluginPermission[], hook: HookName): boolean {
  const required = HOOK_REQUIRED_PERMISSIONS[hook];
  if (!required || required.length === 0) return true;
  return required.every(p => pluginPermissions.includes(p));
}
