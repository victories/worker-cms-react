import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card';
import { Switch } from '@ui/switch';
import { Separator } from '@ui/separator';
import {
  Save, Rocket, Eye, RotateCcw, Palette, Type, Star, CreditCard,
  MessageSquare, Megaphone, Plus, Trash2, ChevronDown, GripVertical,
  Zap, Layers, Globe2, Bot, Shield, Code, ExternalLink,
  Menu as MenuIcon, Link2,
} from 'lucide-react';
import { useToast } from '@ui/toast-notification';

const ICON_OPTIONS = [
  { value: 'zap', label: 'Zap', Icon: Zap },
  { value: 'layers', label: 'Layers', Icon: Layers },
  { value: 'globe', label: 'Globe', Icon: Globe2 },
  { value: 'bot', label: 'Bot', Icon: Bot },
  { value: 'shield', label: 'Shield', Icon: Shield },
  { value: 'code', label: 'Code', Icon: Code },
  { value: 'star', label: 'Star', Icon: Star },
  { value: 'zap', label: 'Rocket', Icon: Rocket },
];

interface LandingConfig {
  enabled: boolean;
  brand: { name: string; logo_url: string; tagline: string };
  colors: {
    primary: string; accent: string;
    bg_dark: string; bg_light: string;
    text_light: string; text_dark: string;
  };
  hero: {
    badge: string; title: string; subtitle: string;
    cta_text: string; cta_url: string;
    secondary_cta_text: string; secondary_cta_url: string;
    stats: { value: string; label: string }[];
  };
  features: {
    title: string; subtitle: string;
    items: { icon: string; title: string; desc: string }[];
  };
  pricing: {
    title: string; subtitle: string;
    plans: {
      name: string; price: string; currency: string; period: string;
      desc: string; features: string[];
      cta_text: string; cta_url: string; highlighted: boolean;
    }[];
  };
  testimonials: {
    title: string;
    items: { text: string; author: string; role: string; avatar: string }[];
  };
  cta: { title: string; subtitle: string; button_text: string; button_url: string };
  /**
   * Top navigation. Added in the v2 redesign so admins can edit the
   * header link list shown above the hero. Optional — older configs
   * without a `nav` block get an empty defaults bag from the loader.
   */
  nav: {
    items: { label: string; url: string }[];
    login_text: string;
    login_url: string;
    cta_text: string;
    cta_url: string;
  };
  /**
   * Multi-column footer (v2 redesign). `columns` is the new canonical
   * shape; `links` (flat list) is kept for backwards-compat — anything
   * read out of `columns` wins when both exist.
   */
  footer: {
    text: string;
    description?: string;
    copyright?: string;
    side_text?: string;
    columns?: { title: string; links: { text: string; url: string }[] }[];
    links: { text: string; url: string }[];
  };
}

// --- Stable sub-components defined OUTSIDE the main component ---

function SectionCard({ id, icon: Icon, title, desc, open, onToggle, children }: {
  id: string; icon: any; title: string; desc?: string; open: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={() => onToggle(id)}>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <Icon className="h-5 w-5" /> {title}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </CardTitle>
        {desc && !open && <CardDescription className="text-xs mt-1">{desc}</CardDescription>}
      </CardHeader>
      {open && <CardContent className="space-y-4">{children}</CardContent>}
    </Card>
  );
}

function Field({ label, value, onChange, placeholder, multiline, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {multiline ? (
        <Textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} />
      ) : (
        <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border cursor-pointer p-0.5" />
        <Input value={value} onChange={e => onChange(e.target.value)} className="font-mono text-sm" />
      </div>
    </div>
  );
}

// --- Main component ---

export function LandingSettings() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    brand: true, colors: true, hero: true, features: false,
    pricing: false, testimonials: false, cta: false, footer: false,
  });

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await (api as any).request('/landing');
      if (res.success && res.data) setConfig(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await (api as any).request('/landing', { method: 'PUT', body: config });
      toast(lang === 'tr' ? 'Landing sayfası kaydedildi' : 'Landing page saved', 'success');
    } catch {
      toast(lang === 'tr' ? 'Kaydetme başarısız' : 'Save failed', 'error');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    try {
      const res = await (api as any).request('/landing/default');
      if (res.success && res.data) {
        setConfig(res.data);
        toast(lang === 'tr' ? 'Varsayılana sıfırlandı' : 'Reset to default', 'success');
      }
    } catch { /* ignore */ }
  };

  const toggle = useCallback((key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] })), []);

  const updateConfig = useCallback((path: string, value: any) => {
    setConfig(prev => {
      if (!prev) return prev;
      const keys = path.split('.');
      const newConfig = JSON.parse(JSON.stringify(prev));
      let obj: any = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!isNaN(Number(k))) obj = obj[Number(k)];
        else obj = obj[k];
      }
      const lastKey = keys[keys.length - 1];
      if (!isNaN(Number(lastKey))) obj[Number(lastKey)] = value;
      else obj[lastKey] = value;
      return newConfig;
    });
  }, []);

  if (loading || !config) return <div className="p-4">{lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6" />
            {lang === 'tr' ? 'Tanıtım Sayfası' : 'Landing Page'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'tr'
              ? 'Satış ve tanıtım sayfasının tüm içeriklerini, renklerini ve görünümünü düzenleyin.'
              : 'Edit all content, colors, and appearance of the landing page.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleReset} title={lang === 'tr' ? 'Varsayılana Sıfırla' : 'Reset to Default'}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <a href="/landing" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="icon" title={lang === 'tr' ? 'Önizle' : 'Preview'}>
              <Eye className="h-4 w-4" />
            </Button>
          </a>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...') : (lang === 'tr' ? 'Kaydet' : 'Save')}
          </Button>
        </div>
      </div>

      {/* Enable/Disable */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{lang === 'tr' ? 'Tanıtım Sayfası Aktif' : 'Landing Page Active'}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'tr' ? 'Kapalıyken /landing adresi 404 döner' : 'When disabled, /landing returns 404'}
              </p>
            </div>
            <Switch checked={config.enabled} onCheckedChange={v => updateConfig('enabled', v)} />
          </div>
        </CardContent>
      </Card>

      {/* BRAND */}
      <SectionCard id="brand" icon={Type} title={lang === 'tr' ? 'Marka & Logo' : 'Brand & Logo'} open={openSections.brand} onToggle={toggle}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={lang === 'tr' ? 'Marka Adı' : 'Brand Name'} value={config.brand.name} onChange={v => updateConfig('brand.name', v)} />
          <Field label="Tagline" value={config.brand.tagline} onChange={v => updateConfig('brand.tagline', v)} />
        </div>
        <Field label={lang === 'tr' ? 'Logo URL' : 'Logo URL'} value={config.brand.logo_url} onChange={v => updateConfig('brand.logo_url', v)} placeholder="https://..." />
      </SectionCard>

      {/* NAV (top menu links) */}
      <SectionCard
        id="nav"
        icon={MenuIcon}
        title={lang === 'tr' ? 'Üst Menü' : 'Top Nav'}
        desc={`${(config.nav?.items ?? []).length} ${lang === 'tr' ? 'öğe' : 'items'}`}
        open={openSections.nav}
        onToggle={toggle}
      >
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Menü Linkleri' : 'Menu Links'}</Label>
        <div className="space-y-2">
          {(config.nav?.items ?? []).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={item.label}
                onChange={e => updateConfig(`nav.items.${i}.label`, e.target.value)}
                placeholder={lang === 'tr' ? 'Etiket' : 'Label'}
                className="w-40"
              />
              <Input
                value={item.url}
                onChange={e => updateConfig(`nav.items.${i}.url`, e.target.value)}
                placeholder="#section"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const items = [...(config.nav?.items ?? [])];
                  items.splice(i, 1);
                  updateConfig('nav.items', items);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateConfig('nav.items', [...(config.nav?.items ?? []), { label: '', url: '#' }])}
          >
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Link Ekle' : 'Add Link'}
          </Button>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={lang === 'tr' ? 'Giriş Metni' : 'Login Text'}
            value={config.nav?.login_text ?? ''}
            onChange={v => updateConfig('nav.login_text', v)}
          />
          <Field
            label={lang === 'tr' ? 'Giriş URL' : 'Login URL'}
            value={config.nav?.login_url ?? ''}
            onChange={v => updateConfig('nav.login_url', v)}
            placeholder="/admin/login"
          />
          <Field
            label={lang === 'tr' ? 'CTA Metni' : 'CTA Text'}
            value={config.nav?.cta_text ?? ''}
            onChange={v => updateConfig('nav.cta_text', v)}
          />
          <Field
            label={lang === 'tr' ? 'CTA URL' : 'CTA URL'}
            value={config.nav?.cta_url ?? ''}
            onChange={v => updateConfig('nav.cta_url', v)}
            placeholder="/admin/register"
          />
        </div>
      </SectionCard>

      {/* COLORS */}
      <SectionCard id="colors" icon={Palette} title={lang === 'tr' ? 'Renkler' : 'Colors'} desc={`${config.colors.primary} / ${config.colors.accent}`} open={openSections.colors} onToggle={toggle}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ColorField label={lang === 'tr' ? 'Ana Renk (Mavi)' : 'Primary (Blue)'} value={config.colors.primary} onChange={v => updateConfig('colors.primary', v)} />
          <ColorField label={lang === 'tr' ? 'Vurgu Renk (Kırmızı)' : 'Accent (Red)'} value={config.colors.accent} onChange={v => updateConfig('colors.accent', v)} />
          <ColorField label={lang === 'tr' ? 'Koyu Arka Plan' : 'Dark Background'} value={config.colors.bg_dark} onChange={v => updateConfig('colors.bg_dark', v)} />
          <ColorField label={lang === 'tr' ? 'Açık Arka Plan' : 'Light Background'} value={config.colors.bg_light} onChange={v => updateConfig('colors.bg_light', v)} />
          <ColorField label={lang === 'tr' ? 'Açık Yazı' : 'Light Text'} value={config.colors.text_light} onChange={v => updateConfig('colors.text_light', v)} />
          <ColorField label={lang === 'tr' ? 'Koyu Yazı' : 'Dark Text'} value={config.colors.text_dark} onChange={v => updateConfig('colors.text_dark', v)} />
        </div>
      </SectionCard>

      {/* HERO */}
      <SectionCard id="hero" icon={Megaphone} title="Hero" desc={config.hero.title.split('\n')[0]} open={openSections.hero} onToggle={toggle}>
        <Field label="Badge" value={config.hero.badge} onChange={v => updateConfig('hero.badge', v)} placeholder="Cloudflare Workers Üzerinde" />
        <Field label={lang === 'tr' ? 'Başlık (\\n ile satır sonu)' : 'Title (\\n for line break)'} value={config.hero.title} onChange={v => updateConfig('hero.title', v)} multiline />
        <Field label={lang === 'tr' ? 'Alt Başlık' : 'Subtitle'} value={config.hero.subtitle} onChange={v => updateConfig('hero.subtitle', v)} multiline />
        <div className="grid grid-cols-2 gap-4">
          <Field label={lang === 'tr' ? 'CTA Buton Metni' : 'CTA Button Text'} value={config.hero.cta_text} onChange={v => updateConfig('hero.cta_text', v)} />
          <Field label="CTA URL" value={config.hero.cta_url} onChange={v => updateConfig('hero.cta_url', v)} />
          <Field label={lang === 'tr' ? 'İkincil Buton' : 'Secondary Button'} value={config.hero.secondary_cta_text} onChange={v => updateConfig('hero.secondary_cta_text', v)} />
          <Field label={lang === 'tr' ? 'İkincil URL' : 'Secondary URL'} value={config.hero.secondary_cta_url} onChange={v => updateConfig('hero.secondary_cta_url', v)} />
        </div>

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'İstatistikler' : 'Stats'}</Label>
        <div className="space-y-2">
          {config.hero.stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={stat.value} onChange={e => updateConfig(`hero.stats.${i}.value`, e.target.value)} placeholder={lang === 'tr' ? 'Değer' : 'Value'} className="w-28" />
              <Input value={stat.label} onChange={e => updateConfig(`hero.stats.${i}.label`, e.target.value)} placeholder={lang === 'tr' ? 'Etiket' : 'Label'} className="flex-1" />
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {
                const stats = [...config.hero.stats]; stats.splice(i, 1); updateConfig('hero.stats', stats);
              }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateConfig('hero.stats', [...config.hero.stats, { value: '', label: '' }])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'İstatistik Ekle' : 'Add Stat'}
          </Button>
        </div>
      </SectionCard>

      {/* FEATURES */}
      <SectionCard id="features" icon={Star} title={lang === 'tr' ? 'Özellikler' : 'Features'} desc={`${config.features.items.length} ${lang === 'tr' ? 'özellik' : 'features'}`} open={openSections.features} onToggle={toggle}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={lang === 'tr' ? 'Başlık' : 'Title'} value={config.features.title} onChange={v => updateConfig('features.title', v)} />
          <Field label={lang === 'tr' ? 'Alt Başlık' : 'Subtitle'} value={config.features.subtitle} onChange={v => updateConfig('features.subtitle', v)} />
        </div>
        <Separator />
        <div className="space-y-3">
          {config.features.items.map((item, i) => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.title || `${lang === 'tr' ? 'Özellik' : 'Feature'} ${i + 1}`}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => {
                    const items = [...config.features.items]; items.splice(i, 1); updateConfig('features.items', items);
                  }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{lang === 'tr' ? 'İkon' : 'Icon'}</Label>
                    <select value={item.icon}
                      onChange={e => updateConfig(`features.items.${i}.icon`, e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {ICON_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Field label={lang === 'tr' ? 'Başlık' : 'Title'} value={item.title} onChange={v => updateConfig(`features.items.${i}.title`, v)} />
                  </div>
                </div>
                <Field label={lang === 'tr' ? 'Açıklama' : 'Description'} value={item.desc} onChange={v => updateConfig(`features.items.${i}.desc`, v)} multiline />
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateConfig('features.items', [...config.features.items, { icon: 'zap', title: '', desc: '' }])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Özellik Ekle' : 'Add Feature'}
          </Button>
        </div>
      </SectionCard>

      {/* PRICING */}
      <SectionCard id="pricing" icon={CreditCard} title={lang === 'tr' ? 'Fiyatlandırma' : 'Pricing'} desc={`${config.pricing.plans.length} ${lang === 'tr' ? 'plan' : 'plans'}`} open={openSections.pricing} onToggle={toggle}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={lang === 'tr' ? 'Başlık' : 'Title'} value={config.pricing.title} onChange={v => updateConfig('pricing.title', v)} />
          <Field label={lang === 'tr' ? 'Alt Başlık' : 'Subtitle'} value={config.pricing.subtitle} onChange={v => updateConfig('pricing.subtitle', v)} />
        </div>
        <Separator />
        <div className="space-y-4">
          {config.pricing.plans.map((plan, i) => (
            <Card key={i} className={`${plan.highlighted ? 'border-primary bg-primary/5' : 'bg-muted/30'}`}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{plan.name || `Plan ${i + 1}`}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input type="checkbox" checked={plan.highlighted}
                        onChange={e => updateConfig(`pricing.plans.${i}.highlighted`, e.target.checked)}
                        className="rounded" />
                      {lang === 'tr' ? 'Öne Çıkar' : 'Highlight'}
                    </label>
                    <Button variant="ghost" size="icon" onClick={() => {
                      const plans = [...config.pricing.plans]; plans.splice(i, 1); updateConfig('pricing.plans', plans);
                    }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={lang === 'tr' ? 'Plan Adı' : 'Plan Name'} value={plan.name} onChange={v => updateConfig(`pricing.plans.${i}.name`, v)} />
                  <Field label={lang === 'tr' ? 'Açıklama' : 'Description'} value={plan.desc} onChange={v => updateConfig(`pricing.plans.${i}.desc`, v)} />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <Field label={lang === 'tr' ? 'Para Birimi' : 'Currency'} value={plan.currency} onChange={v => updateConfig(`pricing.plans.${i}.currency`, v)} placeholder="₺" />
                  <Field label={lang === 'tr' ? 'Fiyat' : 'Price'} value={plan.price} onChange={v => updateConfig(`pricing.plans.${i}.price`, v)} />
                  <Field label={lang === 'tr' ? 'Periyod' : 'Period'} value={plan.period} onChange={v => updateConfig(`pricing.plans.${i}.period`, v)} placeholder="/ay" />
                  <Field label="CTA" value={plan.cta_text} onChange={v => updateConfig(`pricing.plans.${i}.cta_text`, v)} />
                </div>
                <Field label="CTA URL" value={plan.cta_url} onChange={v => updateConfig(`pricing.plans.${i}.cta_url`, v)} />
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{lang === 'tr' ? 'Özellikler (her satır bir özellik)' : 'Features (one per line)'}</Label>
                  <Textarea
                    value={plan.features.join('\n')}
                    onChange={e => updateConfig(`pricing.plans.${i}.features`, e.target.value.split('\n'))}
                    rows={4}
                    placeholder={lang === 'tr' ? 'Her satıra bir özellik yazın' : 'One feature per line'}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateConfig('pricing.plans', [...config.pricing.plans, {
            name: '', price: '', currency: '₺', period: '/ay', desc: '',
            features: [], cta_text: '', cta_url: '', highlighted: false,
          }])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Plan Ekle' : 'Add Plan'}
          </Button>
        </div>
      </SectionCard>

      {/* TESTIMONIALS */}
      <SectionCard id="testimonials" icon={MessageSquare} title={lang === 'tr' ? 'Referanslar' : 'Testimonials'} desc={`${config.testimonials.items.length} ${lang === 'tr' ? 'referans' : 'testimonials'}`} open={openSections.testimonials} onToggle={toggle}>
        <Field label={lang === 'tr' ? 'Başlık' : 'Title'} value={config.testimonials.title} onChange={v => updateConfig('testimonials.title', v)} />
        <Separator />
        <div className="space-y-3">
          {config.testimonials.items.map((item, i) => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.author || `${lang === 'tr' ? 'Referans' : 'Testimonial'} ${i + 1}`}</span>
                  <Button variant="ghost" size="icon" onClick={() => {
                    const items = [...config.testimonials.items]; items.splice(i, 1); updateConfig('testimonials.items', items);
                  }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <Field label={lang === 'tr' ? 'Yorum' : 'Quote'} value={item.text} onChange={v => updateConfig(`testimonials.items.${i}.text`, v)} multiline />
                <div className="grid grid-cols-2 gap-3">
                  <Field label={lang === 'tr' ? 'Yazar' : 'Author'} value={item.author} onChange={v => updateConfig(`testimonials.items.${i}.author`, v)} />
                  <Field label={lang === 'tr' ? 'Ünvan' : 'Role'} value={item.role} onChange={v => updateConfig(`testimonials.items.${i}.role`, v)} />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateConfig('testimonials.items', [...config.testimonials.items, { text: '', author: '', role: '', avatar: '' }])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Referans Ekle' : 'Add Testimonial'}
          </Button>
        </div>
      </SectionCard>

      {/* CTA */}
      <SectionCard id="cta" icon={Megaphone} title={lang === 'tr' ? 'Aksiyon Çağrısı (CTA)' : 'Call to Action'} open={openSections.cta} onToggle={toggle}>
        <Field label={lang === 'tr' ? 'Başlık' : 'Title'} value={config.cta.title} onChange={v => updateConfig('cta.title', v)} />
        <Field label={lang === 'tr' ? 'Alt Başlık' : 'Subtitle'} value={config.cta.subtitle} onChange={v => updateConfig('cta.subtitle', v)} />
        <div className="grid grid-cols-2 gap-4">
          <Field label={lang === 'tr' ? 'Buton Metni' : 'Button Text'} value={config.cta.button_text} onChange={v => updateConfig('cta.button_text', v)} />
          <Field label="URL" value={config.cta.button_url} onChange={v => updateConfig('cta.button_url', v)} />
        </div>
      </SectionCard>

      {/* FOOTER */}
      <SectionCard id="footer" icon={Code} title="Footer" open={openSections.footer} onToggle={toggle}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={lang === 'tr' ? 'Telif Hakkı Metni' : 'Copyright Text'} value={config.footer.text} onChange={v => updateConfig('footer.text', v)} />
          <Field label={lang === 'tr' ? 'Yan Metin' : 'Side Text'} value={config.footer.side_text ?? ''} onChange={v => updateConfig('footer.side_text', v)} placeholder={lang === 'tr' ? 'Edge-native · Sınırsız ölçek' : ''} />
        </div>
        <Field label={lang === 'tr' ? 'Açıklama' : 'Description'} value={config.footer.description ?? ''} onChange={v => updateConfig('footer.description', v)} multiline placeholder={lang === 'tr' ? 'Footer üstünde gösterilen kısa açıklama.' : ''} />
        <Separator />

        {/* Footer columns (multi-column) — the new v2 shape */}
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Footer Sütunları' : 'Footer Columns'}</Label>
        <div className="space-y-4">
          {(config.footer.columns ?? []).map((col, ci) => (
            <Card key={ci} className="border-muted">
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={col.title}
                    onChange={e => updateConfig(`footer.columns.${ci}.title`, e.target.value)}
                    placeholder={lang === 'tr' ? 'Sütun Başlığı (örn. Ürün, Şirket, Yasal)' : 'Column Title'}
                    className="flex-1 font-medium"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const cols = [...(config.footer.columns ?? [])];
                      cols.splice(ci, 1);
                      updateConfig('footer.columns', cols);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-2 pl-2">
                  {(col.links ?? []).map((link, li) => (
                    <div key={li} className="flex items-center gap-2">
                      <Input
                        value={link.text}
                        onChange={e => updateConfig(`footer.columns.${ci}.links.${li}.text`, e.target.value)}
                        placeholder={lang === 'tr' ? 'Metin' : 'Text'}
                        className="w-32"
                      />
                      <Input
                        value={link.url}
                        onChange={e => updateConfig(`footer.columns.${ci}.links.${li}.url`, e.target.value)}
                        placeholder="URL"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const links = [...(col.links ?? [])];
                          links.splice(li, 1);
                          updateConfig(`footer.columns.${ci}.links`, links);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateConfig(`footer.columns.${ci}.links`, [...(col.links ?? []), { text: '', url: '' }])}
                  >
                    <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Link Ekle' : 'Add Link'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateConfig('footer.columns', [...(config.footer.columns ?? []), { title: '', links: [] }])}
          >
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Sütun Ekle' : 'Add Column'}
          </Button>
        </div>

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Footer Linkleri (Eski/Sade)' : 'Legacy Flat Links'}</Label>
        <p className="text-xs text-muted-foreground">{lang === 'tr' ? 'Sütun tanımlanmadığında kullanılır — yeni tasarımda sütunlar tercih edilir.' : 'Used when no columns are defined — columns are preferred in the new design.'}</p>
        <div className="space-y-2">
          {(config.footer.links ?? []).map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={link.text} onChange={e => updateConfig(`footer.links.${i}.text`, e.target.value)} placeholder={lang === 'tr' ? 'Metin' : 'Text'} className="w-32" />
              <Input value={link.url} onChange={e => updateConfig(`footer.links.${i}.url`, e.target.value)} placeholder="URL" className="flex-1" />
              <Button variant="ghost" size="icon" onClick={() => {
                const links = [...(config.footer.links ?? [])]; links.splice(i, 1); updateConfig('footer.links', links);
              }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => updateConfig('footer.links', [...(config.footer.links ?? []), { text: '', url: '' }])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Link Ekle' : 'Add Link'}
          </Button>
        </div>
      </SectionCard>

      {/* Bottom save bar */}
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...') : (lang === 'tr' ? 'Tüm Değişiklikleri Kaydet' : 'Save All Changes')}
        </Button>
      </div>
    </div>
  );
}
