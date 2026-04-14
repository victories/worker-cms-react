// Theme Presets — 8 system themes for the theme marketplace
// These definitions are the source of truth; the SQL seed migration mirrors them.

export interface ThemeCssVariables {
  primary_color: string;
  secondary_color: string;
  bg_color: string;
  surface_color: string;
  text_color: string;
  text_secondary_color: string;
  border_color: string;
  header_bg_color: string;
  header_text_color: string;
  footer_bg_color: string;
  footer_text_color: string;
  link_color: string;
  link_hover_color: string;
  font_family: string;
  heading_font_family: string;
}

export interface ThemeLayoutConfig {
  header_style: string;
  sidebar_position: string;
  sidebar_enabled: boolean;
  footer_style: string;
  post_card_style: string;
  post_card_columns: number;
  show_featured_image: boolean;
  show_author: boolean;
  show_date: boolean;
  show_excerpt: boolean;
  content_max_width: string;
  nav_style: string;
  posts_per_page: number;
  /** Optional raw HTML or shortcode ([name]) rendered at the top ad slot.
   *  Empty string / undefined hides the slot entirely. */
  ad_top_code?: string;
  /** Optional raw HTML or shortcode ([name]) rendered at the mid ad slot. */
  ad_mid_code?: string;
}

/**
 * A named palette variant. A theme can declare multiple palette_variants so
 * admins can swap the entire color scheme without editing individual CSS
 * variables. Each variant provides a complete set of overrides for light and
 * dark mode which are merged on top of the theme's base css_variables.
 */
export interface PaletteVariant {
  slug: string;
  name: string;
  description?: string;
  light: Partial<ThemeCssVariables>;
  dark: Partial<ThemeCssVariables>;
}

export interface ThemePreset {
  name: string;
  slug: string;
  description: string;
  version: string;
  author: string;
  css_variables: ThemeCssVariables;
  layout_config: ThemeLayoutConfig;
  google_fonts: string[];
  is_system: true;
  /** Optional list of swappable color palettes. If present, the theme
   *  supports palette selection (and light/dark switching) from the admin. */
  palette_variants?: PaletteVariant[];
  /** Declares that the theme is designed to render in both light and dark
   *  modes. Themes without this flag are treated as single-mode. */
  supports_dark_mode?: boolean;
  /** Optional slug of the default palette variant. Falls back to the first
   *  entry in palette_variants if omitted. */
  default_palette?: string;
}

// ---------------------------------------------------------------------------
// Default layout config shared across themes (overridden per-theme as needed)
// ---------------------------------------------------------------------------
const DEFAULT_LAYOUT: ThemeLayoutConfig = {
  header_style: 'standard',
  sidebar_position: 'right',
  sidebar_enabled: true,
  footer_style: 'three-column',
  post_card_style: 'card',
  post_card_columns: 1,
  show_featured_image: true,
  show_author: true,
  show_date: true,
  show_excerpt: true,
  content_max_width: '1200px',
  nav_style: 'default',
  posts_per_page: 10,
};

// ---------------------------------------------------------------------------
// 8 System Themes
// ---------------------------------------------------------------------------

export const SYSTEM_THEMES: ThemePreset[] = [
  // 1. Starter
  {
    name: 'Starter',
    slug: 'starter',
    description: 'A clean, versatile theme with a white background and blue accent, perfect for getting started quickly.',
    version: '1.0.0',
    author: 'System',
    css_variables: {
      primary_color: '#2563eb',
      secondary_color: '#10b981',
      bg_color: '#f8fafc',
      surface_color: '#ffffff',
      text_color: '#1e293b',
      text_secondary_color: '#64748b',
      border_color: '#e2e8f0',
      header_bg_color: '#ffffff',
      header_text_color: '#0f172a',
      footer_bg_color: '#0f172a',
      footer_text_color: '#94a3b8',
      link_color: '#2563eb',
      link_hover_color: '#1d4ed8',
      font_family: 'Inter',
      heading_font_family: 'Inter',
    },
    layout_config: {
      ...DEFAULT_LAYOUT,
    },
    google_fonts: ['Inter:400,500,600,700'],
    is_system: true,
  },

  // 2. Modern
  {
    name: 'Modern',
    slug: 'modern',
    description: 'A sophisticated theme with stone tones, teal accents, and elegant serif headings.',
    version: '1.0.0',
    author: 'System',
    css_variables: {
      primary_color: '#0d9488',
      secondary_color: '#f59e0b',
      bg_color: '#fafaf9',
      surface_color: '#ffffff',
      text_color: '#292524',
      text_secondary_color: '#78716c',
      border_color: '#e7e5e4',
      header_bg_color: '#1c1917',
      header_text_color: '#fafaf9',
      footer_bg_color: '#1c1917',
      footer_text_color: '#a8a29e',
      link_color: '#0d9488',
      link_hover_color: '#0f766e',
      font_family: 'DM Sans',
      heading_font_family: 'Playfair Display',
    },
    layout_config: {
      ...DEFAULT_LAYOUT,
      nav_style: 'underline',
    },
    google_fonts: ['DM Sans:400,500,700', 'Playfair Display:400,700'],
    is_system: true,
  },

  // 3. Velvet
  {
    name: 'Velvet',
    slug: 'velvet',
    description: 'A dark, luxurious theme with purple and pink accents for a bold editorial look.',
    version: '1.0.0',
    author: 'System',
    css_variables: {
      primary_color: '#b9a9f5',
      secondary_color: '#f5a9c7',
      bg_color: '#13111a',
      surface_color: '#1d1b26',
      text_color: '#e8e4f0',
      text_secondary_color: '#9892b3',
      border_color: '#2e2b40',
      header_bg_color: '#0e0c17',
      header_text_color: '#e8e4f0',
      footer_bg_color: '#0e0c17',
      footer_text_color: '#9892b3',
      link_color: '#b9a9f5',
      link_hover_color: '#d4c8fa',
      font_family: 'Plus Jakarta Sans',
      heading_font_family: 'Outfit',
    },
    layout_config: {
      ...DEFAULT_LAYOUT,
      nav_style: 'underline',
    },
    google_fonts: ['Plus Jakarta Sans:400,500,600,700', 'Outfit:400,500,600,700'],
    is_system: true,
  },

  // 4. Developer
  {
    name: 'Developer',
    slug: 'developer',
    description: 'A dark, code-inspired theme with monospace fonts and a green accent for technical blogs.',
    version: '1.0.0',
    author: 'System',
    css_variables: {
      primary_color: '#39d353',
      secondary_color: '#f0883e',
      bg_color: '#0d1117',
      surface_color: '#161b22',
      text_color: '#c9d1d9',
      text_secondary_color: '#8b949e',
      border_color: '#30363d',
      header_bg_color: '#010409',
      header_text_color: '#f0f6fc',
      footer_bg_color: '#010409',
      footer_text_color: '#8b949e',
      link_color: '#58a6ff',
      link_hover_color: '#79c0ff',
      font_family: 'JetBrains Mono',
      heading_font_family: 'Fira Code',
    },
    layout_config: {
      ...DEFAULT_LAYOUT,
      header_style: 'minimal',
      sidebar_enabled: false,
      footer_style: 'simple',
      nav_style: 'default',
    },
    google_fonts: ['JetBrains Mono:400,500,700', 'Fira Code:400,500'],
    is_system: true,
  },

  // 5. Magazine
  {
    name: 'Magazine',
    slug: 'magazine',
    description: 'A warm, editorial theme with serif typography and a two-column card layout for news and magazine sites.',
    version: '1.0.0',
    author: 'System',
    css_variables: {
      primary_color: '#991b1b',
      secondary_color: '#b91c1c',
      bg_color: '#fef9f3',
      surface_color: '#ffffff',
      text_color: '#1c1917',
      text_secondary_color: '#57534e',
      border_color: '#d6d3d1',
      header_bg_color: '#fef9f3',
      header_text_color: '#1c1917',
      footer_bg_color: '#292524',
      footer_text_color: '#a8a29e',
      link_color: '#991b1b',
      link_hover_color: '#7f1d1d',
      font_family: 'Source Serif Pro',
      heading_font_family: 'Cormorant Garamond',
    },
    layout_config: {
      ...DEFAULT_LAYOUT,
      header_style: 'centered',
      post_card_columns: 2,
    },
    google_fonts: ['Cormorant Garamond:400,500,600,700', 'Source Serif Pro:400,600'],
    is_system: true,
  },

  // 6. Minimal
  {
    name: 'Minimal',
    slug: 'minimal',
    description: 'A distraction-free theme with generous whitespace and understated gray accents.',
    version: '1.0.0',
    author: 'System',
    css_variables: {
      primary_color: '#6b7280',
      secondary_color: '#9ca3af',
      bg_color: '#ffffff',
      surface_color: '#f9fafb',
      text_color: '#111827',
      text_secondary_color: '#6b7280',
      border_color: '#e5e7eb',
      header_bg_color: '#ffffff',
      header_text_color: '#111827',
      footer_bg_color: '#f9fafb',
      footer_text_color: '#6b7280',
      link_color: '#4b5563',
      link_hover_color: '#1f2937',
      font_family: 'Inter',
      heading_font_family: 'Lora',
    },
    layout_config: {
      ...DEFAULT_LAYOUT,
      header_style: 'minimal',
      sidebar_enabled: false,
      footer_style: 'simple',
      content_max_width: '960px',
    },
    google_fonts: ['Lora:400,500,600,700', 'Inter:400,500,600'],
    is_system: true,
  },

  // 7. Corporate
  {
    name: 'Corporate',
    slug: 'corporate',
    description: 'A professional theme with a navy palette and clean Roboto typography for business websites.',
    version: '1.0.0',
    author: 'System',
    css_variables: {
      primary_color: '#1e3a5f',
      secondary_color: '#3b82f6',
      bg_color: '#f1f5f9',
      surface_color: '#ffffff',
      text_color: '#0f172a',
      text_secondary_color: '#475569',
      border_color: '#cbd5e1',
      header_bg_color: '#1e3a5f',
      header_text_color: '#f8fafc',
      footer_bg_color: '#0f172a',
      footer_text_color: '#94a3b8',
      link_color: '#1e3a5f',
      link_hover_color: '#1e40af',
      font_family: 'Roboto',
      heading_font_family: 'Roboto',
    },
    layout_config: {
      ...DEFAULT_LAYOUT,
    },
    google_fonts: ['Roboto:400,500,700'],
    is_system: true,
  },

  // 8. Creative
  {
    name: 'Creative',
    slug: 'creative',
    description: 'A vibrant theme with orange accents and a three-column card grid for portfolios and creative agencies.',
    version: '1.0.0',
    author: 'System',
    css_variables: {
      primary_color: '#f97316',
      secondary_color: '#fb923c',
      bg_color: '#ffffff',
      surface_color: '#fff7ed',
      text_color: '#1c1917',
      text_secondary_color: '#78716c',
      border_color: '#fed7aa',
      header_bg_color: '#ffffff',
      header_text_color: '#1c1917',
      footer_bg_color: '#431407',
      footer_text_color: '#fdba74',
      link_color: '#f97316',
      link_hover_color: '#ea580c',
      font_family: 'Montserrat',
      heading_font_family: 'Poppins',
    },
    layout_config: {
      ...DEFAULT_LAYOUT,
      header_style: 'centered',
      sidebar_enabled: false,
      footer_style: 'simple',
      post_card_columns: 3,
      content_max_width: '1400px',
    },
    google_fonts: ['Poppins:400,500,600,700,800', 'Montserrat:400,500,600'],
    is_system: true,
  },

  // 9. Publisher — editorial theme with swappable pastel palettes + dark mode
  {
    name: 'Publisher',
    slug: 'publisher',
    description: 'A premium editorial theme with a dashboard sidebar, ad slots, 4 swappable pastel palettes, and built-in dark mode.',
    version: '1.0.0',
    author: 'System',
    // Base variables mirror the default (Lavender / Light) palette. The
    // themeEngine layers palette_variants + user overrides on top of these.
    css_variables: {
      primary_color: '#8B7AB5',
      secondary_color: '#B9A7DB',
      bg_color: '#F0EBF5',
      surface_color: '#FFFFFF',
      text_color: '#2C2533',
      text_secondary_color: '#6B6378',
      border_color: '#E5DEF0',
      header_bg_color: '#FFFFFF',
      header_text_color: '#2C2533',
      footer_bg_color: '#F5F2F8',
      footer_text_color: '#6B6378',
      link_color: '#8B7AB5',
      link_hover_color: '#6D5C94',
      font_family: 'Plus Jakarta Sans',
      heading_font_family: 'Playfair Display',
    },
    layout_config: {
      ...DEFAULT_LAYOUT,
      header_style: 'standard',
      sidebar_position: 'right',
      sidebar_enabled: true,
      footer_style: 'four-column',
      post_card_style: 'card',
      post_card_columns: 1,
      content_max_width: '1400px',
      nav_style: 'default',
    },
    google_fonts: [
      'Plus Jakarta Sans:400,500,600,700',
      'Playfair Display:400,500,600,700',
    ],
    is_system: true,
    supports_dark_mode: true,
    default_palette: 'lavender',
    palette_variants: [
      // ── Soft Lavender ────────────────────────────────────────────────────
      {
        slug: 'lavender',
        name: 'Soft Lavender',
        description: 'Muted lavender-plum on a warm pastel background.',
        light: {
          primary_color: '#8B7AB5',
          secondary_color: '#B9A7DB',
          bg_color: '#F0EBF5',
          surface_color: '#FFFFFF',
          text_color: '#2C2533',
          text_secondary_color: '#6B6378',
          border_color: '#E5DEF0',
          header_bg_color: '#FFFFFF',
          header_text_color: '#2C2533',
          footer_bg_color: '#F5F2F8',
          footer_text_color: '#6B6378',
          link_color: '#8B7AB5',
          link_hover_color: '#6D5C94',
        },
        dark: {
          primary_color: '#B9A7DB',
          secondary_color: '#D4C8F0',
          bg_color: '#1A1620',
          surface_color: '#241F2C',
          text_color: '#F0EBF5',
          text_secondary_color: '#9F95B3',
          border_color: '#2E2838',
          header_bg_color: '#1F1A28',
          header_text_color: '#F0EBF5',
          footer_bg_color: '#16121C',
          footer_text_color: '#9F95B3',
          link_color: '#B9A7DB',
          link_hover_color: '#D4C8F0',
        },
      },
      // ── Soft Blush ───────────────────────────────────────────────────────
      {
        slug: 'blush',
        name: 'Soft Blush',
        description: 'Dusty rose on a warm pink-cream background.',
        light: {
          primary_color: '#B07080',
          secondary_color: '#D99BA8',
          bg_color: '#F7EDEF',
          surface_color: '#FFFFFF',
          text_color: '#2D1F23',
          text_secondary_color: '#76656A',
          border_color: '#F0DEE2',
          header_bg_color: '#FFFFFF',
          header_text_color: '#2D1F23',
          footer_bg_color: '#FAF3F5',
          footer_text_color: '#76656A',
          link_color: '#B07080',
          link_hover_color: '#8E5866',
        },
        dark: {
          primary_color: '#D99BA8',
          secondary_color: '#EDBFC9',
          bg_color: '#1C1518',
          surface_color: '#261C21',
          text_color: '#F7EDEF',
          text_secondary_color: '#B09CA1',
          border_color: '#33262B',
          header_bg_color: '#231A1E',
          header_text_color: '#F7EDEF',
          footer_bg_color: '#181114',
          footer_text_color: '#B09CA1',
          link_color: '#D99BA8',
          link_hover_color: '#EDBFC9',
        },
      },
      // ── Warm Cream ───────────────────────────────────────────────────────
      {
        slug: 'cream',
        name: 'Warm Cream',
        description: 'Neutral warm beige accents on a cream background.',
        light: {
          primary_color: '#8B7355',
          secondary_color: '#C4A57A',
          bg_color: '#F7F2E8',
          surface_color: '#FFFFFF',
          text_color: '#2B241B',
          text_secondary_color: '#76695A',
          border_color: '#EDE4D0',
          header_bg_color: '#FFFFFF',
          header_text_color: '#2B241B',
          footer_bg_color: '#FAF6ED',
          footer_text_color: '#76695A',
          link_color: '#8B7355',
          link_hover_color: '#6B573F',
        },
        dark: {
          primary_color: '#C4A57A',
          secondary_color: '#D8BC91',
          bg_color: '#1A1714',
          surface_color: '#25201A',
          text_color: '#F7F2E8',
          text_secondary_color: '#B0A893',
          border_color: '#332D24',
          header_bg_color: '#211D18',
          header_text_color: '#F7F2E8',
          footer_bg_color: '#15120F',
          footer_text_color: '#B0A893',
          link_color: '#C4A57A',
          link_hover_color: '#D8BC91',
        },
      },
      // ── Soft Periwinkle ──────────────────────────────────────────────────
      {
        slug: 'periwinkle',
        name: 'Soft Periwinkle',
        description: 'Cool pastel lavender-blue accents on a breezy background.',
        light: {
          primary_color: '#6B7BB5',
          secondary_color: '#9FB0E5',
          bg_color: '#EBEEF8',
          surface_color: '#FFFFFF',
          text_color: '#1E2233',
          text_secondary_color: '#616B87',
          border_color: '#D9DEF0',
          header_bg_color: '#FFFFFF',
          header_text_color: '#1E2233',
          footer_bg_color: '#F1F4FA',
          footer_text_color: '#616B87',
          link_color: '#6B7BB5',
          link_hover_color: '#4E5E94',
        },
        dark: {
          primary_color: '#9FB0E5',
          secondary_color: '#C2CFEF',
          bg_color: '#161822',
          surface_color: '#20232F',
          text_color: '#EBEEF8',
          text_secondary_color: '#9BA3BE',
          border_color: '#2A2D3C',
          header_bg_color: '#1B1D28',
          header_text_color: '#EBEEF8',
          footer_bg_color: '#12141C',
          footer_text_color: '#9BA3BE',
          link_color: '#9FB0E5',
          link_hover_color: '#C2CFEF',
        },
      },
    ],
  },
];
