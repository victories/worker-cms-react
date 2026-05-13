import { useSiteStore } from '@/stores/siteStore';
import { useAuthStore } from '@/stores/authStore';
import { t } from '@/lib/i18n';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@ui/select';
import { Globe } from 'lucide-react';

export function SiteSwitcher() {
  const { sites, activeSite, setActiveSiteById } = useSiteStore();
  const lang = useAuthStore((s) => s.lang);

  // The management site (workercms.com itself) is editable from the
  // switcher so admins can publish static pages like /iletisim,
  // /sartlar, /gizlilik. Public pages on that site render with the
  // landing chrome (see src/routes/public/post.ts).
  const visibleSites = sites;

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
