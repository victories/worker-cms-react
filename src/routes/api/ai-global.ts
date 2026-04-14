import { Hono } from 'hono';
import type { Bindings, Variables, GlobalAiProvider, GlobalAiPrompt } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { maskApiKey, PROVIDER_DEFINITIONS, fetchAimlModels, fetchAimlImageModels, testProviderConnection } from '../../lib/ai-providers';

const aiGlobal = new Hono<{ Bindings: Bindings; Variables: Variables }>();
aiGlobal.use('*', authMiddleware, requireRole('super_admin'));

// ══════════════════════════════════════════════════
// Global Provider Settings (super_admin only)
// ══════════════════════════════════════════════════

// GET /api/ai/global/providers
aiGlobal.get('/providers', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM global_ai_providers ORDER BY provider_slug'
  ).all<GlobalAiProvider>();

  const providers = result.results.map((p) => ({
    slug: p.provider_slug,
    enabled: p.is_enabled === 1,
    api_key: p.api_key ? maskApiKey(p.api_key) : null,
    default_model: p.default_model,
    max_tokens: p.max_tokens,
    temperature: p.temperature,
    endpoint_url: p.endpoint_url,
    extra_config: p.extra_config,
  }));

  return c.json({ success: true, data: providers });
});

// GET /api/ai/global/providers/:slug/models
aiGlobal.get('/providers/:slug/models', async (c) => {
  const slug = c.req.param('slug');

  if (slug !== 'aiml') {
    const def = PROVIDER_DEFINITIONS.find((d) => d.slug === slug);
    return c.json({ success: true, data: def?.models || [] });
  }

  const provider = await c.env.DB.prepare(
    'SELECT api_key FROM global_ai_providers WHERE provider_slug = ?'
  ).bind(slug).first<{ api_key: string }>();

  if (!provider?.api_key) {
    return c.json({ success: false, error: 'API key not configured. Save your API key first.' }, 400);
  }

  try {
    const models = await fetchAimlModels(provider.api_key);
    return c.json({ success: true, data: models });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

// GET /api/ai/global/providers/:slug/image-models
aiGlobal.get('/providers/:slug/image-models', async (c) => {
  const slug = c.req.param('slug');

  if (slug !== 'aiml') {
    return c.json({ success: false, error: 'Image models only available for AIML provider' }, 400);
  }

  const provider = await c.env.DB.prepare(
    'SELECT api_key FROM global_ai_providers WHERE provider_slug = ? AND is_enabled = 1'
  ).bind(slug).first<{ api_key: string }>();

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

// PUT /api/ai/global/providers/:slug — Upsert global provider config
aiGlobal.put('/providers/:slug', async (c) => {
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
    `INSERT INTO global_ai_providers (provider_slug, display_name, api_key, default_model, endpoint_url, extra_config, is_enabled, max_tokens, temperature)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider_slug) DO UPDATE SET
       display_name = excluded.display_name,
       api_key = COALESCE(excluded.api_key, global_ai_providers.api_key),
       default_model = COALESCE(excluded.default_model, global_ai_providers.default_model),
       endpoint_url = COALESCE(excluded.endpoint_url, global_ai_providers.endpoint_url),
       extra_config = COALESCE(excluded.extra_config, global_ai_providers.extra_config),
       is_enabled = COALESCE(excluded.is_enabled, global_ai_providers.is_enabled),
       max_tokens = COALESCE(excluded.max_tokens, global_ai_providers.max_tokens),
       temperature = COALESCE(excluded.temperature, global_ai_providers.temperature),
       updated_at = datetime('now')
     RETURNING *`
  ).bind(
    slug,
    displayName,
    body.api_key || null,
    body.default_model || null,
    body.endpoint_url || null,
    body.extra_config || null,
    body.is_enabled ?? 1,
    body.max_tokens ?? 2048,
    body.temperature ?? 0.7
  ).first<GlobalAiProvider>();

  return c.json({ success: true, data: result });
});

// POST /api/ai/global/providers/:slug/test — Test global provider connection
aiGlobal.post('/providers/:slug/test', async (c) => {
  const slug = c.req.param('slug');

  const provider = await c.env.DB.prepare(
    'SELECT * FROM global_ai_providers WHERE provider_slug = ?'
  ).bind(slug).first<GlobalAiProvider>();

  if (!provider) {
    return c.json({ success: false, error: 'Provider bulunamadi' }, 404);
  }

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

// DELETE /api/ai/global/providers/:slug
aiGlobal.delete('/providers/:slug', async (c) => {
  const slug = c.req.param('slug');

  await c.env.DB.prepare(
    'DELETE FROM global_ai_providers WHERE provider_slug = ?'
  ).bind(slug).run();

  return c.json({ success: true, data: { message: 'Global provider silindi' } });
});

// ══════════════════════════════════════════════════
// Global Prompt Templates (super_admin only)
// ══════════════════════════════════════════════════

// GET /api/ai/global/prompts
aiGlobal.get('/prompts', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM global_ai_prompts ORDER BY created_at DESC'
  ).all<GlobalAiPrompt>();

  return c.json({ success: true, data: result.results });
});

// GET /api/ai/global/prompts/:id
aiGlobal.get('/prompts/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  const prompt = await c.env.DB.prepare(
    'SELECT * FROM global_ai_prompts WHERE id = ?'
  ).bind(id).first<GlobalAiPrompt>();

  if (!prompt) {
    return c.json({ success: false, error: 'Prompt bulunamadi' }, 404);
  }

  return c.json({ success: true, data: prompt });
});

// POST /api/ai/global/prompts
aiGlobal.post('/prompts', async (c) => {
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
    image_layout?: string;
  }>();

  if (!body.name || !body.user_prompt) {
    return c.json({ success: false, error: 'Name ve user_prompt alanlari gerekli' }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO global_ai_prompts (
      name, description, system_prompt, user_prompt, variables,
      default_provider_slug, default_model, default_word_count, default_language, default_tone,
      image_enabled, image_model, image_style, image_count, image_layout
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *`
  ).bind(
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
    body.image_layout || null
  ).first<GlobalAiPrompt>();

  return c.json({ success: true, data: result }, 201);
});

// PUT /api/ai/global/prompts/:id
aiGlobal.put('/prompts/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare(
    'SELECT * FROM global_ai_prompts WHERE id = ?'
  ).bind(id).first<GlobalAiPrompt>();

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
    `UPDATE global_ai_prompts SET
      name = ?, description = ?, system_prompt = ?, user_prompt = ?,
      variables = ?, default_provider_slug = ?, default_model = ?, default_word_count = ?,
      default_language = ?, default_tone = ?, is_active = ?,
      image_enabled = ?, image_model = ?, image_style = ?, image_count = ?, image_layout = ?,
      updated_at = datetime('now')
    WHERE id = ?
    RETURNING *`
  ).bind(
    body.name ?? existing.name,
    body.description !== undefined ? body.description : existing.description,
    body.system_prompt !== undefined ? body.system_prompt : existing.system_prompt,
    body.user_prompt ?? existing.user_prompt,
    body.variables !== undefined ? body.variables : existing.variables,
    body.default_provider_slug !== undefined ? body.default_provider_slug : existing.default_provider_slug,
    body.default_model !== undefined ? body.default_model : existing.default_model,
    body.default_word_count ?? existing.default_word_count,
    body.default_language ?? existing.default_language,
    body.default_tone ?? existing.default_tone,
    body.is_active ?? existing.is_active,
    body.image_enabled ?? existing.image_enabled,
    body.image_model !== undefined ? body.image_model : existing.image_model,
    body.image_style ?? existing.image_style,
    body.image_count ?? existing.image_count,
    body.image_layout !== undefined ? body.image_layout : existing.image_layout,
    id
  ).first<GlobalAiPrompt>();

  return c.json({ success: true, data: result });
});

// DELETE /api/ai/global/prompts/:id
aiGlobal.delete('/prompts/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare(
    'SELECT id FROM global_ai_prompts WHERE id = ?'
  ).bind(id).first();

  if (!existing) {
    return c.json({ success: false, error: 'Prompt bulunamadi' }, 404);
  }

  await c.env.DB.prepare(
    'DELETE FROM global_ai_prompts WHERE id = ?'
  ).bind(id).run();

  return c.json({ success: true, data: { message: 'Global prompt silindi' } });
});

export default aiGlobal;
