/** @jsxImportSource react */
import type { PublicPost, PublicTaxonomy } from '../../lib/public-db';
import { PostCard } from '../components/PostCard';
import { Pagination } from '../components/Pagination';
import { PostContent } from '../components/PostContent';

/**
 * Home — the publisher site's `/` (homepage) body.
 *
 * Two render modes, matching the old `src/routes/public/home.tsx`:
 *
 *   - `mode === 'static'` — a CMS page has been pinned as the home
 *     (admin setting `show_on_front=page`). We receive the already
 *     shortcode-processed, plugin-filtered HTML in `staticHtml` and
 *     render it through `<PostContent>` so it picks up the same
 *     `<Prose>` typography as any other page.
 *   - `mode === 'blog'` — the default. We take the pre-fetched
 *     `posts` array (with their category taxonomies attached) and
 *     render them as a stack of `<PostCard>`s, capped with a
 *     `<Pagination>` footer.
 *
 * This component is intentionally a pure view: all data fetching,
 * shortcode expansion, plugin hook invocation, layout JSON parsing,
 * and JSON-LD building happen in the route handler
 * (`src/routes/public/home.ts`). That keeps the component trivial to
 * re-render in tests and gives the handler one place to worry about
 * async D1 I/O.
 *
 * The empty state differs per language; the caller passes the `lang`
 * string as-is (no `defaultLang` comparison needed — PublisherLayout
 * already absorbed the locale prefix).
 */

export interface HomeStaticProps {
  mode: 'static';
  /** Already shortcode- and plugin-filter-processed HTML body. */
  staticHtml: string;
}

export interface HomeBlogProps {
  mode: 'blog';
  posts: Array<{ post: PublicPost; categories: PublicTaxonomy[] }>;
  currentPage: number;
  totalPages: number;
  /** Base URL for pagination (empty string maps to `/`). */
  paginationBase: string;
  siteId: number;
  /** Language prefix ('' or '/en') — used by card links and pagination */
  lp: string;
  lang: string;
}

export type HomeProps = HomeStaticProps | HomeBlogProps;

export function Home(props: HomeProps) {
  if (props.mode === 'static') {
    // Homepage pinned to a CMS page — render its HTML in a Prose
    // wrapper so typography matches posts/archives.
    return <PostContent html={props.staticHtml} />;
  }

  const { posts, currentPage, totalPages, paginationBase, siteId, lp, lang } =
    props;

  if (posts.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center text-muted-foreground">
        <p>{lang === 'tr' ? 'Henüz yazı yok' : 'No posts yet'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        baseUrl={paginationBase === '' ? '/' : paginationBase}
        lang={lang}
      />
    </div>
  );
}
