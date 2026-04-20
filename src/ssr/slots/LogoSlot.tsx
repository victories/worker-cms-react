import type { SlotProps } from './types';

/**
 * Brand block — logo image (or initial fallback) + site name. Mirrors
 * the brand half of the legacy Header. `props.href` overrides the
 * default homeHref; `props.alt` overrides the alt text.
 */
export function LogoSlot({ ctx, props }: SlotProps) {
  const href = (props?.href as string) || ctx.homeHref;
  const alt = (props?.alt as string) || ctx.siteName;
  const initial = ctx.siteName.charAt(0).toUpperCase();

  return (
    <a
      href={href}
      className="flex items-center gap-3 text-foreground transition-colors hover:text-primary"
    >
      {ctx.siteLogo ? (
        <img src={ctx.siteLogo} alt={alt} className="h-8 w-auto" loading="eager" />
      ) : (
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
          {initial}
        </span>
      )}
      <span className="font-semibold tracking-tight">{ctx.siteName}</span>
    </a>
  );
}
