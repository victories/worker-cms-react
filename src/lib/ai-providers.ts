// AI Provider Abstraction Layer for Cloudflare Workers CMS

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiGenerateRequest {
  messages: AiMessage[];
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiGenerateResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string;
}

export interface ProviderConfig {
  apiKey: string;
  endpointUrl?: string;
  extraConfig?: Record<string, string>;
}

export interface ProviderDefinition {
  slug: string;
  name: string;
  models: { id: string; name: string; contextWindow: number; costPer1kInput: number; costPer1kOutput: number }[];
}

// ─── Provider Definitions ─────────────────────────────────────────────────────

export const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    slug: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1', contextWindow: 1047576, costPer1kInput: 0.002, costPer1kOutput: 0.008 },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', contextWindow: 1047576, costPer1kInput: 0.0004, costPer1kOutput: 0.0016 },
      { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', contextWindow: 1047576, costPer1kInput: 0.0001, costPer1kOutput: 0.0004 },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, costPer1kInput: 0.0025, costPer1kOutput: 0.01 },
      { id: 'o3', name: 'o3', contextWindow: 200000, costPer1kInput: 0.002, costPer1kOutput: 0.008 },
      { id: 'o4-mini', name: 'o4-mini', contextWindow: 200000, costPer1kInput: 0.0011, costPer1kOutput: 0.0044 },
    ],
  },
  {
    slug: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', contextWindow: 200000, costPer1kInput: 0.015, costPer1kOutput: 0.075 },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', contextWindow: 200000, costPer1kInput: 0.0008, costPer1kOutput: 0.004 },
    ],
  },
  {
    slug: 'gemini',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1048576, costPer1kInput: 0.00125, costPer1kOutput: 0.01 },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1048576, costPer1kInput: 0.00015, costPer1kOutput: 0.0006 },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1048576, costPer1kInput: 0.0001, costPer1kOutput: 0.0004 },
    ],
  },
  {
    slug: 'deepseek',
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', contextWindow: 128000, costPer1kInput: 0.00027, costPer1kOutput: 0.0011 },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', contextWindow: 128000, costPer1kInput: 0.00055, costPer1kOutput: 0.00219 },
    ],
  },
  {
    slug: 'xai',
    name: 'xAI',
    models: [
      { id: 'grok-3', name: 'Grok-3', contextWindow: 131072, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
      { id: 'grok-3-mini', name: 'Grok-3 Mini', contextWindow: 131072, costPer1kInput: 0.0003, costPer1kOutput: 0.0005 },
    ],
  },
  {
    slug: 'aiml',
    name: 'AIML API',
    models: [],
  },
  {
    slug: 'azure_openai',
    name: 'Azure OpenAI',
    models: [],
  },
];

// ─── Shared OpenAI-Compatible Generate Function ───────────────────────────────

async function openAiCompatibleGenerate(
  request: AiGenerateRequest,
  config: ProviderConfig,
  baseUrl: string,
  headers: Record<string, string>
): Promise<AiGenerateResponse> {
  const body: Record<string, unknown> = {
    model: request.model,
    messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
  };

  if (request.maxTokens !== undefined) {
    body.max_tokens = request.maxTokens;
  }
  if (request.temperature !== undefined) {
    body.temperature = request.temperature;
  }

  let res: Response;
  try {
    res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Network error calling ${baseUrl}: ${message}`);
  }

  if (!res.ok) {
    let errorBody: { error?: { message?: string } } = {};
    try {
      errorBody = (await res.json()) as { error?: { message?: string } };
    } catch {
      // Could not parse error body as JSON
    }
    throw new Error(`API error (${res.status}): ${errorBody.error?.message || res.statusText}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string }; finish_reason: string }[];
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    model: string;
  };

  const choice = data.choices?.[0];
  if (!choice) {
    throw new Error('API returned no choices in the response');
  }

  return {
    content: choice.message.content,
    model: data.model || request.model,
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    totalTokens: data.usage?.total_tokens || (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
    finishReason: choice.finish_reason || 'unknown',
  };
}

// ─── Provider-Specific Generate Functions ─────────────────────────────────────

async function generateOpenAi(
  request: AiGenerateRequest,
  config: ProviderConfig
): Promise<AiGenerateResponse> {
  const baseUrl = config.endpointUrl || 'https://api.openai.com/v1/chat/completions';
  try {
    return await openAiCompatibleGenerate(request, config, baseUrl, {
      Authorization: `Bearer ${config.apiKey}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenAI API error: ${message}`);
  }
}

async function generateAnthropic(
  request: AiGenerateRequest,
  config: ProviderConfig
): Promise<AiGenerateResponse> {
  const baseUrl = config.endpointUrl || 'https://api.anthropic.com/v1/messages';

  const systemMessage = request.messages.find((m) => m.role === 'system');
  const conversationMessages = request.messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model: request.model,
    max_tokens: request.maxTokens || 4096,
    messages: conversationMessages,
  };

  if (systemMessage) {
    body.system = systemMessage.content;
  }
  if (request.temperature !== undefined) {
    body.temperature = request.temperature;
  }

  let res: Response;
  try {
    res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Anthropic API error: Network error - ${message}`);
  }

  if (!res.ok) {
    let errorBody: { error?: { message?: string } } = {};
    try {
      errorBody = (await res.json()) as { error?: { message?: string } };
    } catch {
      // Could not parse error body as JSON
    }
    throw new Error(`Anthropic API error: ${errorBody.error?.message || res.statusText}`);
  }

  const data = (await res.json()) as {
    content: { type: string; text: string }[];
    usage: { input_tokens: number; output_tokens: number };
    model: string;
    stop_reason: string;
  };

  const textBlock = data.content?.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('Anthropic API error: No text content in response');
  }

  const promptTokens = data.usage?.input_tokens || 0;
  const completionTokens = data.usage?.output_tokens || 0;

  return {
    content: textBlock.text,
    model: data.model || request.model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    finishReason: data.stop_reason || 'unknown',
  };
}

async function generateGemini(
  request: AiGenerateRequest,
  config: ProviderConfig
): Promise<AiGenerateResponse> {
  const model = request.model;
  const baseUrl =
    config.endpointUrl ||
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  const systemMessage = request.messages.find((m) => m.role === 'system');
  const conversationMessages = request.messages.filter((m) => m.role !== 'system');

  const contents = conversationMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
  };

  if (systemMessage) {
    body.systemInstruction = {
      parts: [{ text: systemMessage.content }],
    };
  }

  const generationConfig: Record<string, unknown> = {};
  if (request.maxTokens !== undefined) {
    generationConfig.maxOutputTokens = request.maxTokens;
  }
  if (request.temperature !== undefined) {
    generationConfig.temperature = request.temperature;
  }
  if (Object.keys(generationConfig).length > 0) {
    body.generationConfig = generationConfig;
  }

  let res: Response;
  try {
    res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Gemini API error: Network error - ${message}`);
  }

  if (!res.ok) {
    let errorBody: { error?: { message?: string } } = {};
    try {
      errorBody = (await res.json()) as { error?: { message?: string } };
    } catch {
      // Could not parse error body as JSON
    }
    throw new Error(`Gemini API error: ${errorBody.error?.message || res.statusText}`);
  }

  const data = (await res.json()) as {
    candidates: { content: { parts: { text: string }[] }; finishReason: string }[];
    usageMetadata: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number };
  };

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error('Gemini API error: No candidates in response');
  }

  const text = candidate.content?.parts?.[0]?.text;
  if (text === undefined || text === null) {
    throw new Error('Gemini API error: No text content in response');
  }

  const promptTokens = data.usageMetadata?.promptTokenCount || 0;
  const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;

  return {
    content: text,
    model: request.model,
    promptTokens,
    completionTokens,
    totalTokens: data.usageMetadata?.totalTokenCount || promptTokens + completionTokens,
    finishReason: candidate.finishReason || 'unknown',
  };
}

async function generateDeepSeek(
  request: AiGenerateRequest,
  config: ProviderConfig
): Promise<AiGenerateResponse> {
  const baseUrl = config.endpointUrl || 'https://api.deepseek.com/chat/completions';
  try {
    return await openAiCompatibleGenerate(request, config, baseUrl, {
      Authorization: `Bearer ${config.apiKey}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`DeepSeek API error: ${message}`);
  }
}

async function generateXai(
  request: AiGenerateRequest,
  config: ProviderConfig
): Promise<AiGenerateResponse> {
  const baseUrl = config.endpointUrl || 'https://api.x.ai/v1/chat/completions';
  try {
    return await openAiCompatibleGenerate(request, config, baseUrl, {
      Authorization: `Bearer ${config.apiKey}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`xAI API error: ${message}`);
  }
}

async function generateAiml(
  request: AiGenerateRequest,
  config: ProviderConfig
): Promise<AiGenerateResponse> {
  const baseUrl = config.endpointUrl || 'https://api.aimlapi.com/v1/chat/completions';
  try {
    return await openAiCompatibleGenerate(request, config, baseUrl, {
      Authorization: `Bearer ${config.apiKey}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`AIML API error: ${message}`);
  }
}

async function generateAzureOpenAi(
  request: AiGenerateRequest,
  config: ProviderConfig
): Promise<AiGenerateResponse> {
  const resourceName = config.extraConfig?.resource_name;
  const deploymentName = config.extraConfig?.deployment_name;

  if (!resourceName) {
    throw new Error('Azure OpenAI error: resource_name is required in extraConfig');
  }
  if (!deploymentName) {
    throw new Error('Azure OpenAI error: deployment_name is required in extraConfig');
  }

  const apiVersion = config.extraConfig?.api_version || '2024-02-01';
  const baseUrl =
    config.endpointUrl ||
    `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

  try {
    return await openAiCompatibleGenerate(request, config, baseUrl, {
      'api-key': config.apiKey,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Azure OpenAI API error: ${message}`);
  }
}

// ─── Factory Function ─────────────────────────────────────────────────────────

export function getGenerateFunction(
  slug: string
): (req: AiGenerateRequest, config: ProviderConfig) => Promise<AiGenerateResponse> {
  switch (slug) {
    case 'openai':
      return generateOpenAi;
    case 'anthropic':
      return generateAnthropic;
    case 'gemini':
      return generateGemini;
    case 'deepseek':
      return generateDeepSeek;
    case 'xai':
      return generateXai;
    case 'aiml':
      return generateAiml;
    case 'azure_openai':
      return generateAzureOpenAi;
    default:
      throw new Error(`Unknown AI provider: ${slug}`);
  }
}

// ─── Test Connection ──────────────────────────────────────────────────────────

export async function testProviderConnection(
  slug: string,
  config: ProviderConfig,
  model?: string
): Promise<{ success: boolean; error?: string }> {
  const generateFn = getGenerateFunction(slug);

  const provider = PROVIDER_DEFINITIONS.find((p) => p.slug === slug);
  // Use the lightest (last) model for testing if no specific model given
  let testModel = model || provider?.models[provider.models.length - 1]?.id;

  if (!testModel) {
    if (slug === 'azure_openai') {
      if (!config.extraConfig?.deployment_name) {
        return { success: false, error: 'deployment_name is required for Azure OpenAI' };
      }
    } else if (slug === 'aiml') {
      // AIML has dynamic models — use a known lightweight model for testing
      testModel = 'gpt-4o-mini';
    } else {
      return { success: false, error: `No model specified and no default model found for provider: ${slug}` };
    }
  }

  try {
    const response = await generateFn(
      {
        messages: [
          { role: 'user', content: 'Say hello in 5 words.' },
        ],
        model: testModel || config.extraConfig?.deployment_name || '',
        maxTokens: 20,
        temperature: 0,
      },
      config
    );

    if (response.content && response.content.length > 0) {
      return { success: true };
    }
    return { success: false, error: 'Provider returned empty response' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

// ─── Dynamic Model Fetching ──────────────────────────────────────────────────

interface AimlModelResponse {
  id: string;
  type: string;
  info: {
    name: string;
    developer?: string;
    description?: string;
    contextLength?: number;
    maxTokens?: number;
  };
}

export async function fetchAimlModels(apiKey: string): Promise<{ id: string; name: string; contextWindow: number; maxTokens: number }[]> {
  const res = await fetch('https://api.aimlapi.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`AIML API error (${res.status}): Failed to fetch models`);
  }

  const data = (await res.json()) as { data: AimlModelResponse[] };
  const models = (data.data || [])
    .filter((m) => m.type === 'chat-completion')
    .map((m) => ({
      id: m.id,
      name: m.info?.name || m.id,
      contextWindow: m.info?.contextLength || 0,
      maxTokens: m.info?.maxTokens || 4096,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return models;
}

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

// ─── Image Generation ─────────────────────────────────────────────────────────

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
  // Use OpenAI-compatible format (which AIML API supports)
  const body: Record<string, unknown> = {
    model: req.model,
    prompt: req.prompt,
    n: 1,
    size: `${req.width}x${req.height}`,
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

  const data = (await res.json()) as {
    images?: { url: string; width: number; height: number }[];
    data?: { url?: string; b64_json?: string }[];
  };

  // AIML API can return either { images: [...] } or OpenAI-compatible { data: [...] }
  const imageEntry = data.images?.[0] || data.data?.[0];
  if (!imageEntry) {
    throw new Error('AIML Image API returned no images');
  }

  const url = ('url' in imageEntry ? imageEntry.url : '') || '';
  if (!url) {
    throw new Error('AIML Image API returned no image URL');
  }

  return {
    url,
    width: ('width' in imageEntry ? imageEntry.width : req.width) || req.width,
    height: ('height' in imageEntry ? imageEntry.height : req.height) || req.height,
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

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function estimateCost(
  providerSlug: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const provider = PROVIDER_DEFINITIONS.find((p) => p.slug === providerSlug);
  if (!provider) {
    return 0;
  }

  const modelDef = provider.models.find((m) => m.id === model);
  if (!modelDef) {
    return 0;
  }

  const inputCost = (promptTokens / 1000) * modelDef.costPer1kInput;
  const outputCost = (completionTokens / 1000) * modelDef.costPer1kOutput;

  return inputCost + outputCost;
}

export function renderPromptTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }
  return result;
}

export function splitTitleAndBody(content: string): { title: string; body: string } {
  const trimmed = content.trim();

  if (!trimmed) {
    return { title: '', body: '' };
  }

  // Try markdown heading first: # Title or ## Title
  const headingMatch = trimmed.match(/^#{1,2}\s+(.+)/);
  if (headingMatch) {
    const title = headingMatch[1].trim();
    const body = trimmed.slice(headingMatch[0].length).trim();
    return { title, body };
  }

  // Try HTML heading: <h1>Title</h1> or <h2>Title</h2> at the start
  const htmlHeadingMatch = trimmed.match(/^\s*<h[12][^>]*>(.*?)<\/h[12]>/i);
  if (htmlHeadingMatch) {
    const title = htmlHeadingMatch[1].replace(/<[^>]+>/g, '').trim();
    const body = trimmed.slice(htmlHeadingMatch[0].length).trim();
    return { title, body };
  }

  // Try first line as title if it looks like a title (short, no HTML block tags)
  const firstNewline = trimmed.indexOf('\n');
  if (firstNewline === -1) {
    return { title: trimmed.replace(/<[^>]+>/g, '').trim(), body: '' };
  }

  const firstLine = trimmed.slice(0, firstNewline).trim();
  const body = trimmed.slice(firstNewline + 1).trim();

  // Only use first line as title if it's reasonable length and not a paragraph
  if (firstLine.length < 200 && !firstLine.startsWith('<p>')) {
    return { title: firstLine.replace(/<[^>]+>/g, '').trim(), body };
  }

  return { title: '', body: trimmed };
}

export function maskApiKey(key: string): string {
  if (!key) {
    return '';
  }

  if (key.length <= 7) {
    return '***';
  }

  const prefix = key.slice(0, 3);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}
