// Ambient declarations for the build-generated modules under
// `src/ssr/__generated__/`. The actual `.ts` files are produced by
// `npm run build:assets` (Tailwind CSS string + client island bundles)
// and are gitignored. These declarations let `tsc --noEmit` run cleanly
// even on a fresh checkout where the artifacts have not been built yet.

declare module './__generated__/tailwind' {
  export const TAILWIND_CSS: string;
}

declare module '*/__generated__/tailwind' {
  export const TAILWIND_CSS: string;
}

declare module '*/__generated__/publisher-client' {
  export const PUBLISHER_CLIENT_JS: string;
}

declare module '*/__generated__/landing-client' {
  export const LANDING_CLIENT_JS: string;
}
