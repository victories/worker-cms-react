import { Input } from '@ui/input';
import { Label } from '@ui/label';

/**
 * A short curated list of Google fonts. Picking from the list keeps
 * the editor predictable; users who want something exotic still have
 * the free-text field. Each entry is a Google Fonts family name as it
 * appears in the API; the SSR side serialises these into the
 * `?family=` query when emitting the preload `<link>`.
 */
export const POPULAR_FONTS: { sans: string[]; heading: string[]; mono: string[] } = {
  sans: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Source Sans 3', 'Nunito', 'DM Sans'],
  heading: ['Inter', 'Playfair Display', 'Merriweather', 'Lora', 'Crimson Pro', 'Space Grotesk', 'Manrope'],
  mono: ['JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Source Code Pro', 'Roboto Mono'],
};

export interface FontPickerProps {
  label: string;
  value: string;
  /** Suggested fonts for this slot ('sans' | 'heading' | 'mono'). */
  options: string[];
  onChange(font: string): void;
}

export function GoogleFontPicker({ label, value, options, onChange }: FontPickerProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              opt === value
                ? 'rounded-full border border-primary bg-primary text-primary-foreground px-2.5 py-0.5 text-[11px]'
                : 'rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] hover:bg-accent'
            }
            style={{ fontFamily: `'${opt}', sans-serif` }}
          >
            {opt}
          </button>
        ))}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Özel font adı"
        className="h-8 text-xs"
        style={{ fontFamily: value ? `'${value}', sans-serif` : undefined }}
      />
    </div>
  );
}
