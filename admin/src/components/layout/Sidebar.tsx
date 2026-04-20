import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { t } from '@/lib/i18n';
import { cn } from '@ui/lib/utils';
import { SiteSwitcher } from './SiteSwitcher';
import { Separator } from '@ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ui/tooltip';
import {
  LayoutDashboard, FileText, Image, FolderTree, Tag, MessageSquare, Mail,
  Menu, Users, Settings, Plug, Globe, BarChart3, Upload, Database, LayoutGrid,
  Key, Shield, Zap, X, ChevronDown, Paintbrush, Code, ArrowRightLeft, Link2,
  Rocket, Crown, Package, CreditCard, Sparkles, Bot,
} from 'lucide-react';

// Simple nav items (not in accordion groups)
interface NavItem {
  key: string;
  href: string;
  icon: any;
  roles?: string[];
}

// Accordion group
interface NavGroup {
  key: string;
  icon: any;
  roles?: string[];
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

// Navigation structure with the requested ordering:
// Dashboard → Sites (2nd) → Posts → Pages → Media → Categories → Tags → Comments
// → Appearance (accordion: Menus, Widgets)
// → Users → Analytics → Plugins → Import → Backup
// → Settings (accordion: Site Settings, AMP, API Keys, 2FA)
const navStructure: NavEntry[] = [
  { key: 'nav.dashboard', href: '/', icon: LayoutDashboard },
  // Content group (İçerik)
  {
    key: 'nav.content',
    icon: FileText,
    children: [
      { key: 'nav.posts', href: '/posts', icon: FileText },
      { key: 'nav.pages', href: '/pages', icon: FileText },
      { key: 'nav.media', href: '/media', icon: Image },
      { key: 'nav.categories', href: '/categories', icon: FolderTree },
      { key: 'nav.tags', href: '/tags', icon: Tag },
      { key: 'nav.comments', href: '/comments', icon: MessageSquare },
    ],
  },
  { key: 'nav.messages', href: '/messages', icon: Mail },
  // Appearance group (Görünüm)
  {
    key: 'nav.appearance',
    icon: Paintbrush,
    roles: ['admin', 'super_admin'],
    children: [
      { key: 'nav.design', href: '/design', icon: Paintbrush },
      { key: 'nav.layout', href: '/design/layout', icon: LayoutGrid },
      { key: 'nav.menus', href: '/menus', icon: Menu },
    ],
  },
  { key: 'nav.users', href: '/users', icon: Users, roles: ['admin', 'super_admin'] },
  { key: 'nav.analytics', href: '/analytics', icon: BarChart3 },
  { key: 'nav.contety', href: '/contety', icon: Sparkles, roles: ['admin', 'super_admin'] },
  { key: 'nav.cmshub_bot', href: '/cmshub-bot', icon: Bot, roles: ['admin', 'super_admin'] },
  { key: 'nav.payments', href: '/payments', icon: CreditCard, roles: ['super_admin'] },
  // Settings group (Ayarlar)
  {
    key: 'nav.settings',
    icon: Settings,
    roles: ['admin', 'super_admin'],
    children: [
      { key: 'nav.site_settings', href: '/settings', icon: Settings },
      { key: 'nav.content_types', href: '/content-types', icon: Package },
      { key: 'nav.shortcodes', href: '/shortcodes', icon: Code },
      { key: 'nav.plugins', href: '/plugins', icon: Plug },
      { key: 'nav.import', href: '/tools/import', icon: Upload },
      { key: 'nav.redirects', href: '/settings/redirects', icon: ArrowRightLeft },
      { key: 'nav.short_urls', href: '/short-urls', icon: Link2, roles: ['super_admin'] },
      { key: 'nav.amp', href: '/settings/amp', icon: Zap },
      { key: 'nav.api_keys', href: '/settings/api-keys', icon: Key },
      { key: 'nav.2fa', href: '/settings/2fa', icon: Shield },
      { key: 'nav.backup', href: '/tools/backup', icon: Database, roles: ['super_admin'] },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user, lang } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed } = useUIStore();
  const role = user?.role || 'writer';

  // Track which accordion groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Auto-open group if current path matches a child
    const initial: Record<string, boolean> = { 'nav.content': true }; // Content group open by default
    navStructure.forEach((entry) => {
      if (isGroup(entry)) {
        const childMatch = entry.children.some((child) =>
          child.href === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(child.href)
        );
        if (childMatch) initial[entry.key] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isItemActive = (href: string) =>
    href === '/'
      ? location.pathname === '/' || location.pathname === ''
      : location.pathname.startsWith(href);

  const isGroupActive = (group: NavGroup) =>
    group.children.some((child) => isItemActive(child.href));

  const hasRole = (roles?: string[]) => !roles || roles.includes(role);

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = isItemActive(item.href);

    const linkContent = (
      <Link
        key={item.key}
        to={item.href}
        onClick={handleNavClick}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          sidebarCollapsed && 'justify-center px-2',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!sidebarCollapsed && t(item.key, lang)}
      </Link>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.key} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right">{t(item.key, lang)}</TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  const renderNavGroup = (group: NavGroup) => {
    const Icon = group.icon;
    const isOpen = openGroups[group.key] || false;
    const groupActive = isGroupActive(group);

    // In collapsed mode, show only the icon (no accordion)
    if (sidebarCollapsed) {
      const firstChild = group.children[0];
      return (
        <Tooltip key={group.key} delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              to={firstChild.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                groupActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{t(group.key, lang)}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div key={group.key}>
        <button
          onClick={() => toggleGroup(group.key)}
          className={cn(
            'w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            groupActive
              ? 'text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{t(group.key, lang)}</span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="ml-4 pl-3 border-l border-border/50 space-y-0.5 mt-0.5 mb-1">
            {group.children.filter((child) => hasRole(child.roles)).map((child) => {
              const ChildIcon = child.icon;
              const childActive = isItemActive(child.href);
              return (
                <Link
                  key={child.key}
                  to={child.href}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    childActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                  {t(child.key, lang)}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <aside className={cn(
      'border-r bg-card flex flex-col h-full transition-all duration-300',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      <div className="p-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary" onClick={handleNavClick}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0">
            W
          </div>
          {!sidebarCollapsed && <span>WorkerCms</span>}
        </Link>
      </div>

      {!sidebarCollapsed && <SiteSwitcher />}
      <Separator />

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navStructure.map((entry) => {
          if (!hasRole(entry.roles)) return null;

          if (isGroup(entry)) {
            return renderNavGroup(entry);
          }

          return renderNavLink(entry);
        })}
      </nav>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — hidden on mobile, visible on md+ */}
      <div className="hidden md:flex h-full shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile overlay — shown when sidebarOpen, hidden on md+ */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar panel */}
          <div className="relative w-64 h-full animate-slide-in-left z-10 shrink-0" style={{ animationDuration: '0.2s' }}>
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 z-20 p-1.5 rounded-md hover:bg-accent"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </div>
          {/* Tap area to close */}
          <div className="flex-1" onClick={() => setSidebarOpen(false)} />
        </div>
      )}
    </>
  );
}
