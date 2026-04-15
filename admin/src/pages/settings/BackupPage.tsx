import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card';
import { Badge } from '@ui/badge';
import { Download, Database, FileText, HardDrive } from 'lucide-react';
import { useToast } from '@ui/toast-notification';
import { Switch } from '@ui/switch';
import { Label } from '@ui/label';

export function BackupPage() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [mysqlCompat, setMysqlCompat] = useState(false);

  const handleExport = async (format: string) => {
    setLoading(format);
    try {
      if (format === 'wordpress' || format === 'sql') {
        // WXR and SQL exports return raw text - use raw fetch
        const token = api.getToken();
        const siteId = api.getSiteId();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (siteId) headers['X-Site-Id'] = String(siteId);
        const dialectParam = format === 'sql' && mysqlCompat ? '&dialect=mysql' : '';
        const res = await fetch(`/api/backup/export?sections=${format}${dialectParam}`, { headers });
        if (!res.ok) throw new Error('Export failed');
        const text = await res.text();
        const isXml = format === 'wordpress';
        const blob = new Blob([text], { type: isXml ? 'application/xml' : 'application/sql' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = isXml ? 'xml' : 'sql';
        const dialect = format === 'sql' && mysqlCompat ? 'mysql' : format === 'sql' ? 'sqlite' : 'wxr';
        a.download = `backup-${dialect}-${new Date().toISOString().slice(0, 10)}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const res = await api.exportBackup(format) as any;
        if (res.success) {
          const data = res.data;
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `backup-${format}-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
      toast(lang === 'tr' ? 'Yedek indirildi' : 'Backup downloaded', 'success');
    } catch {
      toast(lang === 'tr' ? 'Yedekleme başarısız' : 'Backup failed', 'error');
    } finally {
      setLoading(null);
    }
  };

  const backupOptions = [
    {
      format: 'full',
      icon: Database,
      title: lang === 'tr' ? 'Tam Yedekleme' : 'Full Backup',
      description: lang === 'tr'
        ? 'Tüm yazılar, sayfalar, medya bilgileri, taksonomiler, yorumlar ve ayarlar'
        : 'All posts, pages, media info, taxonomies, comments and settings',
      color: 'text-blue-500',
    },
    {
      format: 'content',
      icon: FileText,
      title: lang === 'tr' ? 'Sadece İçerik' : 'Content Only',
      description: lang === 'tr'
        ? 'Yazılar, sayfalar ve taksonomiler'
        : 'Posts, pages and taxonomies',
      color: 'text-green-500',
    },
    {
      format: 'wordpress',
      icon: Download,
      title: 'WordPress XML (WXR)',
      description: lang === 'tr'
        ? 'WordPress uyumlu dışa aktarma formatı'
        : 'WordPress-compatible export format',
      color: 'text-orange-500',
    },
    {
      format: 'sql',
      icon: HardDrive,
      title: lang === 'tr' ? 'SQL Veritabanı Dökümü' : 'SQL Database Dump',
      description: lang === 'tr'
        ? 'SQLite INSERT komutları ile tam veritabanı çıktısı'
        : 'Full database dump with SQLite INSERT statements',
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">{lang === 'tr' ? 'Yedekleme & Dışa Aktarma' : 'Backup & Export'}</h1>

      <div className="space-y-3">
        {backupOptions.map((opt) => (
          <Card key={opt.format}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg bg-muted ${opt.color}`}>
                    <opt.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">{opt.title}</h3>
                    <p className="text-sm text-muted-foreground">{opt.description}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleExport(opt.format)}
                  disabled={loading !== null}
                  variant="outline"
                >
                  {loading === opt.format ? (
                    t('common.loading', lang)
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {lang === 'tr' ? 'İndir' : 'Download'}
                    </>
                  )}
                </Button>
              </div>
              {opt.format === 'sql' && (
                <div className="flex items-center gap-2 mt-3 ml-14">
                  <Switch
                    id="mysql-compat"
                    checked={mysqlCompat}
                    onCheckedChange={setMysqlCompat}
                  />
                  <Label htmlFor="mysql-compat" className="text-sm cursor-pointer">
                    {lang === 'tr' ? 'MySQL uyumlu format' : 'MySQL compatible format'}
                  </Label>
                  {mysqlCompat && (
                    <Badge variant="outline" className="text-xs ml-1">MySQL / MariaDB</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
