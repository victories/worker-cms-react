import { useState, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Badge } from '@ui/badge';
import { Upload, FileText, Check, AlertTriangle } from 'lucide-react';

export function WPImport() {
  const [file, setFile] = useState<File | null>(null);
  const [xmlContent, setXmlContent] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [language, setLanguage] = useState('tr');
  const [importMedia, setImportMedia] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);
  const { lang } = useAuthStore();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    const text = await f.text();
    setXmlContent(text);

    setLoading(true);
    try {
      const res = await api.importWordPressPreview(text) as any;
      setLoading(false);
      if (res.success) {
        setPreview(res.data);
        setStep('preview');
      } else {
        setError(res.error || (lang === 'tr' ? 'Dosya ayrıştırılamadı' : 'Failed to parse file'));
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || (lang === 'tr' ? 'Bağlantı hatası' : 'Connection error'));
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.importWordPress(xmlContent, language, importMedia) as any;
      setLoading(false);
      if (res.success) {
        setImportResult(res.data);
        setStep('done');
      } else {
        setError(res.error || (lang === 'tr' ? 'İçe aktarma başarısız' : 'Import failed'));
      }
    } catch (err: any) {
      setLoading(false);
      setError(
        err.message || (lang === 'tr'
          ? 'İçe aktarma sırasında bağlantı hatası oluştu. Lütfen tekrar deneyin.'
          : 'Connection error during import. Please try again.')
      );
    }
  };

  const reset = () => {
    setFile(null); setXmlContent(''); setPreview(null);
    setImportResult(null); setError(null); setStep('upload');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">{t('nav.import', lang)}</h1>

      {/* Error display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{lang === 'tr' ? 'Hata' : 'Error'}</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>WordPress XML (WXR)</CardTitle>
            <CardDescription>
              {lang === 'tr'
                ? 'WordPress dışa aktarma dosyanızı (.xml) yükleyin'
                : 'Upload your WordPress export file (.xml)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input ref={fileRef} type="file" accept=".xml" onChange={handleFile} className="hidden" />
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {loading ? t('common.loading', lang) : (lang === 'tr' ? 'Dosya seçin veya sürükleyin' : 'Choose a file or drag & drop')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && preview && (
        <Card>
          <CardHeader>
            <CardTitle>{lang === 'tr' ? 'İçe Aktarma Önizlemesi' : 'Import Preview'}</CardTitle>
            <CardDescription>{preview.title} - {preview.url}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted rounded">
                <div className="text-muted-foreground">{lang === 'tr' ? 'Toplam Öğe' : 'Total Items'}</div>
                <div className="text-2xl font-bold">{preview.items_total}</div>
              </div>
              <div className="p-3 bg-muted rounded">
                <div className="text-muted-foreground">{t('nav.categories', lang)}</div>
                <div className="text-2xl font-bold">{preview.categories}</div>
              </div>
              <div className="p-3 bg-muted rounded">
                <div className="text-muted-foreground">{t('nav.tags', lang)}</div>
                <div className="text-2xl font-bold">{preview.tags}</div>
              </div>
              <div className="p-3 bg-muted rounded">
                <div className="text-muted-foreground">{lang === 'tr' ? 'Yazarlar' : 'Authors'}</div>
                <div className="text-2xl font-bold">{preview.authors?.length || 0}</div>
              </div>
            </div>

            {preview.items_by_type && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.items_by_type).map(([type, count]) => (
                  <Badge key={type} variant="secondary">{type}: {count as number}</Badge>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">{lang === 'tr' ? 'Hedef Dil' : 'Target Language'}</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tr">Türkçe</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={importMedia}
                onChange={(e) => setImportMedia(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">
                {lang === 'tr' ? 'Medya dosyalarını indir (resimler, videolar)' : 'Download media files (images, videos)'}
              </span>
            </label>
            {importMedia && (
              <p className="text-xs text-muted-foreground ml-6">
                {lang === 'tr'
                  ? 'Dosyalar kaynak siteden indirilerek R2 depolamaya aktarılır. Çok sayıda medya dosyası varsa işlem uzun sürebilir.'
                  : 'Files will be downloaded from the source site and uploaded to R2 storage. This may take longer for sites with many media files.'}
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {lang === 'tr' ? 'İçe aktarılıyor...' : 'Importing...'}
                  </span>
                ) : (lang === 'tr' ? 'İçe Aktar' : 'Import')}
              </Button>
              <Button variant="outline" onClick={reset} disabled={loading}>{t('action.cancel', lang)}</Button>
            </div>

            {loading && (
              <p className="text-xs text-muted-foreground">
                {lang === 'tr'
                  ? 'Bu işlem büyük dosyalar için birkaç dakika sürebilir. Lütfen sayfayı kapatmayın.'
                  : 'This may take a few minutes for large files. Please do not close this page.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'done' && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              {lang === 'tr' ? 'İçe Aktarma Tamamlandı' : 'Import Complete'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {importResult.result && Object.entries(importResult.result)
              .filter(([key]) => key !== 'errors')
              .map(([key, val]: [string, any]) => (
              <div key={key} className="flex items-center justify-between text-sm border-b pb-2">
                <span className="font-medium capitalize">{key}</span>
                <div className="flex gap-3">
                  {val.imported > 0 && <Badge variant="success">{val.imported} imported</Badge>}
                  {val.skipped > 0 && <Badge variant="secondary">{val.skipped} skipped</Badge>}
                  {val.failed > 0 && <Badge variant="destructive">{val.failed} failed</Badge>}
                </div>
              </div>
            ))}

            {/* Show import errors if any */}
            {importResult.result?.errors?.length > 0 && (
              <div className="mt-3 p-3 bg-destructive/10 rounded text-sm">
                <p className="font-medium text-destructive mb-1">
                  {lang === 'tr' ? `${importResult.result.errors.length} hata oluştu:` : `${importResult.result.errors.length} errors occurred:`}
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground max-h-40 overflow-y-auto">
                  {importResult.result.errors.slice(0, 20).map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importResult.result.errors.length > 20 && (
                    <li className="text-muted-foreground/60">
                      ...{lang === 'tr' ? `ve ${importResult.result.errors.length - 20} hata daha` : `and ${importResult.result.errors.length - 20} more`}
                    </li>
                  )}
                </ul>
              </div>
            )}

            <Button onClick={reset} variant="outline" className="mt-4">
              {lang === 'tr' ? 'Yeni İçe Aktarma' : 'New Import'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
