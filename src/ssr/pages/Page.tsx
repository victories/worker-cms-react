import { PostContent } from '../components/PostContent';

/**
 * Page — the publisher site's single-CMS-page body.
 *
 * The data model makes posts and pages share the `posts` table with
 * `post_type = 'page'`, and both are served by the same `/:slug`
 * route (`src/routes/public/post.ts`). The handler picks this
 * component when the row's `post_type === 'page'` — pages drop the
 * "post meta" row (author / date / categories) and render just the
 * title + body.
 *
 * The rendered `contentHtml` has already been processed by the
 * handler: shortcodes expanded, plugin filters applied, optional
 * layout JSON (stored in `post_meta.page_layout`) stitched together.
 */

export interface PageProps {
  title: string;
  contentHtml: string;
  /** Optional lead paragraph shown above the body (from post.excerpt) */
  excerpt?: string | null;
}

export function Page({ title, contentHtml, excerpt }: PageProps) {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
          {title}
        </h1>
        {excerpt ? (
          <p className="text-lg text-muted-foreground">{excerpt}</p>
        ) : null}
      </header>

      <PostContent html={contentHtml} />
    </article>
  );
}
