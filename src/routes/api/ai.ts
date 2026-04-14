import { Hono } from 'hono';
import type { Bindings, Variables, AiProvider, AiPrompt, AiJob, AiLog, GlobalAiProvider, GlobalAiPrompt } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware, requireAiAccess } from '../../middleware/auth';
import { getGenerateFunction, testProviderConnection, estimateCost, renderPromptTemplate, splitTitleAndBody, maskApiKey, fetchAimlModels, fetchAimlImageModels, generateImagePrompts, generateAllImages, PROVIDER_DEFINITIONS } from '../../lib/ai-providers';
import type { AiGenerateRequest, AiMessage, ProviderConfig } from '../../lib/ai-providers';
import { uploadAllImagesToR2, mergeImagesIntoHtml, type ImageLayout } from '../../lib/ai-image-utils';

// Helper: Get provider config with global fallback
// userId is used to check ai_use_global permission — users without it can only use site-level providers
async function getProviderWithFallback(
  db: D1Database,
  siteId: number,
  providerSlug: string,
  requireEnabled = true,
  userId?: number
): Promise<{ provider: AiProvider | GlobalAiProvider; source: 'site' | 'global' } | null> {
  // First try site-specific provider
  const siteProvider = await db.prepare(
    `SELECT * FROM ai_providers WHERE site_id = ? AND provider_slug = ?${requireEnabled ? ' AND is_enabled = 1' : ''}`
  ).bind(siteId, providerSlug).first<AiProvider>();

  if (siteProvider?.api_key) {
    return { provider: siteProvider, source: 'site' };
  }

  // Check if user is allowed to use global providers
  if (userId) {
    const userRecord = await db.prepare('SELECT role, ai_use_global FROM users WHERE id = ?').bind(userId).first<{ role: string; ai_use_global: number }>();
    if (userRecord && userRecord.role !== 'super_admin' && userRecord.ai_use_global !== 1) {
      return null; // User cannot use global providers
    }
  }

  // Fallback to global provider
  const globalProvider = await db.prepare(
    `SELECT * FROM global_ai_providers WHERE provider_slug = ?${requireEnabled ? ' AND is_enabled = 1' : ''}`
  ).bind(providerSlug).first<GlobalAiProvider>();

  if (globalProvider?.api_key) {
    return { provider: globalProvider, source: 'global' };
  }

  return null;
}

const ai = new Hono<{ Bindings: Bindings; Variables: Variables }>();
ai.use('*', authMiddleware, requireSite, siteAccessMiddleware, requireAiAccess);

// ══════════════════════════════════════════════════
// Provider Settings (admin only)
// ══════════════════════════════════════════════════

// GET /api/ai/provider-definitions — available provider definitions (no auth needed for frontend)
ai.get('/provider-definitions', async (c) => {
  return c.json({ success: true, data: PROVIDER_DEFINITIONS });
});

// GET /api/ai/providers — List all providers for the site (includes global fallback info)
ai.get('/providers', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  const [siteResult, globalResult] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM ai_providers WHERE site_id = ?').bind(siteId).all<AiProvider>(),
    c.env.DB.prepare('SELECT * FROM global_ai_providers').all<GlobalAiProvider>(),
  ]);

  const globalMap = new Map(globalResult.results.map((g) => [g.provider_slug, g]));

  const providers = siteResult.results.map((p) => {
    const globalProv = globalMap.get(p.provider_slug);
    return {
      slug: p.provider_slug,
      enabled: p.is_enabled === 1,
      api_key: p.api_key ? maskApiKey(p.api_key) : null,
      default_model: p.default_model,
      max_tokens: p.max_tokens,
      temperature: p.temperature,
      endpoint_url: p.endpoint_url,
      extra_config: p.extra_config,
      has_global_fallback: !!(globalProv?.api_key && globalProv.is_enabled === 1),
      using_global: !p.api_key && !!(globalProv?.api_key && globalProv.is_enabled === 1),
    };
  });

  // Also include global-only providers that have no site override
  const siteProviderSlugs = new Set(siteResult.results.map((p) => p.provider_slug));
  for (const g of globalResult.results) {
    if (!siteProviderSlugs.has(g.provider_slug) && g.is_enabled === 1 && g.api_key) {
      providers.push({
        slug: g.provider_slug,
        enabled: true,
        api_key: null,
        default_model: g.default_model,
        max_tokens: g.max_tokens,
        temperature: g.temperature,
        endpoint_url: g.endpoint_url,
        extra_config: g.extra_config,
        has_global_fallback: true,
        using_global: true,
      });
    }
  }

  return c.json({ success: true, data: providers });
});

// GET /api/ai/providers/:slug/models — Fetch available models dynamically
ai.get('/providers/:slug/models', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const slug = c.req.param('slug');

  if (slug !== 'aiml') {
    const def = PROVIDER_DEFINITIONS.find((d) => d.slug === slug);
    return c.json({ success: true, data: def?.models || [] });
  }

  // Try site key first, then global fallback
  const siteProvider = await c.env.DB.prepare(
    'SELECT api_key FROM ai_providers WHERE site_id = ? AND provider_slug = ?'
  ).bind(siteId, slug).first<{ api_key: string }>();

  let apiKey = siteProvider?.api_key;
  if (!apiKey) {
    const globalProvider = await c.env.DB.prepare(
      'SELECT api_key FROM global_ai_providers WHERE provider_slug = ?'
    ).bind(slug).first<{ api_key: string }>();
    apiKey = globalProvider?.api_key;
  }

  if (!apiKey) {
    return c.json({ success: false, error: 'API key not configured. Save your API key first.' }, 400);
  }

  try {
    const models = await fetchAimlModels(apiKey);
    return c.json({ success: true, data: models });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

// GET /api/ai/providers/:slug/image-models — Fetch image models for dynamic providers
ai.get('/providers/:slug/image-models', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const slug = c.req.param('slug');

  if (slug !== 'aiml') {
    return c.json({ success: false, error: 'Image models only available for AIML provider' }, 400);
  }

  // Try site key first, then global fallback
  const siteProvider = await c.env.DB.prepare(
    'SELECT api_key FROM ai_providers WHERE site_id = ? AND provider_slug = ? AND is_enabled = 1'
  ).bind(siteId, slug).first<{ api_key: string }>();

  let apiKey = siteProvider?.api_key;
  if (!apiKey) {
    const globalProvider = await c.env.DB.prepare(
      'SELECT api_key FROM global_ai_providers WHERE provider_slug = ? AND is_enabled = 1'
    ).bind(slug).first<{ api_key: string }>();
    apiKey = globalProvider?.api_key;
  }

  if (!apiKey) {
    return c.json({ success: false, error: 'Provider not configured or no API key' }, 400);
  }

  try {
    const models = await fetchAimlImageModels(apiKey);
    return c.json({ success: true, data: models });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch image models' }, 500);
  }
});

// PUT /api/ai/providers/:slug — Upsert provider config
ai.put('/providers/:slug', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const slug = c.req.param('slug');

  const body = await c.req.json<{
    api_key?: string;
    default_model?: string;
    endpoint_url?: string;
    extra_config?: string;
    is_enabled?: number;
    max_tokens?: number;
    temperature?: number;
  }>();

  const definition = PROVIDER_DEFINITIONS.find((p) => p.slug === slug);
  const displayName = definition?.name || slug;

  const result = await c.env.DB.prepare(
    `INSERT INTO ai_providers (site_id, provider_slug, display_name, api_key, default_model, endpoint_url, extra_config, is_enabled, max_tokens, temperature)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(site_id, provider_slug) DO UPDATE SET
       display_name = excluded.display_name,
       api_key = COALESCE(excluded.api_key, ai_providers.api_key),
       default_model = COALESCE(excluded.default_model, ai_providers.default_model),
       endpoint_url = COALESCE(excluded.endpoint_url, ai_providers.endpoint_url),
       extra_config = COALESCE(excluded.extra_config, ai_providers.extra_config),
       is_enabled = COALESCE(excluded.is_enabled, ai_providers.is_enabled),
       max_tokens = COALESCE(excluded.max_tokens, ai_providers.max_tokens),
       temperature = COALESCE(excluded.temperature, ai_providers.temperature),
       updated_at = datetime('now')
     RETURNING *`
  ).bind(
    siteId,
    slug,
    displayName,
    body.api_key || null,
    body.default_model || null,
    body.endpoint_url || null,
    body.extra_config || null,
    body.is_enabled ?? 1,
    body.max_tokens ?? 2048,
    body.temperature ?? 0.7
  ).first<AiProvider>();

  return c.json({ success: true, data: result });
});

// POST /api/ai/providers/:slug/test — Test provider connection (with global fallback)
ai.post('/providers/:slug/test', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const slug = c.req.param('slug');

  const providerResult = await getProviderWithFallback(c.env.DB, siteId, slug, false);

  if (!providerResult) {
    return c.json({ success: false, error: 'Provider bulunamadi' }, 404);
  }

  const provider = providerResult.provider;

  try {
    let parsedExtra: Record<string, string> | undefined;
    if (provider.extra_config) {
      try { parsedExtra = JSON.parse(provider.extra_config); } catch { /* ignore */ }
    }
    const result = await testProviderConnection(slug, {
      apiKey: provider.api_key || '',
      endpointUrl: provider.endpoint_url || undefined,
      extraConfig: parsedExtra,
    }, provider.default_model || undefined);

    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Baglanti testi basarisiz' }, 400);
  }
});

// DELETE /api/ai/providers/:slug — Delete provider config
ai.delete('/providers/:slug', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const slug = c.req.param('slug');

  await c.env.DB.prepare(
    'DELETE FROM ai_providers WHERE site_id = ? AND provider_slug = ?'
  ).bind(siteId, slug).run();

  return c.json({ success: true, data: { message: 'Provider silindi' } });
});

// ══════════════════════════════════════════════════
// Prompt Templates (editor+)
// ══════════════════════════════════════════════════

// GET /api/ai/prompts — List prompts for site (includes global prompts)
ai.get('/prompts', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;

  const [siteResult, globalResult] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM ai_prompts WHERE site_id = ? ORDER BY created_at DESC').bind(siteId).all<AiPrompt>(),
    c.env.DB.prepare('SELECT * FROM global_ai_prompts WHERE is_active = 1 ORDER BY created_at DESC').all<GlobalAiPrompt>(),
  ]);

  // Mark prompts with their scope
  const sitePrompts = siteResult.results.map((p) => ({ ...p, scope: 'site' as const }));
  const globalPrompts = globalResult.results.map((p) => ({ ...p, site_id: 0, scope: 'global' as const }));

  return c.json({ success: true, data: [...sitePrompts, ...globalPrompts] });
});

// GET /api/ai/prompts/:id — Single prompt
ai.get('/prompts/:id', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const prompt = await c.env.DB.prepare(
    'SELECT * FROM ai_prompts WHERE id = ? AND site_id = ?'
  ).bind(id, siteId).first<AiPrompt>();

  if (!prompt) {
    return c.json({ success: false, error: 'Prompt bulunamadi' }, 404);
  }

  return c.json({ success: true, data: prompt });
});

// POST /api/ai/prompts — Create prompt
ai.post('/prompts', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;

  const body = await c.req.json<{
    name: string;
    description?: string;
    system_prompt?: string;
    user_prompt: string;
    variables?: string;
    default_provider_slug?: string;
    default_model?: string;
    default_word_count?: number;
    default_language?: string;
    default_tone?: string;
    image_enabled?: number;
    image_model?: string;
    image_style?: string;
    image_count?: number;
    image_layout?: string; // JSON string
  }>();

  if (!body.name || !body.user_prompt) {
    return c.json({ success: false, error: 'Name ve user_prompt alanlari gerekli' }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO ai_prompts (
      site_id, name, description, system_prompt, user_prompt, variables,
      default_provider_slug, default_model, default_word_count, default_language, default_tone,
      image_enabled, image_model, image_style, image_count, image_layout,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *`
  ).bind(
    siteId,
    body.name,
    body.description || null,
    body.system_prompt || null,
    body.user_prompt,
    body.variables || null,
    body.default_provider_slug || null,
    body.default_model || null,
    body.default_word_count || 500,
    body.default_language || 'tr',
    body.default_tone || 'neutral',
    body.image_enabled || 0,
    body.image_model || null,
    body.image_style || 'photographic',
    body.image_count || 0,
    body.image_layout || null,
    user.sub
  ).first<AiPrompt>();

  return c.json({ success: true, data: result }, 201);
});

// PUT /api/ai/prompts/:id — Update prompt
ai.put('/prompts/:id', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare(
    'SELECT * FROM ai_prompts WHERE id = ? AND site_id = ?'
  ).bind(id, siteId).first<AiPrompt>();

  if (!existing) {
    return c.json({ success: false, error: 'Prompt bulunamadi' }, 404);
  }

  const body = await c.req.json<{
    name?: string;
    description?: string;
    system_prompt?: string;
    user_prompt?: string;
    variables?: string;
    default_provider_slug?: string;
    default_model?: string;
    default_word_count?: number;
    default_language?: string;
    default_tone?: string;
    is_active?: number;
    image_enabled?: number;
    image_model?: string;
    image_style?: string;
    image_count?: number;
    image_layout?: string;
  }>();

  const result = await c.env.DB.prepare(
    `UPDATE ai_prompts SET
      name = ?, description = ?, system_prompt = ?, user_prompt = ?,
      variables = ?, default_provider_slug = ?, default_model = ?, default_word_count = ?,
      default_language = ?, default_tone = ?, is_active = ?,
      image_enabled = ?, image_model = ?, image_style = ?, image_count = ?, image_layout = ?,
      updated_at = datetime('now')
    WHERE id = ? AND site_id = ?
    RETURNING *`
  ).bind(
    body.name ?? existing.name,
    body.description !== undefined ? body.description : existing.description,
    body.system_prompt !== undefined ? body.system_prompt : existing.system_prompt,
    body.user_prompt ?? existing.user_prompt,
    body.variables !== undefined ? body.variables : existing.variables,
    body.default_provider_slug !== undefined ? body.default_provider_slug : existing.default_provider_slug,
    body.default_model !== undefined ? body.default_model : (existing as any).default_model,
    body.default_word_count ?? existing.default_word_count,
    body.default_language ?? existing.default_language,
    body.default_tone ?? existing.default_tone,
    body.is_active ?? existing.is_active,
    body.image_enabled ?? existing.image_enabled,
    body.image_model !== undefined ? body.image_model : existing.image_model,
    body.image_style ?? existing.image_style,
    body.image_count ?? existing.image_count,
    body.image_layout !== undefined ? body.image_layout : existing.image_layout,
    id,
    siteId
  ).first<AiPrompt>();

  return c.json({ success: true, data: result });
});

// DELETE /api/ai/prompts/:id — Delete prompt
ai.delete('/prompts/:id', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare(
    'SELECT id FROM ai_prompts WHERE id = ? AND site_id = ?'
  ).bind(id, siteId).first();

  if (!existing) {
    return c.json({ success: false, error: 'Prompt bulunamadi' }, 404);
  }

  await c.env.DB.prepare(
    'DELETE FROM ai_prompts WHERE id = ? AND site_id = ?'
  ).bind(id, siteId).run();

  return c.json({ success: true, data: { message: 'Prompt silindi' } });
});

// ══════════════════════════════════════════════════
// Content Generation (editor+)
// ══════════════════════════════════════════════════

// POST /api/ai/generate — Instant content generation
ai.post('/generate', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;

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

  if (!body.provider_slug || !body.prompt_text) {
    return c.json({ success: false, error: 'provider_slug ve prompt_text alanlari gerekli' }, 400);
  }

  // Get provider (with global fallback, respecting ai_use_global permission)
  const providerResult = await getProviderWithFallback(c.env.DB, siteId, body.provider_slug, true, user.sub);

  if (!providerResult) {
    return c.json({ success: false, error: 'Aktif provider bulunamadi' }, 400);
  }

  const provider = providerResult.provider;

  // Build messages
  const messages: AiMessage[] = [];

  let systemPromptText = body.system_prompt || '';
  if (body.word_count && !body.prompt_text.includes(String(body.word_count))) {
    const wordCountInstruction = `Write approximately ${body.word_count} words.`;
    systemPromptText = systemPromptText
      ? `${systemPromptText}\n\n${wordCountInstruction}`
      : wordCountInstruction;
  }

  if (systemPromptText) {
    messages.push({ role: 'system', content: systemPromptText });
  }
  messages.push({ role: 'user', content: body.prompt_text });

  const model = body.model || provider.default_model || '';
  let parsedExtraGen: Record<string, string> | undefined;
  if (provider.extra_config) {
    try { parsedExtraGen = JSON.parse(provider.extra_config); } catch { /* ignore */ }
  }
  const config: ProviderConfig = {
    apiKey: provider.api_key || '',
    endpointUrl: provider.endpoint_url || undefined,
    extraConfig: parsedExtraGen,
  };

  const request: AiGenerateRequest = {
    messages,
    model,
    maxTokens: body.max_tokens ?? provider.max_tokens,
    temperature: body.temperature ?? provider.temperature,
  };

  const startTime = Date.now();

  try {
    const generateFn = getGenerateFunction(body.provider_slug);
    const result = await generateFn(request, config);
    const durationMs = Date.now() - startTime;

    const { title, body: contentBody } = splitTitleAndBody(result.content);
    const cost = estimateCost(body.provider_slug, model, result.promptTokens, result.completionTokens);

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

        // 3. Upload to R2 (pass prompts for content-based filenames)
        const tempUrls = images.map((img) => img.url).filter(Boolean);
        const r2Keys = await uploadAllImagesToR2(c.env.R2, siteId, tempUrls, imagePrompts);
        imageUrls = r2Keys.filter(Boolean);

        // 3b. Register uploaded images in media table so they're discoverable
        const user = c.get('user');
        const authorId = user?.sub || 1;
        for (let i = 0; i < r2Keys.length; i++) {
          const key = r2Keys[i];
          if (!key) continue;
          try {
            // Check if already registered
            const exists = await c.env.DB.prepare(
              'SELECT id FROM media WHERE r2_key = ? AND site_id = ?'
            ).bind(key, siteId).first();
            if (!exists) {
              const filename = key.split('/').pop() || `ai-image-${i}.webp`;
              const ext = filename.split('.').pop()?.toLowerCase() || 'webp';
              const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp';
              // Get file size from R2
              const objHead = await c.env.R2.head(key);
              const size = objHead?.size || 0;
              await c.env.DB.prepare(
                'INSERT INTO media (site_id, r2_key, filename, mime_type, size, alt_text, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
              ).bind(siteId, key, filename, mimeType, size, imagePrompts?.[i] || null, authorId).run();
            }
          } catch (regErr) {
            console.error('Failed to register AI image in media:', regErr);
          }
        }

        // 4. Merge into HTML
        // Convert R2 keys to proper /uploads/ URLs
        // R2 key format: sites/{siteId}/uploads/{year}/{month}/{filename}
        // URL format:    /uploads/s/{siteId}/{year}/{month}/{filename}
        const imageUrlsForHtml = r2Keys.map((key) => {
          if (!key) return '';
          const match = key.match(/^sites\/(\d+)\/uploads\/(.+)$/);
          if (match) {
            return `/uploads/s/${match[1]}/${match[2]}`;
          }
          return `/uploads/${key}`;
        });
        finalContent = mergeImagesIntoHtml(
          contentBody || result.content,
          imageUrlsForHtml,
          layout,
          '', // no cdnBase prefix needed - URLs are already complete
          imagePrompts // pass image prompts as captions for alt/figcaption
        );
      } catch (imgErr: any) {
        // Image generation failed — return text content anyway with warning
        console.error('Image generation failed:', imgErr.message, imgErr.stack);
        // Store warning to return to frontend
        (result as any)._imageWarning = `Image generation failed: ${imgErr.message}`;
      }
    }

    // Log success
    await c.env.DB.prepare(
      `INSERT INTO ai_logs (
        site_id, provider_slug, model, prompt_tokens, completion_tokens,
        total_tokens, estimated_cost, duration_ms, status, request_type, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      siteId,
      body.provider_slug,
      result.model,
      result.promptTokens,
      result.completionTokens,
      result.totalTokens,
      cost,
      durationMs,
      'success',
      'generate',
      user.sub
    ).run();

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
        image_warning: (result as any)._imageWarning || undefined,
      },
    });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;

    // Log error
    await c.env.DB.prepare(
      `INSERT INTO ai_logs (
        site_id, provider_slug, model, prompt_tokens, completion_tokens,
        total_tokens, estimated_cost, duration_ms, status, error_message, request_type, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      siteId,
      body.provider_slug,
      model,
      0, 0, 0, 0,
      durationMs,
      'error',
      err.message || 'Bilinmeyen hata',
      'generate',
      user.sub
    ).run();

    return c.json({ success: false, error: err.message || 'Icerik olusturma basarisiz' }, 500);
  }
});

// POST /api/ai/improve — Content improvement
ai.post('/improve', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;

  const body = await c.req.json<{
    provider_slug: string;
    model?: string;
    content: string;
    action: 'rewrite' | 'summarize' | 'expand' | 'translate' | 'seo_meta';
    target_language?: string;
    tone?: string;
  }>();

  if (!body.provider_slug || !body.content || !body.action) {
    return c.json({ success: false, error: 'provider_slug, content ve action alanlari gerekli' }, 400);
  }

  // Get provider (with global fallback, respecting ai_use_global permission)
  const providerResult = await getProviderWithFallback(c.env.DB, siteId, body.provider_slug, true, user.sub);

  if (!providerResult) {
    return c.json({ success: false, error: 'Aktif provider bulunamadi' }, 400);
  }

  const provider = providerResult.provider;

  // Build system prompt based on action
  const actionPrompts: Record<string, string> = {
    rewrite: 'Rewrite the following content in a better way. Keep the same meaning but improve clarity and style.',
    summarize: 'Summarize the following content concisely.',
    expand: 'Expand the following content with more detail, examples, and depth.',
    translate: `Translate the following content to ${body.target_language || 'English'}. Maintain the original formatting.`,
    seo_meta: 'Generate SEO metadata for the following content. Return a JSON object with: title (max 60 chars), description (max 160 chars), keywords (comma-separated).',
  };

  let systemPrompt = actionPrompts[body.action];
  if (!systemPrompt) {
    return c.json({ success: false, error: 'Gecersiz action' }, 400);
  }

  if (body.tone) {
    systemPrompt += `\n\nUse a ${body.tone} tone.`;
  }

  const messages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: body.content },
  ];

  const model = body.model || provider.default_model || '';
  let parsedExtraImp: Record<string, string> | undefined;
  if (provider.extra_config) {
    try { parsedExtraImp = JSON.parse(provider.extra_config); } catch { /* ignore */ }
  }
  const config: ProviderConfig = {
    apiKey: provider.api_key || '',
    endpointUrl: provider.endpoint_url || undefined,
    extraConfig: parsedExtraImp,
  };

  const request: AiGenerateRequest = {
    messages,
    model,
    maxTokens: provider.max_tokens,
    temperature: provider.temperature,
  };

  const startTime = Date.now();

  try {
    const generateFn = getGenerateFunction(body.provider_slug);
    const result = await generateFn(request, config);
    const durationMs = Date.now() - startTime;

    const cost = estimateCost(body.provider_slug, model, result.promptTokens, result.completionTokens);

    // Log success
    await c.env.DB.prepare(
      `INSERT INTO ai_logs (
        site_id, provider_slug, model, prompt_tokens, completion_tokens,
        total_tokens, estimated_cost, duration_ms, status, request_type, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      siteId,
      body.provider_slug,
      result.model,
      result.promptTokens,
      result.completionTokens,
      result.totalTokens,
      cost,
      durationMs,
      'success',
      'improve',
      user.sub
    ).run();

    return c.json({
      success: true,
      data: {
        content: result.content,
        action: body.action,
        tokens: {
          prompt: result.promptTokens,
          completion: result.completionTokens,
          total: result.totalTokens,
        },
        cost,
        duration_ms: durationMs,
      },
    });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;

    // Log error
    await c.env.DB.prepare(
      `INSERT INTO ai_logs (
        site_id, provider_slug, model, prompt_tokens, completion_tokens,
        total_tokens, estimated_cost, duration_ms, status, error_message, request_type, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      siteId,
      body.provider_slug,
      model,
      0, 0, 0, 0,
      durationMs,
      'error',
      err.message || 'Bilinmeyen hata',
      'improve',
      user.sub
    ).run();

    return c.json({ success: false, error: err.message || 'Icerik iyilestirme basarisiz' }, 500);
  }
});

// ══════════════════════════════════════════════════
// Scheduled Jobs (admin only)
// ══════════════════════════════════════════════════

// GET /api/ai/jobs — List jobs with pagination
ai.get('/jobs', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const url = new URL(c.req.url);

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '20')));
  const offset = (page - 1) * perPage;

  const status = url.searchParams.get('status');

  let where = 'j.site_id = ?';
  const params: unknown[] = [siteId];

  if (status) {
    where += ' AND j.status = ?';
    params.push(status);
  }

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM ai_jobs j WHERE ${where}`
  ).bind(...params).first<{ count: number }>();
  const total = countResult?.count || 0;

  const result = await c.env.DB.prepare(
    `SELECT j.*, u.display_name as creator_name
     FROM ai_jobs j
     LEFT JOIN users u ON u.id = j.created_by
     WHERE ${where}
     ORDER BY j.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...params, perPage, offset).all();

  return c.json({
    success: true,
    data: result.results,
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    },
  });
});

// POST /api/ai/jobs — Create job
ai.post('/jobs', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;

  const body = await c.req.json<{
    prompt_id?: number;
    provider_slug: string;
    model?: string;
    prompt_text: string;
    system_prompt?: string;
    scheduled_at: string;
    target_category_id?: number;
    target_language?: string;
    target_word_count?: number;
    target_status?: string;
  }>();

  if (!body.provider_slug || !body.prompt_text || !body.scheduled_at) {
    return c.json({ success: false, error: 'provider_slug, prompt_text ve scheduled_at alanlari gerekli' }, 400);
  }

  // Validate scheduled_at is in the future
  if (new Date(body.scheduled_at) <= new Date()) {
    return c.json({ success: false, error: 'scheduled_at gelecekte olmali' }, 400);
  }

  // Validate provider exists and is enabled (with global fallback, respecting ai_use_global permission)
  const providerCheck = await getProviderWithFallback(c.env.DB, siteId, body.provider_slug, true, user.sub);

  if (!providerCheck) {
    return c.json({ success: false, error: 'Aktif provider bulunamadi' }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO ai_jobs (
      site_id, prompt_id, provider_slug, model, prompt_text, system_prompt,
      scheduled_at, target_category_id, target_language, target_word_count,
      target_status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *`
  ).bind(
    siteId,
    body.prompt_id || null,
    body.provider_slug,
    body.model || null,
    body.prompt_text,
    body.system_prompt || null,
    body.scheduled_at,
    body.target_category_id || null,
    body.target_language || 'tr',
    body.target_word_count || 500,
    body.target_status || 'draft',
    user.sub
  ).first<AiJob>();

  return c.json({ success: true, data: result }, 201);
});

// PUT /api/ai/jobs/:id — Update pending job
ai.put('/jobs/:id', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare(
    'SELECT * FROM ai_jobs WHERE id = ? AND site_id = ?'
  ).bind(id, siteId).first<AiJob>();

  if (!existing) {
    return c.json({ success: false, error: 'Job bulunamadi' }, 404);
  }

  if (existing.status !== 'pending') {
    return c.json({ success: false, error: 'Sadece bekleyen joblar guncellenebilir' }, 400);
  }

  const body = await c.req.json<{
    prompt_id?: number;
    provider_slug?: string;
    model?: string;
    prompt_text?: string;
    system_prompt?: string;
    scheduled_at?: string;
    target_category_id?: number;
    target_language?: string;
    target_word_count?: number;
    target_status?: string;
  }>();

  // If scheduled_at is being updated, validate it is in the future
  if (body.scheduled_at && new Date(body.scheduled_at) <= new Date()) {
    return c.json({ success: false, error: 'scheduled_at gelecekte olmali' }, 400);
  }

  const result = await c.env.DB.prepare(
    `UPDATE ai_jobs SET
      prompt_id = ?, provider_slug = ?, model = ?, prompt_text = ?, system_prompt = ?,
      scheduled_at = ?, target_category_id = ?, target_language = ?,
      target_word_count = ?, target_status = ?, updated_at = datetime('now')
    WHERE id = ? AND site_id = ?
    RETURNING *`
  ).bind(
    body.prompt_id !== undefined ? body.prompt_id : existing.prompt_id,
    body.provider_slug ?? existing.provider_slug,
    body.model !== undefined ? body.model : existing.model,
    body.prompt_text ?? existing.prompt_text,
    body.system_prompt !== undefined ? body.system_prompt : existing.system_prompt,
    body.scheduled_at ?? existing.scheduled_at,
    body.target_category_id !== undefined ? body.target_category_id : existing.target_category_id,
    body.target_language ?? existing.target_language,
    body.target_word_count ?? existing.target_word_count,
    body.target_status ?? existing.target_status,
    id,
    siteId
  ).first<AiJob>();

  return c.json({ success: true, data: result });
});

// DELETE /api/ai/jobs/:id — Delete/cancel job
ai.delete('/jobs/:id', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare(
    'SELECT * FROM ai_jobs WHERE id = ? AND site_id = ?'
  ).bind(id, siteId).first<AiJob>();

  if (!existing) {
    return c.json({ success: false, error: 'Job bulunamadi' }, 404);
  }

  if (existing.status === 'running') {
    return c.json({ success: false, error: 'Cannot delete running job' }, 400);
  }

  await c.env.DB.prepare(
    'DELETE FROM ai_jobs WHERE id = ? AND site_id = ?'
  ).bind(id, siteId).run();

  return c.json({ success: true, data: { message: 'Job silindi' } });
});

// POST /api/ai/jobs/:id/retry — Retry failed job
ai.post('/jobs/:id/retry', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare(
    'SELECT * FROM ai_jobs WHERE id = ? AND site_id = ?'
  ).bind(id, siteId).first<AiJob>();

  if (!existing) {
    return c.json({ success: false, error: 'Job bulunamadi' }, 404);
  }

  if (existing.status !== 'failed') {
    return c.json({ success: false, error: 'Sadece basarisiz joblar yeniden denenebilir' }, 400);
  }

  const result = await c.env.DB.prepare(
    `UPDATE ai_jobs SET
      status = 'pending',
      error_message = NULL,
      scheduled_at = datetime('now'),
      updated_at = datetime('now')
    WHERE id = ? AND site_id = ?
    RETURNING *`
  ).bind(id, siteId).first<AiJob>();

  return c.json({ success: true, data: result });
});

// ══════════════════════════════════════════════════
// Generation Logs (admin only)
// ══════════════════════════════════════════════════

// GET /api/ai/logs — List logs with pagination
ai.get('/logs', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const url = new URL(c.req.url);

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '20')));
  const offset = (page - 1) * perPage;

  const providerSlug = url.searchParams.get('provider_slug');
  const status = url.searchParams.get('status');

  let where = 'l.site_id = ?';
  const params: unknown[] = [siteId];

  if (providerSlug) {
    where += ' AND l.provider_slug = ?';
    params.push(providerSlug);
  }
  if (status) {
    where += ' AND l.status = ?';
    params.push(status);
  }

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM ai_logs l WHERE ${where}`
  ).bind(...params).first<{ count: number }>();
  const total = countResult?.count || 0;

  const result = await c.env.DB.prepare(
    `SELECT l.*, u.display_name as creator_name
     FROM ai_logs l
     LEFT JOIN users u ON u.id = l.created_by
     WHERE ${where}
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...params, perPage, offset).all();

  return c.json({
    success: true,
    data: result.results,
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    },
  });
});

// GET /api/ai/logs/stats — Aggregate stats
ai.get('/logs/stats', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  const stats = await c.env.DB.prepare(
    `SELECT
      COUNT(*) as total,
      SUM(total_tokens) as tokens,
      SUM(estimated_cost) as cost,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count
    FROM ai_logs
    WHERE site_id = ?`
  ).bind(siteId).first<{
    total: number;
    tokens: number | null;
    cost: number | null;
    success_count: number;
  }>();

  const total = stats?.total || 0;
  const successCount = stats?.success_count || 0;

  return c.json({
    success: true,
    data: {
      total_requests: total,
      total_tokens: stats?.tokens || 0,
      total_cost: stats?.cost || 0,
      success_count: successCount,
      error_count: total - successCount,
      success_rate: total > 0 ? Math.round((successCount / total) * 10000) / 100 : 0,
    },
  });
});

export default ai;
