import type { HookName, PluginPermission } from './types';
import { pluginEngine } from './engine';
import { hasPermissionForHook } from './permissions';

export class SandboxedPluginContext {
  private pluginSlug: string;
  private permissions: PluginPermission[];
  private siteId: number;
  private db: D1Database | null;

  constructor(pluginSlug: string, permissions: PluginPermission[], siteId: number, db: D1Database | null = null) {
    this.pluginSlug = pluginSlug;
    this.permissions = permissions;
    this.siteId = siteId;
    this.db = db;
  }

  register(slug: string, hook: string, handler: Function, priority?: number): void {
    const hookName = hook as HookName;

    // Permission check (empty permissions = permissive for backward compat)
    if (this.permissions.length > 0 && !hasPermissionForHook(this.permissions, hookName)) {
      console.warn(`[Sandbox] Plugin "${this.pluginSlug}" denied hook "${hook}" - missing permissions`);
      return;
    }

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
        return args[0];
      } finally {
        const durationMs = Date.now() - start;
        if (db) {
          try {
            db.prepare(
              'INSERT INTO plugin_execution_logs (site_id, plugin_slug, hook, duration_ms, status, error_message) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(siteId, pluginSlug, hook, durationMs, status, errorMessage || null).run();
          } catch {
            // Silently fail logging
          }
        }
      }
    };
  }
}

export function createPluginSandbox(pluginSlug: string, permissions: PluginPermission[], siteId: number, db: D1Database | null = null): SandboxedPluginContext {
  return new SandboxedPluginContext(pluginSlug, permissions, siteId, db);
}
