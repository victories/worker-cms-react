import type { PaginationParams } from '../types';

// D1 query helpers with site_id scoping

export function paginate(params: PaginationParams) {
  const offset = (params.page - 1) * params.per_page;
  return { limit: params.per_page, offset };
}

export function parsePagination(url: URL): PaginationParams {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const per_page = Math.min(250, Math.max(1, parseInt(url.searchParams.get('per_page') || '20')));
  return { page, per_page };
}

// `table` and `where` are interpolated into SQL, so they must NEVER carry
// user input — the allowlist below turns an accidental misuse into a loud
// error instead of an injection. User-supplied values go in `params`.
const COUNTABLE_TABLES = new Set(['posts', 'media', 'comments c']);

export async function countRows(db: D1Database, table: string, where: string, params: unknown[]): Promise<number> {
  if (!COUNTABLE_TABLES.has(table)) {
    throw new Error(`countRows: table "${table}" is not in the allowlist`);
  }
  const result = await db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE ${where}`).bind(...params).first<{ count: number }>();
  return result?.count ?? 0;
}

export function buildMeta(total: number, pagination: PaginationParams) {
  return {
    page: pagination.page,
    per_page: pagination.per_page,
    total,
    total_pages: Math.ceil(total / pagination.per_page),
  };
}
