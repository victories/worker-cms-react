# AI Image Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI image generation integrated with text content, using AIML API, with per-image layout control and cron compatibility.

**Architecture:** Sequential generation flow: text AI produces article, then generates image prompts, AIML Image API creates images in parallel, images are uploaded to R2, and merged into HTML using per-image layout settings. Template-level image settings persist in DB so cron jobs work identically to manual generation.

**Tech Stack:** Cloudflare Workers, D1, R2, Hono, React (Vite), AIML API (images endpoint)

**Design Doc:** `docs/plans/2026-03-02-ai-image-generation-design.md`

---

## Task 1: Database Migration — Add Image Columns

**Files:**
- Create: `src/db/migrations/010_ai_image_generation.sql`

**Step 1: Write migration SQL**

```sql
-- Migration 010: AI Image Generation Support
-- Adds image generation fields to prompt templates and jobs

-- Prompt templates: image settings
ALTER TABLE ai_prompts ADD COLUMN image_enabled INTEGER DEFAULT 0;
ALTER TABLE ai_prompts ADD COLUMN image_model TEXT;
ALTER TABLE ai_prompts ADD COLUMN image_style TEXT DEFAULT 'photographic';
ALTER TABLE ai_prompts ADD COLUMN image_count INTEGER DEFAULT 0;
ALTER TABLE ai_prompts ADD COLUMN image_layout TEXT;

-- Jobs: image tracking
ALTER TABLE ai_jobs ADD COLUMN image_enabled INTEGER DEFAULT 0;
ALTER TABLE ai_jobs ADD COLUMN image_model TEXT;
ALTER TABLE ai_jobs ADD COLUMN image_style TEXT;
ALTER TABLE ai_jobs ADD COLUMN image_count INTEGER DEFAULT 0;
ALTER TABLE ai_jobs ADD COLUMN image_layout TEXT;
ALTER TABLE ai_jobs ADD COLUMN image_status TEXT DEFAULT 'pending';
ALTER TABLE ai_jobs ADD COLUMN image_urls TEXT;
ALTER TABLE ai_jobs ADD COLUMN image_prompts TEXT;
```

**Step 2: Apply migration locally**

Run: `npx wrangler d1 execute wp-cms --local --file=src/db/migrations/010_ai_image_generation.sql`
Expected: Migration completes without errors

**Step 3: Apply migration to remote**

Run: `npx wrangler d1 execute wp-cms --remote --file=src/db/migrations/010_ai_image_generation.sql`
Expected: Migration completes without errors

**Step 4: Commit**

```bash
git add src/db/migrations/010_ai_image_generation.sql
git commit -m "feat: add image generation columns to ai_prompts and ai_jobs"
```

---

## Task 2: Backend — Image Model Fetcher & Image Generator

**Files:**
- Modify: `src/lib/ai-providers.ts` (add after line 530, after `fetchAimlModels`)

**Step 1: Add `fetchAimlImageModels` function**

Add after the existing `fetchAimlModels` function (after line 530):

```typescript
export async function fetchAimlImageModels(apiKey: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch('https://api.aimlapi.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`AIML API error (${res.status}): Failed to fetch image models`);
  }

  const data = (await res.json()) as { data: AimlModelResponse[] };
  const models = (data.data || [])
    .filter((m) => m.type === 'image')
    .map((m) => ({
      id: m.id,
      name: m.info?.name || m.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return models;
}
```

**Step 2: Add `generateImages` function**

Add after `fetchAimlImageModels`:

```typescript
export interface ImageGenerationRequest {
  model: string;
  prompt: string;
  width: number;
  height: number;
  style?: string;
}

export interface ImageGenerationResult {
  url: string;
  width: number;
  height: number;
}

export async function generateImage(
  apiKey: string,
  req: ImageGenerationRequest
): Promise<ImageGenerationResult> {
  const body: Record<string, unknown> = {
    model: req.model,
    prompt: req.prompt,
    image_size: { width: req.width, height: req.height },
    num_images: 1,
    output_format: 'webp',
  };

  const res = await fetch('https://api.aimlapi.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AIML Image API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { images: { url: string; width: number; height: number }[] };
  if (!data.images || data.images.length === 0) {
    throw new Error('AIML Image API returned no images');
  }

  return {
    url: data.images[0].url,
    width: data.images[0].width,
    height: data.images[0].height,
  };
}

export async function generateAllImages(
  apiKey: string,
  prompts: string[],
  model: string,
  layout: { position: string; size: string }[]
): Promise<ImageGenerationResult[]> {
  const results = await Promise.allSettled(
    prompts.map((prompt, i) => {
      const [w, h] = (layout[i]?.size || '400x300').split('x').map(Number);
      return generateImage(apiKey, { model, prompt, width: w, height: h });
    })
  );

  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { url: '', width: 0, height: 0 }
  );
}
```

**Step 3: Add `generateImagePrompts` function**

Add after `generateAllImages`:

```typescript
export async function generateImagePrompts(
  generateFn: (req: AiGenerateRequest, config: ProviderConfig) => Promise<AiGenerateResponse>,
  config: ProviderConfig,
  model: string,
  articleContent: string,
  imageCount: number,
  style: string,
  language: string
): Promise<string[]> {
  const styleMap: Record<string, string> = {
    photographic: 'realistic photograph',
    digital_art: 'digital art illustration',
    illustration: 'hand-drawn illustration',
    '3d_render': '3D rendered scene',
    anime: 'anime style illustration',
  };
  const styleDesc = styleMap[style] || 'realistic photograph';

  const messages: AiMessage[] = [
    {
      role: 'system',
      content: `You are an image prompt generator. Given an article, generate exactly ${imageCount} image prompts. Each prompt should describe a ${styleDesc} that visually represents a key section of the article. Output ONLY the prompts, one per line, numbered 1. 2. 3. etc. No other text. Write prompts in English regardless of article language.`,
    },
    {
      role: 'user',
      content: `Generate ${imageCount} image prompts for this article:\n\n${articleContent.slice(0, 3000)}`,
    },
  ];

  const result = await generateFn(
    { messages, model, maxTokens: 500, temperature: 0.7 },
    config
  );

  const prompts = result.content
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter((line) => line.length > 10)
    .slice(0, imageCount);

  // Pad with generic prompts if AI returned fewer
  while (prompts.length < imageCount) {
    prompts.push(`A ${styleDesc} related to the article topic`);
  }

  return prompts;
}
```

**Step 4: Verify file compiles**

Run: `npx wrangler deploy --dry-run`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/lib/ai-providers.ts
git commit -m "feat: add image model fetcher, image generator, and prompt generator"
```

---

## Task 3: Backend — Image Upload to R2 + HTML Merge Utility

**Files:**
- Create: `src/lib/ai-image-utils.ts`

**Step 1: Create the utility file**

```typescript
// AI Image Utilities — R2 upload and HTML merge for generated images

import { getR2Key, getUniqueFilename } from './storage';

export interface ImageLayout {
  position: 'cover' | 'left' | 'right' | 'full';
  size: string; // "800x450" or "400x300"
}

/**
 * Download image from temporary URL and upload to R2 for permanent storage.
 */
export async function uploadImageToR2(
  r2: R2Bucket,
  siteId: number,
  imageUrl: string,
  index: number
): Promise<string> {
  if (!imageUrl) throw new Error(`Image URL is empty for index ${index}`);

  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to download image ${index}: HTTP ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const ext = imageUrl.includes('.png') ? 'png' : 'webp';
  const filename = getUniqueFilename(`ai-image-${index + 1}.${ext}`);
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
  imageUrls: string[]
): Promise<string[]> {
  const results = await Promise.allSettled(
    imageUrls.map((url, i) => uploadImageToR2(r2, siteId, url, i))
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
  cdnBase: string
): string {
  if (!r2Keys.length || !layout.length) return html;

  // Build image HTML for each position
  const imageHtmlParts: { position: string; html: string }[] = [];

  for (let i = 0; i < Math.min(r2Keys.length, layout.length); i++) {
    if (!r2Keys[i]) continue;

    const imgUrl = `${cdnBase}/${r2Keys[i]}`;
    const pos = layout[i].position;
    const [w, h] = layout[i].size.split('x').map(Number);
    const alt = `AI generated image ${i + 1}`;

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
```

**Step 2: Verify compilation**

Run: `npx wrangler deploy --dry-run`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai-image-utils.ts
git commit -m "feat: add R2 image upload and HTML merge utilities"
```

---

## Task 4: Backend — Image Models Endpoint

**Files:**
- Modify: `src/routes/api/ai.ts` (add new route near the existing `/providers/:slug/models` route)
- Modify: `src/lib/ai-providers.ts` (already done in Task 2)

**Step 1: Add image-models route**

In `src/routes/api/ai.ts`, add after the existing `GET /providers/:slug/models` route (after line ~67):

```typescript
// GET /api/ai/providers/:slug/image-models — Fetch image models for dynamic providers
ai.get('/providers/:slug/image-models', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const slug = c.req.param('slug');

  if (slug !== 'aiml') {
    return c.json({ success: false, error: 'Image models only available for AIML provider' }, 400);
  }

  const provider = await c.env.DB.prepare(
    'SELECT api_key FROM ai_providers WHERE site_id = ? AND provider_slug = ? AND is_enabled = 1'
  ).bind(siteId, slug).first<{ api_key: string }>();

  if (!provider?.api_key) {
    return c.json({ success: false, error: 'Provider not configured or no API key' }, 400);
  }

  try {
    const models = await fetchAimlImageModels(provider.api_key);
    return c.json({ success: true, data: models });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch image models' }, 500);
  }
});
```

**Step 2: Add import**

At the top of `src/routes/api/ai.ts`, add `fetchAimlImageModels` to the import:

Change:
```typescript
import { getGenerateFunction, estimateCost, splitTitleAndBody, PROVIDER_DEFINITIONS, fetchAimlModels, testProviderConnection } from '../lib/ai-providers';
```
To:
```typescript
import { getGenerateFunction, estimateCost, splitTitleAndBody, PROVIDER_DEFINITIONS, fetchAimlModels, fetchAimlImageModels, testProviderConnection, generateImagePrompts, generateAllImages } from '../lib/ai-providers';
```

Also add import for image utils:
```typescript
import { uploadAllImagesToR2, mergeImagesIntoHtml, type ImageLayout } from '../lib/ai-image-utils';
```

**Step 3: Verify compilation**

Run: `npx wrangler deploy --dry-run`
Expected: No errors

**Step 4: Commit**

```bash
git add src/routes/api/ai.ts src/lib/ai-providers.ts
git commit -m "feat: add image models endpoint"
```

---

## Task 5: Backend — Extend Generate Endpoint for Images

**Files:**
- Modify: `src/routes/api/ai.ts` — the `POST /api/ai/generate` handler (lines 315-444)

**Step 1: Extend the request body type**

Change the body type (lines 319-327) to:

```typescript
const body = await c.req.json<{
  provider_slug: string;
  model?: string;
  prompt_text: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  word_count?: number;
  // Image generation fields
  image_enabled?: boolean;
  image_model?: string;
  image_style?: string;
  image_count?: number;
  image_layout?: ImageLayout[];
}>();
```

**Step 2: Add image generation after text generation**

After the successful text generation (after line 383, after `splitTitleAndBody`), add image generation logic:

```typescript
    // --- Image Generation (if enabled) ---
    let imageUrls: string[] = [];
    let imagePrompts: string[] = [];
    let finalContent = result.content;

    if (body.image_enabled && body.image_count && body.image_count > 0 && body.image_model) {
      try {
        // 1. Generate image prompts using text AI
        imagePrompts = await generateImagePrompts(
          generateFn,
          config,
          model,
          result.content,
          body.image_count,
          body.image_style || 'photographic',
          'en'
        );

        // 2. Generate images in parallel
        const layout = body.image_layout || [];
        const images = await generateAllImages(
          provider.api_key || '',
          imagePrompts,
          body.image_model,
          layout
        );

        // 3. Upload to R2
        const tempUrls = images.map((img) => img.url).filter(Boolean);
        const r2Keys = await uploadAllImagesToR2(c.env.R2, siteId, tempUrls);
        imageUrls = r2Keys.filter(Boolean);

        // 4. Merge into HTML
        const cdnBase = c.env.CDN_URL || `/api/media/file`;
        finalContent = mergeImagesIntoHtml(
          contentBody || result.content,
          r2Keys,
          layout,
          cdnBase
        );
      } catch (imgErr: any) {
        // Image generation failed — return text content anyway with warning
        console.error('Image generation failed:', imgErr.message);
      }
    }
```

**Step 3: Update the response to include image data**

Change the response object (lines 406-420) to:

```typescript
    return c.json({
      success: true,
      data: {
        content: body.image_enabled ? finalContent : result.content,
        title,
        body: body.image_enabled ? finalContent : contentBody,
        tokens: {
          prompt: result.promptTokens,
          completion: result.completionTokens,
          total: result.totalTokens,
        },
        cost,
        duration_ms: durationMs,
        image_prompts: imagePrompts.length > 0 ? imagePrompts : undefined,
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      },
    });
```

**Step 4: Verify compilation**

Run: `npx wrangler deploy --dry-run`
Expected: No errors

**Step 5: Commit**

```bash
git add src/routes/api/ai.ts
git commit -m "feat: extend generate endpoint with image generation support"
```

---

## Task 6: Backend — Extend Prompt CRUD for Image Fields

**Files:**
- Modify: `src/routes/api/ai.ts` — POST and PUT prompt handlers
- Modify: `src/types.ts` — AiPrompt and AiJob interfaces

**Step 1: Update AiPrompt interface in `src/types.ts`**

Add these fields to the AiPrompt interface:
```typescript
  image_enabled: number;
  image_model: string | null;
  image_style: string;
  image_count: number;
  image_layout: string | null; // JSON string
```

Add these fields to the AiJob interface:
```typescript
  image_enabled: number;
  image_model: string | null;
  image_style: string | null;
  image_count: number;
  image_layout: string | null;
  image_status: string;
  image_urls: string | null;
  image_prompts: string | null;
```

**Step 2: Update POST /api/ai/prompts** (create handler, lines 190-234)

Extend body type to include image fields:
```typescript
  image_enabled?: number;
  image_model?: string;
  image_style?: string;
  image_count?: number;
  image_layout?: string; // JSON string
```

Extend the INSERT SQL to include image columns:
```sql
INSERT INTO ai_prompts (
  site_id, name, description, system_prompt, user_prompt, variables,
  default_provider_slug, default_model, default_word_count, default_language, default_tone,
  image_enabled, image_model, image_style, image_count, image_layout,
  created_by
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING *
```

Add binds: `body.image_enabled || 0`, `body.image_model || null`, `body.image_style || 'photographic'`, `body.image_count || 0`, `body.image_layout || null`

**Step 3: Update PUT /api/ai/prompts/:id** (update handler, lines 237-288)

Extend body type similarly, and add to UPDATE SET clause:
```sql
image_enabled = ?, image_model = ?, image_style = ?, image_count = ?, image_layout = ?,
```

Add binds:
```typescript
body.image_enabled ?? existing.image_enabled,
body.image_model !== undefined ? body.image_model : existing.image_model,
body.image_style ?? existing.image_style,
body.image_count ?? existing.image_count,
body.image_layout !== undefined ? body.image_layout : existing.image_layout,
```

**Step 4: Verify compilation**

Run: `npx wrangler deploy --dry-run`
Expected: No errors

**Step 5: Commit**

```bash
git add src/routes/api/ai.ts src/types.ts
git commit -m "feat: extend prompt CRUD to save image generation settings"
```

---

## Task 7: Backend — Extend Cron Job Processor for Images

**Files:**
- Modify: `src/lib/ai-cron.ts`

**Step 1: Add imports**

At the top of `src/lib/ai-cron.ts`, add:
```typescript
import { generateImagePrompts, generateAllImages } from './ai-providers';
import { uploadAllImagesToR2, mergeImagesIntoHtml, type ImageLayout } from './ai-image-utils';
```

**Step 2: Join prompt template for image settings**

Extend the SQL query (lines 14-21) to also join `ai_prompts` for image fields:

```typescript
const { results: jobs } = await env.DB.prepare(
  `SELECT j.*, p.api_key, p.endpoint_url, p.extra_config, p.max_tokens as provider_max_tokens, p.temperature as provider_temperature,
          pt.image_enabled as tmpl_image_enabled, pt.image_model as tmpl_image_model,
          pt.image_style as tmpl_image_style, pt.image_count as tmpl_image_count,
          pt.image_layout as tmpl_image_layout
   FROM ai_jobs j
   INNER JOIN ai_providers p ON p.site_id = j.site_id AND p.provider_slug = j.provider_slug AND p.is_enabled = 1
   LEFT JOIN ai_prompts pt ON pt.id = j.prompt_id
   WHERE j.status = 'pending' AND j.scheduled_at <= ?
   ORDER BY j.scheduled_at ASC
   LIMIT 5`
).bind(now).all<any>();
```

**Step 3: Add image generation after text generation**

After `splitTitleAndBody` (after line 77), add:

```typescript
      let finalBody = body || result.content;

      // Image generation if template has images enabled
      const imageEnabled = job.image_enabled || job.tmpl_image_enabled;
      const imageModel = job.image_model || job.tmpl_image_model;
      const imageCount = job.image_count || job.tmpl_image_count || 0;
      const imageLayoutStr = job.image_layout || job.tmpl_image_layout;
      const imageStyle = job.image_style || job.tmpl_image_style || 'photographic';

      if (imageEnabled && imageCount > 0 && imageModel && job.api_key) {
        try {
          // Update image status
          await env.DB.prepare(
            `UPDATE ai_jobs SET image_status = 'generating', updated_at = datetime('now') WHERE id = ?`
          ).bind(job.id).run();

          // 1. Generate image prompts
          const imagePrompts = await generateImagePrompts(
            generateFn,
            config,
            model,
            result.content,
            imageCount,
            imageStyle,
            job.target_language || 'tr'
          );

          // 2. Generate images
          let layout: ImageLayout[] = [];
          try { layout = JSON.parse(imageLayoutStr || '[]'); } catch { /* ignore */ }

          const images = await generateAllImages(
            job.api_key,
            imagePrompts,
            imageModel,
            layout
          );

          // 3. Upload to R2
          const tempUrls = images.map((img: any) => img.url).filter(Boolean);
          const r2Keys = await uploadAllImagesToR2(env.R2, job.site_id, tempUrls);

          // 4. Merge into HTML
          const cdnBase = env.CDN_URL || '/api/media/file';
          finalBody = mergeImagesIntoHtml(finalBody, r2Keys, layout, cdnBase);

          // 5. Save image data to job
          await env.DB.prepare(
            `UPDATE ai_jobs SET image_status = 'done', image_urls = ?, image_prompts = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(JSON.stringify(r2Keys), JSON.stringify(imagePrompts), job.id).run();

        } catch (imgErr: any) {
          console.error(`Image generation failed for job ${job.id}:`, imgErr.message);
          await env.DB.prepare(
            `UPDATE ai_jobs SET image_status = 'failed', updated_at = datetime('now') WHERE id = ?`
          ).bind(job.id).run();
          // Continue with text-only content
        }
      }
```

**Step 4: Update post insertion to use `finalBody`**

Change the post INSERT (line 88-102) to use `finalBody` instead of `body || result.content`:

```typescript
      const post = await env.DB.prepare(
        `INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, published_at)
         VALUES (?, ?, ?, ?, ?, ?, 'post', ?, ?, ?)
         RETURNING id`
      ).bind(
        job.site_id,
        title || 'AI Generated Post',
        slug,
        finalBody,
        (finalBody).slice(0, 200),
        postStatus,
        job.created_by,
        job.target_language || 'tr',
        publishedAt
      ).first<{ id: number }>();
```

**Step 5: Verify compilation**

Run: `npx wrangler deploy --dry-run`
Expected: No errors

**Step 6: Commit**

```bash
git add src/lib/ai-cron.ts
git commit -m "feat: extend cron job processor with image generation"
```

---

## Task 8: Frontend — API Client Method for Image Models

**Files:**
- Modify: `admin/src/lib/api.ts`

**Step 1: Add `getAiProviderImageModels` method**

Add after the existing `getAiProviderModels` method:

```typescript
async getAiProviderImageModels(slug: string) {
  return this.request(`/ai/providers/${slug}/image-models`);
}
```

**Step 2: Commit**

```bash
git add admin/src/lib/api.ts
git commit -m "feat: add image models API client method"
```

---

## Task 9: Frontend — i18n Translation Keys

**Files:**
- Modify: `admin/src/lib/i18n.ts`

**Step 1: Add translation keys**

Add these entries to the translations object:

```typescript
'ai.image_generation': { tr: 'Resim Uretimi', en: 'Image Generation' },
'ai.add_images': { tr: 'Yaziya resim ekle', en: 'Add images to article' },
'ai.image_model': { tr: 'Resim Modeli', en: 'Image Model' },
'ai.image_style': { tr: 'Resim Stili', en: 'Image Style' },
'ai.image_count': { tr: 'Resim Sayisi', en: 'Image Count' },
'ai.image_layout': { tr: 'Resim Yerlesimi', en: 'Image Layout' },
'ai.image_position': { tr: 'Pozisyon', en: 'Position' },
'ai.position_cover': { tr: 'Kapak - Tam Satir', en: 'Cover - Full Width' },
'ai.position_full': { tr: 'Tam Satir', en: 'Full Width' },
'ai.position_left': { tr: 'Sol Float', en: 'Left Float' },
'ai.position_right': { tr: 'Sag Float', en: 'Right Float' },
'ai.style_photographic': { tr: 'Fotografik', en: 'Photographic' },
'ai.style_digital_art': { tr: 'Dijital Sanat', en: 'Digital Art' },
'ai.style_illustration': { tr: 'Illustrasyon', en: 'Illustration' },
'ai.style_3d_render': { tr: '3D Render', en: '3D Render' },
'ai.style_anime': { tr: 'Anime', en: 'Anime' },
'ai.apply_default_layout': { tr: 'Varsayilan Yerlesim Uygula', en: 'Apply Default Layout' },
'ai.layout_blog_classic': { tr: 'Blog Klasik', en: 'Blog Classic' },
'ai.layout_magazine': { tr: 'Magazin', en: 'Magazine' },
'ai.layout_gallery': { tr: 'Galeri', en: 'Gallery' },
'ai.generating_image_prompts': { tr: 'Resim promptlari hazirlaniyor...', en: 'Generating image prompts...' },
'ai.generating_images': { tr: 'Resimler uretiliyor...', en: 'Generating images...' },
'ai.uploading_images': { tr: 'Resimler yukleniyor...', en: 'Uploading images...' },
'ai.merging_content': { tr: 'Icerik birlestiriliyor...', en: 'Merging content...' },
'ai.fetch_image_models': { tr: 'Resim Modellerini Getir', en: 'Fetch Image Models' },
'ai.fetching_image_models': { tr: 'Resim modelleri getiriliyor...', en: 'Fetching image models...' },
```

**Step 2: Commit**

```bash
git add admin/src/lib/i18n.ts
git commit -m "feat: add image generation translation keys"
```

---

## Task 10: Frontend — Prompt Template Image Settings UI

**Files:**
- Modify: `admin/src/pages/ai/AiPrompts.tsx`

**Step 1: Extend form state**

Add to `PromptFormData` interface and `emptyForm`:

```typescript
// Interface additions:
image_enabled: boolean;
image_model: string;
image_style: string;
image_count: number;
image_layout: { position: string; size: string }[];

// emptyForm additions:
image_enabled: false,
image_model: '',
image_style: 'photographic',
image_count: 0,
image_layout: [],
```

**Step 2: Add image model state**

```typescript
const [imageModels, setImageModels] = useState<{ id: string; name: string }[]>([]);
const [loadingImageModels, setLoadingImageModels] = useState(false);
```

**Step 3: Add image model fetch function**

```typescript
const fetchImageModels = async () => {
  setLoadingImageModels(true);
  try {
    const res = await api.getAiProviderImageModels('aiml');
    if (res?.success && Array.isArray(res.data)) {
      setImageModels(res.data);
    }
  } catch { /* ignore */ }
  setLoadingImageModels(false);
};
```

**Step 4: Add image settings section in the dialog JSX**

After the existing model selection section, add:

```tsx
{/* Image Generation Settings */}
<div className="border-t pt-4 mt-4">
  <div className="flex items-center gap-2 mb-4">
    <input
      type="checkbox"
      id="image_enabled"
      checked={form.image_enabled}
      onChange={(e) => {
        const enabled = e.target.checked;
        setForm((f) => ({
          ...f,
          image_enabled: enabled,
          image_count: enabled && f.image_count === 0 ? 2 : f.image_count,
          image_layout: enabled && f.image_layout.length === 0
            ? [
                { position: 'cover', size: '800x450' },
                { position: 'left', size: '400x300' },
              ]
            : f.image_layout,
        }));
        if (enabled && imageModels.length === 0) {
          fetchImageModels();
        }
      }}
      className="rounded"
    />
    <label htmlFor="image_enabled" className="font-medium">
      {t('ai.add_images', lang)}
    </label>
  </div>

  {form.image_enabled && (
    <div className="space-y-4">
      {/* Image Model */}
      <div>
        <label className="block text-sm font-medium mb-1">{t('ai.image_model', lang)}</label>
        {loadingImageModels ? (
          <div className="text-sm text-gray-500">{t('ai.fetching_image_models', lang)}</div>
        ) : imageModels.length > 0 ? (
          <select
            value={form.image_model}
            onChange={(e) => setForm((f) => ({ ...f, image_model: e.target.value }))}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">-- Model Sec --</option>
            {imageModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        ) : (
          <button onClick={fetchImageModels} className="text-blue-600 text-sm underline">
            {t('ai.fetch_image_models', lang)}
          </button>
        )}
      </div>

      {/* Image Style */}
      <div>
        <label className="block text-sm font-medium mb-1">{t('ai.image_style', lang)}</label>
        <select
          value={form.image_style}
          onChange={(e) => setForm((f) => ({ ...f, image_style: e.target.value }))}
          className="w-full border rounded px-3 py-2"
        >
          <option value="photographic">{t('ai.style_photographic', lang)}</option>
          <option value="digital_art">{t('ai.style_digital_art', lang)}</option>
          <option value="illustration">{t('ai.style_illustration', lang)}</option>
          <option value="3d_render">{t('ai.style_3d_render', lang)}</option>
          <option value="anime">{t('ai.style_anime', lang)}</option>
        </select>
      </div>

      {/* Image Count */}
      <div>
        <label className="block text-sm font-medium mb-1">{t('ai.image_count', lang)}</label>
        <select
          value={form.image_count}
          onChange={(e) => {
            const count = parseInt(e.target.value);
            setForm((f) => {
              const newLayout = [...f.image_layout];
              // Grow: add defaults
              while (newLayout.length < count) {
                newLayout.push(
                  newLayout.length === 0
                    ? { position: 'cover', size: '800x450' }
                    : { position: 'left', size: '400x300' }
                );
              }
              // Shrink: remove from end
              while (newLayout.length > count) newLayout.pop();
              return { ...f, image_count: count, image_layout: newLayout };
            });
          }}
          className="w-full border rounded px-3 py-2"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* Per-Image Layout Controls */}
      <div>
        <label className="block text-sm font-medium mb-2">{t('ai.image_layout', lang)}</label>
        <div className="space-y-2">
          {form.image_layout.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded p-2">
              <span className="text-sm font-medium w-16">Resim {idx + 1}:</span>
              <select
                value={item.position}
                onChange={(e) => {
                  const pos = e.target.value;
                  setForm((f) => {
                    const newLayout = [...f.image_layout];
                    const size = (pos === 'cover' || pos === 'full') ? '800x450' : '400x300';
                    newLayout[idx] = { position: pos, size };
                    return { ...f, image_layout: newLayout };
                  });
                }}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="cover">{t('ai.position_cover', lang)}</option>
                <option value="full">{t('ai.position_full', lang)}</option>
                <option value="left">{t('ai.position_left', lang)}</option>
                <option value="right">{t('ai.position_right', lang)}</option>
              </select>
              <span className="text-xs text-gray-500">{item.size}</span>
            </div>
          ))}
        </div>

        {/* Preset Layouts */}
        <div className="mt-3 flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setForm((f) => {
                const layout = f.image_layout.map((_, i) => {
                  if (i === 0) return { position: 'cover', size: '800x450' };
                  return { position: i % 2 === 1 ? 'left' : 'right', size: '400x300' };
                });
                return { ...f, image_layout: layout };
              });
            }}
            className="text-xs px-3 py-1 border rounded hover:bg-gray-100"
          >
            {t('ai.layout_blog_classic', lang)}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm((f) => {
                const layout = f.image_layout.map((_, i) => ({
                  position: i === 0 ? 'cover' : 'full',
                  size: '800x450',
                }));
                return { ...f, image_layout: layout };
              });
            }}
            className="text-xs px-3 py-1 border rounded hover:bg-gray-100"
          >
            {t('ai.layout_magazine', lang)}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm((f) => {
                const layout = f.image_layout.map(() => ({
                  position: 'full' as string,
                  size: '800x450',
                }));
                return { ...f, image_layout: layout };
              });
            }}
            className="text-xs px-3 py-1 border rounded hover:bg-gray-100"
          >
            {t('ai.layout_gallery', lang)}
          </button>
        </div>
      </div>
    </div>
  )}
</div>
```

**Step 5: Update save logic to serialize image_layout**

In the save handler, serialize `image_layout` to JSON before sending:

```typescript
const payload = {
  ...form,
  is_active: form.is_active ? 1 : 0,
  image_enabled: form.image_enabled ? 1 : 0,
  image_layout: JSON.stringify(form.image_layout),
};
```

**Step 6: Update edit loading to parse image_layout**

When loading a prompt for editing, parse the JSON:

```typescript
const editLayout = prompt.image_layout ? JSON.parse(prompt.image_layout) : [];
setForm({
  ...prompt,
  is_active: !!prompt.is_active,
  image_enabled: !!prompt.image_enabled,
  image_layout: editLayout,
});
```

**Step 7: Build and verify**

Run: `cd admin && npm run build`
Expected: Build succeeds

**Step 8: Commit**

```bash
git add admin/src/pages/ai/AiPrompts.tsx
git commit -m "feat: add image generation settings UI to prompt template dialog"
```

---

## Task 11: Frontend — Extend Generate Modal with Image Support

**Files:**
- Modify: `admin/src/components/editor/AiGenerateModal.tsx`

**Step 1: Pass image settings from selected prompt template**

When a prompt template is selected and it has `image_enabled`, include image fields in the generate API call:

```typescript
// In the generate handler, after building promptText:
const selectedTemplate = templates.find((t: any) => t.id === genPromptId);

const generatePayload: Record<string, unknown> = {
  provider_slug: genProvider,
  model: genModel || undefined,
  prompt_text: promptText,
  system_prompt: genSystemPrompt || undefined,
  max_tokens: Math.min(genWordCount * 3, 8000),
  temperature: 0.7,
  word_count: genWordCount,
};

// Add image settings if template has them
if (selectedTemplate?.image_enabled) {
  generatePayload.image_enabled = true;
  generatePayload.image_model = selectedTemplate.image_model;
  generatePayload.image_style = selectedTemplate.image_style;
  generatePayload.image_count = selectedTemplate.image_count;
  try {
    generatePayload.image_layout = JSON.parse(selectedTemplate.image_layout || '[]');
  } catch {
    generatePayload.image_layout = [];
  }
}

const res = await api.generateAiContent(generatePayload);
```

**Step 2: Build and verify**

Run: `cd admin && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add admin/src/components/editor/AiGenerateModal.tsx
git commit -m "feat: pass image settings from prompt template to generate API"
```

---

## Task 12: Build and Deploy

**Files:** None (build + deploy step)

**Step 1: Build admin**

Run: `cd admin && npm run build`
Expected: Build succeeds with no errors

**Step 2: Deploy**

Run: `npx wrangler deploy`
Expected: Deployment succeeds

**Step 3: Final commit if any remaining changes**

```bash
git add -A
git commit -m "chore: build admin for image generation feature"
```

---

## Verification Checklist

After deployment, verify in this order:

1. **DB Migration**: Open D1 console, run `PRAGMA table_info(ai_prompts)` — should show `image_enabled`, `image_model`, `image_style`, `image_count`, `image_layout` columns
2. **Image Models Endpoint**: Go to AI Settings, verify AIML provider enabled, then call GET `/api/ai/providers/aiml/image-models` — should return image model list
3. **Prompt Template UI**: Go to AI Prompts, edit a template, check "Yaziya resim ekle" — image settings should appear with model, style, count, per-image layout controls
4. **Save Template**: Save template with image settings enabled, reload — settings should persist
5. **Generate with Images**: Use the template in AiGenerateModal, generate content — should produce text with embedded images
6. **Cron Compatibility**: Create a scheduled job using the image-enabled template — on next cron run, should produce post with images
