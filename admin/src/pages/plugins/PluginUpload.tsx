import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
import { ArrowLeft, Save, AlertTriangle, Check } from 'lucide-react';
import { useToast } from '@ui/toast-notification';

const DEFAULT_CODE = `// Plugin Worker - Izole V8 ortaminda calisir
// Kullanilabilir: Web API'leri, fetch (izin varsa)
// Kullanilamaz: D1, R2, KV veya ana worker binding'leri

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { hook, args, settings } = await request.json();

    try {
      const result = await handleHook(hook, args, settings);
      return Response.json({ result });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }
};

async function handleHook(hook, args, settings) {
  switch (hook) {
    case 'post.beforeRender':
      // HTML icerigini degistir ve geri dondur
      return args[0];

    case 'page.head':
      // <head> icine HTML ekle
      return args[0];

    case 'page.bodyEnd':
      // </body> oncesine HTML ekle
      return args[0];

    default:
      return args[0]; // degistirmeden gec
  }
}`;

const HOOK_GROUPS = [
  {
    label: 'Yazi',
    hooks: ['post.beforeSave', 'post.afterSave', 'post.beforeDelete', 'post.beforeRender'],
  },
  {
    label: 'Medya',
    hooks: ['media.afterUpload', 'media.beforeServe'],
  },
  {
    label: 'Yorum',
    hooks: ['comment.beforeSave', 'comment.afterSave'],
  },
  {
    label: 'Sayfa',
    hooks: ['page.head', 'page.bodyStart', 'page.bodyEnd'],
  },
  {
    label: 'API',
    hooks: ['api.response'],
  },
];

const PERMISSIONS = [
  { value: 'posts:read', label: 'posts:read', description: 'Yazilari okuyabilir', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'posts:write', label: 'posts:write', description: 'Yazilari duzenleyebilir', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'media:read', label: 'media:read', description: 'Medya dosyalarini okuyabilir', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'media:write', label: 'media:write', description: 'Medya dosyalarini duzenleyebilir', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'settings:read', label: 'settings:read', description: 'Site ayarlarini okuyabilir', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'settings:write', label: 'settings:write', description: 'Site ayarlarini duzenleyebilir', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'comments:read', label: 'comments:read', description: 'Yorumlari okuyabilir', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'comments:write', label: 'comments:write', description: 'Yorumlari duzenleyebilir', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'http:fetch', label: 'http:fetch', description: 'Dis sunuculara HTTP istegi yapabilir', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'page:inject', label: 'page:inject', description: 'Sayfalara HTML enjekte edebilir', color: 'bg-purple-100 text-purple-800 border-purple-200' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function PluginUpload() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [hooks, setHooks] = useState<Set<string>>(new Set());
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [code, setCode] = useState(DEFAULT_CODE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManual) {
      setSlug(slugify(name));
    }
  }, [name, slugManual]);

  const toggleHook = (hook: string) => {
    setHooks((prev) => {
      const next = new Set(prev);
      if (next.has(hook)) next.delete(hook);
      else next.add(hook);
      return next;
    });
  };

  const togglePermission = (perm: string) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const handleSlugChange = (value: string) => {
    setSlugManual(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Eklenti adi zorunludur');
      return;
    }
    if (!slug.trim()) {
      setError('Slug zorunludur');
      return;
    }
    if (hooks.size === 0) {
      setError('En az bir hook secmelisiniz');
      return;
    }
    if (!code.trim()) {
      setError('Eklenti kodu bos olamaz');
      return;
    }

    setSaving(true);
    try {
      const res = await api.deployPlugin({
        slug,
        name: name.trim(),
        code,
        hooks: Array.from(hooks),
        permissions: Array.from(permissions),
      });
      if ((res as any).success) {
        toast('Eklenti basariyla deploy edildi', 'success');
        navigate('/plugins');
      } else {
        setError((res as any).error || 'Eklenti deploy edilemedi');
      }
    } catch {
      setError('Eklenti deploy edilemedi');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/plugins')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Yeni Eklenti Olustur</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Section 1: Temel Bilgiler */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Temel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plugin-name">Eklenti Adi *</Label>
            <Input
              id="plugin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ornek: SEO Optimizer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plugin-slug">Slug *</Label>
            <Input
              id="plugin-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="ornek: seo-optimizer"
            />
            <p className="text-xs text-muted-foreground">
              Sadece kucuk harf, rakam ve tire kullanilabilir
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plugin-desc">Aciklama</Label>
            <Textarea
              id="plugin-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Eklenti ne yapar?"
              className="min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plugin-version">Versiyon</Label>
            <Input
              id="plugin-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              className="max-w-[200px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Hook'lar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hook'lar *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {HOOK_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-sm font-medium text-muted-foreground mb-2">{group.label}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {group.hooks.map((hook) => {
                  const isChecked = hooks.has(hook);
                  return (
                    <button
                      key={hook}
                      type="button"
                      onClick={() => toggleHook(hook)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
                        isChecked
                          ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/30'
                          : 'border-input bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground/40'
                      }`}>
                        {isChecked && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className="truncate">{hook}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            {hooks.size} hook secili
          </p>
        </CardContent>
      </Card>

      {/* Section 3: Izinler */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Izinler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERMISSIONS.map((perm) => {
              const isChecked = permissions.has(perm.value);
              return (
                <button
                  key={perm.value}
                  type="button"
                  onClick={() => togglePermission(perm.value)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-all text-left ${
                    isChecked
                      ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/30'
                      : 'border-input bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 transition-colors ${
                    isChecked
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground/40'
                  }`}>
                    {isChecked && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${perm.color}`}>
                      {perm.label}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {permissions.size} izin secili
          </p>
        </CardContent>
      </Card>

      {/* Section 4: Eklenti Kodu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eklenti Kodu</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono text-sm min-h-[400px]"
            placeholder="// Plugin kodunuzu buraya yazin..."
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Deploy ediliyor...' : 'Eklentiyi Kaydet ve Deploy Et'}
        </Button>
      </div>
    </div>
  );
}
