# AI Image Generation Design

## Overview
Integrate AI image generation into the existing text content generation system. Images are generated alongside text automatically using AIML API, with per-image position control and layout customization. Compatible with scheduled/cron job system for fully automated publishing.

## User Requirements
- Images generated alongside text (not separate step)
- Use existing AIML API key for image generation
- Dynamic image model selection (fetched from AIML API)
- Per-image position control (cover, left float, right float, full width)
- Preset layout templates + individual customization
- Compatible with cron/scheduled jobs for automated publishing
- No user intervention needed after initial template setup

## Generation Flow (Sequential - Yaklasim A)

```
1. Text AI generates article (existing system)
2. If image_enabled:
   a. Text AI generates image prompts (one per image)
      System: "Generate {count} image prompts for this article,
              each describing a photo/illustration relevant to the content"
   b. Parallel AIML Image API calls for each prompt
      POST /v1/images/generations { model, prompt, image_size }
   c. Upload returned URLs to R2 (permanent storage)
   d. Insert into HTML based on image_layout config:
      - cover  -> <figure class="wp-cover"> at top
      - left   -> <figure class="wp-float-left"> between paragraphs
      - right  -> <figure class="wp-float-right"> between paragraphs
      - full   -> <figure class="wp-full-width"> between paragraphs
3. Return combined HTML (text + images)
```

Progress steps shown in UI:
1. Metin uretiliyor... (Generating text)
2. Resim promptlari hazirlaniyor... (Preparing image prompts)
3. Resimler uretiliyor... (1/3) (Generating images)
4. Resimler yukleniyor... (Uploading images)
5. Icerik birlestiriliyor... (Merging content)

## Prompt Template UI — Image Settings

When "Yaziya resim ekle" checkbox is enabled:

```
+---------------------------------------------+
| Resim Uretimi                               |
| +-------------------------------------------+
| | [x] Yaziya resim ekle                     |
| +-------------------------------------------+
|                                              |
| Resim Modeli:  [flux-pro/v1.1        v]     |
| Resim Stili:   [Fotografik           v]     |
| Resim Sayisi:  [3                    v]     |
|                                              |
| -- Resim Yerlesim Ayarlari --------------- - |
|                                              |
|  Resim 1:  [Kapak - Tam Satir    v]  800x450|
|  Resim 2:  [Sol Float            v]  400x300|
|  Resim 3:  [Sol Float            v]  400x300|
|                                              |
|  [Varsayilan Yerlesim Uygula]               |
+---------------------------------------------+
```

### Position Options (Per Image)
| Position | Description | Default Size |
|----------|-------------|-------------|
| Kapak - Tam Satir | Full width at article top | 800x450 |
| Tam Satir | Full width between paragraphs | 800x450 |
| Sol Float | Left side, text flows right | 400x300 |
| Sag Float | Right side, text flows left | 400x300 |

### Preset Layout Templates
"Varsayilan Yerlesim Uygula" button offers:
- **Blog Klasik**: 1=Cover, alternating left/right for rest
- **Magazin**: 1=Cover, rest all full width
- **Galeri**: All full width

User can customize individual images after applying a preset.

### Image Count Change Behavior
- Count increases: new images default to "Sol Float"
- Count decreases: removes from end
- First image always defaults to "Kapak - Tam Satir"

### Image Style Presets
- Fotografik (photographic)
- Dijital Sanat (digital art)
- Illustrasyon (illustration)
- 3D Render
- Anime

## Database Schema Changes

### `ai_prompt_templates` — new columns
```sql
image_enabled   INTEGER DEFAULT 0        -- 0/1 toggle
image_model     TEXT                      -- e.g. 'flux-pro/v1.1'
image_style     TEXT DEFAULT 'photographic'
image_count     INTEGER DEFAULT 0        -- 0-5
image_layout    TEXT                      -- JSON array
```

`image_layout` JSON example (3 images):
```json
[
  {"position": "cover", "size": "800x450"},
  {"position": "left", "size": "400x300"},
  {"position": "left", "size": "400x300"}
]
```

### `ai_jobs` — new columns
```sql
image_status    TEXT DEFAULT 'pending'    -- pending/generating/done/failed
image_urls      TEXT                      -- JSON array of R2 URLs
image_prompts   TEXT                      -- JSON array of generated prompts
```

## Backend Changes

### New endpoint: `GET /api/ai/providers/:slug/image-models`
- Fetches models with `type === "image"` from AIML API
- Returns `{ id, name, info }` array for image model dropdown

### Extended `POST /api/ai/generate`
Request body gains:
```typescript
image_enabled?: boolean;
image_model?: string;
image_style?: string;
image_count?: number;
image_layout?: Array<{ position: string; size: string }>;
```

Response gains:
```typescript
image_prompts?: string[];
image_urls?: string[];
```

### New function: `generateImages(apiKey, model, prompts, layout, style)`
- Calls `POST https://api.aimlapi.com/v1/images/generations` for each prompt
- Parallel execution with Promise.allSettled
- Returns array of image URLs

### New function: `uploadImageToR2(imageUrl, bucket, filename)`
- Fetches image from AIML temporary URL
- Uploads to R2 with webp conversion if needed
- Returns permanent R2 URL

### New function: `mergeImagesIntoHtml(html, imageUrls, layout)`
- Parses HTML into paragraphs
- Inserts images at calculated positions based on layout
- Cover image goes before first paragraph
- Float/full images distributed evenly between paragraphs
- Returns merged HTML

### CSS classes (injected into CMS theme):
```css
.wp-cover { width: 100%; margin-bottom: 1.5rem; }
.wp-float-left { float: left; width: 45%; margin: 0 1.5rem 1rem 0; }
.wp-float-right { float: right; width: 45%; margin: 0 0 1rem 1.5rem; }
.wp-full-width { width: 100%; margin: 1.5rem 0; clear: both; }
figure img { width: 100%; height: auto; border-radius: 8px; }
figcaption { font-size: 0.85rem; color: #666; margin-top: 0.5rem; }
```

## Cron/Scheduled Job Compatibility

Existing job system works unchanged:
1. Cron picks up pending job from `ai_jobs`
2. Reads `prompt_template_id` -> gets template with image settings
3. Same generate flow runs (text -> image prompts -> images -> HTML)
4. Result inserted into `posts` table with `status = 'published'`
5. `image_status` updated to 'done', `image_urls` saved
6. Fully automated, no user intervention

Progress callbacks are no-ops in cron context (no UI), only logged.

## AIML Image API Reference
- Endpoint: `POST https://api.aimlapi.com/v1/images/generations`
- Auth: `Authorization: Bearer <API_KEY>`
- Body: `{ model, prompt, image_size: { width, height }, num_images, output_format }`
- Response: `{ images: [{ url, width, height, content_type }] }`
- Supported sizes: 256-1440px, multiples of 32
- Models: flux-pro/v1.1, flux/schnell, flux-2-pro, dall-e-3, stable-diffusion-xl, etc.

## Files to Modify
1. `src/lib/ai-providers.ts` — image model fetcher, image generation function
2. `src/routes/api/ai.ts` — image-models endpoint, extended generate endpoint
3. `src/lib/image-utils.ts` — NEW: R2 upload, HTML merge utilities
4. `admin/src/pages/ai/AiPrompts.tsx` — image settings UI in template dialog
5. `admin/src/pages/ai/AiSettings.tsx` — image model display (optional)
6. `admin/src/components/editor/AiGenerateModal.tsx` — progress steps for image gen
7. `admin/src/lib/api.ts` — image-models API method
8. `admin/src/lib/i18n.ts` — translation keys
9. DB migration — new columns for templates and jobs tables
