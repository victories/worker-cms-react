import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast-notification';
import { Plus, Edit2, Trash2, FileText, Package, Image, ShoppingBag, Briefcase, BookOpen, Users, Film, Music, MapPin, Calendar, Heart, Star } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  'file-text': FileText,
  'package': Package,
  'image': Image,
  'shopping-bag': ShoppingBag,
  'briefcase': Briefcase,
  'book-open': BookOpen,
  'users': Users,
  'film': Film,
  'music': Music,
  'map-pin': MapPin,
  'calendar': Calendar,
  'heart': Heart,
  'star': Star,
};

export function ContentTypeList() {
  const { lang } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTypes = async () => {
    try {
      const res = await api.request<{ success: boolean; data: any[] }>('/content-types');
      if (res.success) setTypes(res.data);
    } catch {
      toast('İçerik tipleri yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTypes(); }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm('Bu içerik tipini silmek istediğinize emin misiniz?')) return;
    try {
      await api.request(`/content-types/${slug}`, { method: 'DELETE' });
      toast('İçerik tipi silindi', 'success');
      loadTypes();
    } catch {
      toast('Silinemedi', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('İçerik Tipleri', lang)}</h1>
          <p className="text-muted-foreground">{t('Özel içerik tiplerini yönetin', lang)}</p>
        </div>
        <Button onClick={() => navigate('/content-types/new')}>
          <Plus className="w-4 h-4 mr-2" />
          {t('Yeni İçerik Tipi', lang)}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>
      ) : types.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Henüz içerik tipi yok</h3>
            <p className="text-muted-foreground mb-4">
              Ürünler, portfolyo, etkinlikler gibi özel içerik tipleri oluşturun.
            </p>
            <Button onClick={() => navigate('/content-types/new')}>
              <Plus className="w-4 h-4 mr-2" />
              İlk İçerik Tipini Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {types.map((ct) => {
            const IconComp = ICON_MAP[ct.icon] || FileText;
            const fieldCount = ct.fields?.length || 0;
            return (
              <Card key={ct.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <IconComp className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{ct.name}</CardTitle>
                        <p className="text-sm text-muted-foreground font-mono">{ct.slug}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{fieldCount} alan</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {ct.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{ct.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    {ct.supports?.includes('editor') && <Badge variant="outline" className="text-xs">Editör</Badge>}
                    {ct.supports?.includes('thumbnail') && <Badge variant="outline" className="text-xs">Görsel</Badge>}
                    {ct.has_archive ? <Badge variant="outline" className="text-xs">Arşiv</Badge> : null}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/content-types/${ct.slug}/edit`)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Düzenle
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/content/${ct.slug}`)}>
                      Yazılar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(ct.slug)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
