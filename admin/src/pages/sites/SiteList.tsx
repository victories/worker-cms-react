import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Badge } from '@ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@ui/dialog';
import { Globe, Plus, Settings, Trash2, ExternalLink, Pause, Play, CheckCircle2, Search, X, User, Crown, Package, ArrowUpRight, Loader2, Copy, Check, RefreshCw, Server, Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@ui/toast-notification';
import { Card, CardContent } from '@ui/card';

export function SiteList() {
  const { lang, user } = useAuthStore();
  const { sites, activeSite, fetchSites, setActiveSite } = useSiteStore();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newSite, setNewSite] = useState({ name: '', slug: '', description: '', domain: '' });
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [pauseId, setPauseId] = useState<number | null>(null);
  const [pauseAction, setPauseAction] = useState<'pause' | 'resume'>('pause');
  const [activateId, setActivateId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Status column sort: 'none' = insertion order, 'asc' = active first (then
  // pending, then paused/suspended), 'desc' = suspended first.
  const [statusSort, setStatusSort] = useState<'none' | 'asc' | 'desc'>('none');
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'super_admin';
  const [subscription, setSubscription] = useState<any>(null);
  // Effective quota (package base + active add-ons), authoritative source
  // for the site allowance. /subscriptions/my only returns the package row,
  // which is null/free for à-la-carte add-on buyers — so the denominator
  // must come from /subscriptions/overview, which reads users.max_sites.
  const [quota, setQuota] = useState<{ max_sites: number; sites_used: number } | null>(null);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [userDeleteSite, setUserDeleteSite] = useState<any>(null);
  const [userDeleteConfirmDomain, setUserDeleteConfirmDomain] = useState('');
  const [userDeleteLoading, setUserDeleteLoading] = useState(false);
  const [cnameModalSite, setCnameModalSite] = useState<any>(null);
  const [cnameCopied, setCnameCopied] = useState(false);
  const [cnameVerifying, setCnameVerifying] = useState(false);
  const [cnameVerified, setCnameVerified] = useState(false);
  const [cnameError, setCnameError] = useState('');

  useEffect(() => {
    fetchSites();
    if (!isSuperAdmin) {
      api.request('/subscriptions/my').then((res: any) => {
        if (res?.success) setSubscription(res.data);
      }).catch(() => {});
      api.request('/subscriptions/overview').then((res: any) => {
        if (res?.success && res.data) {
          setQuota({ max_sites: res.data.max_sites ?? 1, sites_used: res.data.sites_used ?? 0 });
        }
      }).catch(() => {});
    }
  }, []);

  // Effective site allowance and usage — addon-aware. Falls back to the
  // package row / stale auth-store value only until /overview resolves.
  const effectiveMax = quota?.max_sites ?? subscription?.max_sites ?? user?.max_sites ?? 1;
  const sitesUsed = quota?.sites_used ?? sites.length;

  // Status breakdown for the page header (over all sites, not the filtered view).
  const activeCount = sites.filter((s: any) => s.status === 'active').length;
  const pausedCount = sites.filter((s: any) => s.status === 'paused').length;

  // Filter sites based on search query
  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return sites;
    const q = searchQuery.toLowerCase().trim();
    return sites.filter((site: any) => {
      // Search site name
      if (site.name?.toLowerCase().includes(q)) return true;
      // Search slug
      if (site.slug?.toLowerCase().includes(q)) return true;
      // Search description
      if (site.description?.toLowerCase().includes(q)) return true;
      // Search domains
      if (site.domains?.some((d: any) => d.domain?.toLowerCase().includes(q))) return true;
      // Search owner
      if (site.owner?.display_name?.toLowerCase().includes(q)) return true;
      if (site.owner?.email?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [sites, searchQuery]);

  // Rank for the Status sort: active first, then pending, then paused/other.
  const statusRank = (s: string) => (s === 'active' ? 0 : s === 'pending' ? 1 : 2);
  const displayedSites = useMemo(() => {
    if (statusSort === 'none') return filteredSites;
    const arr = [...filteredSites];
    arr.sort((a: any, b: any) => {
      const d = statusRank(a.status) - statusRank(b.status);
      return statusSort === 'asc' ? d : -d;
    });
    return arr;
  }, [filteredSites, statusSort]);

  const handleCreate = async () => {
    if (!newSite.name) return;
    setLoading(true);
    const res = await api.request<any>('/sites', {
      method: 'POST',
      body: {
        name: newSite.name,
        slug: newSite.slug || undefined,
        description: newSite.description || undefined,
        domain: newSite.domain || undefined,
      },
    });
    setLoading(false);
    if (res.success) {
      toast(lang === 'tr' ? 'Site oluşturuldu' : 'Site created', 'success');
      setShowCreate(false);
      setNewSite({ name: '', slug: '', description: '', domain: '' });
      fetchSites();
    }
  };

  const handleDelete = (id: number) => setDeleteId(id);

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      const res: any = await api.request(`/sites/${deleteId}`, { method: 'DELETE' });
      if (res && res.success === false) {
        toast(res.error || (lang === 'tr' ? 'Silme başarısız' : 'Delete failed'), 'error');
      } else {
        toast(lang === 'tr' ? 'Site silindi' : 'Site deleted', 'success');
      }
    } catch {
      toast(lang === 'tr' ? 'Silme başarısız' : 'Delete failed', 'error');
    }
    setDeleteId(null);
    fetchSites();
  };

  const handlePause = (id: number, currentStatus: string) => {
    setPauseId(id);
    setPauseAction(currentStatus === 'active' ? 'pause' : 'resume');
  };

  const confirmPause = async () => {
    if (pauseId === null) return;
    try {
      // Resume for non-super_admin goes through /activate (quota-checked);
      // pause and super_admin status changes use the plain PUT.
      const res: any = (pauseAction === 'resume' && !isSuperAdmin)
        ? await api.request(`/sites/${pauseId}/activate`, { method: 'POST' })
        : await api.request(`/sites/${pauseId}`, { method: 'PUT', body: { status: pauseAction === 'pause' ? 'paused' : 'active' } });
      if (res && res.success === false) {
        toast(res.error || (lang === 'tr' ? 'İşlem başarısız' : 'Operation failed'), 'error');
      } else {
        toast(
          pauseAction === 'pause'
            ? (lang === 'tr' ? 'Site duraklatıldı' : 'Site paused')
            : (lang === 'tr' ? 'Site yeniden aktif' : 'Site resumed'),
          'success'
        );
      }
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
    setPauseId(null);
    fetchSites();
  };

  // Force-activate a domain even if its CNAME isn't verified (super_admin).
  // Flips the site status to 'active' via the plain PUT, which for a
  // super_admin accepts any status (owners can't force-activate — the PUT
  // strips non-'paused' statuses for them; that path stays quota-checked).
  const confirmActivate = async () => {
    if (activateId === null) return;
    try {
      const res: any = await api.request(`/sites/${activateId}`, {
        method: 'PUT',
        body: { status: 'active' },
      });
      if (res && res.success === false) {
        toast(res.error || (lang === 'tr' ? 'İşlem başarısız' : 'Operation failed'), 'error');
      } else {
        toast(lang === 'tr' ? 'Domain aktifleştirildi' : 'Domain activated', 'success');
      }
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
    setActivateId(null);
    fetchSites();
  };

  const handleSelectSite = (site: any) => {
    setActiveSite(site);
    navigate('/');
  };

  const getPrimaryDomain = (site: any) => {
    if (!site.domains || site.domains.length === 0) return null;
    const primary = site.domains.find((d: any) => d.is_primary === 1);
    return primary || site.domains[0];
  };

  // Management sites cannot be deleted or paused
  const isDefaultSite = (site: any) => site.is_management === 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold">{t('nav.sites', lang)}</h1>
          <span className="text-sm text-muted-foreground">
            {lang === 'tr'
              ? <><span className="text-green-600 font-medium">{activeCount} aktif</span> · <span className="text-red-500 font-medium">{pausedCount} duraklatılmış</span> · toplam {sites.length} site</>
              : <><span className="text-green-600 font-medium">{activeCount} active</span> · <span className="text-red-500 font-medium">{pausedCount} paused</span> · {sites.length} total</>}
          </span>
        </div>
        <Button onClick={() => {
          if (!isSuperAdmin) {
            if (sitesUsed >= effectiveMax) {
              setShowLimitWarning(true);
              return;
            }
          }
          navigate('/setup-domain');
        }}>
          <Plus className="h-4 w-4 mr-2" />
          {lang === 'tr' ? 'Yeni Site' : 'New Site'}
        </Button>
      </div>

      {/* Package & Quota Info — non-super_admin users */}
      {!isSuperAdmin && (
        <Card className="border-dashed">
          <CardContent className="py-3 px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Package badge */}
                {subscription ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/40">
                      <Crown className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{subscription.package_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {subscription.billing_period === 'yearly'
                          ? (lang === 'tr' ? 'Yıllık Plan' : 'Yearly Plan')
                          : (lang === 'tr' ? 'Aylık Plan' : 'Monthly Plan')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                      <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{lang === 'tr' ? 'Ücretsiz Plan' : 'Free Plan'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {sitesUsed >= effectiveMax
                          ? (lang === 'tr'
                            ? `${effectiveMax} site hakkınızın tamamını kullandınız. Yükseltme yaparak daha fazla site ekleyebilirsiniz.`
                            : `You've used all ${effectiveMax} site(s). Upgrade to add more.`)
                          : (lang === 'tr'
                            ? `${sitesUsed} / ${effectiveMax} site kullanılıyor`
                            : `${sitesUsed} / ${effectiveMax} site(s) used`)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="hidden sm:block w-px h-8 bg-border" />

                {/* Quotas */}
                <div className="flex items-center gap-4 text-xs">
                  {/* Site quota */}
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-muted-foreground">{lang === 'tr' ? 'Site:' : 'Sites:'}</span>
                    <span className={`font-semibold ${sitesUsed >= effectiveMax ? 'text-red-500' : ''}`}>
                      {sitesUsed} / {effectiveMax}
                    </span>
                  </div>

                  {/* Storage quota if available */}
                  {subscription?.max_storage_mb > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{lang === 'tr' ? 'Depolama:' : 'Storage:'}</span>
                      <span className="font-semibold">{subscription.max_storage_mb} MB</span>
                    </div>
                  )}

                  {/* Posts per site if limited */}
                  {subscription?.max_posts_per_site > 0 && (
                    <div className="flex items-center gap-1.5 hidden sm:flex">
                      <span className="text-muted-foreground">{lang === 'tr' ? 'Yazı/Site:' : 'Posts/Site:'}</span>
                      <span className="font-semibold">{subscription.max_posts_per_site}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upgrade link */}
              {!subscription && (
                <Link to="/upgrade">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {lang === 'tr' ? 'Planı Yükselt' : 'Upgrade Plan'}
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'tr' ? 'Site adı, domain, açıklama veya kullanıcı ara...' : 'Search by site name, domain, description or user...'}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results count when filtering */}
      {searchQuery.trim() && (
        <p className="text-xs text-muted-foreground">
          {filteredSites.length} / {sites.length} {lang === 'tr' ? 'site gösteriliyor' : 'sites shown'}
        </p>
      )}

      <div className="rounded-md border">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium">{lang === 'tr' ? 'Site Adı' : 'Site Name'}</th>
              <th className="text-left px-4 py-3 font-medium">Domain</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">{lang === 'tr' ? 'Sahip' : 'Owner'}</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">{lang === 'tr' ? 'Açıklama' : 'Description'}</th>
              <th
                className="text-center px-4 py-3 font-medium cursor-pointer select-none hover:text-primary transition-colors"
                onClick={() => setStatusSort((s) => (s === 'asc' ? 'desc' : s === 'desc' ? 'none' : 'asc'))}
                title={lang === 'tr' ? 'Duruma göre sırala (aktifler önce)' : 'Sort by status (active first)'}
              >
                <span className="inline-flex items-center gap-1">
                  {lang === 'tr' ? 'Durum' : 'Status'}
                  {statusSort === 'asc' ? <ArrowUp className="h-3.5 w-3.5" />
                    : statusSort === 'desc' ? <ArrowDown className="h-3.5 w-3.5" />
                    : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                </span>
              </th>
              <th className="text-center px-4 py-3 font-medium hidden sm:table-cell">{lang === 'tr' ? 'Yazılar' : 'Posts'}</th>
              <th className="text-center px-4 py-3 font-medium hidden sm:table-cell">{lang === 'tr' ? 'Medya' : 'Media'}</th>
              <th className="text-right px-4 py-3 font-medium">{lang === 'tr' ? 'İşlemler' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {displayedSites.map((site: any) => {
              const primaryDomain = getPrimaryDomain(site);
              const isActive = activeSite?.id === site.id;
              const isDefault = isDefaultSite(site);

              return (
                <tr key={site.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${isActive ? 'bg-primary/5' : ''}`}>
                  {/* Site Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{site.name}</span>
                      {isActive && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          {lang === 'tr' ? 'Seçili' : 'Selected'}
                        </Badge>
                      )}
                      {isDefault && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600">
                          {lang === 'tr' ? 'Yönetim' : 'Management'}
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Domain */}
                  <td className="px-4 py-3">
                    {primaryDomain ? (
                      <div className="flex items-center gap-1">
                        <a
                          href={`https://${primaryDomain.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`hover:underline font-mono text-xs ${site.status === 'paused' ? 'text-red-500 font-semibold' : 'text-primary'}`}
                        >
                          {primaryDomain.domain}
                        </a>
                        {site.domains && site.domains.length > 1 && (
                          <span className="text-[10px] text-muted-foreground">+{site.domains.length - 1}</span>
                        )}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        {lang === 'tr' ? 'Atanmamış' : 'None'}
                      </span>
                    )}
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {site.owner ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{site.owner.display_name || '—'}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{site.owner.email}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-muted-foreground text-xs line-clamp-1">
                      {site.description || '—'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    {site.status === 'pending' ? (
                      <Badge
                        variant="warning"
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setCnameModalSite(site);
                          setCnameVerified(false);
                          setCnameError('');
                        }}
                      >
                        <Info className="h-3 w-3 mr-1" />
                        {lang === 'tr' ? 'CNAME Bekliyor' : 'CNAME Pending'}
                      </Badge>
                    ) : (
                      <Badge variant={site.status === 'active' ? 'success' : site.status === 'paused' ? 'secondary' : 'destructive'}>
                        {site.status === 'active'
                          ? (lang === 'tr' ? 'Aktif' : 'Active')
                          : site.status === 'paused'
                          ? (lang === 'tr' ? 'Duraklatıldı' : 'Paused')
                          : site.status}
                      </Badge>
                    )}
                  </td>

                  {/* Post count */}
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="text-muted-foreground">{site.post_count || 0}</span>
                  </td>

                  {/* Media count */}
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="text-muted-foreground">{site.media_count || 0}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant={isActive ? 'default' : 'outline'}
                        className="h-7 text-xs px-2"
                        onClick={() => handleSelectSite(site)}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {lang === 'tr' ? 'Seçili' : 'Selected'}
                          </>
                        ) : (
                          lang === 'tr' ? 'Seç' : 'Select'
                        )}
                      </Button>
                      <Link to={`/sites/${site.id}/settings`}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={t('nav.settings', lang)}>
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {/* Force-activate a CNAME-pending domain (skip verification) */}
                      {!isDefault && site.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-green-600"
                          onClick={() => setActivateId(site.id)}
                          title={lang === 'tr' ? 'Aktifleştir (CNAME beklemeden)' : 'Activate (skip CNAME)'}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {!isDefault && site.status !== 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-7 w-7 p-0 ${site.status === 'paused' ? 'text-green-600' : 'text-yellow-600'}`}
                          onClick={() => handlePause(site.id, site.status)}
                          title={site.status === 'active'
                            ? (lang === 'tr' ? 'Durakla' : 'Pause')
                            : (lang === 'tr' ? 'Devam Et' : 'Resume')}
                        >
                          {site.status === 'paused' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      {!isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => {
                            if (isSuperAdmin) {
                              handleDelete(site.id);
                            } else {
                              setUserDeleteSite(site);
                              setUserDeleteConfirmDomain('');
                            }
                          }}
                          title={lang === 'tr' ? 'Sil' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {displayedSites.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  {searchQuery.trim()
                    ? (lang === 'tr' ? 'Aramayla eşleşen site bulunamadı.' : 'No sites match your search.')
                    : (lang === 'tr' ? 'Henüz site yok.' : 'No sites yet.')}
                </td>
              </tr>
            )}
          </tbody>
        </table></div>
      </div>

      {/* Create Site Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === 'tr' ? 'Yeni Site Oluştur' : 'Create New Site'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{lang === 'tr' ? 'Site Adı' : 'Site Name'} *</Label>
              <Input
                value={newSite.name}
                onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                placeholder={lang === 'tr' ? 'Benim Sitem' : 'My Site'}
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={newSite.slug}
                onChange={(e) => setNewSite({ ...newSite, slug: e.target.value })}
                placeholder={lang === 'tr' ? 'otomatik oluşturulur' : 'auto-generated'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {lang === 'tr' ? 'Boş bırakılırsa site adından oluşturulur' : 'Auto-generated from name if left empty'}
              </p>
            </div>
            <div>
              <Label>Domain</Label>
              <Input
                value={newSite.domain}
                onChange={(e) => setNewSite({ ...newSite, domain: e.target.value })}
                placeholder="example.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {lang === 'tr' ? 'Bu sitenin birincil domain adresi' : 'Primary domain for this site'}
              </p>
            </div>
            <div>
              <Label>{lang === 'tr' ? 'Açıklama' : 'Description'}</Label>
              <Input
                value={newSite.description}
                onChange={(e) => setNewSite({ ...newSite, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {t('action.cancel', lang)}
            </Button>
            <Button onClick={handleCreate} disabled={loading || !newSite.name}>
              {loading ? t('common.loading', lang) : t('action.create', lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={confirmDelete}
        title={lang === 'tr' ? 'Siteyi Sil' : 'Delete Site'}
        description={lang === 'tr' ? 'Bu site ve tüm içeriği kalıcı olarak silinecek.' : 'This site and all its content will be permanently deleted.'}
        confirmLabel={lang === 'tr' ? 'Sil' : 'Delete'}
        cancelLabel={lang === 'tr' ? 'İptal' : 'Cancel'}
        variant="destructive"
      />

      {/* Pause/Resume Confirm Dialog */}
      <ConfirmDialog
        open={pauseId !== null}
        onOpenChange={(open) => { if (!open) setPauseId(null); }}
        onConfirm={confirmPause}
        title={pauseAction === 'pause'
          ? (lang === 'tr' ? 'Siteyi Duraklat' : 'Pause Site')
          : (lang === 'tr' ? 'Siteyi Aktifleştir' : 'Resume Site')}
        description={pauseAction === 'pause'
          ? (lang === 'tr' ? 'Site duraklatılacak. Ziyaretçiler 403 hatası görecek. İçerik silinmez.' : 'Site will be paused. Visitors will see a 403 error. Content is not deleted.')
          : (lang === 'tr' ? 'Site tekrar aktif olacak ve ziyaretçilere açılacak.' : 'Site will be active again and accessible to visitors.')}
        confirmLabel={pauseAction === 'pause'
          ? (lang === 'tr' ? 'Duraklat' : 'Pause')
          : (lang === 'tr' ? 'Aktifleştir' : 'Resume')}
        cancelLabel={lang === 'tr' ? 'İptal' : 'Cancel'}
        variant={pauseAction === 'pause' ? 'destructive' : 'default'}
      />

      {/* Force-Activate (skip CNAME) Confirm Dialog */}
      <ConfirmDialog
        open={activateId !== null}
        onOpenChange={(open) => { if (!open) setActivateId(null); }}
        onConfirm={confirmActivate}
        title={lang === 'tr' ? 'Domaini Aktifleştir' : 'Activate Domain'}
        description={lang === 'tr'
          ? 'CNAME doğrulanmamış olsa bile bu domain aktifleştirilip yayına alınacak. Domain trafiğinin bu sunucuya yönlendirilmiş olması gerekir.'
          : 'This domain will be activated and go live even if its CNAME is not verified. Make sure the domain traffic is routed to this server.'}
        confirmLabel={lang === 'tr' ? 'Aktifleştir' : 'Activate'}
        cancelLabel={lang === 'tr' ? 'İptal' : 'Cancel'}
        variant="default"
      />

      {/* User Delete Site Confirmation Dialog */}
      <Dialog open={!!userDeleteSite} onOpenChange={(open) => { if (!open) { setUserDeleteSite(null); setUserDeleteConfirmDomain(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {lang === 'tr' ? 'Siteyi Sil' : 'Delete Site'}
            </DialogTitle>
          </DialogHeader>
          {userDeleteSite && (() => {
            const siteDomain = userDeleteSite.domains?.find((d: any) => d.is_primary === 1)?.domain
              || userDeleteSite.domains?.[0]?.domain
              || userDeleteSite.slug;
            return (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm space-y-2">
                  <p className="font-medium text-destructive">
                    {lang === 'tr' ? 'Bu işlem geri alınamaz!' : 'This action cannot be undone!'}
                  </p>
                  <p className="text-muted-foreground">
                    {lang === 'tr'
                      ? `"${userDeleteSite.name}" sitesi ve tüm içeriği (yazılar, medya, ayarlar, yorumlar) kalıcı olarak silinecektir.`
                      : `"${userDeleteSite.name}" and all its content (posts, media, settings, comments) will be permanently deleted.`}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">
                    {lang === 'tr'
                      ? <>Onaylamak için <span className="font-mono font-bold text-destructive">{siteDomain}</span> yazın:</>
                      : <>Type <span className="font-mono font-bold text-destructive">{siteDomain}</span> to confirm:</>}
                  </Label>
                  <Input
                    value={userDeleteConfirmDomain}
                    onChange={(e) => setUserDeleteConfirmDomain(e.target.value)}
                    placeholder={siteDomain}
                    className="font-mono text-sm"
                    autoFocus
                  />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUserDeleteSite(null); setUserDeleteConfirmDomain(''); }}>
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              disabled={
                userDeleteLoading ||
                !userDeleteSite ||
                userDeleteConfirmDomain !== (userDeleteSite?.domains?.find((d: any) => d.is_primary === 1)?.domain || userDeleteSite?.domains?.[0]?.domain || userDeleteSite?.slug)
              }
              onClick={async () => {
                if (!userDeleteSite) return;
                const siteDomain = userDeleteSite.domains?.find((d: any) => d.is_primary === 1)?.domain
                  || userDeleteSite.domains?.[0]?.domain
                  || userDeleteSite.slug;
                setUserDeleteLoading(true);
                try {
                  const endpoint = isSuperAdmin ? `/sites/${userDeleteSite.id}` : `/sites/${userDeleteSite.id}/my`;
                  const res = await api.request<any>(endpoint, {
                    method: 'DELETE',
                    body: { confirm_domain: siteDomain },
                  });
                  if (res.success) {
                    toast(lang === 'tr' ? 'Site silindi' : 'Site deleted', 'success');
                    setUserDeleteSite(null);
                    setUserDeleteConfirmDomain('');
                    fetchSites();
                  } else {
                    toast(res.error || 'Error', 'error');
                  }
                } catch (err: any) {
                  toast(err.message || 'Error', 'error');
                }
                setUserDeleteLoading(false);
              }}
            >
              {userDeleteLoading
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Trash2 className="h-4 w-4 mr-2" />}
              {lang === 'tr' ? 'Kalıcı Olarak Sil' : 'Permanently Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Site Limit Warning Dialog */}
      <Dialog open={showLimitWarning} onOpenChange={setShowLimitWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              {lang === 'tr' ? 'Site Limitine Ulaştınız' : 'Site Limit Reached'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {lang === 'tr'
                ? `Mevcut paketinizde maksimum ${effectiveMax} site hakkınız bulunmaktadır ve tamamını kullandınız.`
                : `Your current plan allows a maximum of ${effectiveMax} site(s) and you've used all of them.`}
            </p>
            <p className="text-sm text-muted-foreground">
              {lang === 'tr'
                ? 'Daha fazla site ekleyebilmek için paketinizi yükseltmeniz gerekmektedir.'
                : 'You need to upgrade your plan to add more sites.'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLimitWarning(false)}>
              {lang === 'tr' ? 'Kapat' : 'Close'}
            </Button>
            <Button onClick={() => { setShowLimitWarning(false); navigate('/upgrade'); }}>
              <Crown className="h-4 w-4 mr-2" />
              {lang === 'tr' ? 'Planı Yükselt' : 'Upgrade Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CNAME Instructions Modal */}
      <Dialog open={!!cnameModalSite} onOpenChange={(open) => { if (!open) { setCnameModalSite(null); setCnameError(''); setCnameVerified(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-orange-500" />
              {lang === 'tr' ? 'CNAME Kaydı Talimatları' : 'CNAME Record Instructions'}
            </DialogTitle>
          </DialogHeader>
          {cnameModalSite && (() => {
            const siteDomain = cnameModalSite.domains?.find((d: any) => d.is_primary === 1)?.domain
              || cnameModalSite.domains?.[0]?.domain || '';
            const cnameTarget = cnameModalSite.cname_target || cnameModalSite.domains?.find((d: any) => d.cname_target)?.cname_target || 'proxy.workercms.com';

            return (
              <div className="space-y-4">
                {cnameVerified && (
                  <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {lang === 'tr' ? 'CNAME doğrulandı! Domain aktif.' : 'CNAME verified! Domain is active.'}
                  </div>
                )}

                {cnameError && (
                  <div className="flex items-center gap-2 p-3 text-sm text-orange-600 bg-orange-50 dark:bg-orange-950/50 rounded-lg border border-orange-200 dark:border-orange-800">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    {cnameError}
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  {lang === 'tr'
                    ? `Domain sağlayıcınızın DNS panelinde ${siteDomain} ve www.${siteDomain} için aşağıdaki CNAME kayıtlarını ekleyin.`
                    : `Add the following CNAME records for ${siteDomain} and www.${siteDomain} at your DNS provider.`}
                </p>

                {/* Bare domain CNAME */}
                <div className="bg-muted/30 rounded-lg px-4 py-3 border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{lang === 'tr' ? 'Kayıt Tipi' : 'Record Type'}</span>
                    <span className="font-mono text-xs font-bold text-blue-600">CNAME</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{lang === 'tr' ? 'Ad / Host' : 'Name / Host'}</span>
                    <span className="font-mono text-xs">@ {lang === 'tr' ? 'veya' : 'or'} {siteDomain}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{lang === 'tr' ? 'Hedef / Value' : 'Target / Value'}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold">{cnameTarget}</span>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(cnameTarget); setCnameCopied(true); setTimeout(() => setCnameCopied(false), 2000); }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {cnameCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* www CNAME */}
                <div className="bg-muted/30 rounded-lg px-4 py-3 border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{lang === 'tr' ? 'Kayıt Tipi' : 'Record Type'}</span>
                    <span className="font-mono text-xs font-bold text-blue-600">CNAME</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{lang === 'tr' ? 'Ad / Host' : 'Name / Host'}</span>
                    <span className="font-mono text-xs">www</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{lang === 'tr' ? 'Hedef / Value' : 'Target / Value'}</span>
                    <span className="font-mono text-xs font-bold">{cnameTarget}</span>
                  </div>
                </div>

                {/* Info box */}
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2 border border-blue-100 dark:border-blue-900">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {lang === 'tr'
                      ? 'NS değiştirmenize gerek yok! Sadece CNAME kaydı eklemek yeterli. Mevcut e-posta ve diğer DNS kayıtlarınız etkilenmez.'
                      : 'No need to change nameservers! Just add a CNAME record. Your existing email and other DNS records are not affected.'}
                  </p>
                </div>

                {/* How-to */}
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground transition-colors font-medium">
                    {lang === 'tr' ? 'Nasıl yapılır?' : 'How to do this?'}
                  </summary>
                  <ol className="mt-2 space-y-1 list-decimal list-inside pl-1">
                    <li>{lang === 'tr' ? 'Domain sağlayıcınızın (GoDaddy, Namecheap vb.) DNS paneline girin' : 'Log in to your DNS provider (GoDaddy, Namecheap, etc.)'}</li>
                    <li>{lang === 'tr' ? 'DNS kayıtları bölümüne gidin' : 'Go to DNS records section'}</li>
                    <li>{lang === 'tr' ? `Yeni bir CNAME kaydı ekleyin: @ → ${cnameTarget}` : `Add a new CNAME record: @ → ${cnameTarget}`}</li>
                    <li>{lang === 'tr' ? `www için de aynı CNAME kaydını ekleyin: www → ${cnameTarget}` : `Add the same CNAME for www: www → ${cnameTarget}`}</li>
                    <li>{lang === 'tr' ? 'Kaydedin. Yayılma genellikle 1-5 dakika sürer' : 'Save. Propagation usually takes 1-5 minutes'}</li>
                  </ol>
                </details>
              </div>
            );
          })()}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setCnameModalSite(null); setCnameError(''); setCnameVerified(false); }}>
              {lang === 'tr' ? 'Kapat' : 'Close'}
            </Button>
            {!cnameVerified && cnameModalSite && (
              <Button
                onClick={async () => {
                  const siteDomain = cnameModalSite.domains?.find((d: any) => d.is_primary === 1)?.domain
                    || cnameModalSite.domains?.[0]?.domain || '';
                  if (!siteDomain) return;
                  setCnameVerifying(true);
                  setCnameError('');
                  try {
                    const res = await api.request('/domains/verify', {
                      method: 'POST',
                      body: { domain: siteDomain },
                    }) as any;
                    if (res.success && res.data?.verified) {
                      setCnameVerified(true);
                      fetchSites();
                    } else if (res.success && !res.data?.verified) {
                      setCnameError(res.data?.message || (lang === 'tr' ? 'CNAME henüz algılanmadı' : 'CNAME not detected yet'));
                    } else {
                      setCnameError(res.error || (lang === 'tr' ? 'Doğrulama başarısız' : 'Verification failed'));
                    }
                  } catch (err: any) {
                    setCnameError(err.message || (lang === 'tr' ? 'Doğrulama başarısız' : 'Verification failed'));
                  }
                  setCnameVerifying(false);
                }}
                disabled={cnameVerifying}
              >
                {cnameVerifying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lang === 'tr' ? 'Kontrol ediliyor...' : 'Checking...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    {lang === 'tr' ? 'CNAME Durumunu Kontrol Et' : 'Check CNAME Status'}
                  </span>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
