import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Puzzle, Power, PowerOff, Settings, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/toast-notification';

export function PluginList() {
  const { lang } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    setLoading(true);
    const res = await api.request<any>('/plugins');
    setLoading(false);
    if (res.success) setPlugins(res.data || []);
  };

  const togglePlugin = async (plugin: any) => {
    const action = plugin.is_active ? 'deactivate' : 'activate';
    try {
      await api.request(`/plugins/${plugin.id}/${action}`, { method: 'POST' });
      const msg = plugin.is_active
        ? (lang === 'tr' ? 'Eklenti devre dışı bırakıldı' : 'Plugin deactivated')
        : (lang === 'tr' ? 'Eklenti aktifleştirildi' : 'Plugin activated');
      toast(msg, 'success');
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
    loadPlugins();
  };

  if (loading) return <div className="p-4">{t('common.loading', lang)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.plugins', lang)}</h1>
        <Button size="sm" onClick={() => navigate('/plugins/new')}>
          <Plus className="h-4 w-4 mr-1" />
          {lang === 'tr' ? 'Yeni Eklenti' : 'New Plugin'}
        </Button>
      </div>

      {plugins.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Puzzle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {lang === 'tr' ? 'Henüz eklenti yüklenmemiş' : 'No plugins installed yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plugins.map((plugin) => (
            <Card key={plugin.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${plugin.is_active ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-muted text-muted-foreground'}`}>
                    <Puzzle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{plugin.name}</h3>
                      <Badge variant="secondary" className="text-xs">v{plugin.version}</Badge>
                      {plugin.is_active ? (
                        <Badge variant="success">{lang === 'tr' ? 'Aktif' : 'Active'}</Badge>
                      ) : (
                        <Badge variant="secondary">{lang === 'tr' ? 'Pasif' : 'Inactive'}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{plugin.description}</p>
                    {plugin.author && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {lang === 'tr' ? 'Geliştirici' : 'Author'}: {plugin.author}
                      </p>
                    )}
                    {plugin.permissions && (() => {
                      try {
                        const perms: string[] = typeof plugin.permissions === 'string' ? JSON.parse(plugin.permissions) : plugin.permissions;
                        const colorMap: Record<string, string> = {
                          'read': 'bg-blue-100 text-blue-800',
                          'write': 'bg-amber-100 text-amber-800',
                          'fetch': 'bg-orange-100 text-orange-800',
                          'inject': 'bg-purple-100 text-purple-800',
                        };
                        return (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {perms.map((p: string) => {
                              const suffix = p.split(':')[1] || p;
                              const color = colorMap[suffix] || 'bg-gray-100 text-gray-800';
                              return (
                                <span key={p} className={`text-xs px-1.5 py-0.5 rounded ${color}`}>
                                  {p}
                                </span>
                              );
                            })}
                          </div>
                        );
                      } catch { return null; }
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/plugins/${plugin.slug}/logs`} className="text-xs text-gray-500 hover:text-gray-700">
                    Loglar
                  </Link>
                  {plugin.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/plugins/${plugin.id}/settings`)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      {lang === 'tr' ? 'Ayarlar' : 'Settings'}
                    </Button>
                  )}
                  <Button
                    variant={plugin.is_active ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => togglePlugin(plugin)}
                  >
                    {plugin.is_active ? (
                      <>
                        <PowerOff className="h-4 w-4 mr-1" />
                        {lang === 'tr' ? 'Devre Dışı' : 'Deactivate'}
                      </>
                    ) : (
                      <>
                        <Power className="h-4 w-4 mr-1" />
                        {lang === 'tr' ? 'Aktifleştir' : 'Activate'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
