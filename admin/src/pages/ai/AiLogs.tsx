import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@ui/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select';
import { Pagination, getPerPage } from '@/components/shared/Pagination';
import { useToast } from '@ui/toast-notification';
import {
  Activity,
  Coins,
  Hash,
  CheckCircle2,
  Filter,
  ExternalLink,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface AiLogEntry {
  id: number;
  site_id: number;
  job_id: number | null;
  provider_slug: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  duration_ms: number;
  status: string;
  error_message: string | null;
  request_type: string;
  result_post_id: number | null;
  creator_name: string | null;
  created_at: string;
}

interface AiLogStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  success_count: number;
  error_count: number;
  success_rate: number;
}

interface LogMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AiLogs() {
  const { lang } = useAuthStore();
  const { toast } = useToast();

  // Data state
  const [logs, setLogs] = useState<AiLogEntry[]>([]);
  const [meta, setMeta] = useState<LogMeta | null>(null);
  const [stats, setStats] = useState<AiLogStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPageState] = useState(getPerPage);

  // Filter state
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const isTr = lang === 'tr';

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const res = await api.getAiLogStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch {
      // stats are non-critical, silently fail
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        per_page: String(perPage),
      };
      if (filterProvider !== 'all') {
        params.provider_slug = filterProvider;
      }
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const res = await api.getAiLogs(params);
      if (res.success) {
        setLogs(res.data);
        setMeta(res.meta);
      }
    } catch {
      toast(
        isTr ? 'Loglar yüklenirken hata oluştu' : 'Failed to load AI logs',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [page, perPage, filterProvider, filterStatus, isTr, toast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFilter = () => {
    setPage(1);
    loadLogs();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const formatTokens = (n: number): string => {
    return n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  };

  const formatCost = (n: number): string => {
    return '$' + n.toFixed(4);
  };

  const formatDuration = (ms: number): string => {
    return (ms / 1000).toFixed(1) + 's';
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate > 90) return 'text-green-600 dark:text-green-400';
    if (rate > 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSuccessRateBg = (rate: number): string => {
    if (rate > 90) return 'bg-green-50 dark:bg-green-950';
    if (rate > 70) return 'bg-yellow-50 dark:bg-yellow-950';
    return 'bg-red-50 dark:bg-red-950';
  };

  // ── Stat cards config ──────────────────────────────────────────────────────

  const statCards = [
    {
      label: t('ai.total_requests', lang),
      value: stats ? formatTokens(stats.total_requests) : '-',
      icon: Activity,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: t('ai.total_tokens', lang),
      value: stats ? formatTokens(stats.total_tokens) : '-',
      icon: Hash,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      label: t('ai.total_cost', lang),
      value: stats ? formatCost(stats.total_cost) : '-',
      icon: Coins,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      label: t('ai.success_rate', lang),
      value: stats ? `${stats.success_rate.toFixed(0)}%` : '-',
      icon: CheckCircle2,
      color: stats ? getSuccessRateColor(stats.success_rate) : 'text-gray-500',
      bg: stats ? getSuccessRateBg(stats.success_rate) : 'bg-gray-50 dark:bg-gray-950',
    },
  ];

  // ── Status badge ───────────────────────────────────────────────────────────

  const statusBadge = (status: string) => {
    if (status === 'success') {
      return <Badge variant="success">{isTr ? 'Başarılı' : 'Success'}</Badge>;
    }
    return <Badge variant="destructive">{isTr ? 'Hata' : 'Error'}</Badge>;
  };

  // ── Request type badge ─────────────────────────────────────────────────────

  const requestTypeBadge = (type: string) => {
    if (type === 'generate') {
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border-transparent">
          {isTr ? 'Üretim' : 'Generate'}
        </Badge>
      );
    }
    if (type === 'improve') {
      return (
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 border-transparent">
          {isTr ? 'Geliştirme' : 'Improve'}
        </Badge>
      );
    }
    return <Badge variant="secondary">{type}</Badge>;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          {isTr ? 'AI Geçmişi' : 'AI History'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isTr
            ? 'AI içerik üretim geçmişi ve istatistikler'
            : 'AI content generation history and statistics'}
        </p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {isTr ? 'Filtreler' : 'Filters'}
              </span>
            </div>

            <Select value={filterProvider} onValueChange={setFilterProvider}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('ai.provider', lang)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {isTr ? 'Tüm Sağlayıcılar' : 'All Providers'}
                </SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="azure">Azure</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={isTr ? 'Durum' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {isTr ? 'Tüm Durumlar' : 'All Statuses'}
                </SelectItem>
                <SelectItem value="success">
                  {isTr ? 'Başarılı' : 'Success'}
                </SelectItem>
                <SelectItem value="error">
                  {isTr ? 'Hata' : 'Error'}
                </SelectItem>
              </SelectContent>
            </Select>

            <Button variant="default" size="sm" onClick={handleFilter}>
              <Filter className="h-4 w-4 mr-1" />
              {isTr ? 'Filtrele' : 'Filter'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Logs table ──────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  {t('common.loading', lang)}
                </p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              {isTr ? 'Henüz AI log kaydı yok' : 'No AI log entries yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      {isTr ? 'Tarih' : 'Date'}
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      {isTr ? 'Tür' : 'Type'}
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      {t('ai.provider', lang)}
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      {t('ai.model', lang)}
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                      {t('ai.tokens', lang)}
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                      {t('ai.cost', lang)}
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                      {t('ai.duration', lang)}
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      {isTr ? 'Durum' : 'Status'}
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      {isTr ? 'Yazı' : 'Post'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(log.created_at, lang)}
                      </td>
                      <td className="py-3 pr-4">
                        {requestTypeBadge(log.request_type)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-medium capitalize">
                          {log.provider_slug}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {log.model}
                        </code>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        <span title={`Prompt: ${formatTokens(log.prompt_tokens)} + Completion: ${formatTokens(log.completion_tokens)}`}>
                          {formatTokens(log.total_tokens)}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {formatTokens(log.prompt_tokens)} + {formatTokens(log.completion_tokens)}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {formatCost(log.estimated_cost)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {formatDuration(log.duration_ms)}
                      </td>
                      <td className="py-3 pr-4">
                        {statusBadge(log.status)}
                        {log.error_message && (
                          <p
                            className="text-xs text-destructive mt-1 max-w-[200px] truncate"
                            title={log.error_message}
                          >
                            {log.error_message}
                          </p>
                        )}
                      </td>
                      <td className="py-3">
                        {log.result_post_id ? (
                          <Link
                            to={`/posts/${log.result_post_id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="text-xs">#{log.result_post_id}</span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {meta && (
        <Pagination
          page={page}
          totalPages={meta.total_pages}
          total={meta.total}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(pp) => {
            setPerPageState(pp);
            setPage(1);
          }}
          lang={lang}
        />
      )}
    </div>
  );
}
