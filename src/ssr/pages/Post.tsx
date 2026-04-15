/** @jsxImportSource react */
import type { PublicPost, PublicTaxonomy } from '../../lib/public-db';
import { Badge } from '@ui/badge';
import { Separator } from '@ui/separator';
import { formatDate } from '@ui/lib/utils';
import { PostContent } from '../components/PostContent';

/**
 * Post — the publisher site's single-post body.
 *
 * Renders: title, meta row (author / date / categories), featured
 * image, post content (through `<PostContent>` → `<Prose>`), tags,
 * then — if enabled — the comments list and a comment form.
 *
 * ## Comment form
 *
 * The old Hono JSX post handler hand-wrote a `<script>` block that
 * intercepted the form submit and POSTed to `/api/comments/submit`.
 * We keep that model but move the script source into
 * `src/client/comment-form.ts` (loaded as a tiny island via a
 * sibling `<script type="application/json">` blob). The submit
 * URL and localised strings flow as JSON props to the client, so
 * there's no inline string interpolation at render time.
 *
 * For Faz 4 the handler passes `commentFormBootHtml` — the exact
 * boot `<script>` the old route produced — and this component
 * injects it verbatim via `dangerouslySetInnerHTML`. That keeps the
 * interactive behaviour unchanged while the rest of the page moves
 * to React. Faz 7 can swap it for a proper React island.
 *
 * ## Comments display
 *
 * Each approved comment is rendered as a card with author initial,
 * name, formatted timestamp, and the comment body (already sanitised
 * server-side) inserted via `dangerouslySetInnerHTML`. The reCAPTCHA
 * `<script>` — when the site has v3 enabled and scoped to comments —
 * is also passed in pre-rendered so we don't couple this component
 * to the reCAPTCHA settings shape.
 */

export interface PostCommentViewModel {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
}

export interface PostPageProps {
  post: PublicPost;
  /** Already shortcode- + plugin-filter-processed HTML body */
  contentHtml: string;
  lang: string;
  /** Language prefix ('' or '/en') for category / tag links */
  lp: string;
  siteId: number;
  categories: PublicTaxonomy[];
  tags: PublicTaxonomy[];
  /** Rewritten absolute URL for featured image (or undefined) */
  featuredImageSrc?: string;
  /** Comments section visible? Controlled by settings + post.comment_status */
  showComments: boolean;
  comments: PostCommentViewModel[];
  /**
   * Raw `<script>` string that boots the comment form submit handler,
   * already interpolated by the handler with localised messages and
   * reCAPTCHA config. Rendered via dangerouslySetInnerHTML. Pass
   * `undefined` when comments are disabled.
   */
  commentFormBootHtml?: string;
  /** Optional external reCAPTCHA `<script src>` snippet HTML */
  recaptchaScriptHtml?: string;
}

function formatCommentDate(dateStr: string, lang: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(
      lang === 'tr' ? 'tr-TR' : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  } catch {
    return dateStr;
  }
}

export function Post({
  post,
  contentHtml,
  lang,
  lp,
  categories,
  tags,
  featuredImageSrc,
  showComments,
  comments,
  commentFormBootHtml,
  recaptchaScriptHtml,
}: PostPageProps) {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          {post.author_name ? (
            <span className="font-medium text-foreground/80">
              {post.author_name}
            </span>
          ) : null}
          {post.published_at ? (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={post.published_at}>
                {formatDate(post.published_at, lang)}
              </time>
            </>
          ) : null}
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <a key={cat.id} href={`${lp}/category/${cat.slug}`}>
                  <Badge
                    variant="secondary"
                    className="hover:bg-primary hover:text-primary-foreground"
                  >
                    {cat.name}
                  </Badge>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {featuredImageSrc ? (
        <img
          src={featuredImageSrc}
          alt={post.title}
          className="w-full rounded-lg border border-border object-cover"
          fetchPriority="high"
          loading="eager"
        />
      ) : null}

      <PostContent html={contentHtml} />

      {tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <span className="text-sm font-medium text-muted-foreground">
            {lang === 'tr' ? 'Etiketler:' : 'Tags:'}
          </span>
          {tags.map((tag) => (
            <a key={tag.id} href={`${lp}/tag/${tag.slug}`}>
              <Badge variant="outline" className="hover:bg-accent">
                #{tag.name}
              </Badge>
            </a>
          ))}
        </div>
      ) : null}

      {showComments ? (
        <>
          <Separator className="my-4" />
          <CommentsSection
            postId={post.id}
            comments={comments}
            lang={lang}
            commentFormBootHtml={commentFormBootHtml}
            recaptchaScriptHtml={recaptchaScriptHtml}
          />
        </>
      ) : null}
    </article>
  );
}

interface CommentsSectionProps {
  postId: number;
  comments: PostCommentViewModel[];
  lang: string;
  commentFormBootHtml?: string;
  recaptchaScriptHtml?: string;
}

function CommentsSection({
  postId,
  comments,
  lang,
  commentFormBootHtml,
  recaptchaScriptHtml,
}: CommentsSectionProps) {
  return (
    <section className="flex flex-col gap-6">
      <h3 className="text-xl font-semibold">
        {lang === 'tr'
          ? `Yorumlar (${comments.length})`
          : `Comments (${comments.length})`}
      </h3>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {lang === 'tr' ? 'Henüz yorum yok.' : 'No comments yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {(c.author_name || 'A').charAt(0).toUpperCase()}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {c.author_name}
                  </span>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={c.created_at}
                  >
                    {formatCommentDate(c.created_at, lang)}
                  </time>
                </div>
              </div>
              <div
                className="text-sm text-foreground/90"
                dangerouslySetInnerHTML={{ __html: c.content }}
              />
            </li>
          ))}
        </ul>
      )}

      <CommentForm postId={postId} lang={lang} />

      {commentFormBootHtml ? (
        <div
          // Boot script carries closures around form elements — needs
          // to render after the form is in the DOM. React renders in
          // order, so this sibling script runs at parse time.
          dangerouslySetInnerHTML={{ __html: commentFormBootHtml }}
        />
      ) : null}
      {recaptchaScriptHtml ? (
        <div dangerouslySetInnerHTML={{ __html: recaptchaScriptHtml }} />
      ) : null}
    </section>
  );
}

function CommentForm({ postId, lang }: { postId: number; lang: string }) {
  const inputCls =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h4 className="mb-3 text-base font-semibold">
        {lang === 'tr' ? 'Yorum Yaz' : 'Leave a Comment'}
      </h4>
      <div
        className="comment-form-success mb-3 hidden rounded-md bg-green-100 px-3 py-2 text-sm text-green-800"
        role="status"
      />
      <div
        className="comment-form-error mb-3 hidden rounded-md bg-red-100 px-3 py-2 text-sm text-red-800"
        role="alert"
      />
      <form id="comment-form" data-post-id={String(postId)} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-foreground/80">
            {lang === 'tr' ? 'Adınız' : 'Name'} *
            <input type="text" name="author_name" required className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-foreground/80">
            {lang === 'tr' ? 'E-posta' : 'Email'}
            <input type="email" name="author_email" className={inputCls} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground/80">
          {lang === 'tr' ? 'Yorumunuz' : 'Comment'} *
          <textarea
            name="content"
            rows={4}
            required
            placeholder={
              lang === 'tr'
                ? 'Yorumunuzu buraya yazın...'
                : 'Write your comment here...'
            }
            className={inputCls}
          />
        </label>
        <div>
          <button
            type="submit"
            id="comment-submit-btn"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {lang === 'tr' ? 'Yorum Gönder' : 'Submit Comment'}
          </button>
        </div>
      </form>
    </div>
  );
}
