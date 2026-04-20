import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Textarea } from '@ui/textarea';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@ui/toast-notification';

interface TaxonomyListProps {
  type: 'category' | 'tag';
}

export function TaxonomyList({ type }: TaxonomyListProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { lang } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => { loadItems(); }, [type]);

  const loadItems = async () => {
    setLoading(true);
    const res = await api.getTaxonomies({ type });
    if (res.success) setItems(res.data);
    setLoading(false);
  };

  const resetForm = () => {
    setName(''); setSlug(''); setDescription('');
    setEditId(null); setShowForm(false);
  };

  const handleSave = async () => {
    // Always send slug (even when empty) so the server can detect an
    // intentional "regenerate from name" on edit. POST also accepts
    // empty and falls back to the name-based default.
    const data = { name, slug, type, description };
    try {
      if (editId) {
        await api.updateTaxonomy(editId, data);
        toast(lang === 'tr' ? 'Güncellendi' : 'Updated successfully', 'success');
      } else {
        await api.createTaxonomy(data);
        toast(lang === 'tr' ? 'Oluşturuldu' : 'Created successfully', 'success');
      }
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
    resetForm();
    loadItems();
  };

  const handleEdit = (item: any) => {
    setName(item.name); setSlug(item.slug); setDescription(item.description || '');
    setEditId(item.id); setShowForm(true);
  };

  const handleDelete = (id: number) => setDeleteId(id);

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      await api.deleteTaxonomy(deleteId);
      toast(lang === 'tr' ? 'Silindi' : 'Deleted successfully', 'success');
    } catch {
      toast(lang === 'tr' ? 'Silme başarısız' : 'Delete failed', 'error');
    }
    setDeleteId(null);
    loadItems();
  };

  const title = type === 'category' ? t('nav.categories', lang) : t('nav.tags', lang);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4" /> {t('action.add_new', lang)}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[350px_1fr]">
        {showForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">
                {editId ? t('action.edit', lang) : t('action.create', lang)}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">{lang === 'tr' ? 'Ad' : 'Name'}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{lang === 'tr' ? 'Açıklama' : 'Description'}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <Button onClick={handleSave} className="w-full">{t('action.save', lang)}</Button>
            </CardContent>
          </Card>
        )}

        <Card className={showForm ? '' : 'lg:col-span-2'}>
          <CardContent className="pt-6">
            {loading ? (
              <p className="text-muted-foreground">{t('common.loading', lang)}</p>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground">{t('common.no_results', lang)}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">{lang === 'tr' ? 'Ad' : 'Name'}</th>
                    <th className="text-left py-2 px-2 font-medium">Slug</th>
                    <th className="text-left py-2 px-2 font-medium">{lang === 'tr' ? 'Sayı' : 'Count'}</th>
                    <th className="text-right py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 px-2 font-medium">{item.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{item.slug}</td>
                      <td className="py-2 px-2 text-muted-foreground">{item.count || 0}</td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
