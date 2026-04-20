import { useEffect, useState } from 'react';
import { HslColorPicker as ReactColorful, type HslColor } from 'react-colorful';
import { Input } from '@ui/input';
import { Label } from '@ui/label';

/**
 * Adapter around `react-colorful`'s HslColorPicker that speaks the
 * shadcn token format. shadcn HSL values are bare strings of the form
 * `"H S% L%"` (e.g. `"221 83% 53%"`); we parse that into the
 * `{h, s, l}` object react-colorful wants and serialise back on every
 * change.
 *
 * Invalid input strings fall back to white so the picker never crashes
 * mid-edit.
 */

export interface HslColorPickerProps {
  /** CSS variable name without leading -- (used as the field label) */
  tokenName: string;
  /** Bare HSL string, `"H S% L%"`. */
  value: string;
  onChange(next: string): void;
  className?: string;
}

function parseHsl(raw: string): HslColor {
  if (!raw) return { h: 0, s: 0, l: 100 };
  const m = raw.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return { h: 0, s: 0, l: 100 };
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

function formatHsl(c: HslColor): string {
  const h = Math.round(c.h);
  const s = Math.round(c.s);
  const l = Math.round(c.l);
  return `${h} ${s}% ${l}%`;
}

export function HslColorPicker({ tokenName, value, onChange, className }: HslColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  // Keep local input in sync when the parent rewrites the value (preset
  // switch, undo, …).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const color = parseHsl(value);
  const swatch = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="h-9 w-9 shrink-0 rounded border border-input shadow-sm"
          style={{ background: swatch }}
          aria-label={`${tokenName} renk seçici`}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <Label className="text-xs font-mono text-muted-foreground">--{tokenName}</Label>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft !== value) onChange(draft);
            }}
            className="h-8 font-mono text-xs"
            placeholder="0 0% 100%"
          />
        </div>
      </div>
      {open ? (
        <div className="mt-2 rounded border border-border bg-popover p-3 shadow-md">
          <ReactColorful
            color={color}
            onChange={(next) => {
              const formatted = formatHsl(next);
              setDraft(formatted);
              onChange(formatted);
            }}
            style={{ width: '100%', height: 160 }}
          />
        </div>
      ) : null}
    </div>
  );
}
