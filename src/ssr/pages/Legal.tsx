import { PostContent } from '../components/PostContent';
import { Container } from '@ui/container';

export interface LegalProps {
  title: string;
  description?: string;
  contentHtml: string;
  brandName: string;
}

/**
 * Legal/policy page (privacy, terms, KVKK, distance sales agreement, etc).
 *
 * Rendered by `/legal/:slug` for every site. Content comes from
 * `src/lib/legal-pages.ts`, with `{{brand}}` placeholders replaced by
 * the resolved site brand name at request time.
 */
export function Legal({ title, description, contentHtml, brandName }: LegalProps) {
  return (
    <main className="py-12">
      <Container size="lg">
        <article className="mx-auto flex max-w-3xl flex-col gap-6">
          <header className="flex flex-col gap-3 border-b border-border/40 pb-6">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {brandName}
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="text-lg text-muted-foreground">{description}</p>
            ) : null}
          </header>

          <PostContent html={contentHtml} />
        </article>
      </Container>
    </main>
  );
}
