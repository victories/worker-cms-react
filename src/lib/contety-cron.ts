// Contety Cron Polling — fallback for callback mechanism
// Checks processing contents and imports completed ones
import type { Bindings } from '../types';
import { getContentDetail, importContentAsPost, getContetyApiKey } from './contety';
import type { ContetyConfig } from '../types';

/**
 * Poll processing Contety contents and import completed ones.
 * Called from the cron handler in index.ts.
 */
export async function processContetyPolling(env: Bindings): Promise<void> {
  // Find processing contents older than 2 minutes (give callback time to arrive first)
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { results: pending } = await env.DB.prepare(
    `SELECT cc.*, cfg.api_key as site_api_key, cfg.auto_import, cfg.default_status,
            cfg.default_category_id, cfg.default_author_id,
            gcfg.api_key as global_api_key
     FROM contety_contents cc
     LEFT JOIN contety_configs cfg ON cfg.site_id = cc.site_id
     LEFT JOIN global_contety_config gcfg ON gcfg.id = (SELECT id FROM global_contety_config WHERE is_enabled = 1 LIMIT 1)
     WHERE cc.status = 'processing' AND cc.created_at <= ?
     ORDER BY cc.created_at ASC
     LIMIT 10`
  ).bind(twoMinAgo).all<any>();

  if (!pending || pending.length === 0) return;

  for (const item of pending) {
    const apiKey = item.site_api_key || item.global_api_key;
    if (!apiKey) {
      // No API key available, mark as failed
      await env.DB.prepare(
        `UPDATE contety_contents SET status = 'failed', error_message = 'No API key configured', updated_at = datetime('now') WHERE id = ?`
      ).bind(item.id).run();
      continue;
    }

    try {
      const detail = await getContentDetail(apiKey, item.contety_content_id);

      if (detail.status === 'completed') {
        // Auto-import if enabled
        if (item.auto_import === 1) {
          const config: Partial<ContetyConfig> = {
            default_status: item.default_status || 'draft',
            default_category_id: item.default_category_id,
            default_author_id: item.default_author_id,
          };

          const postId = await importContentAsPost(
            env.DB, env.R2, item.site_id, detail, config
          );

          await env.DB.prepare(
            `UPDATE contety_contents SET status = 'completed', post_id = ?, title = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(postId, detail.title || item.title, item.id).run();

          await env.DB.prepare(
            `INSERT INTO contety_logs (site_id, action, contety_content_id, post_id, credits_used, status) VALUES (?, 'auto_import', ?, ?, ?, 'success')`
          ).bind(item.site_id, item.contety_content_id, postId, detail.credits || 0).run();
        } else {
          // Just update status, let user manually import
          await env.DB.prepare(
            `UPDATE contety_contents SET status = 'completed', title = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(detail.title || item.title, item.id).run();
        }
      } else if (detail.status === 'failed') {
        await env.DB.prepare(
          `UPDATE contety_contents SET status = 'failed', error_message = 'Content generation failed on Contety', updated_at = datetime('now') WHERE id = ?`
        ).bind(item.id).run();

        await env.DB.prepare(
          `INSERT INTO contety_logs (site_id, action, contety_content_id, status, error_message) VALUES (?, 'poll_failed', ?, 'failed', 'Content generation failed')`
        ).bind(item.site_id, item.contety_content_id).run();
      }
      // If still 'processing', leave it — will be checked again next cron run
    } catch (err: any) {
      // Don't fail the entire cron for one item
      console.error(`Contety polling error for content ${item.contety_content_id}:`, err.message);
    }
  }
}
