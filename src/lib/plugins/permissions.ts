import type { HookName, PluginPermission } from './types';

export const HOOK_REQUIRED_PERMISSIONS: Record<HookName, PluginPermission[]> = {
  // Data hooks
  'post.beforeSave':    ['posts:read', 'posts:write'],
  'post.afterSave':     ['posts:read'],
  'post.beforeDelete':  ['posts:read'],
  'media.afterUpload':  ['media:read'],
  'media.beforeServe':  ['media:read'],
  'comment.beforeSave': ['comments:read', 'comments:write'],
  'comment.afterSave':  ['comments:read'],
  'api.response':       ['settings:read'],

  // v2 document-level render hooks
  'ui.head':      ['page:inject'],
  'ui.bodyStart': ['page:inject'],
  'ui.bodyEnd':   ['page:inject'],

  // v2 layout slot hooks
  'ui.slot.headerRight':   ['page:inject'],
  'ui.slot.sidebarTop':    ['page:inject'],
  'ui.slot.sidebarBottom': ['page:inject'],
  'ui.slot.footerStart':   ['page:inject'],
  'ui.slot.footerEnd':     ['page:inject'],
  'ui.slot.postHeader':    ['page:inject'],
  'ui.slot.postFooter':    ['page:inject'],
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
  'page:inject': 'Sayfalara React node enjekte edebilir',
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
