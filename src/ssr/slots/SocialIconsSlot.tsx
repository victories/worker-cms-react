import type { SlotProps } from './types';

interface SocialEntry {
  key: string;
  label: string;
  /** SVG path d attribute (single-path icons keep markup small). */
  path: string;
}

// Single-path simple-icons style glyphs. Each is centred on a 24×24 box.
const NETWORKS: SocialEntry[] = [
  {
    key: 'instagram',
    label: 'Instagram',
    path: 'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.6c-3.2 0-3.5 0-4.7.1-1.1 0-1.7.2-2.1.4-.5.2-.9.5-1.2.8-.3.3-.6.7-.8 1.2-.1.4-.3 1-.4 2.1C2.7 8.5 2.7 8.8 2.7 12s0 3.5.1 4.7c0 1.1.2 1.7.4 2.1.2.5.5.9.8 1.2.3.3.7.6 1.2.8.4.1 1 .3 2.1.4 1.2.1 1.5.1 4.7.1s3.5 0 4.7-.1c1.1 0 1.7-.2 2.1-.4.5-.2.9-.5 1.2-.8.3-.3.6-.7.8-1.2.1-.4.3-1 .4-2.1.1-1.2.1-1.5.1-4.7s0-3.5-.1-4.7c0-1.1-.2-1.7-.4-2.1-.2-.5-.5-.9-.8-1.2-.3-.3-.7-.6-1.2-.8-.4-.1-1-.3-2.1-.4-1.2-.1-1.5-.1-4.7-.1zm0 2.7a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 1.6a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8zm5.7-2.9a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    path: 'M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12z',
  },
  {
    key: 'twitter',
    label: 'X / Twitter',
    path: 'M18.244 2H21l-6.522 7.45L22 22h-6.84l-4.79-6.27L4.8 22H2.04l6.98-7.97L2 2h6.94l4.34 5.74L18.244 2zm-1.2 18h1.66L7.04 4H5.27l11.774 16z',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    path: 'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.4 3.6-6.4 3.6z',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    path: 'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.28V1.72C24 .77 23.2 0 22.22 0z',
  },
  {
    key: 'github',
    label: 'GitHub',
    path: 'M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.3-3.2-.2-.4-.6-1.6.1-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6.2 0c2.4-1.6 3.4-1.2 3.4-1.2.7 1.7.2 2.9.1 3.2.8.9 1.3 2 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z',
  },
];

/**
 * Renders a horizontal strip of social-network links. Each network's
 * URL is supplied via `props.<key>` (e.g. `props.instagram`). Empty
 * keys are skipped — there's no "all six always visible" mode.
 */
export function SocialIconsSlot({ props }: SlotProps) {
  const entries = NETWORKS.filter((n) => typeof props?.[n.key] === 'string' && (props[n.key] as string).length > 0);
  if (entries.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      {entries.map((n) => (
        <a
          key={n.key}
          href={String(props?.[n.key])}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={n.label}
          className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
            <path d={n.path} />
          </svg>
        </a>
      ))}
    </div>
  );
}

export const SOCIAL_NETWORKS = NETWORKS.map((n) => ({ key: n.key, label: n.label }));
