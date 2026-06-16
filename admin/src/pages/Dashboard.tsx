import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { formatDate } from '@ui/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Badge } from '@ui/badge';
import { SparklineChart } from '@/components/dashboard/SparklineChart';
import { QuickActionsWidget } from '@/components/dashboard/QuickActionsWidget';
import { SiteHealthWidget } from '@/components/dashboard/SiteHealthWidget';
import {
  FileText, File, MessageSquare, Image,
  Globe, Package, Crown, ArrowRight,
} from 'lucide-react';

/**
 * Hook that animates a number from 0 to the target value.
 */
function useCountUp(target: number, duration: number = 1000): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setCount(0);
      return;
    }
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
}

// Static sparkline data sets (since we don't have historical data yet)
const SPARK_DATA = {
  posts:    [3, 5, 4, 7, 6, 9, 8, 11, 10, 12],
  pages:    [1, 2, 1, 3, 2, 3, 4, 3, 5, 4],
  comments: [2, 4, 3, 6, 5, 4, 7, 8, 6, 9],
  media:    [5, 8, 12, 9, 15, 11, 18, 14, 20, 17],
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  gradient: string;
  sparklineData: number[];
  changeText: string;
}

function StatCard({ label, value, icon: Icon, color, gradient, sparklineData, changeText }: StatCardProps) {
  const numericValue = typeof value === 'number' ? value : parseInt(value, 10);
  const isNumeric = !isNaN(numericValue) && numericValue > 0;
  const animatedValue = useCountUp(isNumeric ? numericValue : 0, 1200);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 rounded-xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">
              {isNumeric ? animatedValue : value}
            </p>
          </div>
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="mt-3">
          <SparklineChart data={sparklineData} color={color} />
        </div>
        {changeText && (
          <p className="text-xs text-muted-foreground mt-2">{changeText}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { user, lang } = useAuthStore();
  const { activeSite, sites } = useSiteStore();
  const [stats, setStats] = useState<any>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (!activeSite) return;
    loadData();
  }, [activeSite]);

  useEffect(() => {
    if (!isSuperAdmin) {
      api.request('/subscriptions/overview').then((res: any) => {
        if (res?.success) setSubscription(res.data);
      }).catch(() => {});
    }
  }, []);

  const loadData = async () => {
    const [postsRes, commentsRes, analyticsRes] = await Promise.all([
      api.getPosts({ per_page: '5', sort: 'created_at', order: 'desc' }),
      api.getComments({ per_page: '5' }),
      api.getAnalytics({ period: '7d' }).catch(() => null),
    ]);

    if (postsRes.success) setRecentPosts(postsRes.data);
    if (commentsRes.success) setRecentComments(commentsRes.data);
    if (analyticsRes && (analyticsRes as any).success) setStats((analyticsRes as any).data);
  };

  const thisMonth = lang === 'tr' ? 'bu ay' : 'this month';

  const statCards: StatCardProps[] = [
    {
      label: t('dashboard.total_posts', lang),
      value: stats?.total_posts ?? '-',
      icon: FileText,
      color: '#F5A524',
      gradient: 'from-[#F5A524] to-[#E89414]',
      sparklineData: SPARK_DATA.posts,
      changeText: stats?.total_posts ? `+${Math.min(stats.total_posts, 12)} ${thisMonth}` : '',
    },
    {
      label: t('dashboard.total_pages', lang),
      value: stats?.total_pages ?? '-',
      icon: File,
      color: '#F5A524',
      gradient: 'from-[#F5A524] to-[#E89414]',
      sparklineData: SPARK_DATA.pages,
      changeText: stats?.total_pages ? `+${Math.min(stats.total_pages, 3)} ${thisMonth}` : '',
    },
    {
      label: t('dashboard.total_comments', lang),
      value: stats?.total_comments ?? '-',
      icon: MessageSquare,
      color: '#F5A524',
      gradient: 'from-[#F5A524] to-[#E89414]',
      sparklineData: SPARK_DATA.comments,
      changeText: stats?.total_comments ? `+${Math.min(stats.total_comments, 8)} ${thisMonth}` : '',
    },
    {
      label: t('dashboard.total_media', lang),
      value: stats?.total_media ?? '-',
      icon: Image,
      color: '#F5A524',
      gradient: 'from-[#F5A524] to-[#E89414]',
      sparklineData: SPARK_DATA.media,
      changeText: stats?.total_media ? `+${Math.min(stats.total_media, 45)} ${thisMonth}` : '',
    },
  ];

  const primaryDomain = activeSite?.domains?.find(d => d.is_primary)?.domain
    || activeSite?.domains?.[0]?.domain;

  const siteUrl = primaryDomain
    ? `https://${primaryDomain}`
    : activeSite?.slug
      ? `https://${activeSite.slug}.wpworker.com`
      : undefined;

  return (
    <div className="space-y-6">
      {/* ---- Welcome header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-[#FFB638] to-[#F5A524] bg-clip-text text-transparent">
              {t('dashboard.welcome', lang)}, {user?.display_name}!
            </span>
          </h1>
          {activeSite && (
            <p className="text-muted-foreground mt-1">
              {lang === 'tr'
                ? `${activeSite.name} ile neler oluyor`
                : `Here's what's happening with ${activeSite.name}`}
            </p>
          )}
        </div>

        {/* Quota badges for non-super_admin */}
        {!isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {subscription?.package ? (
              <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs border-[#F5A524]/30 bg-[#F5A524]/10 text-[#F5A524]">
                <Crown className="h-3 w-3" />
                {subscription.package.package_name}
              </Badge>
            ) : subscription?.addons?.length > 0 ? (
              <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs">
                <Package className="h-3 w-3" />
                {lang === 'tr'
                  ? `${subscription.addons.length} eklenti`
                  : `${subscription.addons.length} add-ons`}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs">
                <Package className="h-3 w-3" />
                {lang === 'tr' ? 'Paket Yok' : 'No Package'}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs">
              <Globe className="h-3 w-3" />
              {lang === 'tr'
                ? `${subscription?.sites_used ?? sites.length} / ${subscription?.max_sites || 0} site`
                : `${subscription?.sites_used ?? sites.length} / ${subscription?.max_sites || 0} sites`}
            </Badge>
          </div>
        )}
      </div>

      {/* ---- Stat cards grid ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* ---- Quick Actions + Site Health ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <QuickActionsWidget siteUrl={siteUrl} lang={lang} />
        <SiteHealthWidget
          domain={primaryDomain}
          themeName="starter"
          postCount={stats?.total_posts ?? 0}
          commentCount={stats?.total_comments ?? 0}
          lang={lang}
        />
      </div>

      {/* ---- Recent Posts + Recent Comments ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Posts */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {t('dashboard.recent_posts', lang)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t('posts.no_posts', lang)}
              </p>
            ) : (
              <div className="space-y-0.5">
                {recentPosts.map((post, i) => (
                  <div
                    key={post.id}
                    className={`flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg transition-colors duration-150 hover:bg-muted group ${
                      i % 2 === 0 ? 'bg-muted/30' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/posts/${post.id}`}
                        className="text-sm font-medium hover:text-primary truncate block transition-colors duration-150"
                      >
                        {post.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(post.created_at, lang)}
                      </p>
                    </div>
                    <Badge
                      variant={post.status === 'publish' ? 'success' : 'secondary'}
                      className="ml-2 shrink-0"
                    >
                      {post.status === 'publish'
                        ? t('status.published', lang)
                        : t('status.draft', lang)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {recentPosts.length > 0 && (
              <Link
                to="/posts"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-4 font-medium"
              >
                {lang === 'tr' ? 'Tum Yazilari Gor' : 'View All Posts'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Recent Comments */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              {t('dashboard.recent_comments', lang)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentComments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t('common.no_results', lang)}
              </p>
            ) : (
              <div className="space-y-0.5">
                {recentComments.map((comment, i) => (
                  <div
                    key={comment.id}
                    className={`py-2.5 px-3 -mx-3 rounded-lg transition-colors duration-150 hover:bg-muted group ${
                      i % 2 === 0 ? 'bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{comment.author_name}</span>
                      <Badge variant={comment.status === 'approved' ? 'success' : 'secondary'}>
                        {comment.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {comment.content?.replace(/<[^>]*>/g, '')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {recentComments.length > 0 && (
              <Link
                to="/comments"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-4 font-medium"
              >
                {lang === 'tr' ? 'Tum Yorumlari Gor' : 'View All Comments'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
