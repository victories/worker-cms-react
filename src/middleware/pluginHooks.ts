import type { Context, Next } from 'hono';
import type { Bindings, Variables } from '../types';
import { pluginEngine } from '../lib/plugins/engine';
import { createPluginSandbox } from '../lib/plugins/sandbox';
import type { PluginPermission } from '../lib/plugins/types';
import { registerDispatchedPlugin, getPluginLimits } from '../lib/plugins/dispatcher';

// Built-in plugin imports — all use the v2 ReactNode hook API.
import * as seoOptimizer from '../plugins/seo-optimizer/index';
import * as socialShare from '../plugins/social-share/index';
import * as contactForm from '../plugins/contact-form/index';
import * as heroSlider from '../plugins/hero-slider/index';

/**
 * Plugin hooks middleware.
 *
 * Runs once per request:
 *   1. Clears the per-request plugin engine registry.
 *   2. Loads the `site_plugins` rows for the current site and
 *      register()s each active plugin's hooks against the engine.
 *   3. Dispatched (3rd-party) plugins route through Workers for
 *      Platforms via `registerDispatchedPlugin` — currently unused
 *      in MVP.
 *
 * Shortcode processing used to be registered here as a built-in
 * `post.beforeRender` filter (v1). With v2 that hook no longer exists:
 * public route handlers now call `processAllShortcodes` explicitly on
 * post content before rendering.
 */

// Built-in plugin registry - maps entry_point to plugin module
// Since Cloudflare Workers can't do dynamic imports, we use a static registry
const pluginRegistry: Record<
  string,
  { register: (engine: { register: (slug: string, hook: string, handler: Function, priority?: number) => void }, settings: Record<string, any>) => void }
> = {};

// Register a built-in plugin module
export function registerBuiltinPlugin(
  entryPoint: string,
  module: { register: (engine: { register: (slug: string, hook: string, handler: Function, priority?: number) => void }, settings: Record<string, any>) => void }
) {
  pluginRegistry[entryPoint] = module;
}

// Register all built-in plugins
registerBuiltinPlugin('plugins/seo-optimizer', seoOptimizer);
registerBuiltinPlugin('plugins/social-share', socialShare);
registerBuiltinPlugin('plugins/contact-form', contactForm);
registerBuiltinPlugin('plugins/hero-slider', heroSlider);

export async function pluginHooksMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  const siteId = c.get('siteId');
  if (!siteId) {
    await next();
    return;
  }

  // Clear previous registrations
  pluginEngine.clear();

  try {
    // Load active plugins for this site
    const result = await c.env.DB.prepare(
      `SELECT p.*, sp.settings as site_settings
       FROM plugins p
       JOIN site_plugins sp ON p.id = sp.plugin_id
       WHERE sp.site_id = ? AND sp.is_active = 1`
    ).bind(siteId).all();

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
      } else if (c.env.DISPATCHER) {
        // 3rd party plugin: dispatch to isolated V8 isolate
        try {
          const settings = plugin.site_settings ? JSON.parse(plugin.site_settings) : {};
          const limits = getPluginLimits();
          registerDispatchedPlugin(pluginEngine, c.env.DISPATCHER, plugin, settings, limits);
        } catch (e) {
          console.error(`Failed to register dispatched plugin ${plugin.slug}:`, e);
        }
      }
    }
  } catch (e) {
    // If plugins table doesn't exist yet or query fails, continue without plugins
    console.error('Plugin hooks middleware error:', e);
  }

  await next();
}
