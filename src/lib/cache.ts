// KV Cache utility - cache-aside pattern for public DB queries

/**
 * Cache-aside wrapper. Returns cached value if available, otherwise calls fetcher and caches result.
 * If kv is undefined (no KV binding), calls fetcher directly.
 */
export async function cached<T>(
  kv: KVNamespace | undefined,
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (!kv) return fetcher();

  try {
    const hit = await kv.get(key, 'json');
    if (hit !== null) return hit as T;
  } catch {
    // KV read failed, fall through to fetcher
  }

  const result = await fetcher();

  try {
    // Don't await - fire and forget to not block response
    kv.put(key, JSON.stringify(result), { expirationTtl: ttlSeconds });
  } catch {
    // KV write failed, continue with result
  }

  return result;
}

/**
 * Purge all cache keys for a site. Uses KV list API with prefix.
 * Call this when any content/config changes for a site.
 */
export async function cachePurgeSite(kv: KVNamespace | undefined, siteId: number): Promise<void> {
  if (!kv) return;

  try {
    const prefix = `site:${siteId}:`;
    let cursor: string | undefined;

    do {
      const list = await kv.list({ prefix, cursor, limit: 1000 });
      const deletePromises = list.keys.map(k => kv.delete(k.name));
      await Promise.all(deletePromises);
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);
  } catch (err) {
    console.error(`[Cache] Purge failed for site ${siteId}:`, err);
  }
}
