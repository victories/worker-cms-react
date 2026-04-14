import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Mail, MailOpen, Reply, Trash2, ArrowLeft, Send, Clock, User, AtSign,
  MessageSquare, ChevronLeft, ChevronRight, Archive, RefreshCw, CheckCircle,
  AlertTriangle, Filter, Inbox,
} from 'lucide-react';

interface Submission {
  id: number;
  site_id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  reply_content: string | null;
  replied_at: string | null;
  replied_by: number | null;
  replied_by_name: string | null;
  ip_address: string | null;
  created_at: string;
}

interface ListResponse {
  success: boolean;
  data: Submission[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    unread_count: number;
  };
}

export function MessageList() {
  const { lang } = useAuthStore();
  const { activeSite } = useSiteStore();
  const tr = lang === 'tr';

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Detail view
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    if (!activeSite?.id) return;
    setLoading(true);
    try {
      let endpoint = `/contact/submissions?page=${page}&per_page=20`;
      if (filterStatus) endpoint += `&status=${filterStatus}`;
      const res = await api.request<ListResponse>(endpoint);
      if (res.success) {
        setSubmissions(res.data || []);
        setTotalPages(res.meta?.total_pages || 1);
        setTotal(res.meta?.total || 0);
        setUnreadCount(res.meta?.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
    }
    setLoading(false);
  }, [activeSite?.id, page, filterStatus]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const openDetail = async (sub: Submission) => {
    setActiveSubmission(sub);
    setReplyContent('');
    setReplySuccess(null);
    setReplyError(null);

    // Fetch full detail (auto-marks as read)
    try {
      const res = await api.request<{ success: boolean; data: Submission }>(`/contact/submissions/${sub.id}`);
      if (res.success && res.data) {
        setActiveSubmission(res.data);
        // Update list to reflect read status
        setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: res.data.status } : s));
        if (sub.status === 'unread') {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch {}
  };

  const handleReply = async () => {
    if (!activeSubmission || !replyContent.trim()) return;
    setReplying(true);
    setReplyError(null);
    setReplySuccess(null);

    try {
      const res = await api.request<{ success: boolean; error?: string }>(`/contact/submissions/${activeSubmission.id}/reply`, {
        method: 'POST',
        body: { content: replyContent.trim() },
      });

      if (res.success) {
        setReplySuccess(tr ? 'Yanıt gönderildi!' : 'Reply sent successfully!');
        setActiveSubmission(prev => prev ? { ...prev, status: 'replied', reply_content: replyContent.trim(), replied_at: new Date().toISOString() } : null);
        setSubmissions(prev => prev.map(s => s.id === activeSubmission.id ? { ...s, status: 'replied' } : s));
        setReplyContent('');
      } else {
        setReplyError(res.error || (tr ? 'Yanıt gönderilemedi' : 'Failed to send reply'));
      }
    } catch {
      setReplyError(tr ? 'Yanıt gönderilemedi' : 'Failed to send reply');
    }
    setReplying(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tr ? 'Bu mesajı silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this message?')) return;
    try {
      await api.request(`/contact/submissions/${id}`, { method: 'DELETE' });
      if (activeSubmission?.id === id) setActiveSubmission(null);
      setSubmissions(prev => prev.filter(s => s.id !== id));
      setTotal(prev => prev - 1);
    } catch {}
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    if (!confirm(tr ? `${selectedIds.size} mesajı silmek istediğinize emin misiniz?` : `Delete ${selectedIds.size} messages?`)) return;
    try {
      await api.request('/contact/submissions', {
        method: 'DELETE',
        body: { ids: Array.from(selectedIds) },
      });
      setSubmissions(prev => prev.filter(s => !selectedIds.has(s.id)));
      setTotal(prev => prev - selectedIds.size);
      setSelectedIds(new Set());
      if (activeSubmission && selectedIds.has(activeSubmission.id)) {
        setActiveSubmission(null);
      }
    } catch {}
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.request(`/contact/submissions/${id}/status`, {
        method: 'PUT',
        body: { status: newStatus },
      });
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      if (activeSubmission?.id === id) {
        setActiveSubmission(prev => prev ? { ...prev, status: newStatus } : null);
      }
      if (newStatus === 'unread') setUnreadCount(prev => prev + 1);
      if (newStatus !== 'unread') setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissions.map(s => s.id)));
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'unread':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">{tr ? 'Okunmadı' : 'Unread'}</Badge>;
      case 'read':
        return <Badge variant="secondary">{tr ? 'Okundu' : 'Read'}</Badge>;
      case 'replied':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">{tr ? 'Yanıtlandı' : 'Replied'}</Badge>;
      case 'archived':
        return <Badge variant="outline">{tr ? 'Arşiv' : 'Archived'}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'Z');
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return tr ? 'Az önce' : 'Just now';
    if (mins < 60) return `${mins} ${tr ? 'dk önce' : 'min ago'}`;
    if (hours < 24) return `${hours} ${tr ? 'saat önce' : 'hr ago'}`;
    if (days < 7) return `${days} ${tr ? 'gün önce' : 'days ago'}`;
    return d.toLocaleDateString(tr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ── Detail View ──
  if (activeSubmission) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setActiveSubmission(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {tr ? 'Geri' : 'Back'}
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {activeSubmission.status !== 'archived' && (
              <Button variant="ghost" size="sm" onClick={() => handleStatusChange(activeSubmission.id, 'archived')}>
                <Archive className="h-4 w-4 mr-1" />
                {tr ? 'Arşivle' : 'Archive'}
              </Button>
            )}
            {activeSubmission.status === 'read' && (
              <Button variant="ghost" size="sm" onClick={() => handleStatusChange(activeSubmission.id, 'unread')}>
                <Mail className="h-4 w-4 mr-1" />
                {tr ? 'Okunmadı yap' : 'Mark unread'}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(activeSubmission.id)}>
              <Trash2 className="h-4 w-4 mr-1" />
              {tr ? 'Sil' : 'Delete'}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">{activeSubmission.subject || (tr ? '(Konusuz)' : '(No Subject)')}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{activeSubmission.name}</span>
                  <span className="flex items-center gap-1"><AtSign className="h-3.5 w-3.5" />{activeSubmission.email}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDate(activeSubmission.created_at)}</span>
                </div>
              </div>
              {statusBadge(activeSubmission.status)}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed">
              {activeSubmission.message}
            </div>

            {activeSubmission.ip_address && (
              <p className="text-xs text-muted-foreground mt-3">IP: {activeSubmission.ip_address}</p>
            )}
          </CardContent>
        </Card>

        {/* Previous reply */}
        {activeSubmission.reply_content && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                <Reply className="h-4 w-4" />
                {tr ? 'Gönderilen Yanıt' : 'Sent Reply'}
                {activeSubmission.replied_at && (
                  <span className="text-xs font-normal text-muted-foreground">— {formatDate(activeSubmission.replied_at)}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 whitespace-pre-wrap text-sm">
                {activeSubmission.reply_content}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reply form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Reply className="h-4 w-4" />
              {tr ? 'Yanıt Yaz' : 'Write Reply'}
              <span className="text-xs font-normal text-muted-foreground">→ {activeSubmission.email}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {replySuccess && (
              <div className="flex items-center gap-2 p-3 mb-3 rounded-md bg-green-500/10 text-green-700 text-sm">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {replySuccess}
              </div>
            )}
            {replyError && (
              <div className="flex items-center gap-2 p-3 mb-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {replyError}
              </div>
            )}
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={tr ? 'Yanıtınızı yazın...' : 'Type your reply...'}
              className="min-h-[120px] mb-3"
            />
            <Button onClick={handleReply} disabled={replying || !replyContent.trim()}>
              <Send className="h-4 w-4 mr-2" />
              {replying ? (tr ? 'Gönderiliyor...' : 'Sending...') : (tr ? 'Yanıt Gönder' : 'Send Reply')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">{tr ? 'İletişim Mesajları' : 'Contact Messages'}</h1>
            <p className="text-sm text-muted-foreground">
              {total} {tr ? 'mesaj' : 'message(s)'}
              {unreadCount > 0 && (
                <span className="text-blue-600 font-medium ml-1">
                  ({unreadCount} {tr ? 'okunmadı' : 'unread'})
                </span>
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setPage(1); loadSubmissions(); }}>
          <RefreshCw className="h-4 w-4 mr-1" />
          {tr ? 'Yenile' : 'Refresh'}
        </Button>
      </div>

      {/* Filters + Bulk actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {[
            { key: '', label: tr ? 'Tümü' : 'All' },
            { key: 'unread', label: tr ? 'Okunmadı' : 'Unread' },
            { key: 'read', label: tr ? 'Okundu' : 'Read' },
            { key: 'replied', label: tr ? 'Yanıtlandı' : 'Replied' },
            { key: 'archived', label: tr ? 'Arşiv' : 'Archived' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { setFilterStatus(f.key); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterStatus === f.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {tr ? `${selectedIds.size} Sil` : `Delete ${selectedIds.size}`}
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('common.loading', lang)}
          </CardContent>
        </Card>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">
              {tr ? 'Henüz mesaj yok' : 'No messages yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Select all header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={selectedIds.size === submissions.length && submissions.length > 0}
                onChange={toggleSelectAll}
                className="rounded"
              />
              <span>{tr ? 'Tümünü seç' : 'Select all'}</span>
            </div>

            <div className="divide-y">
              {submissions.map(sub => (
                <div
                  key={sub.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors ${
                    sub.status === 'unread' ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''
                  }`}
                >
                  <div className="pt-1" onClick={(e) => { e.stopPropagation(); toggleSelect(sub.id); }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(sub.id)}
                      onChange={() => toggleSelect(sub.id)}
                      className="rounded"
                    />
                  </div>
                  <div className="pt-0.5">
                    {sub.status === 'unread' ? (
                      <Mail className="h-4 w-4 text-blue-500" />
                    ) : sub.status === 'replied' ? (
                      <Reply className="h-4 w-4 text-green-500" />
                    ) : (
                      <MailOpen className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => openDetail(sub)}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm truncate ${sub.status === 'unread' ? 'font-semibold' : ''}`}>
                        {sub.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        &lt;{sub.email}&gt;
                      </span>
                    </div>
                    <p className={`text-sm truncate mt-0.5 ${sub.status === 'unread' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {sub.subject || (tr ? '(Konusuz)' : '(No Subject)')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {sub.message.slice(0, 100)}{sub.message.length > 100 ? '...' : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(sub.created_at)}</span>
                    {statusBadge(sub.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
