/**
 * Worker CMS hex-prism brand mark — the single source of the logo across
 * the app. This is byte-identical to the `Wordmark` used in the public
 * landing nav/footer (src/ssr/pages/Landing.tsx) so the admin and the
 * marketing site share exactly one logo. Renders inline (zero requests).
 */
export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#0F0F11" stroke="#26262C" />
      <path
        d="M8 11 L16 7 L24 11 L24 21 L16 25 L8 21 Z"
        stroke="#F5A524"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 11 L16 15 L24 11 M16 15 L16 25"
        stroke="#F5A524"
        strokeWidth="1.25"
        strokeLinejoin="round"
        opacity=".6"
      />
      <circle cx="16" cy="15" r="1.6" fill="#F5A524" />
    </svg>
  );
}
