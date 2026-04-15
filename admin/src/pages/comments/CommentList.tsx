import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@ui/lib/utils';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Card, CardContent } from '@ui/card';
import { Check, X, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination, getPerPage } from '@/components/shared/Pagination';
import { useToast } from '@ui/toast-notification';

export function CommentList() {
  const [comments, setComments] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { lang } = useAuthStore();
  const { toast } = useToast();

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPageState] = useState(getPerPage);

  useEffect(() => { loadComments(); }, [page, perPage]);

  const loadComments = async () => {
    setLoading(true);
    const res = await api.getComments({ per_page: String(perPage), page: String(page) });
    if (res.success) {
      setComments(res.data);
      setMeta(res.meta);
    }
    setLoading(false);
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.updateComment(id, { status });
      const msg = status === 'approved'
        ? (lang === 'tr' ? 'Yorum onaylandı' : 'Comment approved')
        : (lang === 'tr' ? 'Spam olarak işaretlendi' : 'Marked as spam');
      toast(msg, 'success');
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
    loadComments();
  };

  const handleDelete = (id: number) => setDeleteId(id);

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      await api.deleteComment(deleteId);
      toast(lang === 'tr' ? 'Yorum silindi' : 'Comment deleted', 'success');
    } catch {
      toast(lang === 'tr' ? 'Silme başarısız' : 'Delete failed', 'error');
    }
    setDeleteId(null);
    loadComments();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="success">{t('status.approved', lang)}</Badge>;
      case 'spam': return <Badge variant="destructive">{t('status.spam', lang)}</Badge>;
      default: return <Badge variant="secondary">{t('status.pending', lang)}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.comments', lang)}</h1>

      {loading ? (
        <p className="text-muted-foreground">{t('common.loading', lang)}</p>
      ) : comments.length === 0 ? (
        <p className="text-muted-foreground">{t('common.no_results', lang)}</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.author_name}</span>
                      {statusBadge(comment.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(comment.created_at, lang)}
                      </span>
                    </div>
                    {comment.author_email && (
                      <p className="text-xs text-muted-foreground mb-1">{comment.author_email}</p>
                    )}
                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: comment.content }} />
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {comment.status !== 'approved' && (
                      <Button variant="ghost" size="icon" onClick={() => updateStatus(comment.id, 'approved')} title="Approve">
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    {comment.status !== 'spam' && (
                      <Button variant="ghost" size="icon" onClick={() => updateStatus(comment.id, 'spam')} title="Spam">
                        <X className="h-4 w-4 text-yellow-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(comment.id)} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
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

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={confirmDelete}
        title={t('common.confirm_delete', lang)}
        description={lang === 'tr' ? 'Bu yorum kalıcı olarak silinecek.' : 'This comment will be permanently deleted.'}
        confirmLabel={t('action.delete', lang)}
        cancelLabel={t('action.cancel', lang)}
        variant="destructive"
      />
    </div>
  );
}
