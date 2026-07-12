import { useState } from 'react';
import { useSiteStore } from '@/stores/siteStore';
import { useAuthStore } from '@/stores/authStore';
import { t } from '@/lib/i18n';
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@ui/select';
import { Input } from '@ui/input';
import { Globe, Search } from 'lucide-react';

// Primary domain without a www. prefix; falls back to the site name.
function siteDomain(site: any): string | null {
  const d = site.domains?.find((x: any) => x.is_primary)?.domain || site.domains?.[0]?.domain;
  return d ? d.replace(/^www\./, '') : null;
}

export function SiteSwitcher() {
  const { sites, activeSite, setActiveSiteById } = useSiteStore();
  const lang = useAuthStore((s) => s.lang);
  const [query, setQuery] = useState('');

  // The management site (workercms.com itself) is editable from the
  // switcher so admins can publish static pages like /iletisim,
  // /sartlar, /gizlilik. Public pages on that site render with the
  // landing chrome (see src/routes/public/post.ts).
  const visibleSites = sites;

  if (visibleSites.length === 0) return null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? visibleSites.filter((s: any) => {
        const d = (siteDomain(s) || '').toLowerCase();
        return d.includes(q) || (s.name || '').toLowerCase().includes(q);
      })
    : visibleSites;

  const activeLabel = activeSite
    ? (siteDomain(activeSite) || activeSite.name)
    : t('site_switcher.select', lang);

  return (
    <div className="px-3 py-2">
      <Select
        value={activeSite ? String(activeSite.id) : undefined}
        onValueChange={(val) => setActiveSiteById(Number(val))}
        onOpenChange={(open) => { if (!open) setQuery(''); }}
      >
        <SelectTrigger className="w-full bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate text-sm font-mono">{activeLabel}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          <div className="sticky top-0 z-10 bg-popover p-1.5 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={lang === 'tr' ? 'Site ara...' : 'Search sites...'}
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>
          {filtered.map((site: any) => (
            <SelectItem key={site.id} value={String(site.id)}>
              <span className="font-mono text-sm">{siteDomain(site) || site.name}</span>
            </SelectItem>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              {lang === 'tr' ? 'Site bulunamadı' : 'No sites found'}
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
