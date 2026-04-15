import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { formatDate } from '@ui/lib/utils';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Input } from '@ui/input';
import { Card, CardContent, CardHeader } from '@ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Plus, Search, Pencil, Trash2, Globe, ExternalLink, CheckSquare, Clock } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination, getPerPage } from '@/components/shared/Pagination';
import { useToast } from '@ui/toast-notification';

interface PostListProps {
  postType?: string;
}

type BulkAction = '' | 'delete' | 'publish' | 'draft' | 'pending' | 'trash' | 'scheduled';

export function PostList({ postType = 'post' }: PostListProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>('');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [perPage, setPerPageState] = useState(getPerPage);

  const { lang } = useAuthStore();
  const { activeSite } = useSiteStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') || '1');

  useEffect(() => {
    loadPosts();
  }, [page, perPage, postType, activeSite?.id]);

  // Clear selection on page/type change
  useEffect(() => {
    setSelectedIds(new Set());
    setBulkAction('');
  }, [page, postType]);

  const loadPosts = async () => {
    setLoading(true);
    const res = await api.getPosts({
      page: String(page),
      per_page: String(perPage),
      post_type: postType,
      ...(search ? { search } : {}),
    });
    if (res.success) {
      setPosts(res.data);
      setMeta(res.meta);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPosts();
  };

  const handleDelete = (id: number) => setDeleteId(id);

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      await api.deletePost(deleteId);
      toast(lang === 'tr' ? 'Başarıyla silindi' : 'Deleted successfully', 'success');
    } catch {
      toast(lang === 'tr' ? 'Silme başarısız' : 'Delete failed', 'error');
    }
    setDeleteId(null);
    loadPosts();
  };

  // ── Bulk Selection ──
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === posts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map(p => p.id)));
    }
  };

  const isAllSelected = posts.length > 0 && selectedIds.size === posts.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < posts.length;
  const hasSelection = selectedIds.size > 0;

  // ── Bulk Action ──
  const handleBulkApply = () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkConfirmOpen(true);
  };

  const confirmBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkLoading(true);
    setBulkConfirmOpen(false);

    try {
      const ids = Array.from(selectedIds);
      let res;

      if (bulkAction === 'delete') {
        res = await api.bulkPostAction('delete', ids);
      } else {
        res = await api.bulkPostAction('status', ids, bulkAction);
      }

      if (res.success) {
        const count = res.data.affected;
        const actionLabel = bulkAction === 'delete'
          ? (lang === 'tr' ? 'silindi' : 'deleted')
          : (lang === 'tr' ? 'güncellendi' : 'updated');
        toast(`${count} ${lang === 'tr' ? 'öğe' : 'item(s)'} ${actionLabel}`, 'success');
      } else {
        toast(res.error || (lang === 'tr' ? 'İşlem başarısız' : 'Operation failed'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }

    setBulkLoading(false);
    setSelectedIds(new Set());
    setBulkAction('');
    loadPosts();
  };

  const getBulkConfirmText = () => {
    const count = selectedIds.size;
    if (bulkAction === 'delete') {
      return lang === 'tr'
        ? `Seçili ${count} öğe kalıcı olarak silinecek. Bu işlem geri alınamaz.`
        : `${count} selected item(s) will be permanently deleted. This cannot be undone.`;
    }
    const statusLabels: Record<string, string> = lang === 'tr'
      ? { publish: 'Yayınlandı', draft: 'Taslak', pending: 'Beklemede', trash: 'Çöp' }
      : { publish: 'Published', draft: 'Draft', pending: 'Pending', trash: 'Trash' };
    const label = statusLabels[bulkAction] || bulkAction;
    return lang === 'tr'
      ? `Seçili ${count} öğenin durumu "${label}" olarak değiştirilecek.`
      : `${count} selected item(s) will be changed to "${label}".`;
  };

  const getPrimaryDomain = (site: any) => {
    if (!site?.domains || site.domains.length === 0) return null;
    const primary = site.domains.find((d: any) => d.is_primary === 1);
    return primary || site.domains[0];
  };

  const isPage = postType === 'page';
  const titleKey = isPage ? 'nav.pages' : 'nav.posts';
  const newKey = isPage ? 'posts.new_page' : 'posts.new_post';
  const newPath = isPage ? '/pages/new' : '/posts/new';
  const editPath = isPage ? '/pages' : '/posts';
  const activeDomain = activeSite ? getPrimaryDomain(activeSite) : null;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'published':
      case 'publish':
        return <Badge variant="success">{t('status.published', lang)}</Badge>;
      case 'pending':
        return <Badge variant="warning">{lang === 'tr' ? 'Beklemede' : 'Pending'}</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">{t('status.scheduled', lang)}</Badge>;
      case 'trash':
        return <Badge variant="destructive">{lang === 'tr' ? 'Çöp' : 'Trash'}</Badge>;
      default:
        return <Badge variant="secondary">{t('status.draft', lang)}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t(titleKey, lang)}</h1>
          {activeSite && (
            <div className="flex items-center gap-2 mt-1">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{activeSite.name}</span>
              {activeDomain && (
                <a
                  href={`https://${activeDomain.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                >
                  <ExternalLink className="h-3 w-3" />
                  {activeDomain.domain}
                </a>
              )}
            </div>
          )}
        </div>
        <Button onClick={() => navigate(newPath)}>
          <Plus className="h-4 w-4" />
          {t(newKey, lang)}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <Input
                placeholder={t('action.search', lang)}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit" variant="secondary" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2">
              <Select value={bulkAction} onValueChange={(v) => setBulkAction(v as BulkAction)}>
                <SelectTrigger className="w-[180px]" disabled={!hasSelection}>
                  <SelectValue placeholder={lang === 'tr' ? 'Toplu İşlemler' : 'Bulk Actions'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delete">{lang === 'tr' ? 'Sil' : 'Delete'}</SelectItem>
                  <SelectItem value="publish">{lang === 'tr' ? 'Yayınla' : 'Publish'}</SelectItem>
                  <SelectItem value="draft">{lang === 'tr' ? 'Taslak' : 'Draft'}</SelectItem>
                  <SelectItem value="pending">{lang === 'tr' ? 'Beklemede' : 'Pending'}</SelectItem>
                  <SelectItem value="scheduled">{lang === 'tr' ? 'Zamanlanmış' : 'Scheduled'}</SelectItem>
                  <SelectItem value="trash">{lang === 'tr' ? 'Çöp Kutusuna At' : 'Move to Trash'}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                size="sm"
                disabled={!hasSelection || !bulkAction || bulkLoading}
                onClick={handleBulkApply}
              >
                {lang === 'tr' ? 'Uygula' : 'Apply'}
              </Button>
              {hasSelection && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {selectedIds.size} {lang === 'tr' ? 'seçili' : 'selected'}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t('common.loading', lang)}</p>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground">{t('posts.no_posts', lang)}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-2 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center w-5 h-5 rounded border border-input hover:border-primary transition-colors"
                        style={{
                          backgroundColor: isAllSelected ? 'hsl(var(--primary))' : isSomeSelected ? 'hsl(var(--primary) / 0.3)' : 'transparent',
                        }}
                        title={lang === 'tr' ? 'Tümünü Seç' : 'Select All'}
                      >
                        {(isAllSelected || isSomeSelected) && (
                          <CheckSquare className="h-3.5 w-3.5 text-primary-foreground" />
                        )}
                      </button>
                    </th>
                    <th className="text-left py-3 px-2 font-medium">{t('posts.title', lang)}</th>
                    <th className="text-left py-3 px-2 font-medium">{t('posts.author', lang)}</th>
                    <th className="text-left py-3 px-2 font-medium">{t('posts.status', lang)}</th>
                    <th className="text-left py-3 px-2 font-medium">{t('posts.date', lang)}</th>
                    <th className="text-right py-3 px-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => {
                    const checked = selectedIds.has(post.id);
                    return (
                      <tr
                        key={post.id}
                        className={`border-b last:border-0 hover:bg-muted/50 transition-colors ${checked ? 'bg-primary/5' : ''}`}
                      >
                        <td className="py-3 px-2">
                          <button
                            type="button"
                            onClick={() => toggleSelect(post.id)}
                            className="flex items-center justify-center w-5 h-5 rounded border border-input hover:border-primary transition-colors"
                            style={{
                              backgroundColor: checked ? 'hsl(var(--primary))' : 'transparent',
                            }}
                          >
                            {checked && <CheckSquare className="h-3.5 w-3.5 text-primary-foreground" />}
                          </button>
                        </td>
                        <td className="py-3 px-2">
                          <Link to={`${editPath}/${post.id}`} className="font-medium hover:text-primary">
                            {post.title || '(Untitled)'}
                          </Link>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{post.author_name || '-'}</td>
                        <td className="py-3 px-2">
                          <div className="space-y-0.5">
                            {statusBadge(post.status)}
                            {post.status === 'scheduled' && post.published_at && (
                              <p className="text-xs text-blue-500 flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {new Date(post.published_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{formatDate(post.created_at, lang)}</td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`${editPath}/${post.id}`)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {meta && (
            <Pagination
              page={page}
              totalPages={meta.total_pages}
              total={meta.total}
              perPage={perPage}
              onPageChange={(p) => setSearchParams({ page: String(p) })}
              onPerPageChange={(pp) => {
                setPerPageState(pp);
                setSearchParams({ page: '1' });
              }}
              lang={lang}
            />
          )}
        </CardContent>
      </Card>

      {/* Single delete confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={confirmDelete}
        title={t('common.confirm_delete', lang)}
        description={lang === 'tr' ? 'Bu öğe kalıcı olarak silinecek.' : 'This item will be permanently deleted.'}
        confirmLabel={t('action.delete', lang)}
        cancelLabel={t('action.cancel', lang)}
        variant="destructive"
      />

      {/* Bulk action confirm */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={(open) => { if (!open) setBulkConfirmOpen(false); }}
        onConfirm={confirmBulkAction}
        title={
          bulkAction === 'delete'
            ? (lang === 'tr' ? 'Toplu Silme Onayı' : 'Confirm Bulk Delete')
            : (lang === 'tr' ? 'Toplu Durum Değişikliği' : 'Confirm Bulk Status Change')
        }
        description={getBulkConfirmText()}
        confirmLabel={
          bulkAction === 'delete'
            ? (lang === 'tr' ? 'Sil' : 'Delete')
            : (lang === 'tr' ? 'Uygula' : 'Apply')
        }
        cancelLabel={t('action.cancel', lang)}
        variant={bulkAction === 'delete' ? 'destructive' : 'default'}
      />
    </div>
  );
}
