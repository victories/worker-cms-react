/** @jsxImportSource react */
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Badge } from '@ui/badge';
import { cn } from '@ui/lib/utils';
import type {
  PublicTaxonomy,
  SidebarData,
  SidebarWidget,
} from '../../lib/public-db';
import { MenuRenderer } from './MenuRenderer';

/**
 * WidgetRenderer — switch on `widget_type` and render the matching body.
 *
 * Widgets are row entries in the `widgets` table (area = sidebar,
 * footer-N, header, slider). The CMS admin lets users reorder and
 * configure them; the frontend renders each one into its configured
 * area. This is the React port of `src/components/WidgetRenderer.tsx`.
 *
 * Rules:
 * - Returns `null` (not an empty wrapper) when a widget has nothing to
 *   show. This lets callers do `widgets.map(w => <WidgetRenderer.../>)`
 *   without leaving phantom gaps.
 * - Presentation wrapper is a shadcn `<Card>` so all widgets pick up the
 *   same border/shadow/background tokens. Sidebar and footer columns
 *   can override by passing `variant="bare"` which drops the card chrome
 *   (useful for footer columns that are already grouped visually).
 * - `lp` (lang prefix) is computed once in the caller (PublisherLayout)
 *   and threaded down so link hrefs respect the current locale.
 */

export interface WidgetRendererProps {
  widget: SidebarWidget;
  sidebarData: SidebarData | undefined;
  lang: string;
  /** Result of `langPrefix(lang, defaultLang)` — '' or '/en' etc. */
  lp: string;
  /** 'card' = wrap in shadcn Card, 'bare' = just the body (footer cols) */
  variant?: 'card' | 'bare';
  className?: string;
}

interface WidgetConfig {
  content?: string;
  text?: string;
  menu_slug?: string;
  style?: 'yatay' | 'dikey' | 'horizontal' | 'vertical';
}

function parseConfig(raw: string | null): WidgetConfig {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as WidgetConfig;
  } catch {
    return {};
  }
}

function Wrapper({
  title,
  variant,
  className,
  children,
}: {
  title?: string | null;
  variant: 'card' | 'bare';
  className?: string;
  children: ReactNode;
}) {
  if (variant === 'bare') {
    return (
      <div className={cn('space-y-3', className)}>
        {title ? (
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h3>
        ) : null}
        {children}
      </div>
    );
  }
  return (
    <Card className={className}>
      {title ? (
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={cn(title ? 'pt-0' : 'pt-6')}>
        {children}
      </CardContent>
    </Card>
  );
}

export function WidgetRenderer({
  widget,
  sidebarData,
  lang,
  lp,
  variant = 'card',
  className,
}: WidgetRendererProps) {
  const config = parseConfig(widget.config);

  // ── categories ────────────────────────────────────────────────────
  if (widget.widget_type === 'categories' && sidebarData && sidebarData.categories.length > 0) {
    const label = widget.title || (lang === 'tr' ? 'Kategoriler' : 'Categories');
    return (
      <Wrapper title={label} variant={variant} className={className}>
        <ul className="flex flex-col divide-y divide-border text-sm">
          {sidebarData.categories.map((cat: PublicTaxonomy) => (
            <li key={cat.id} className="py-2 first:pt-0 last:pb-0">
              <a
                href={`${lp}/category/${cat.slug}`}
                className="flex items-center justify-between text-foreground/80 transition-colors hover:text-primary"
              >
                <span>{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.count}</span>
              </a>
            </li>
          ))}
        </ul>
      </Wrapper>
    );
  }

  // ── recent_posts ──────────────────────────────────────────────────
  if (widget.widget_type === 'recent_posts' && sidebarData && sidebarData.recentPosts.length > 0) {
    const label = widget.title || (lang === 'tr' ? 'Son Yazılar' : 'Recent Posts');
    return (
      <Wrapper title={label} variant={variant} className={className}>
        <ul className="flex flex-col divide-y divide-border text-sm">
          {sidebarData.recentPosts.map((p) => (
            <li key={p.id} className="py-2 first:pt-0 last:pb-0">
              <a
                href={`${lp}/${p.slug}`}
                className="text-foreground/80 transition-colors hover:text-primary line-clamp-2"
              >
                {p.title}
              </a>
            </li>
          ))}
        </ul>
      </Wrapper>
    );
  }

  // ── tags ──────────────────────────────────────────────────────────
  if (widget.widget_type === 'tags' && sidebarData && sidebarData.tags.length > 0) {
    const label = widget.title || (lang === 'tr' ? 'Etiketler' : 'Tags');
    return (
      <Wrapper title={label} variant={variant} className={className}>
        <div className="flex flex-wrap gap-2">
          {sidebarData.tags.map((tag: PublicTaxonomy) => (
            <a key={tag.id} href={`${lp}/tag/${tag.slug}`}>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {tag.name}
              </Badge>
            </a>
          ))}
        </div>
      </Wrapper>
    );
  }

  // ── text ──────────────────────────────────────────────────────────
  if (widget.widget_type === 'text') {
    const body = config.content || config.text || '';
    if (!body) return null;
    return (
      <Wrapper title={widget.title} variant={variant} className={className}>
        <div
          className="text-sm text-foreground/80 [&_a]:text-primary [&_a:hover]:text-primary/80"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </Wrapper>
    );
  }

  // ── menu ──────────────────────────────────────────────────────────
  if (widget.widget_type === 'menu' && sidebarData?.menus) {
    const menuSlug = config.menu_slug;
    if (!menuSlug) return null;
    const menuData = sidebarData.menus[menuSlug];
    if (!menuData || menuData.items.length === 0) return null;
    const orientation =
      config.style === 'yatay' || config.style === 'horizontal'
        ? 'horizontal'
        : 'vertical';
    return (
      <Wrapper title={widget.title} variant={variant} className={className}>
        <MenuRenderer items={menuData.items} orientation={orientation} />
      </Wrapper>
    );
  }

  return null;
}
