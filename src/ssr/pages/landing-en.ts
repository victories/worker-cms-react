import type { LandingConfig } from './Landing';

/**
 * English landing content.
 *
 * The Turkish landing is data-driven from the `landing_config` row in
 * `global_settings` (edited via the admin panel). There is no admin
 * editor for the English variant yet, so the global (English) audience
 * is served this static config. The shape matches the render schema in
 * `Landing.tsx` (`LandingConfig`): titles use `{...}` to mark the
 * amber-accented span (see `withAccent`). The brand stays "Worker CMS";
 * the operating company is COMPANY NAME LTD (shown in the footer).
 */
export const LANDING_EN: LandingConfig = {
  enabled: true,
  brand: {
    name: 'Worker CMS',
    tagline: 'The modern content platform that runs on the edge',
  },
  nav: {
    items: [
      { label: 'Features', url: '#features' },
      { label: 'Performance', url: '#architecture' },
      { label: 'AI Integration', url: '#mcp' },
      { label: 'Plugins', url: '#plugins' },
      { label: 'Pricing', url: '#pricing' },
    ],
    login_text: 'Log in',
    login_url: '/admin/login?lang=en',
    cta_text: 'Start free',
    cta_url: '/admin/register?lang=en',
  },
  hero: {
    badge: 'Edge-native CMS · 300+ locations · ~30ms p50',
    title: 'The freedom of WordPress, {at a tenth of a second}.',
    subtitle:
      'Worker CMS is a cloud content platform that runs unlimited sites from a single dashboard. {No configuration, no server management, no plugin conflicts} — just publish.',
    cta_text: 'Start free',
    cta_url: '#pricing',
    secondary_cta_text: 'Watch demo',
    secondary_cta_url: '#features',
    stats: [
      { value: '~30ms', label: 'Response time' },
      { value: '99.99%', label: 'Uptime' },
      { value: '∞', label: 'Sites' },
      { value: '300+', label: 'Edge locations' },
    ],
  },
  marquee: {
    items: [
      'Unlimited multi-site',
      'Built-in AI assistant',
      'Automatic AMP',
      'Full-text search built in',
      'Plugin sandbox',
      'Dual editor',
      'SEO analyzer',
      'Multilingual',
      '2FA + RBAC',
      'WordPress migration',
      'Server-side analytics',
      'Automatic backups',
    ],
  },
  architecture: {
    eyebrow: '[ 01 ] Performance',
    title: 'Served from {the location nearest} to your visitor.',
    intro:
      'Each page is generated on the server closest to the visitor. A request that takes 800ms on a single-server classic CMS completes in {30 milliseconds} on Worker CMS. No origin server, no cold starts, no waiting to scale.',
    bullets: [
      { text: 'Content and users isolated per domain' },
      { text: 'Built-in edge cache, purged automatically when content changes' },
      { text: 'Page-view logging never delays the response (runs in the background)' },
      { text: 'Streaming HTML — first byte under 50ms' },
    ],
  },
  features: {
    eyebrow: '[ 02 ] Features',
    title: 'Everything you expect from a CMS, {and then some}.',
    subtitle:
      'Manage unlimited sites from one account — each with its own domain, content, team and language.',
    items: [
      {
        icon: 'grid',
        title: 'Unlimited Multi-Site',
        desc: 'One account, unlimited independent sites. Each with its own domain, content, team and language. Manage them all from a single dashboard.',
      },
      {
        icon: 'pencil',
        title: 'Dual Editor + SEO',
        desc: 'A rich-text editor and a block editor, side by side. Per-post meta management, OpenGraph, a built-in SEO analyzer and automatic revision history.',
      },
      {
        icon: 'package',
        title: 'Plugin Sandbox',
        desc: 'A hook-based plugin system. Every plugin runs against a permission list; unauthorized operations are blocked automatically. WordPress plugin conflicts are history.',
      },
      {
        icon: 'bolt',
        title: 'Automatic AMP',
        desc: "Google's accelerated mobile format is one click away. Automatic image conversion, AMP analytics and a custom domain.",
      },
      {
        icon: 'search',
        title: 'Built-in Full-Text Search',
        desc: 'On-site search included. BM25 ranking: title 10x, excerpt 5x, content 1x weighted. No need for Algolia or Elasticsearch.',
      },
      {
        icon: 'zap',
        title: 'Smart Edge Cache',
        desc: 'Frequently visited pages are cached automatically. When content updates, the cache is purged automatically — no more manual purges.',
      },
    ],
  },
  mcp: {
    eyebrow: '[ 03 ] AI Integration',
    title: 'Hand your CMS {to AI}.',
    intro:
      'Worker CMS talks to AI assistants natively. Claude, Cursor or your own AI tool can author content, moderate comments and read analytics directly. {No more copy-paste workflow.}',
    stats: [
      { value: '20', text: 'ready-made tools: posts, media, taxonomy, comments, analytics' },
      { value: '∞', text: 'one account, valid across all your sites' },
      { value: '0', text: 'extra licenses, extra tools, extra monthly fees' },
    ],
  },
  plugins: {
    eyebrow: '[ 04 ] Extend',
    title: 'Plugins and {shortcodes}.',
    intro:
      'The built-in plugins handle 80% of the work out of the box. Shortcodes drop a gallery, slider, form or recent-posts list into any post with a single line.',
    items: [
      {
        icon: 'search',
        status: 'active',
        title: 'SEO Optimizer',
        desc: 'Automatic meta descriptions, title warnings, reading-time badge, OpenGraph tags.',
      },
      {
        icon: 'globe',
        status: 'active',
        title: 'Social Share',
        desc: 'Styled share buttons for 9 platforms. Added automatically below each post.',
      },
      {
        icon: 'msg',
        status: 'optional',
        title: 'Contact Form',
        desc: 'reCAPTCHA-protected form. Messages land in the admin panel and trigger an email notification.',
      },
      {
        icon: 'layers',
        status: 'optional',
        title: 'Hero Slider',
        desc: 'Autoplay, touch swipe, palette-matched styling.',
      },
    ],
    shortcodes: [
      { code: '[slider]', desc: 'image carousel' },
      { code: '[gallery]', desc: 'media grid' },
      { code: '[recent-posts]', desc: 'last n posts' },
      { code: '[contact-form]', desc: 'protected form' },
      { code: '[social-media]', desc: '9 platforms' },
      { code: '[search-form]', desc: 'on-site search' },
      { code: '[menu]', desc: 'navigation' },
      { code: '[custom-html]', desc: 'raw HTML' },
    ],
  },
  pricing: {
    eyebrow: '[ 05 ] Pricing',
    title: 'One price. {No surprises.}',
    subtitle:
      'Every plan includes the AI assistant, edge cache, plugin sandbox and unlimited page views.',
    plans: [
      {
        name: 'Starter',
        desc: 'For personal projects',
        price: 'Free',
        features: [
          '1 site, 1 domain',
          '2 team members',
          '5 GB media storage',
          'AI assistant (100 actions / month)',
          'All built-in plugins',
        ],
        cta_text: 'Get started',
        cta_url: '/admin/register?lang=en&plan=starter',
        highlighted: false,
      },
      {
        name: 'Pro',
        desc: 'For publishers and small teams',
        currency: '£',
        price: '29',
        period: '/ mo',
        features: [
          '10 sites, unlimited domains',
          'Unlimited team members',
          '100 GB media storage',
          'AI assistant (unlimited)',
          'WordPress migration assistant',
          'Priority support',
        ],
        cta_text: 'Go Pro',
        cta_url: '/admin/register?lang=en&plan=pro',
        highlighted: true,
      },
      {
        name: 'Enterprise',
        desc: 'For agencies and organizations',
        price: 'Custom',
        features: [
          'Unlimited sites',
          'SSO + SAML',
          'SLA guarantee (99.99%)',
          'Custom plugin development',
          'Dedicated account manager',
        ],
        cta_text: 'Talk to us',
        cta_url: '/legal/iletisim',
        highlighted: false,
        isEnterprise: true,
      },
    ],
  },
  cta: {
    title: 'Live in minutes.',
    subtitle: 'Create your first site in 60 seconds. No credit card required.',
    button_text: 'Create a free account',
    button_url: '/admin/register?lang=en',
  },
  footer: {
    description:
      'A modern, edge-native, multi-site content management platform. The freedom of WordPress, at the speed of modern software.',
    columns: [
      {
        title: 'Product',
        links: [
          { text: 'Features', url: '#features' },
          { text: 'Performance', url: '#architecture' },
          { text: 'AI Integration', url: '#mcp' },
          { text: 'Plugins', url: '#plugins' },
          { text: 'Pricing', url: '#pricing' },
        ],
      },
      {
        title: 'Company',
        links: [
          { text: 'Contact', url: '/legal/iletisim' },
          { text: 'System status', url: '/legal/durum' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { text: 'Privacy', url: '/legal/gizlilik' },
          { text: 'Terms of Service', url: '/legal/kullanim-kosullari' },
          { text: 'Terms of Sale', url: '/legal/mesafeli-satis-sozlesmesi' },
          { text: 'Refund Policy', url: '/legal/iade-politikasi' },
          { text: 'Cookie Policy', url: '/legal/cerez-politikasi' },
        ],
      },
    ],
    text: '© 2026 COMPANY NAME LTD',
  },
};
