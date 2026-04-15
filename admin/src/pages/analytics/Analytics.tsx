import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Eye, TrendingUp, FileText, MessageSquare, ExternalLink, BarChart3, Image, File } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface OverviewData {
  total_views: number;
  today_views: number;
  total_posts: number;
  total_pages: number;
  total_comments: number;
  total_media: number;
}

interface ViewEntry {
  date: string;
  views: number;
}

interface PopularPage {
  path: string;
  views: number;
  id: number | null;
  title: string | null;
  slug: string;
}

interface ReferrerEntry {
  referrer: string;
  count: number;
}

// ── Period options ────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: 7, labelTr: '7 Gun', labelEn: '7 Days' },
  { value: 14, labelTr: '14 Gun', labelEn: '14 Days' },
  { value: 30, labelTr: '30 Gun', labelEn: '30 Days' },
  { value: 90, labelTr: '90 Gun', labelEn: '90 Days' },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

export function Analytics() {
  const { lang } = useAuthStore();
  const { activeSite } = useSiteStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<number>(30);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [views, setViews] = useState<ViewEntry[]>([]);
  const [popular, setPopular] = useState<PopularPage[]>([]);
  const [referrers, setReferrers] = useState<ReferrerEntry[]>([]);

  const isTr = lang === 'tr';

  // ── Data fetching ────────────────────────────────────────────────────────

  const loadData = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);

    try {
      const [overviewRes, viewsRes, popularRes, referrersRes] = await Promise.all([
        api.request<{ success: boolean; data: OverviewData }>('/analytics/overview'),
        api.request<{ success: boolean; data: ViewEntry[] }>(`/analytics/views?days=${days}`),
        api.request<{ success: boolean; data: PopularPage[] }>(`/analytics/popular?days=${days}`),
        api.request<{ success: boolean; data: ReferrerEntry[] }>(`/analytics/referrers?days=${days}`),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (viewsRes.success) setViews(viewsRes.data);
      if (popularRes.success) setPopular(popularRes.data);
      if (referrersRes.success) setReferrers(referrersRes.data);
    } catch (err: any) {
      setError(err.message || (isTr ? 'Veriler yuklenirken hata olustu' : 'Failed to load analytics data'));
    } finally {
      setLoading(false);
    }
  }, [isTr]);

  useEffect(() => {
    if (!activeSite) return;
    loadData(period);
  }, [activeSite, period, loadData]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // ── Loading state ────────────────────────────────────────────────────────

  if (!activeSite) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {isTr ? 'Lutfen bir site secin' : 'Please select a site'}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            {isTr ? 'Analitik verileri yukleniyor...' : 'Loading analytics data...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadData(period)}>
            {isTr ? 'Tekrar Dene' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  // ── Chart calculations ───────────────────────────────────────────────────

  const maxViews = Math.max(...views.map((v) => v.views), 1);

  // ── Stat cards config ────────────────────────────────────────────────────

  const statCards = [
    {
      label: isTr ? 'Toplam Goruntulenme' : 'Total Views',
      value: overview ? formatNumber(overview.total_views) : '-',
      icon: Eye,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: isTr ? 'Bugunun Goruntulenmeleri' : "Today's Views",
      value: overview ? formatNumber(overview.today_views) : '-',
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-950',
    },
    {
      label: isTr ? 'Toplam Yazi' : 'Total Posts',
      value: overview ? formatNumber(overview.total_posts) : '-',
      icon: FileText,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      label: isTr ? 'Toplam Sayfa' : 'Total Pages',
      value: overview ? formatNumber(overview.total_pages) : '-',
      icon: File,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50 dark:bg-indigo-950',
    },
    {
      label: isTr ? 'Toplam Yorum' : 'Total Comments',
      value: overview ? formatNumber(overview.total_comments) : '-',
      icon: MessageSquare,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      label: isTr ? 'Toplam Medya' : 'Total Media',
      value: overview ? formatNumber(overview.total_media) : '-',
      icon: Image,
      color: 'text-pink-500',
      bg: 'bg-pink-50 dark:bg-pink-950',
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            {isTr ? 'Analitik' : 'Analytics'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isTr
              ? 'Site trafigini ve icerik performansini takip edin'
              : 'Track your site traffic and content performance'}
          </p>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`rounded-md p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Period selector + Views chart ────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg">
            {isTr ? 'Goruntulenme Grafigi' : 'Views Chart'}
          </CardTitle>
          <div className="flex items-center gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={period === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(opt.value)}
              >
                {isTr ? opt.labelTr : opt.labelEn}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {views.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              {isTr ? 'Bu donem icin veri bulunamadi' : 'No data available for this period'}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Chart container */}
              <div className="flex items-end gap-[2px] h-52 w-full">
                {views.map((entry) => {
                  const heightPercent = maxViews > 0 ? (entry.views / maxViews) * 100 : 0;
                  const barHeight = Math.max(heightPercent, 1);
                  return (
                    <div
                      key={entry.date}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                        <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border whitespace-nowrap">
                          {formatDate(entry.date)}: {entry.views.toLocaleString()}
                        </div>
                      </div>
                      {/* Bar */}
                      <div
                        className="w-full rounded-t-sm bg-primary/80 hover:bg-primary transition-colors min-h-[2px]"
                        style={{ height: `${barHeight}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels: show only a few to avoid crowding */}
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                {views.length > 0 && <span>{formatDate(views[0].date)}</span>}
                {views.length > 2 && (
                  <span>{formatDate(views[Math.floor(views.length / 2)].date)}</span>
                )}
                {views.length > 1 && <span>{formatDate(views[views.length - 1].date)}</span>}
              </div>
              {/* Summary line */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>
                  {isTr ? 'Toplam' : 'Total'}:{' '}
                  <span className="font-medium text-foreground">
                    {views.reduce((sum, v) => sum + v.views, 0).toLocaleString()}
                  </span>{' '}
                  {isTr ? 'goruntulenme' : 'views'}
                </span>
                <span>
                  {isTr ? 'Gunluk Ortalama' : 'Daily Avg'}:{' '}
                  <span className="font-medium text-foreground">
                    {views.length > 0
                      ? Math.round(
                          views.reduce((sum, v) => sum + v.views, 0) / views.length
                        ).toLocaleString()
                      : 0}
                  </span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Popular posts + Top referrers ────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Popular Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {isTr ? 'Populer Sayfalar' : 'Popular Pages'}
              <Badge variant="secondary" className="ml-auto">
                {isTr ? `Son ${period} gun` : `Last ${period} days`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {popular.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                {isTr ? 'Henuz veri yok' : 'No data yet'}
              </div>
            ) : (
              <div className="space-y-1">
                {popular.slice(0, 20).map((page, index) => {
                  const maxPopViews = popular[0]?.views || 1;
                  const barWidth = (page.views / maxPopViews) * 100;
                  return (
                    <div
                      key={page.path}
                      className="relative flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-md bg-primary/5"
                        style={{ width: `${barWidth}%` }}
                      />
                      <span className="relative text-xs font-mono text-muted-foreground w-5 text-right flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="relative min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {page.title || page.path}
                        </p>
                        {page.title && (
                          <p className="text-xs text-muted-foreground truncate">{page.path}</p>
                        )}
                      </div>
                      <div className="relative flex items-center gap-1 flex-shrink-0">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium tabular-nums">
                          {page.views.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              {isTr ? 'Yonlendiren Kaynaklar' : 'Top Referrers'}
              <Badge variant="secondary" className="ml-auto">
                {isTr ? `Son ${period} gun` : `Last ${period} days`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrers.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                {isTr ? 'Henuz veri yok' : 'No data yet'}
              </div>
            ) : (
              <div className="space-y-1">
                {referrers.slice(0, 20).map((ref, index) => {
                  const maxCount = referrers[0]?.count || 1;
                  const barWidth = (ref.count / maxCount) * 100;
                  return (
                    <div
                      key={ref.referrer + index}
                      className="relative flex items-center gap-3 py-2 px-2 rounded-md"
                    >
                      {/* Background bar for visual weight */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-md bg-primary/5"
                        style={{ width: `${barWidth}%` }}
                      />
                      <span className="relative text-xs font-mono text-muted-foreground w-5 text-right flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="relative min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {ref.referrer || (isTr ? '(Dogrudan)' : '(Direct)')}
                        </p>
                      </div>
                      <span className="relative text-sm font-medium tabular-nums flex-shrink-0">
                        {ref.count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
