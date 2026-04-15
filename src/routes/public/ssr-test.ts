import { Hono } from 'hono';
import { createElement } from 'react';
import type { Bindings, Variables } from '../../types';
import { renderPage } from '../../lib/ssr';
import { Shell, DEFAULT_THEME_BOOT } from '../../ssr/shell';
import { PublisherLayout } from '../../ssr/layouts/PublisherLayout';
import { PostCard } from '../../ssr/components/PostCard';
import { Pagination } from '../../ssr/components/Pagination';
import { SEOHead } from '../../ssr/components/SEOHead';
import type { PublicPost, SidebarData } from '../../lib/public-db';
import type { NavMenuItem } from '@ui/nav-menu';

/**
 * Faz 2 SSR smoke test.
 *
 * Renders a full `<Shell><PublisherLayout>...</PublisherLayout></Shell>`
 * tree using mock data — no DB hits. Lets us verify in one page that:
 *
 *   - Shell emits a valid HTML document with inlined Tailwind + theme-boot
 *   - PublisherLayout renders Header, main grid, optional Sidebar, Footer
 *   - NavMenu, PostCard, Pagination, WidgetRenderer, Footer widgets
 *     all render with shadcn tokens
 *   - Islands (ThemeToggle, MobileDrawer, SearchOverlay) emit their
 *     `data-island` wrappers + adjacent JSON data scripts
 *
 * This file replaces the minimal Faz 0 smoke test. The /ssr-test route
 * stays hand-written on mock data through Faz 2–4; it's deleted in
 * Faz 8 alongside the other migration scaffolding.
 *
 * The handler is plain `.ts` (createElement, not JSX) so we don't need
 * to pick between `hono/jsx` and `react` pragmas at the file level.
 */

const ssrTest = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ── Mock data ────────────────────────────────────────────────────────

const navItems: NavMenuItem[] = [
  { id: 1, parent_id: null, title: 'Home', url: '/', target: null, css_class: null },
  { id: 2, parent_id: null, title: 'Articles', url: '/category/articles', target: null, css_class: null },
  { id: 3, parent_id: null, title: 'About', url: '/page/about', target: null, css_class: null },
  { id: 4, parent_id: null, title: 'Contact', url: '/page/contact', target: null, css_class: null },
];

function mockPost(id: number, title: string, excerpt: string): PublicPost {
  return {
    id,
    title,
    slug: `post-${id}`,
    content: null,
    excerpt,
    status: 'publish',
    post_type: 'post',
    language: 'tr',
    featured_image_id: null,
    comment_status: 'open',
    is_sticky: 0,
    seo_title: null,
    seo_description: null,
    seo_keywords: null,
    og_image_r2_key: null,
    amp_enabled: 0,
    published_at: new Date(2026, 3, 10 + id).toISOString(),
    created_at: new Date(2026, 3, 10 + id).toISOString(),
    author_name: 'Mock Author',
    author_email: null,
    featured_image_url: null,
  };
}

const posts: PublicPost[] = [
  mockPost(1, 'React 19 ile Worker CMS modernizasyonu', 'Hono JSX layout katmanını React Server Component odaklı bir SSR yapısına taşıyoruz.'),
  mockPost(2, 'shadcn tokenlarıyla tutarlı tema sistemi', 'Publisher ve admin aynı HSL token katmanını paylaşıyor — renk ve radius tek yerden kontrol ediliyor.'),
  mockPost(3, 'Faz 2: Shell ve layout iskeleti', 'Bu sayfa mock veriyle tam layout render ediyor; gerçek route\'lar Faz 4\'te bağlanacak.'),
];

const sidebarData: SidebarData = {
  widgets: [
    {
      id: 101,
      widget_type: 'categories',
      title: 'Kategoriler',
      config: null,
      position: 1,
    },
    {
      id: 102,
      widget_type: 'recent_posts',
      title: 'Son Yazılar',
      config: null,
      position: 2,
    },
    {
      id: 103,
      widget_type: 'tags',
      title: 'Etiketler',
      config: null,
      position: 3,
    },
  ],
  footerWidgets: {
    'footer-1': [
      { id: 201, widget_type: 'text', title: 'Hakkımızda', config: JSON.stringify({ content: 'Worker CMS — Cloudflare tabanlı modern yayıncılık motoru.' }), position: 1 },
    ],
    'footer-2': [
      { id: 202, widget_type: 'categories', title: 'Kategoriler', config: null, position: 1 },
    ],
    'footer-3': [
      { id: 203, widget_type: 'recent_posts', title: 'Popüler', config: null, position: 1 },
    ],
    'footer-4': [],
  },
  headerWidgets: [],
  sliderWidgets: [],
  categories: [
    { id: 1, name: 'Mimari', slug: 'mimari', type: 'category', description: null, count: 12 },
    { id: 2, name: 'Dağıtım', slug: 'dagitim', type: 'category', description: null, count: 8 },
    { id: 3, name: 'Performans', slug: 'performans', type: 'category', description: null, count: 5 },
  ],
  recentPosts: posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    published_at: p.published_at,
  })),
  tags: [
    { id: 10, name: 'react', slug: 'react', type: 'post_tag', description: null, count: 9 },
    { id: 11, name: 'ssr', slug: 'ssr', type: 'post_tag', description: null, count: 4 },
    { id: 12, name: 'cloudflare', slug: 'cloudflare', type: 'post_tag', description: null, count: 7 },
    { id: 13, name: 'shadcn', slug: 'shadcn', type: 'post_tag', description: null, count: 3 },
  ],
  menus: {},
};

// ── Route handler ────────────────────────────────────────────────────

ssrTest.get('/ssr-test', () => {
  const lang = 'tr';
  const lp = '';
  const siteId = 1;

  const page = createElement(
    'div',
    { className: 'flex flex-col gap-8' },
    createElement(
      'header',
      { className: 'flex flex-col gap-3' },
      createElement(
        'p',
        {
          className:
            'inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1 text-xs font-medium text-muted-foreground',
        },
        createElement('span', {
          className: 'size-2 animate-pulse rounded-full bg-primary',
        }),
        'Faz 2 — PublisherLayout smoke test'
      ),
      createElement(
        'h1',
        { className: 'text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl' },
        'Son Yazılar'
      ),
      createElement(
        'p',
        { className: 'max-w-2xl text-muted-foreground' },
        'Bu sayfa mock veriyle üretildi. Header, ana içerik, sidebar ve footer Faz 2 layout iskeleti üzerinden render ediliyor.'
      )
    ),
    createElement(
      'div',
      { className: 'grid grid-cols-1 gap-6 md:grid-cols-2' },
      ...posts.map((post, idx) =>
        createElement(PostCard, {
          key: post.id,
          post,
          lang,
          lp,
          siteId,
          isLCP: idx === 0,
        })
      )
    ),
    createElement(Pagination, {
      currentPage: 1,
      totalPages: 5,
      baseUrl: '/',
      lang,
    })
  );

  const seoHead = createElement(SEOHead, {
    title: 'SSR Test',
    description: 'Faz 2 React SSR — Shell + PublisherLayout smoke test',
    siteName: 'wp-cms-v2',
    lang,
    ogType: 'website',
  });

  const layout = createElement(PublisherLayout, {
    siteName: 'wp-cms-v2',
    lang,
    lp,
    navItems,
    sidebarData,
    supportsDarkMode: true,
    showSidebar: true,
    children: page,
  });

  return renderPage(
    createElement(Shell, {
      lang,
      themeBootScript: DEFAULT_THEME_BOOT,
      head: seoHead,
      children: layout,
    })
  );
});

export default ssrTest;
