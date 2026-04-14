// Built-in shortcode registry
// Each shortcode has a render function that receives params, inner content, and context

export interface ShortcodeContext {
  db: D1Database;
  siteId: number;
  lang: string;
  defaultLang: string;
  origin: string;
  langPrefix: string; // pre-computed: '' for default lang, '/en' for non-default
}

export type ShortcodeRenderer = (
  params: Record<string, string>,
  innerContent: string,
  ctx: ShortcodeContext
) => Promise<string>;

const registry = new Map<string, ShortcodeRenderer>();

export function registerShortcode(name: string, renderer: ShortcodeRenderer) {
  registry.set(name, renderer);
}

export function getShortcodeRenderer(name: string): ShortcodeRenderer | undefined {
  return registry.get(name);
}

export function hasBuiltinShortcode(name: string): boolean {
  return registry.has(name);
}

export function getRegisteredNames(): string[] {
  return Array.from(registry.keys());
}
