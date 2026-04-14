import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { useThemeStore } from '@/stores/themeStore';
import { useUIStore } from '@/stores/uiStore';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Languages, Moon, Sun, Monitor, Menu as MenuIcon, PanelLeftClose, PanelLeft, ExternalLink, UserCog, ArrowLeftCircle, Crown, Settings2, Check, Globe, Package, Rocket } from 'lucide-react';

export function Header() {
  const { user, lang, setLang, logout, isImpersonating, originalUser, stopImpersonation } = useAuthStore();
  const { activeSite } = useSiteStore();
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const { toggleSidebar, sidebarCollapsed, toggleCollapsed } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    navigate('/users');
  };

  const themeIcon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;
  const ThemeIcon = themeIcon;

  return (
    <>
      {isImpersonating && (
        <div className="bg-amber-500 text-white px-4 py-1.5 flex items-center justify-between text-sm">
          <span>
            {lang === 'tr'
              ? `${user?.display_name} olarak görüntülüyorsunuz`
              : `Viewing as ${user?.display_name}`}
            {originalUser && (
              <span className="opacity-75 ml-1">
                ({lang === 'tr' ? 'orijinal' : 'original'}: {originalUser.display_name})
              </span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-amber-600 h-7 gap-1.5"
            onClick={handleStopImpersonation}
          >
            <ArrowLeftCircle className="h-4 w-4" />
            {lang === 'tr' ? "Admin'e Dön" : 'Back to Admin'}
          </Button>
        </div>
      )}
    <header className="h-14 border-b bg-card px-4 md:px-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {/* Mobile menu toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
          <MenuIcon className="h-5 w-5" />
        </Button>

        {/* Desktop sidebar collapse */}
        <Button variant="ghost" size="icon" className="hidden md:flex" onClick={toggleCollapsed}>
          {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>

        {activeSite && (() => {
          const primaryDomain = activeSite.domains?.find((d: any) => d.is_primary)?.domain
            || activeSite.domains?.[0]?.domain;
          const siteUrl = primaryDomain ? `https://${primaryDomain}` : null;
          return siteUrl ? (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hidden sm:inline-flex items-center gap-1 hover:text-primary transition-colors"
            >
              {activeSite.name}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {activeSite.name}
            </span>
          );
        })()}
      </div>

      <div className="flex items-center gap-1">
        {/* Upgrade button for non-super_admin users */}
        {user?.role !== 'super_admin' && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs border-yellow-500/50 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 hidden sm:flex"
            onClick={() => navigate('/upgrade')}
          >
            <Crown className="h-3.5 w-3.5" />
            {lang === 'tr' ? 'Yükselt' : 'Upgrade'}
          </Button>
        )}

        {/* Global dropdown (super_admin only) */}
        {user?.role === 'super_admin' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Global</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{lang === 'tr' ? 'Global Yönetim' : 'Global Management'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/sites')}>
                <Globe className="h-4 w-4 mr-2" />
                {lang === 'tr' ? 'Siteler' : 'Sites'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/global-settings')}>
                <Settings2 className="h-4 w-4 mr-2" />
                {lang === 'tr' ? 'Global Ayarlar' : 'Global Settings'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/packages')}>
                <Package className="h-4 w-4 mr-2" />
                {lang === 'tr' ? 'Paketler' : 'Packages'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings/landing')}>
                <Rocket className="h-4 w-4 mr-2" />
                {lang === 'tr' ? 'Tanıtım Sayfası' : 'Landing Page'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Language selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8">
              <Languages className="h-4 w-4" />
              <span className="hidden sm:inline">{lang === 'tr' ? 'TR' : 'EN'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{lang === 'tr' ? 'Dil Seçin' : 'Select Language'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLang('tr')}>
              {lang === 'tr' && <Check className="h-4 w-4 mr-2" />}
              {lang !== 'tr' && <span className="w-4 mr-2" />}
              Türkçe
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang('en')}>
              {lang === 'en' && <Check className="h-4 w-4 mr-2" />}
              {lang !== 'en' && <span className="w-4 mr-2" />}
              English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8">
              <ThemeIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{theme === 'system' ? 'Auto' : resolvedTheme === 'dark' ? 'Dark' : 'Light'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="h-4 w-4 mr-2" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="h-4 w-4 mr-2" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="h-4 w-4 mr-2" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.display_name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserCog className="h-4 w-4 mr-2" />
              {lang === 'tr' ? 'Profil' : 'Profile'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('action.logout', lang)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </>
  );
}
