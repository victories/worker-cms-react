/** @jsxImportSource react */

/**
 * ThemeStyles — injects per-site CSS custom properties as a `<style>` tag.
 *
 * The shadcn token layer in `packages/ui/tokens/design-tokens.css` defines
 * a full :root + .dark set of HSL values (the neutral "shadcn" palette).
 * That file is compiled into the Tailwind bundle and embedded in `<Shell>`.
 *
 * ThemeStyles is how a site overrides those defaults at request time. The
 * route handler resolves the active theme + palette (see
 * `src/lib/themes/engine.ts`) and hands us a plain `{ key: value }` map like:
 *
 *   { '--primary': '221 83% 53%', '--background': '0 0% 100%', ... }
 *
 * We render a single `<style>` block that redeclares those vars on
 * `:root` (and, if `dark` is passed, on `.dark`). Because this style tag
 * appears AFTER the Tailwind bundle in `<head>`, the per-site values win
 * by cascade order without needing `!important`.
 *
 * Keys are written verbatim — callers are expected to pass full CSS
 * variable names including the leading `--`. This keeps the component
 * agnostic to the naming convention (shadcn HSL triples or legacy
 * hex values both work).
 */

export interface ThemeStylesProps {
  /** CSS custom properties to set on :root (light mode) */
  light: Record<string, string>;
  /** CSS custom properties to set on .dark (dark mode override) */
  dark?: Record<string, string>;
}

function toBlock(selector: string, vars: Record<string, string>): string {
  const entries = Object.entries(vars)
    .filter(([, v]) => typeof v === 'string' && v.length > 0)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  if (!entries) return '';
  return `${selector}{${entries}}`;
}

export function ThemeStyles({ light, dark }: ThemeStylesProps) {
  const css = [toBlock(':root', light), dark ? toBlock('.dark', dark) : '']
    .filter(Boolean)
    .join('');
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
