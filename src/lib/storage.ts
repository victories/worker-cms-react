// R2 storage helpers with site prefix isolation

export function getSitePrefix(siteId: number): string {
  return `sites/${siteId}/uploads`;
}

export function getR2Key(siteId: number, filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${getSitePrefix(siteId)}/${year}/${month}/${filename}`;
}

export function getUniqueFilename(originalName: string): string {
  const ext = originalName.split('.').pop() || '';
  const name = originalName.replace(/\.[^.]+$/, '');
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const unique = crypto.randomUUID().slice(0, 8);
  return `${slug}-${unique}.${ext}`;
}

export async function uploadFile(
  r2: R2Bucket,
  siteId: number,
  file: ArrayBuffer,
  filename: string,
  mimeType: string
): Promise<{ key: string; size: number }> {
  const uniqueName = getUniqueFilename(filename);
  const key = getR2Key(siteId, uniqueName);

  await r2.put(key, file, {
    httpMetadata: { contentType: mimeType },
  });

  return { key, size: file.byteLength };
}

export async function deleteFile(r2: R2Bucket, key: string): Promise<void> {
  await r2.delete(key);
}

export async function getFile(r2: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  return await r2.get(key);
}

export async function deleteAllSiteFiles(r2: R2Bucket, siteId: number): Promise<number> {
  const prefix = getSitePrefix(siteId);
  let deleted = 0;
  let cursor: string | undefined;

  do {
    const listed = await r2.list({ prefix, cursor });
    if (listed.objects.length > 0) {
      await Promise.all(listed.objects.map(obj => r2.delete(obj.key)));
      deleted += listed.objects.length;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return deleted;
}
