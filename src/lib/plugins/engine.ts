import type { HookName, PluginRegistration } from './types';

// Plugin Engine - manages hook registration and execution
class PluginEngine {
  private hooks: Map<HookName, PluginRegistration[]> = new Map();

  // Register a handler for a hook
  register(pluginSlug: string, hook: HookName, handler: (...args: any[]) => any, priority: number = 10): void {
    if (!this.hooks.has(hook)) {
      this.hooks.set(hook, []);
    }

    const registrations = this.hooks.get(hook)!;
    registrations.push({ pluginSlug, hook, handler, priority });

    // Sort by priority (lower = earlier)
    registrations.sort((a, b) => a.priority - b.priority);
  }

  // Remove all hooks for a plugin
  unregister(pluginSlug: string): void {
    for (const [hook, registrations] of this.hooks) {
      this.hooks.set(hook, registrations.filter(r => r.pluginSlug !== pluginSlug));
    }
  }

  // Execute a filter hook (pipe pattern: output of one becomes input of next)
  async executeFilter<T>(hook: HookName, value: T, ...args: any[]): Promise<T> {
    const registrations = this.hooks.get(hook);
    if (!registrations || registrations.length === 0) return value;

    let result = value;
    for (const reg of registrations) {
      try {
        result = await reg.handler(result, ...args);
      } catch (error) {
        console.error(`Plugin ${reg.pluginSlug} error in hook ${hook}:`, error);
        // Continue with previous result on error
      }
    }
    return result;
  }

  // Execute an action hook (all handlers run, no return value)
  async executeAction(hook: HookName, ...args: any[]): Promise<void> {
    const registrations = this.hooks.get(hook);
    if (!registrations || registrations.length === 0) return;

    for (const reg of registrations) {
      try {
        await reg.handler(...args);
      } catch (error) {
        console.error(`Plugin ${reg.pluginSlug} error in hook ${hook}:`, error);
      }
    }
  }

  // Check if a hook has any registered handlers
  hasHandlers(hook: HookName): boolean {
    const registrations = this.hooks.get(hook);
    return !!registrations && registrations.length > 0;
  }

  // Get all registered hooks for debugging
  getRegistered(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [hook, registrations] of this.hooks) {
      result[hook] = registrations.map(r => r.pluginSlug);
    }
    return result;
  }

  // Clear all registrations
  clear(): void {
    this.hooks.clear();
  }
}

// Singleton instance
export const pluginEngine = new PluginEngine();
