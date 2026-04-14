import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Globe, Palette, FileText, MessageSquare } from 'lucide-react';

interface SiteHealthWidgetProps {
  domain?: string;
  themeName?: string;
  postCount: number | string;
  commentCount: number | string;
  lang: string;
}

export function SiteHealthWidget({
  domain,
  themeName,
  postCount,
  commentCount,
  lang,
}: SiteHealthWidgetProps) {
  const rows = [
    {
      icon: Globe,
      label: 'Domain',
      value: domain || '-',
      color: 'text-blue-500',
      badge: domain ? (lang === 'tr' ? 'Bagli' : 'Connected') : (lang === 'tr' ? 'Yok' : 'None'),
      badgeColor: domain
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
    },
    {
      icon: Palette,
      label: lang === 'tr' ? 'Tema' : 'Theme',
      value: themeName || 'starter',
      color: 'text-violet-500',
      badge: null,
      badgeColor: '',
    },
    {
      icon: FileText,
      label: lang === 'tr' ? 'Yazilar' : 'Posts',
      value: `${postCount} ${lang === 'tr' ? 'yayin' : 'published'}`,
      color: 'text-blue-500',
      badge: null,
      badgeColor: '',
    },
    {
      icon: MessageSquare,
      label: lang === 'tr' ? 'Yorumlar' : 'Comments',
      value: `${commentCount} ${lang === 'tr' ? 'toplam' : 'total'}`,
      color: 'text-amber-500',
      badge: null,
      badgeColor: '',
    },
  ];

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-500" />
          {lang === 'tr' ? 'Site Durumu' : 'Site Health'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <row.icon className={`h-4 w-4 ${row.color}`} />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{row.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{row.value}</span>
                {row.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.badgeColor}`}>
                    {row.badge}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
