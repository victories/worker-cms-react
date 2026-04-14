// AI Image Utilities — R2 upload and HTML merge for generated images

import { getR2Key, getUniqueFilename } from './storage';

export interface ImageLayout {
  position: 'cover' | 'left' | 'right' | 'full';
  size: string; // "800x450" or "400x300"
}

/**
 * Download image from temporary URL and upload to R2 for permanent storage.
 */
/**
 * Generate a URL-friendly slug from prompt text for use as image filename.
 * Supports Turkish characters by transliterating them.
 */
function slugifyPrompt(prompt: string, maxLen = 50): string {
  // Turkish character map
  const trMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U',
    'â': 'a', 'Â': 'A', 'î': 'i', 'Î': 'I', 'û': 'u', 'Û': 'U',
    'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'ä': 'a', 'ñ': 'n',
  };
  let slug = prompt
    .split('')
    .map((ch) => trMap[ch] || ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Take first N characters, cut at last full word boundary
  if (slug.length > maxLen) {
    slug = slug.slice(0, maxLen);
    const lastDash = slug.lastIndexOf('-');
    if (lastDash > 10) slug = slug.slice(0, lastDash);
  }

  return slug || 'image';
}

export async function uploadImageToR2(
  r2: R2Bucket,
  siteId: number,
  imageUrl: string,
  index: number,
  promptText?: string
): Promise<string> {
  if (!imageUrl) throw new Error(`Image URL is empty for index ${index}`);

  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to download image ${index}: HTTP ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const ext = imageUrl.includes('.png') ? 'png' : 'webp';

  // Generate filename from prompt text if available
  const baseName = promptText ? slugifyPrompt(promptText) : `ai-image-${index + 1}`;
  const filename = getUniqueFilename(`${baseName}.${ext}`);
  const key = getR2Key(siteId, filename);

  await r2.put(key, buffer, {
    httpMetadata: { contentType: ext === 'png' ? 'image/png' : 'image/webp' },
  });

  return key;
}

/**
 * Upload all generated images to R2.
 * Returns array of R2 keys (permanent URLs).
 */
export async function uploadAllImagesToR2(
  r2: R2Bucket,
  siteId: number,
  imageUrls: string[],
  prompts?: string[]
): Promise<string[]> {
  const results = await Promise.allSettled(
    imageUrls.map((url, i) => uploadImageToR2(r2, siteId, url, i, prompts?.[i]))
  );

  return results.map((r) =>
    r.status === 'fulfilled' ? r.value : ''
  );
}

/**
 * Merge images into HTML content based on layout settings.
 * - cover: inserted before first paragraph
 * - left/right: inserted between paragraphs, distributed evenly
 * - full: inserted between paragraphs as full-width
 */
export function mergeImagesIntoHtml(
  html: string,
  r2Keys: string[],
  layout: ImageLayout[],
  cdnBase: string,
  captions?: string[]
): string {
  if (!r2Keys.length || !layout.length) return html;

  // Build image HTML for each position
  const imageHtmlParts: { position: string; html: string }[] = [];

  for (let i = 0; i < Math.min(r2Keys.length, layout.length); i++) {
    if (!r2Keys[i]) continue;

    const imgUrl = cdnBase ? `${cdnBase}/${r2Keys[i]}` : r2Keys[i];
    const pos = layout[i].position;
    const [w, h] = layout[i].size.split('x').map(Number);
    // Use caption from image prompt if available, strip to a short readable form
    const alt = captions?.[i]
      ? captions[i].replace(/\s+/g, ' ').trim().slice(0, 120)
      : `Image ${i + 1}`;

    let figClass = 'wp-full-width';
    if (pos === 'cover') figClass = 'wp-cover';
    else if (pos === 'left') figClass = 'wp-float-left';
    else if (pos === 'right') figClass = 'wp-float-right';

    const imgHtml = `<figure class="${figClass}"><img src="${imgUrl}" alt="${alt}" width="${w}" height="${h}" loading="lazy" /><figcaption>${alt}</figcaption></figure>`;
    imageHtmlParts.push({ position: pos, html: imgHtml });
  }

  if (imageHtmlParts.length === 0) return html;

  // Extract cover images
  const coverImages = imageHtmlParts.filter((p) => p.position === 'cover');
  const bodyImages = imageHtmlParts.filter((p) => p.position !== 'cover');

  // Split HTML into paragraphs/blocks
  const blocks = html.split(/(<\/p>|<\/h[2-6]>|<\/ul>|<\/ol>|<\/blockquote>)/i);

  // Rebuild with images inserted
  let result = '';

  // Insert cover images at the very top
  for (const img of coverImages) {
    result += img.html + '\n';
  }

  if (bodyImages.length === 0) {
    result += html;
    return result;
  }

  // Calculate insertion points — distribute evenly among paragraph breaks
  const breakPoints: number[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (/^<\/(p|h[2-6]|ul|ol|blockquote)>/i.test(blocks[i])) {
      breakPoints.push(i);
    }
  }

  // Determine where to insert each body image
  const insertionMap = new Map<number, string[]>();
  if (breakPoints.length > 0 && bodyImages.length > 0) {
    const step = Math.max(1, Math.floor(breakPoints.length / (bodyImages.length + 1)));
    for (let i = 0; i < bodyImages.length; i++) {
      const breakIdx = Math.min(breakPoints.length - 1, step * (i + 1));
      const blockIdx = breakPoints[breakIdx];
      if (!insertionMap.has(blockIdx)) insertionMap.set(blockIdx, []);
      insertionMap.get(blockIdx)!.push(bodyImages[i].html);
    }
  }

  // Build final HTML
  for (let i = 0; i < blocks.length; i++) {
    result += blocks[i];
    const images = insertionMap.get(i);
    if (images) {
      result += '\n' + images.join('\n') + '\n';
    }
  }

  return result;
}
