// AI Cron Job Processor — runs inside Cloudflare Workers scheduled handler
import type { Bindings } from '../types';
import type { AiProvider, AiJob } from '../types';
import { getGenerateFunction, estimateCost, splitTitleAndBody, generateImagePrompts, generateAllImages } from './ai-providers';
import type { AiMessage, ProviderConfig } from './ai-providers';
import { uploadAllImagesToR2, mergeImagesIntoHtml, type ImageLayout } from './ai-image-utils';

/**
 * Process pending AI generation jobs.
 * Called from the cron handler in index.ts.
 * Picks up to 5 pending jobs whose scheduled_at <= now and executes them.
 */
export async function processAiJobs(env: Bindings, now: string): Promise<void> {
  // 1. Fetch up to 5 pending jobs ready to run
  // Use LEFT JOIN for site provider, then fallback to global provider
  const { results: jobs } = await env.DB.prepare(
    `SELECT j.*,
            COALESCE(p.api_key, gp.api_key) as api_key,
            COALESCE(p.endpoint_url, gp.endpoint_url) as endpoint_url,
            COALESCE(p.extra_config, gp.extra_config) as extra_config,
            COALESCE(p.max_tokens, gp.max_tokens) as provider_max_tokens,
            COALESCE(p.temperature, gp.temperature) as provider_temperature,
            pt.image_enabled as tmpl_image_enabled, pt.image_model as tmpl_image_model,
            pt.image_style as tmpl_image_style, pt.image_count as tmpl_image_count,
            pt.image_layout as tmpl_image_layout
     FROM ai_jobs j
     LEFT JOIN ai_providers p ON p.site_id = j.site_id AND p.provider_slug = j.provider_slug AND p.is_enabled = 1
     LEFT JOIN global_ai_providers gp ON gp.provider_slug = j.provider_slug AND gp.is_enabled = 1
     LEFT JOIN ai_prompts pt ON pt.id = j.prompt_id
     WHERE j.status = 'pending' AND j.scheduled_at <= ?
       AND (p.api_key IS NOT NULL OR gp.api_key IS NOT NULL)
     ORDER BY j.scheduled_at ASC
     LIMIT 5`
  ).bind(now).all<any>();

  if (!jobs || jobs.length === 0) return;

  for (const job of jobs) {
    // 2. Mark as running
    await env.DB.prepare(
      `UPDATE ai_jobs SET status = 'running', updated_at = datetime('now') WHERE id = ?`
    ).bind(job.id).run();

    const startTime = Date.now();
    let model = job.model || '';

    try {
      // 3. Build messages
      const messages: AiMessage[] = [];

      let systemPrompt = job.system_prompt || '';
      if (job.target_word_count && job.target_word_count > 0) {
        const wordInstruction = `Write approximately ${job.target_word_count} words. Write in ${job.target_language || 'tr'} language.`;
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${wordInstruction}` : wordInstruction;
      }

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: job.prompt_text });

      // 4. Build config
      let parsedExtra: Record<string, string> | undefined;
      if (job.extra_config) {
        try { parsedExtra = JSON.parse(job.extra_config); } catch { /* ignore */ }
      }

      const config: ProviderConfig = {
        apiKey: job.api_key || '',
        endpointUrl: job.endpoint_url || undefined,
        extraConfig: parsedExtra,
      };

      // 5. Generate content
      const generateFn = getGenerateFunction(job.provider_slug);
      const result = await generateFn(
        {
          messages,
          model,
          maxTokens: job.provider_max_tokens || 4096,
          temperature: job.provider_temperature ?? 0.7,
        },
        config
      );

      const durationMs = Date.now() - startTime;
      model = result.model || model;

      // 6. Split title and body
      const { title, body } = splitTitleAndBody(result.content);
      const slug = (title || 'ai-generated')
        .toLowerCase()
        .replace(/[^a-z0-9\u00e0-\u024f]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100) || `ai-${Date.now()}`;

      let finalBody = body || result.content;

      // 6b. Image generation if template has images enabled
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

          // Generate image prompts
          const imagePrompts = await generateImagePrompts(
            generateFn,
            config,
            model,
            result.content,
            imageCount,
            imageStyle,
            job.target_language || 'tr'
          );

          // Generate images
          let layout: ImageLayout[] = [];
          try { layout = JSON.parse(imageLayoutStr || '[]'); } catch { /* ignore */ }

          const images = await generateAllImages(
            job.api_key,
            imagePrompts,
            imageModel,
            layout
          );

          // Upload to R2
          const tempUrls = images.map((img: any) => img.url).filter(Boolean);
          const r2Keys = await uploadAllImagesToR2(env.R2, job.site_id, tempUrls);

          // Merge into HTML
          const cdnBase = (env as any).CDN_URL || '/api/media/file';
          finalBody = mergeImagesIntoHtml(finalBody, r2Keys, layout, cdnBase);

          // Save image data to job
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

      // 7. Insert post
      const postStatus = job.target_status || 'draft';
      const publishedAt = postStatus === 'publish' ? new Date().toISOString() : null;

      const post = await env.DB.prepare(
        `INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id, language, published_at)
         VALUES (?, ?, ?, ?, ?, ?, 'post', ?, ?, ?)
         RETURNING id`
      ).bind(
        job.site_id,
        title || 'AI Generated Post',
        slug,
        finalBody,
        finalBody.slice(0, 200),
        postStatus,
        job.created_by,
        job.target_language || 'tr',
        publishedAt
      ).first<{ id: number }>();

      const postId = post?.id || null;

      // 8. Assign category if specified
      if (postId && job.target_category_id) {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO post_taxonomies (post_id, taxonomy_id) VALUES (?, ?)`
        ).bind(postId, job.target_category_id).run();

        // Update taxonomy count
        await env.DB.prepare(
          `UPDATE taxonomies SET count = count + 1 WHERE id = ?`
        ).bind(job.target_category_id).run();
      }

      // 9. Mark job completed
      await env.DB.prepare(
        `UPDATE ai_jobs SET status = 'completed', result_post_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(postId, job.id).run();

      // 10. Log success
      const cost = estimateCost(job.provider_slug, model, result.promptTokens, result.completionTokens);
      await env.DB.prepare(
        `INSERT INTO ai_logs (
          site_id, job_id, provider_slug, model, prompt_tokens, completion_tokens,
          total_tokens, estimated_cost, duration_ms, status, request_type, result_post_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        job.site_id,
        job.id,
        job.provider_slug,
        model,
        result.promptTokens,
        result.completionTokens,
        result.totalTokens,
        cost,
        durationMs,
        'success',
        'generate',
        postId,
        job.created_by
      ).run();

    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Mark job failed
      await env.DB.prepare(
        `UPDATE ai_jobs SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(errorMessage, job.id).run();

      // Log error
      await env.DB.prepare(
        `INSERT INTO ai_logs (
          site_id, job_id, provider_slug, model, prompt_tokens, completion_tokens,
          total_tokens, estimated_cost, duration_ms, status, error_message, request_type, created_by
        ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?)`
      ).bind(
        job.site_id,
        job.id,
        job.provider_slug,
        model,
        durationMs,
        'error',
        errorMessage,
        'generate',
        job.created_by
      ).run();
    }
  }
}
