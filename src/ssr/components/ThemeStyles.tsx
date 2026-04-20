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
  /** Font family slots — emitted as `--font-sans/heading/mono` CSS vars. */
  fonts?: { sans?: string; heading?: string; mono?: string };
  /**
   * Google Fonts specifier strings ("Inter:400,500,600,700"). Emitted
   * as a single Google Fonts CSS link so designs can swap typography
   * without a build step.
   */
  googleFonts?: string[];
}

function toBlock(selector: string, vars: Record<string, string>): string {
  const entries = Object.entries(vars)
    .filter(([, v]) => typeof v === 'string' && v.length > 0)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  if (!entries) return '';
  return `${selector}{${entries}}`;
}

function buildFontVars(fonts?: ThemeStylesProps['fonts']): string {
  if (!fonts) return '';
  const entries: string[] = [];
  if (fonts.sans) entries.push(`--font-sans:'${fonts.sans}',ui-sans-serif,system-ui`);
  if (fonts.heading) entries.push(`--font-heading:'${fonts.heading}',ui-sans-serif,system-ui`);
  if (fonts.mono) entries.push(`--font-mono:'${fonts.mono}',ui-monospace,monospace`);
  return entries.length ? `:root{${entries.join(';')}}` : '';
}

function buildGoogleFontsHref(specifiers: string[] = []): string | null {
  if (specifiers.length === 0) return null;
  const families = specifiers.map((spec) => {
    const [name, weights] = spec.split(':');
    const family = name.trim().replace(/ /g, '+');
    return weights ? `family=${family}:wght@${weights}` : `family=${family}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

export function ThemeStyles({ light, dark, fonts, googleFonts }: ThemeStylesProps) {
  const css = [toBlock(':root', light), dark ? toBlock('.dark', dark) : '', buildFontVars(fonts)]
    .filter(Boolean)
    .join('');
  const gFontsHref = buildGoogleFontsHref(googleFonts);
  if (!css && !gFontsHref) return null;
  return (
    <>
      {gFontsHref ? <link rel="stylesheet" href={gFontsHref} /> : null}
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
    </>
  );
}
