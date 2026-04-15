import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { FileText, File, Image, ExternalLink, Zap } from 'lucide-react';
import { t } from '@/lib/i18n';

interface QuickActionsWidgetProps {
  siteUrl?: string;
  lang: string;
}

const actions = [
  {
    icon: FileText,
    labelKey: 'posts.new_post',
    to: '/posts/new',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    external: false,
  },
  {
    icon: File,
    labelKey: 'posts.new_page',
    to: '/pages/new',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    external: false,
  },
  {
    icon: Image,
    labelKey: 'media.title',
    to: '/media',
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    external: false,
  },
];

export function QuickActionsWidget({ siteUrl, lang }: QuickActionsWidgetProps) {
  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          {lang === 'tr' ? 'Hizli Islemler' : 'Quick Actions'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2.5">
          {actions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={`flex items-center gap-2.5 p-3 rounded-lg ${action.bg} hover:opacity-80 transition-all duration-150`}
            >
              <action.icon className={`h-4 w-4 ${action.color}`} />
              <span className="text-sm font-medium">{t(action.labelKey, lang)}</span>
            </Link>
          ))}
          {siteUrl && (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:opacity-80 transition-all duration-150"
            >
              <ExternalLink className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">
                {lang === 'tr' ? 'Siteyi Gor' : 'View Site'}
              </span>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
