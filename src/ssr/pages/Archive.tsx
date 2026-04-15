/** @jsxImportSource react */
import type { PublicPost, PublicTaxonomy } from '../../lib/public-db';
import { PostCard } from '../components/PostCard';
import { Pagination } from '../components/Pagination';

/**
 * Archive — category / tag listing page body.
 *
 * The handler picks the `type` (`'category'` or `'tag'`), fetches
 * the matching taxonomy row and the paginated posts tied to it,
 * then passes everything as pre-built props. This component renders:
 *
 *   1. Archive header — `{TypeLabel}: {taxonomy.name}` plus the
 *      localised "N posts" count and optional description.
 *   2. Stack of `<PostCard>`s (or an empty state).
 *   3. `<Pagination>` footer when there's more than one page.
 *
 * Matches the old `src/routes/public/archive.tsx` layout visually
 * but drops the inline styles — everything is shadcn + Tailwind now.
 */

export interface ArchivePageProps {
  type: 'category' | 'tag';
  taxonomy: PublicTaxonomy;
  posts: Array<{ post: PublicPost; categories: PublicTaxonomy[] }>;
  totalPosts: number;
  currentPage: number;
  totalPages: number;
  /** Pagination base URL, e.g. `/category/foo` or `/en/tag/bar` */
  paginationBase: string;
  siteId: number;
  lang: string;
  /** Language prefix ('' or '/en') for post card links */
  lp: string;
}

export function Archive({
  type,
  taxonomy,
  posts,
  totalPosts,
  currentPage,
  totalPages,
  paginationBase,
  siteId,
  lang,
  lp,
}: ArchivePageProps) {
  const typeLabel =
    type === 'category'
      ? lang === 'tr'
        ? 'Kategori'
        : 'Category'
      : lang === 'tr'
        ? 'Etiket'
        : 'Tag';

  const countLabel =
    lang === 'tr'
      ? `${totalPosts} yazı`
      : `${totalPosts} ${totalPosts === 1 ? 'post' : 'posts'}`;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {typeLabel}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {taxonomy.name}
        </h1>
        {taxonomy.description ? (
          <p className="text-base text-muted-foreground">{taxonomy.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{countLabel}</p>
      </header>

      {posts.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center text-muted-foreground">
          <p>
            {lang === 'tr'
              ? 'Bu kategoride yazı yok'
              : 'No posts in this category'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {posts.map(({ post, categories }, idx) => (
            <PostCard
              key={post.id}
              post={post}
              lang={lang}
              lp={lp}
              categories={categories}
              siteId={siteId}
              isLCP={idx === 0 && currentPage === 1}
            />
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        baseUrl={paginationBase}
        lang={lang}
      />
    </div>
  );
}
