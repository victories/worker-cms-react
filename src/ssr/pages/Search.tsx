import type { PublicPost, PublicTaxonomy } from '../../lib/public-db';
import { PostCard } from '../components/PostCard';
import { Pagination } from '../components/Pagination';

/**
 * Search — full-text search results page body.
 *
 * Two render modes:
 *
 *   - Empty query: show the search prompt with a single input/submit
 *     form (pre-filled via the handler's `searchAction` prop). No
 *     pagination, no result count.
 *   - Non-empty query: show the rewritten header ("Search results for
 *     'foo' — 42 results") followed by the `<PostCard>` stack and
 *     `<Pagination>` footer. Empty result set falls to the "no
 *     results" block.
 *
 * The actual FTS query and `logSearch` fire-and-forget already ran
 * in the handler — this component just renders whatever it got.
 */

export interface SearchEmptyProps {
  mode: 'empty';
  /** Action URL for the search form (locale-prefixed) */
  searchAction: string;
  lang: string;
}

export interface SearchResultsProps {
  mode: 'results';
  query: string;
  posts: Array<{ post: PublicPost; categories: PublicTaxonomy[] }>;
  total: number;
  currentPage: number;
  totalPages: number;
  paginationBase: string;
  siteId: number;
  lang: string;
  /** Language prefix ('' or '/en') */
  lp: string;
}

export type SearchPageProps = SearchEmptyProps | SearchResultsProps;

export function Search(props: SearchPageProps) {
  if (props.mode === 'empty') {
    return <SearchPrompt action={props.searchAction} lang={props.lang} />;
  }

  const {
    query,
    posts,
    total,
    currentPage,
    totalPages,
    paginationBase,
    siteId,
    lang,
    lp,
  } = props;

  const countLabel =
    lang === 'tr'
      ? `${total} sonuç bulundu`
      : `${total} ${total === 1 ? 'result found' : 'results found'}`;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {lang === 'tr' ? 'Arama Sonuçları' : 'Search Results'}
        </h1>
        <p className="text-base text-muted-foreground">
          &ldquo;{query}&rdquo; — {countLabel}
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center text-muted-foreground">
          <p>{lang === 'tr' ? 'Sonuç bulunamadı' : 'No results found'}</p>
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
              isLCP={idx === 0}
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

function SearchPrompt({ action, lang }: { action: string; lang: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {lang === 'tr' ? 'Arama' : 'Search'}
        </h1>
        <p className="text-base text-muted-foreground">
          {lang === 'tr'
            ? 'Aramak istediğinizi yazın.'
            : 'Enter your search query.'}
        </p>
      </header>
      <form
        action={action}
        method="get"
        className="flex items-center gap-2"
        role="search"
      >
        <input
          type="text"
          name="q"
          placeholder={lang === 'tr' ? 'Ara...' : 'Search...'}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          autoFocus
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {lang === 'tr' ? 'Ara' : 'Search'}
        </button>
      </form>
    </div>
  );
}
