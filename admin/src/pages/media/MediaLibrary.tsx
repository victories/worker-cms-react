import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { formatBytes, formatDate, mediaUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, File, X, CheckSquare, Square, RefreshCw, Save } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination, getPerPage } from '@/components/shared/Pagination';
import { useToast } from '@/components/ui/toast-notification';

export function MediaLibrary() {
  const [media, setMedia] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { lang } = useAuthStore();
  const { toast } = useToast();

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPageState] = useState(getPerPage);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [editAltText, setEditAltText] = useState('');
  const [savingAlt, setSavingAlt] = useState(false);

  useEffect(() => {
    loadMedia();
  }, [page, perPage]);

  const loadMedia = async () => {
    setLoading(true);
    const res = await api.getMedia({ per_page: String(perPage), page: String(page) });
    if (res.success) {
      setMedia(res.data);
      setMeta(res.meta);
    }
    setLoading(false);
  };

  // Generate alt text from filename: "my-photo_2024.jpg" -> "my photo 2024"
  const altTextFromFilename = (filename: string) =>
    filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('alt_text', altTextFromFilename(file.name));
        await api.uploadMedia(formData);
      }
      toast(lang === 'tr' ? 'Dosyalar yüklendi' : 'Files uploaded successfully', 'success');
    } catch {
      toast(lang === 'tr' ? 'Yükleme başarısız' : 'Upload failed', 'error');
    }
    setUploading(false);
    loadMedia();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: number) => setDeleteId(id);

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      await api.deleteMedia(deleteId);
      toast(lang === 'tr' ? 'Dosya silindi' : 'File deleted', 'success');
    } catch {
      toast(lang === 'tr' ? 'Silme başarısız' : 'Delete failed', 'error');
    }
    setDeleteId(null);
    setSelected(null);
    loadMedia();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('alt_text', altTextFromFilename(file.name));
        await api.uploadMedia(formData);
      }
      toast(lang === 'tr' ? 'Dosyalar yüklendi' : 'Files uploaded successfully', 'success');
    } catch {
      toast(lang === 'tr' ? 'Yükleme başarısız' : 'Upload failed', 'error');
    }
    setUploading(false);
    loadMedia();
  };

  const isImage = (mime: string) => mime?.startsWith('image/');

  // Bulk selection functions
  const toggleSelect = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === media.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(media.map(m => m.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const enterSelectMode = () => {
    setSelectMode(true);
  };

  const isAllSelected = media.length > 0 && selectedIds.size === media.length;
  const hasSelection = selectedIds.size > 0;

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setBulkConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    setBulkConfirmOpen(false);

    try {
      const ids = Array.from(selectedIds);
      const res = await api.bulkMediaAction('delete', ids);

      if (res.success) {
        const count = res.data.affected;
        toast(
          lang === 'tr'
            ? `${count} dosya silindi`
            : `${count} file(s) deleted`,
          'success'
        );
      } else {
        toast(res.error || (lang === 'tr' ? 'İşlem başarısız' : 'Operation failed'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Toplu silme başarısız' : 'Bulk delete failed', 'error');
    }

    setBulkLoading(false);
    setSelectedIds(new Set());
    setSelectMode(false);
    loadMedia();
  };

  const handleScanR2 = async () => {
    setScanning(true);
    try {
      const res = await api.scanR2Media();
      if (res.success) {
        const { registered, total, already_tracked } = res.data;
        if (registered > 0) {
          toast(
            lang === 'tr'
              ? `${registered} yeni dosya bulundu ve eklendi (toplam R2: ${total})`
              : `Found and registered ${registered} new file(s) (total R2: ${total})`,
            'success'
          );
          loadMedia();
        } else {
          toast(
            lang === 'tr'
              ? `Yeni dosya bulunamadı (takip edilen: ${already_tracked})`
              : `No new files found (tracked: ${already_tracked})`,
            'info'
          );
        }
      }
    } catch {
      toast(lang === 'tr' ? 'R2 tarama başarısız' : 'R2 scan failed', 'error');
    }
    setScanning(false);
  };

  const handleItemClick = (item: any) => {
    if (selectMode) {
      toggleSelect(item.id);
    } else {
      setSelected(item);
      setEditAltText(item.alt_text || '');
    }
  };

  const handleSaveAltText = async () => {
    if (!selected) return;
    setSavingAlt(true);
    try {
      const res = await api.updateMedia(selected.id, { alt_text: editAltText }) as any;
      if (res?.success) {
        toast(lang === 'tr' ? 'Alt etiket kaydedildi' : 'Alt text saved', 'success');
        setSelected({ ...selected, alt_text: editAltText });
        setMedia(prev => prev.map(m => m.id === selected.id ? { ...m, alt_text: editAltText } : m));
      } else {
        toast(res?.error || 'Failed', 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Kaydetme başarısız' : 'Save failed', 'error');
    }
    setSavingAlt(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('media.library', lang)}</h1>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {isAllSelected
                  ? (lang === 'tr' ? 'Seçimi Kaldır' : 'Deselect All')
                  : (lang === 'tr' ? 'Tümünü Seç' : 'Select All')}
              </Button>
              {hasSelection && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkLoading}
                >
                  <Trash2 className="h-4 w-4" />
                  {bulkLoading
                    ? (lang === 'tr' ? 'Siliniyor...' : 'Deleting...')
                    : lang === 'tr'
                      ? `${selectedIds.size} Dosya Sil`
                      : `Delete ${selectedIds.size} File(s)`}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                <X className="h-4 w-4" />
                {lang === 'tr' ? 'İptal' : 'Cancel'}
              </Button>
            </>
          ) : (
            <>
              {media.length > 0 && (
                <Button variant="outline" size="sm" onClick={enterSelectMode}>
                  <CheckSquare className="h-4 w-4" />
                  {lang === 'tr' ? 'Seç' : 'Select'}
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                onChange={handleUpload}
                className="hidden"
              />
              <Button variant="outline" onClick={handleScanR2} disabled={scanning}>
                <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
                {scanning
                  ? (lang === 'tr' ? 'Taranıyor...' : 'Scanning...')
                  : (lang === 'tr' ? 'R2 Tara' : 'Scan R2')}
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4" />
                {uploading ? t('common.loading', lang) : t('media.upload_files', lang)}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Selection info bar */}
      {selectMode && hasSelection && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {lang === 'tr'
              ? `${selectedIds.size} dosya seçildi`
              : `${selectedIds.size} file(s) selected`}
          </span>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-muted-foreground">{t('common.loading', lang)}</p>
          ) : media.length === 0 && page === 1 ? (
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('media.drop_files', lang)}</p>
            </div>
          ) : (
            <>
              {!selectMode && (
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center mb-4 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <p className="text-sm text-muted-foreground">{t('media.drop_files', lang)}</p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className={`group relative aspect-square rounded-lg border overflow-hidden cursor-pointer transition-all ${
                      selectedIds.has(item.id)
                        ? 'ring-2 ring-primary border-primary bg-primary/5'
                        : 'hover:ring-2 hover:ring-primary'
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    {isImage(item.mime_type) ? (
                      <img
                        src={item.r2_key ? mediaUrl(item.r2_key) : `/uploads/${item.filename}`}
                        alt={item.alt_text || item.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted p-2">
                        <File className="h-8 w-8 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground truncate w-full text-center">
                          {item.filename}
                        </span>
                      </div>
                    )}
                    {/* Checkbox overlay in select mode */}
                    {selectMode && (
                      <div
                        className={`absolute top-1.5 left-1.5 rounded-md p-0.5 transition-colors ${
                          selectedIds.has(item.id)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white/80 dark:bg-black/50 text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={(e) => toggleSelect(item.id, e)}
                      >
                        {selectedIds.has(item.id) ? (
                          <CheckSquare className="h-5 w-5" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </div>
                    )}
                    {/* Selected overlay */}
                    {selectMode && selectedIds.has(item.id) && (
                      <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {meta && (
                <Pagination
                  page={page}
                  totalPages={meta.total_pages}
                  total={meta.total}
                  perPage={perPage}
                  onPageChange={(p) => {
                    setPage(p);
                    setSelectedIds(new Set());
                  }}
                  onPerPageChange={(pp) => {
                    setPerPageState(pp);
                    setPage(1);
                    setSelectedIds(new Set());
                  }}
                  lang={lang}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.filename}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[200px]">
                {isImage(selected.mime_type) ? (
                  <img
                    src={selected.r2_key ? mediaUrl(selected.r2_key) : `/uploads/${selected.filename}`}
                    alt={selected.alt_text || selected.filename}
                    className="max-w-full max-h-[400px] object-contain"
                  />
                ) : (
                  <File className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">{lang === 'tr' ? 'Dosya Adı' : 'Filename'}:</span>
                  <p className="text-muted-foreground">{selected.filename}</p>
                </div>
                {isImage(selected.mime_type) && (
                  <div>
                    <Label htmlFor="alt-text" className="font-medium text-sm">
                      {lang === 'tr' ? 'Alt Etiket (Alt Text)' : 'Alt Text'}
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="alt-text"
                        value={editAltText}
                        onChange={(e) => setEditAltText(e.target.value)}
                        placeholder={lang === 'tr' ? 'Resim açıklaması...' : 'Image description...'}
                        className="h-8 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 shrink-0"
                        onClick={handleSaveAltText}
                        disabled={savingAlt}
                      >
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <span className="font-medium">{lang === 'tr' ? 'Tür' : 'Type'}:</span>
                  <p className="text-muted-foreground">{selected.mime_type}</p>
                </div>
                <div>
                  <span className="font-medium">{lang === 'tr' ? 'Boyut' : 'Size'}:</span>
                  <p className="text-muted-foreground">{formatBytes(selected.size)}</p>
                </div>
                {selected.width && (
                  <div>
                    <span className="font-medium">{lang === 'tr' ? 'Boyutlar' : 'Dimensions'}:</span>
                    <p className="text-muted-foreground">{selected.width} x {selected.height}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium">{lang === 'tr' ? 'Tarih' : 'Date'}:</span>
                  <p className="text-muted-foreground">{formatDate(selected.created_at, lang)}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(selected.id)}>
                  <Trash2 className="h-4 w-4" />
                  {t('action.delete', lang)}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Single delete confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={confirmDelete}
        title={t('common.confirm_delete', lang)}
        description={lang === 'tr' ? 'Bu dosya kalıcı olarak silinecek.' : 'This file will be permanently deleted.'}
        confirmLabel={t('action.delete', lang)}
        cancelLabel={t('action.cancel', lang)}
        variant="destructive"
      />

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={(open) => { if (!open) setBulkConfirmOpen(false); }}
        onConfirm={confirmBulkDelete}
        title={lang === 'tr' ? 'Toplu Silme Onayı' : 'Confirm Bulk Delete'}
        description={
          lang === 'tr'
            ? `${selectedIds.size} dosya kalıcı olarak silinecek. R2 depolamadan da kaldırılacak. Bu işlem geri alınamaz.`
            : `${selectedIds.size} file(s) will be permanently deleted from both database and R2 storage. This cannot be undone.`
        }
        confirmLabel={
          lang === 'tr'
            ? `${selectedIds.size} Dosyayı Sil`
            : `Delete ${selectedIds.size} File(s)`
        }
        cancelLabel={t('action.cancel', lang)}
        variant="destructive"
      />
    </div>
  );
}
