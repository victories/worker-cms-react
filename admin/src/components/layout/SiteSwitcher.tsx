import { useSiteStore } from '@/stores/siteStore';
import { useAuthStore } from '@/stores/authStore';
import { t } from '@/lib/i18n';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';

export function SiteSwitcher() {
  const { sites, activeSite, setActiveSiteById } = useSiteStore();
  const lang = useAuthStore((s) => s.lang);

  // Hide management site from non-super_admin users
  const user = useAuthStore((s) => s.user);
  // Hide management site from everyone (including super_admin) in the switcher
  const visibleSites = sites.filter((s: any) => s.is_management !== 1);

  // If active site is management and user can't see it, auto-switch to first visible
  if (activeSite && (activeSite as any).is_management === 1 && visibleSites.length > 0) {
    setActiveSiteById(visibleSites[0].id);
  }

  if (visibleSites.length === 0) return null;

  return (
    <div className="px-3 py-2">
      <Select
        value={activeSite ? String(activeSite.id) : undefined}
        onValueChange={(val) => setActiveSiteById(Number(val))}
      >
        <SelectTrigger className="w-full bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="h-4 w-4 text-primary shrink-0" />
            <SelectValue placeholder={t('site_switcher.select', lang)} />
          </div>
        </SelectTrigger>
        <SelectContent>
          {visibleSites.map((site: any) => (
            <SelectItem key={site.id} value={String(site.id)}>
              {site.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
