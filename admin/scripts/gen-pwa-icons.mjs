// Generates PWA icons (PNG) for the admin app from the brand hex-prism
// mark, using sharp. Output goes to admin/public/ so Vite copies them into
// dist and the worker serves them at /admin/<name>.png. Run once:
//   node scripts/gen-pwa-icons.mjs
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUB = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// Full-bleed dark background + centered amber hex-prism (same mark as the
// favicon/landing). Generous padding so it doubles as a maskable icon.
const ICON = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0F0F11"/>
  <g transform="translate(256,256) scale(11) translate(-16,-16)" fill="none" stroke="#F5A524" stroke-linejoin="round">
    <path d="M8 11 L16 7 L24 11 L24 21 L16 25 L8 21 Z" stroke-width="1.5"/>
    <path d="M8 11 L16 15 L24 11 M16 15 L16 25" stroke-width="1.25" opacity=".6"/>
    <circle cx="16" cy="15" r="1.6" fill="#F5A524" stroke="none"/>
  </g>
</svg>`;

const buf = Buffer.from(ICON);
const out = [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['pwa-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
];

for (const [name, size] of out) {
  const png = await sharp(buf).resize(size, size).png().toBuffer();
  writeFileSync(resolve(PUB, name), png);
  console.log('[pwa-icons]', name, size + 'x' + size);
}
