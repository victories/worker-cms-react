// Workers for Platforms dispatch layer for 3rd party plugins

import type { HookName } from './types';

interface DispatchLimits {
  cpuMs: number;
  subRequests: number;
}

function sanitizeArgs(hook: string, args: any[]): any[] {
  return args.map(arg => {
    if (typeof arg !== 'object' || arg === null) return arg;
    const { password_hash, totp_secret, ...safe } = arg;
    return safe;
  });
}

export async function dispatchToPlugin(
  dispatcher: any,
  pluginSlug: string,
  hook: string,
  args: any[],
  settings: Record<string, any>,
  limits: DispatchLimits
): Promise<any> {
  try {
    const worker = dispatcher.get(`plugin-${pluginSlug}`, {}, { limits });
    const response = await worker.fetch(new Request('https://plugin.internal/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hook, args: sanitizeArgs(hook, args), settings }),
    }));

    if (!response.ok) {
      throw new Error(`Plugin ${pluginSlug} returned ${response.status}`);
    }

    const data = await response.json() as { result: any };
    return data.result;
  } catch (err: any) {
    console.error(`[Dispatcher] Plugin "${pluginSlug}" dispatch error:`, err.message);
    return args[0]; // fallback: passthrough
  }
}

export function registerDispatchedPlugin(
  engine: { register: (slug: string, hook: HookName, handler: (...args: any[]) => any, priority?: number) => void },
  dispatcher: any,
  plugin: { slug: string; hooks?: string; permissions?: string },
  settings: Record<string, any>,
  limits: DispatchLimits
): void {
  const hooks: HookName[] = plugin.hooks ? JSON.parse(plugin.hooks) : [];
  for (const hook of hooks) {
    engine.register(plugin.slug, hook, async (...args: any[]) => {
      return dispatchToPlugin(dispatcher, plugin.slug, hook, args, settings, limits);
    });
  }
}

export function getPluginLimits(plan?: string): DispatchLimits {
  switch (plan) {
    case 'enterprise': return { cpuMs: 50, subRequests: 50 };
    case 'pro': return { cpuMs: 20, subRequests: 5 };
    default: return { cpuMs: 10, subRequests: 0 };
  }
}
