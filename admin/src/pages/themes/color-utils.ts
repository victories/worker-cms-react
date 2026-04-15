// Color conversion helpers for the shadcn HSL token editor.
//
// shadcn stores colors as bare HSL triples (`"221 83% 53%"` —
// no `hsl()` wrapper, no commas) so they can be interpolated inside
// `hsl(var(--primary))` in Tailwind. The admin color picker uses a
// native `<input type="color">` which only speaks hex, so we translate
// between the two at the edge.
//
// All functions below are pure and dependency-free.

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** Parse a shadcn triple like `"221 83.2% 53.3%"` (optionally wrapped
 *  in `hsl(...)`). Returns null for malformed input so callers can
 *  fall back to a default without crashing. */
export function parseHsl(raw: string | undefined | null): Hsl | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^hsl\s*\(/i, '').replace(/\)$/, '');
  // Accept space- or comma-separated values, optional % on s/l.
  const match = cleaned.match(
    /^\s*([-+]?\d*\.?\d+)\s*[,\s]\s*([-+]?\d*\.?\d+)\s*%?\s*[,\s]\s*([-+]?\d*\.?\d+)\s*%?\s*$/
  );
  if (!match) return null;
  const h = Number(match[1]);
  const s = Number(match[2]);
  const l = Number(match[3]);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  return { h, s, l };
}

/** Format an Hsl back into the shadcn triple form. Numbers are
 *  rounded to one decimal place to match the shadcn themes generator. */
export function formatHsl({ h, s, l }: Hsl): string {
  const round = (n: number) => {
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  };
  return `${round(h)} ${round(s)}% ${round(l)}%`;
}

/** Convert `"#rrggbb"` (or `"#rgb"`) to Hsl. Returns null if the hex
 *  is malformed so callers can ignore the edit instead of writing
 *  garbage into state. */
export function hexToHsl(hex: string): Hsl | null {
  if (!hex) return null;
  const trimmed = hex.trim().replace(/^#/, '');
  let r: number, g: number, b: number;
  if (trimmed.length === 3) {
    r = parseInt(trimmed[0]! + trimmed[0]!, 16);
    g = parseInt(trimmed[1]! + trimmed[1]!, 16);
    b = parseInt(trimmed[2]! + trimmed[2]!, 16);
  } else if (trimmed.length === 6) {
    r = parseInt(trimmed.slice(0, 2), 16);
    g = parseInt(trimmed.slice(2, 4), 16);
    b = parseInt(trimmed.slice(4, 6), 16);
  } else {
    return null;
  }
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;

  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rf) {
      h = ((gf - bf) / delta) % 6;
    } else if (max === gf) {
      h = (bf - rf) / delta + 2;
    } else {
      h = (rf - gf) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h * 10) / 10,
    s: Math.round(s * 1000) / 10, // percent with 1 decimal
    l: Math.round(l * 1000) / 10,
  };
}

/** Convert an Hsl back to `"#rrggbb"`. Saturation and lightness are
 *  percentages (0-100). */
export function hslToHex({ h, s, l }: Hsl): string {
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const hPrime = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));

  let r1 = 0, g1 = 0, b1 = 0;
  if (hPrime < 1) { r1 = c; g1 = x; }
  else if (hPrime < 2) { r1 = x; g1 = c; }
  else if (hPrime < 3) { g1 = c; b1 = x; }
  else if (hPrime < 4) { g1 = x; b1 = c; }
  else if (hPrime < 5) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }

  const m = lNorm - c / 2;
  const to255 = (v: number) => {
    const n = Math.round((v + m) * 255);
    return Math.max(0, Math.min(255, n));
  };
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(to255(r1))}${hex(to255(g1))}${hex(to255(b1))}`;
}
