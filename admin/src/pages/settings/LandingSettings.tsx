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
  Save, Rocket, Eye, RotateCcw, Type, Star, CreditCard, Bot, Puzzle, Layers,
  Megaphone, Plus, Trash2, ChevronDown, Layout, Cpu, Link as LinkIcon,
} from 'lucide-react';
import { useToast } from '@ui/toast-notification';

/**
 * Landing settings — admin form for the v2 dark landing page.
 *
 * The schema mirrors `src/ssr/pages/landing-defaults.ts` exactly. Each
 * collapsible section maps 1:1 to a part of that page. New text fields
 * added here flow through to the SSR renderer with no other code
 * changes — the backend just stores the JSON blob.
 */

// ── Types matching landing-defaults.ts ───────────────────────────────

interface NavLink { label: string; url: string }
interface Stat { value: string; label: string }
interface FeatureCard { num: string; title: string; desc: string; footer: string }
interface MiniFeature { title: string; desc: string }
interface McpBullet { value: string; text: string }
interface BuiltInPlugin { name: string; status: string; description: string }
interface Shortcode { code: string; label: string }
interface PricingPlan {
  name: string; desc?: string; currency?: string;
  price?: string | number; period?: string;
  features?: string[]; cta_text?: string; cta_url?: string;
  highlighted?: boolean;
}
interface FooterLink { text: string; url: string }
interface FooterColumn { heading: string; links: FooterLink[] }

interface LandingConfig {
  enabled: boolean;
  brand: { name: string; tagline: string; logo_url: string };
  nav: { items: NavLink[]; login_text: string; login_url: string; cta_text: string; cta_url: string };
  hero: {
    badge: string;
    title_lead: string; title_highlight: string; title_tail: string;
    subtitle_lead: string; subtitle_bold: string; subtitle_tail: string;
    cta_text: string; cta_url: string;
    secondary_cta_text: string; secondary_cta_url: string;
    note: string;
    stats: Stat[];
  };
  marquee: { items: string[] };
  architecture: {
    section_label: string;
    title_lead: string; title_highlight: string; title_tail: string;
    body_lead: string; body_bold: string; body_tail: string;
    bullets: string[];
    diagram_label: string; live_label: string;
  };
  features: {
    section_label: string;
    title_lead: string; title_highlight: string; title_tail: string;
    side_note: string;
    items: FeatureCard[];
    mini: MiniFeature[];
  };
  mcp: {
    section_label: string;
    title_lead: string; title_highlight: string; title_tail: string;
    body_lead: string; body_bold: string; body_tail: string;
    bullets: McpBullet[];
    plan_note: string;
    chat_title: string; chat_status: string;
    chat_user_label: string; chat_user_message: string;
    chat_assistant_label: string; chat_steps: string[];
    chat_response_lead: string; chat_response_quoted: string;
    compat_label: string; compat_items: string[]; compat_extra: string;
  };
  plugins: {
    section_label: string;
    title_lead: string; title_highlight: string; title_tail: string;
    body: string;
    builtin_heading: string;
    builtin: BuiltInPlugin[];
    shortcodes_heading: string;
    shortcodes: Shortcode[];
    shortcodes_extra: string;
  };
  pricing: {
    section_label: string;
    title_lead: string; title_highlight: string;
    subtitle: string;
    plans: PricingPlan[];
    final_title: string; final_subtitle: string;
    final_cta_text: string; final_cta_url: string;
  };
  footer: {
    description: string;
    columns: FooterColumn[];
    copyright: string;
    side_text: string;
  };
}

// ── Reusable subcomponents ───────────────────────────────────────────

function SectionCard({
  id, icon: Icon, title, desc, open, onToggle, children,
}: {
  id: string; icon: any; title: string; desc?: string;
  open: boolean; onToggle: (id: string) => void; children: React.ReactNode;
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

function Field({
  label, value, onChange, placeholder, multiline, type = 'text',
}: {
  label: string; value: string;
  onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; type?: string;
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

function TripleHeadingFields({
  lead, highlight, tail, onChange, lang, includeTail = true,
}: {
  lead: string; highlight: string; tail?: string;
  onChange: (k: 'title_lead' | 'title_highlight' | 'title_tail', v: string) => void;
  lang: string; includeTail?: boolean;
}) {
  return (
    <div className={`grid ${includeTail ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
      <Field
        label={lang === 'tr' ? 'Başlık (öncesi)' : 'Title (lead)'}
        value={lead}
        onChange={v => onChange('title_lead', v)}
      />
      <Field
        label={lang === 'tr' ? 'Vurgu (turuncu)' : 'Highlight (amber)'}
        value={highlight}
        onChange={v => onChange('title_highlight', v)}
      />
      {includeTail ? (
        <Field
          label={lang === 'tr' ? 'Başlık (sonrası)' : 'Title (tail)'}
          value={tail || ''}
          onChange={v => onChange('title_tail', v)}
        />
      ) : null}
    </div>
  );
}

function TripleBodyFields({
  lead, bold, tail, onLeadChange, onBoldChange, onTailChange, lang,
}: {
  lead: string; bold: string; tail: string;
  onLeadChange: (v: string) => void;
  onBoldChange: (v: string) => void;
  onTailChange: (v: string) => void;
  lang: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <Field
        label={lang === 'tr' ? 'Paragraf (öncesi)' : 'Body (lead)'}
        value={lead} onChange={onLeadChange} multiline
      />
      <Field
        label={lang === 'tr' ? 'Vurgu (kalın)' : 'Highlight (bold)'}
        value={bold} onChange={onBoldChange}
      />
      <Field
        label={lang === 'tr' ? 'Paragraf (sonrası)' : 'Body (tail)'}
        value={tail} onChange={onTailChange} multiline
      />
    </div>
  );
}

function StringList({
  label, items, onChange, placeholder, lang,
}: {
  label: string; items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string; lang: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={e => {
                const next = [...items]; next[i] = e.target.value; onChange(next);
              }}
              placeholder={placeholder}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, ''])}>
          <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Ekle' : 'Add'}
        </Button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function LandingSettings() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    brand: true, nav: false, hero: true,
    marquee: false, architecture: false, features: false,
    mcp: false, plugins: false, pricing: false, footer: false,
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

  const toggle = useCallback(
    (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] })),
    []
  );

  // Generic "set value at dotted path" helper. Path segments parse as
  // numeric indices when they look like numbers, e.g. `hero.stats.0.value`.
  const updateConfig = useCallback((path: string, value: any) => {
    setConfig(prev => {
      if (!prev) return prev;
      const keys = path.split('.');
      const next = JSON.parse(JSON.stringify(prev));
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        obj = !isNaN(Number(k)) ? obj[Number(k)] : obj[k];
      }
      const last = keys[keys.length - 1];
      if (!isNaN(Number(last))) obj[Number(last)] = value;
      else obj[last] = value;
      return next;
    });
  }, []);

  if (loading || !config) {
    return <div className="p-4">{lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</div>;
  }

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
              ? 'Tanıtım sayfasının tüm metinlerini buradan düzenleyin.'
              : 'Edit every text on the landing page from here.'}
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

      {/* Enable */}
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
      <SectionCard id="brand" icon={Type}
        title={lang === 'tr' ? 'Marka' : 'Brand'}
        desc={config.brand.name}
        open={openSections.brand} onToggle={toggle}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label={lang === 'tr' ? 'Marka Adı' : 'Brand Name'}
            value={config.brand.name}
            onChange={v => updateConfig('brand.name', v)} />
          <Field label="Tagline"
            value={config.brand.tagline}
            onChange={v => updateConfig('brand.tagline', v)} />
        </div>
        <Field label={lang === 'tr' ? 'Logo URL (opsiyonel)' : 'Logo URL (optional)'}
          value={config.brand.logo_url}
          onChange={v => updateConfig('brand.logo_url', v)}
          placeholder="https://..." />
      </SectionCard>

      {/* NAV */}
      <SectionCard id="nav" icon={LinkIcon}
        title={lang === 'tr' ? 'Üst Menü' : 'Top Nav'}
        desc={`${config.nav.items.length} ${lang === 'tr' ? 'öğe' : 'items'}`}
        open={openSections.nav} onToggle={toggle}
      >
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Menü Bağlantıları' : 'Menu Links'}</Label>
        <div className="space-y-2">
          {config.nav.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={item.label}
                onChange={e => updateConfig(`nav.items.${i}.label`, e.target.value)}
                placeholder={lang === 'tr' ? 'Etiket' : 'Label'} className="w-40" />
              <Input value={item.url}
                onChange={e => updateConfig(`nav.items.${i}.url`, e.target.value)}
                placeholder="#features" className="flex-1" />
              <Button variant="ghost" size="icon" className="shrink-0"
                onClick={() => {
                  const items = config.nav.items.filter((_, j) => j !== i);
                  updateConfig('nav.items', items);
                }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm"
            onClick={() => updateConfig('nav.items', [...config.nav.items, { label: '', url: '#' }])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Bağlantı Ekle' : 'Add Link'}
          </Button>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3">
          <Field label={lang === 'tr' ? 'Giriş Buton Metni' : 'Login Text'}
            value={config.nav.login_text}
            onChange={v => updateConfig('nav.login_text', v)} />
          <Field label={lang === 'tr' ? 'Giriş URL' : 'Login URL'}
            value={config.nav.login_url}
            onChange={v => updateConfig('nav.login_url', v)} />
          <Field label={lang === 'tr' ? 'CTA Buton Metni' : 'CTA Text'}
            value={config.nav.cta_text}
            onChange={v => updateConfig('nav.cta_text', v)} />
          <Field label="CTA URL"
            value={config.nav.cta_url}
            onChange={v => updateConfig('nav.cta_url', v)} />
        </div>
      </SectionCard>

      {/* HERO */}
      <SectionCard id="hero" icon={Megaphone}
        title="Hero"
        desc={config.hero.title_lead + (config.hero.title_highlight ? ` ${config.hero.title_highlight}` : '')}
        open={openSections.hero} onToggle={toggle}
      >
        <Field label="Badge"
          value={config.hero.badge}
          onChange={v => updateConfig('hero.badge', v)}
          placeholder="Edge-native CMS · 300+ konum" />

        <Label className="text-sm font-medium">{lang === 'tr' ? 'Başlık' : 'Title'}</Label>
        <TripleHeadingFields
          lead={config.hero.title_lead}
          highlight={config.hero.title_highlight}
          tail={config.hero.title_tail}
          onChange={(k, v) => updateConfig(`hero.${k}`, v)}
          lang={lang}
        />

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Alt Başlık' : 'Subtitle'}</Label>
        <TripleBodyFields
          lead={config.hero.subtitle_lead}
          bold={config.hero.subtitle_bold}
          tail={config.hero.subtitle_tail}
          onLeadChange={v => updateConfig('hero.subtitle_lead', v)}
          onBoldChange={v => updateConfig('hero.subtitle_bold', v)}
          onTailChange={v => updateConfig('hero.subtitle_tail', v)}
          lang={lang}
        />

        <Separator />
        <div className="grid grid-cols-2 gap-3">
          <Field label={lang === 'tr' ? 'Ana CTA Metni' : 'Primary CTA Text'}
            value={config.hero.cta_text}
            onChange={v => updateConfig('hero.cta_text', v)} />
          <Field label="CTA URL"
            value={config.hero.cta_url}
            onChange={v => updateConfig('hero.cta_url', v)} />
          <Field label={lang === 'tr' ? 'İkincil CTA Metni' : 'Secondary CTA Text'}
            value={config.hero.secondary_cta_text}
            onChange={v => updateConfig('hero.secondary_cta_text', v)} />
          <Field label={lang === 'tr' ? 'İkincil URL' : 'Secondary URL'}
            value={config.hero.secondary_cta_url}
            onChange={v => updateConfig('hero.secondary_cta_url', v)} />
        </div>
        <Field label={lang === 'tr' ? 'Not (CTA yanı)' : 'Note (next to CTA)'}
          value={config.hero.note}
          onChange={v => updateConfig('hero.note', v)} />

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'İstatistikler' : 'Stats'}</Label>
        <div className="space-y-2">
          {config.hero.stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={stat.value}
                onChange={e => updateConfig(`hero.stats.${i}.value`, e.target.value)}
                placeholder={lang === 'tr' ? 'Değer' : 'Value'} className="w-28" />
              <Input value={stat.label}
                onChange={e => updateConfig(`hero.stats.${i}.label`, e.target.value)}
                placeholder={lang === 'tr' ? 'Etiket' : 'Label'} className="flex-1" />
              <Button variant="ghost" size="icon" className="shrink-0"
                onClick={() => {
                  const stats = config.hero.stats.filter((_, j) => j !== i);
                  updateConfig('hero.stats', stats);
                }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm"
            onClick={() => updateConfig('hero.stats', [...config.hero.stats, { value: '', label: '' }])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'İstatistik Ekle' : 'Add Stat'}
          </Button>
        </div>
      </SectionCard>

      {/* MARQUEE */}
      <SectionCard id="marquee" icon={Layout}
        title={lang === 'tr' ? 'Kayan Şerit' : 'Marquee'}
        desc={`${config.marquee.items.length} ${lang === 'tr' ? 'öğe' : 'items'}`}
        open={openSections.marquee} onToggle={toggle}
      >
        <StringList
          label={lang === 'tr' ? 'Şerit Metinleri' : 'Marquee Items'}
          items={config.marquee.items}
          onChange={items => updateConfig('marquee.items', items)}
          placeholder={lang === 'tr' ? 'Kısa metin' : 'Short label'}
          lang={lang}
        />
      </SectionCard>

      {/* ARCHITECTURE */}
      <SectionCard id="architecture" icon={Cpu}
        title={lang === 'tr' ? 'Performans / Mimari' : 'Performance / Architecture'}
        open={openSections.architecture} onToggle={toggle}
      >
        <Field label={lang === 'tr' ? 'Bölüm Etiketi' : 'Section Label'}
          value={config.architecture.section_label}
          onChange={v => updateConfig('architecture.section_label', v)}
          placeholder="[ 01 ] Performans" />

        <Label className="text-sm font-medium">{lang === 'tr' ? 'Başlık' : 'Title'}</Label>
        <TripleHeadingFields
          lead={config.architecture.title_lead}
          highlight={config.architecture.title_highlight}
          tail={config.architecture.title_tail}
          onChange={(k, v) => updateConfig(`architecture.${k}`, v)}
          lang={lang}
        />

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Açıklama' : 'Description'}</Label>
        <TripleBodyFields
          lead={config.architecture.body_lead}
          bold={config.architecture.body_bold}
          tail={config.architecture.body_tail}
          onLeadChange={v => updateConfig('architecture.body_lead', v)}
          onBoldChange={v => updateConfig('architecture.body_bold', v)}
          onTailChange={v => updateConfig('architecture.body_tail', v)}
          lang={lang}
        />

        <Separator />
        <StringList
          label={lang === 'tr' ? 'Madde İmleri' : 'Bullets'}
          items={config.architecture.bullets}
          onChange={items => updateConfig('architecture.bullets', items)}
          lang={lang}
        />

        <Separator />
        <div className="grid grid-cols-2 gap-3">
          <Field label={lang === 'tr' ? 'Diyagram Etiketi' : 'Diagram Label'}
            value={config.architecture.diagram_label}
            onChange={v => updateConfig('architecture.diagram_label', v)} />
          <Field label={lang === 'tr' ? '"Canlı" Etiketi' : '"Live" Label'}
            value={config.architecture.live_label}
            onChange={v => updateConfig('architecture.live_label', v)} />
        </div>
      </SectionCard>

      {/* FEATURES */}
      <SectionCard id="features" icon={Star}
        title={lang === 'tr' ? 'Özellikler' : 'Features'}
        desc={`${config.features.items.length} ${lang === 'tr' ? 'kart' : 'cards'} · ${config.features.mini.length} mini`}
        open={openSections.features} onToggle={toggle}
      >
        <Field label={lang === 'tr' ? 'Bölüm Etiketi' : 'Section Label'}
          value={config.features.section_label}
          onChange={v => updateConfig('features.section_label', v)} />

        <Label className="text-sm font-medium">{lang === 'tr' ? 'Başlık' : 'Title'}</Label>
        <TripleHeadingFields
          lead={config.features.title_lead}
          highlight={config.features.title_highlight}
          tail={config.features.title_tail}
          onChange={(k, v) => updateConfig(`features.${k}`, v)}
          lang={lang}
        />
        <Field label={lang === 'tr' ? 'Yan Not' : 'Side Note'}
          value={config.features.side_note}
          onChange={v => updateConfig('features.side_note', v)}
          multiline />

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Özellik Kartları' : 'Feature Cards'}</Label>
        <div className="space-y-3">
          {config.features.items.map((item, i) => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.title || `${lang === 'tr' ? 'Özellik' : 'Feature'} ${i + 1}`}</span>
                  <Button variant="ghost" size="icon"
                    onClick={() => {
                      const items = config.features.items.filter((_, j) => j !== i);
                      updateConfig('features.items', items);
                    }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label={lang === 'tr' ? 'Numara' : 'Number'}
                    value={item.num}
                    onChange={v => updateConfig(`features.items.${i}.num`, v)}
                    placeholder="01" />
                  <div className="col-span-2">
                    <Field label={lang === 'tr' ? 'Başlık' : 'Title'}
                      value={item.title}
                      onChange={v => updateConfig(`features.items.${i}.title`, v)} />
                  </div>
                </div>
                <Field label={lang === 'tr' ? 'Açıklama' : 'Description'}
                  value={item.desc}
                  onChange={v => updateConfig(`features.items.${i}.desc`, v)}
                  multiline />
                <Field label={lang === 'tr' ? 'Alt Bilgi (kart altı)' : 'Footer (bottom of card)'}
                  value={item.footer}
                  onChange={v => updateConfig(`features.items.${i}.footer`, v)} />
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm"
            onClick={() => updateConfig('features.items', [
              ...config.features.items,
              { num: '', title: '', desc: '', footer: '' },
            ])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Kart Ekle' : 'Add Card'}
          </Button>
        </div>

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Mini Özellikler' : 'Mini Features'}</Label>
        <div className="space-y-2">
          {config.features.mini.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={m.title}
                onChange={e => updateConfig(`features.mini.${i}.title`, e.target.value)}
                placeholder={lang === 'tr' ? 'Başlık' : 'Title'} className="w-48" />
              <Input value={m.desc}
                onChange={e => updateConfig(`features.mini.${i}.desc`, e.target.value)}
                placeholder={lang === 'tr' ? 'Açıklama' : 'Description'} className="flex-1" />
              <Button variant="ghost" size="icon" className="shrink-0"
                onClick={() => {
                  const mini = config.features.mini.filter((_, j) => j !== i);
                  updateConfig('features.mini', mini);
                }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm"
            onClick={() => updateConfig('features.mini', [...config.features.mini, { title: '', desc: '' }])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Mini Ekle' : 'Add Mini'}
          </Button>
        </div>
      </SectionCard>

      {/* MCP */}
      <SectionCard id="mcp" icon={Bot}
        title={lang === 'tr' ? 'AI Entegrasyonu' : 'AI Integration'}
        open={openSections.mcp} onToggle={toggle}
      >
        <Field label={lang === 'tr' ? 'Bölüm Etiketi' : 'Section Label'}
          value={config.mcp.section_label}
          onChange={v => updateConfig('mcp.section_label', v)} />

        <Label className="text-sm font-medium">{lang === 'tr' ? 'Başlık' : 'Title'}</Label>
        <TripleHeadingFields
          lead={config.mcp.title_lead}
          highlight={config.mcp.title_highlight}
          tail={config.mcp.title_tail}
          onChange={(k, v) => updateConfig(`mcp.${k}`, v)}
          lang={lang}
        />

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Açıklama' : 'Body'}</Label>
        <TripleBodyFields
          lead={config.mcp.body_lead}
          bold={config.mcp.body_bold}
          tail={config.mcp.body_tail}
          onLeadChange={v => updateConfig('mcp.body_lead', v)}
          onBoldChange={v => updateConfig('mcp.body_bold', v)}
          onTailChange={v => updateConfig('mcp.body_tail', v)}
          lang={lang}
        />

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Liste' : 'Bullets'}</Label>
        <div className="space-y-2">
          {config.mcp.bullets.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={b.value}
                onChange={e => updateConfig(`mcp.bullets.${i}.value`, e.target.value)}
                placeholder="20" className="w-20 font-mono" />
              <Input value={b.text}
                onChange={e => updateConfig(`mcp.bullets.${i}.text`, e.target.value)}
                placeholder={lang === 'tr' ? 'Açıklama' : 'Text'} className="flex-1" />
              <Button variant="ghost" size="icon" className="shrink-0"
                onClick={() => {
                  const bullets = config.mcp.bullets.filter((_, j) => j !== i);
                  updateConfig('mcp.bullets', bullets);
                }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm"
            onClick={() => updateConfig('mcp.bullets', [...config.mcp.bullets, { value: '', text: '' }])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Madde Ekle' : 'Add Bullet'}
          </Button>
        </div>
        <Field label={lang === 'tr' ? 'Plan Notu' : 'Plan Note'}
          value={config.mcp.plan_note}
          onChange={v => updateConfig('mcp.plan_note', v)} />

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Sohbet Demo' : 'Chat Demo'}</Label>
        <div className="grid grid-cols-2 gap-3">
          <Field label={lang === 'tr' ? 'Üst Başlık' : 'Header'}
            value={config.mcp.chat_title}
            onChange={v => updateConfig('mcp.chat_title', v)} />
          <Field label={lang === 'tr' ? 'Durum Rozeti' : 'Status Badge'}
            value={config.mcp.chat_status}
            onChange={v => updateConfig('mcp.chat_status', v)} />
          <Field label={lang === 'tr' ? 'Kullanıcı Etiketi' : 'User Label'}
            value={config.mcp.chat_user_label}
            onChange={v => updateConfig('mcp.chat_user_label', v)} />
          <Field label={lang === 'tr' ? 'Asistan Etiketi' : 'Assistant Label'}
            value={config.mcp.chat_assistant_label}
            onChange={v => updateConfig('mcp.chat_assistant_label', v)} />
        </div>
        <Field label={lang === 'tr' ? 'Kullanıcı Mesajı' : 'User Message'}
          value={config.mcp.chat_user_message}
          onChange={v => updateConfig('mcp.chat_user_message', v)}
          multiline />
        <StringList
          label={lang === 'tr' ? 'Adımlar (sonu "→ sonuç" ile yazın)' : 'Steps (end with "→ result")'}
          items={config.mcp.chat_steps}
          onChange={items => updateConfig('mcp.chat_steps', items)}
          lang={lang}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label={lang === 'tr' ? 'Yanıt (öncesi)' : 'Response (lead)'}
            value={config.mcp.chat_response_lead}
            onChange={v => updateConfig('mcp.chat_response_lead', v)} />
          <Field label={lang === 'tr' ? 'Yanıt (alıntı/gri)' : 'Response (quoted)'}
            value={config.mcp.chat_response_quoted}
            onChange={v => updateConfig('mcp.chat_response_quoted', v)} />
        </div>

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Uyumlu Asistanlar' : 'Compatible Assistants'}</Label>
        <Field label={lang === 'tr' ? '"Uyumlu" Etiketi' : '"Compatible" Label'}
          value={config.mcp.compat_label}
          onChange={v => updateConfig('mcp.compat_label', v)} />
        <StringList
          label={lang === 'tr' ? 'Asistan Adları' : 'Assistant Names'}
          items={config.mcp.compat_items}
          onChange={items => updateConfig('mcp.compat_items', items)}
          lang={lang}
        />
        <Field label={lang === 'tr' ? 'Ek Yazı' : 'Extra Text'}
          value={config.mcp.compat_extra}
          onChange={v => updateConfig('mcp.compat_extra', v)}
          placeholder="+ standart protokol" />
      </SectionCard>

      {/* PLUGINS */}
      <SectionCard id="plugins" icon={Puzzle}
        title={lang === 'tr' ? 'Eklentiler & Kısa Kodlar' : 'Plugins & Shortcodes'}
        desc={`${config.plugins.builtin.length} ${lang === 'tr' ? 'eklenti' : 'plugins'} · ${config.plugins.shortcodes.length} ${lang === 'tr' ? 'kod' : 'codes'}`}
        open={openSections.plugins} onToggle={toggle}
      >
        <Field label={lang === 'tr' ? 'Bölüm Etiketi' : 'Section Label'}
          value={config.plugins.section_label}
          onChange={v => updateConfig('plugins.section_label', v)} />

        <Label className="text-sm font-medium">{lang === 'tr' ? 'Başlık' : 'Title'}</Label>
        <TripleHeadingFields
          lead={config.plugins.title_lead}
          highlight={config.plugins.title_highlight}
          tail={config.plugins.title_tail}
          onChange={(k, v) => updateConfig(`plugins.${k}`, v)}
          lang={lang}
        />
        <Field label={lang === 'tr' ? 'Açıklama' : 'Description'}
          value={config.plugins.body}
          onChange={v => updateConfig('plugins.body', v)} multiline />

        <Separator />
        <Field label={lang === 'tr' ? 'Eklenti Bölüm Başlığı' : 'Built-in Heading'}
          value={config.plugins.builtin_heading}
          onChange={v => updateConfig('plugins.builtin_heading', v)} />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Dahili Eklentiler' : 'Built-in Plugins'}</Label>
        <div className="space-y-3">
          {config.plugins.builtin.map((p, i) => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.name || `${lang === 'tr' ? 'Eklenti' : 'Plugin'} ${i + 1}`}</span>
                  <Button variant="ghost" size="icon"
                    onClick={() => {
                      const builtin = config.plugins.builtin.filter((_, j) => j !== i);
                      updateConfig('plugins.builtin', builtin);
                    }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Field label={lang === 'tr' ? 'Ad' : 'Name'}
                      value={p.name}
                      onChange={v => updateConfig(`plugins.builtin.${i}.name`, v)} />
                  </div>
                  <Field label={lang === 'tr' ? 'Durum' : 'Status'}
                    value={p.status}
                    onChange={v => updateConfig(`plugins.builtin.${i}.status`, v)}
                    placeholder="aktif / opsiyonel" />
                </div>
                <Field label={lang === 'tr' ? 'Açıklama' : 'Description'}
                  value={p.description}
                  onChange={v => updateConfig(`plugins.builtin.${i}.description`, v)}
                  multiline />
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm"
            onClick={() => updateConfig('plugins.builtin', [
              ...config.plugins.builtin,
              { name: '', status: 'aktif', description: '' },
            ])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Eklenti Ekle' : 'Add Plugin'}
          </Button>
        </div>

        <Separator />
        <Field label={lang === 'tr' ? 'Kısa Kod Bölüm Başlığı' : 'Shortcodes Heading'}
          value={config.plugins.shortcodes_heading}
          onChange={v => updateConfig('plugins.shortcodes_heading', v)} />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Kısa Kod Listesi' : 'Shortcodes'}</Label>
        <div className="space-y-2">
          {config.plugins.shortcodes.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={s.code}
                onChange={e => updateConfig(`plugins.shortcodes.${i}.code`, e.target.value)}
                placeholder="[slider]" className="w-40 font-mono" />
              <Input value={s.label}
                onChange={e => updateConfig(`plugins.shortcodes.${i}.label`, e.target.value)}
                placeholder={lang === 'tr' ? 'Açıklama' : 'Label'} className="flex-1" />
              <Button variant="ghost" size="icon" className="shrink-0"
                onClick={() => {
                  const list = config.plugins.shortcodes.filter((_, j) => j !== i);
                  updateConfig('plugins.shortcodes', list);
                }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm"
            onClick={() => updateConfig('plugins.shortcodes', [
              ...config.plugins.shortcodes,
              { code: '', label: '' },
            ])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Kod Ekle' : 'Add Shortcode'}
          </Button>
        </div>
        <Field label={lang === 'tr' ? 'Ek Yazı' : 'Extra Text'}
          value={config.plugins.shortcodes_extra}
          onChange={v => updateConfig('plugins.shortcodes_extra', v)} />
      </SectionCard>

      {/* PRICING */}
      <SectionCard id="pricing" icon={CreditCard}
        title={lang === 'tr' ? 'Fiyatlandırma' : 'Pricing'}
        desc={lang === 'tr' ? 'Planlar Paketler sayfasından' : 'Plans come from Packages'}
        open={openSections.pricing} onToggle={toggle}
      >
        <Field label={lang === 'tr' ? 'Bölüm Etiketi' : 'Section Label'}
          value={config.pricing.section_label}
          onChange={v => updateConfig('pricing.section_label', v)} />

        <Label className="text-sm font-medium">{lang === 'tr' ? 'Başlık' : 'Title'}</Label>
        <TripleHeadingFields
          lead={config.pricing.title_lead}
          highlight={config.pricing.title_highlight}
          onChange={(k, v) => updateConfig(`pricing.${k}`, v)}
          lang={lang}
          includeTail={false}
        />
        <Field label={lang === 'tr' ? 'Alt Başlık' : 'Subtitle'}
          value={config.pricing.subtitle}
          onChange={v => updateConfig('pricing.subtitle', v)}
          multiline />

        <Separator />
        <Card className="bg-muted/40 border-dashed">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="text-sm">
                <div className="font-medium mb-1">
                  {lang === 'tr' ? 'Planlar Paketler sayfasından gelir' : 'Plans come from the Packages page'}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lang === 'tr'
                    ? 'Tanıtım sayfasındaki fiyat kartları, /admin/packages sayfasındaki aktif paketlerden otomatik üretilir. Paket eklediğinizde, sildiğinizde veya düzenlediğinizde değişiklik anında yansır.'
                    : 'The pricing cards on the landing page are generated from active packages in /admin/packages. Add, remove, or edit packages there and the change reflects immediately.'}
                </p>
                <a href="/admin/packages"
                   className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                  {lang === 'tr' ? 'Paketleri Yönet' : 'Manage Packages'} →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Son CTA Bandı' : 'Final CTA'}</Label>
        <div className="grid grid-cols-2 gap-3">
          <Field label={lang === 'tr' ? 'Başlık' : 'Title'}
            value={config.pricing.final_title}
            onChange={v => updateConfig('pricing.final_title', v)} />
          <Field label={lang === 'tr' ? 'Alt Başlık' : 'Subtitle'}
            value={config.pricing.final_subtitle}
            onChange={v => updateConfig('pricing.final_subtitle', v)} />
          <Field label={lang === 'tr' ? 'Buton Metni' : 'Button Text'}
            value={config.pricing.final_cta_text}
            onChange={v => updateConfig('pricing.final_cta_text', v)} />
          <Field label="URL"
            value={config.pricing.final_cta_url}
            onChange={v => updateConfig('pricing.final_cta_url', v)} />
        </div>
      </SectionCard>

      {/* FOOTER */}
      <SectionCard id="footer" icon={Layers}
        title="Footer"
        desc={`${config.footer.columns.length} ${lang === 'tr' ? 'sütun' : 'columns'}`}
        open={openSections.footer} onToggle={toggle}
      >
        <Field label={lang === 'tr' ? 'Açıklama' : 'Description'}
          value={config.footer.description}
          onChange={v => updateConfig('footer.description', v)} multiline />

        <Separator />
        <Label className="text-sm font-medium">{lang === 'tr' ? 'Footer Sütunları' : 'Footer Columns'}</Label>
        <div className="space-y-3">
          {config.footer.columns.map((col, i) => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{col.heading || `${lang === 'tr' ? 'Sütun' : 'Column'} ${i + 1}`}</span>
                  <Button variant="ghost" size="icon"
                    onClick={() => {
                      const cols = config.footer.columns.filter((_, j) => j !== i);
                      updateConfig('footer.columns', cols);
                    }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Field label={lang === 'tr' ? 'Sütun Başlığı' : 'Column Heading'}
                  value={col.heading}
                  onChange={v => updateConfig(`footer.columns.${i}.heading`, v)} />
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{lang === 'tr' ? 'Bağlantılar' : 'Links'}</Label>
                  {col.links.map((link, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Input value={link.text}
                        onChange={e => updateConfig(`footer.columns.${i}.links.${j}.text`, e.target.value)}
                        placeholder={lang === 'tr' ? 'Metin' : 'Text'} className="w-40" />
                      <Input value={link.url}
                        onChange={e => updateConfig(`footer.columns.${i}.links.${j}.url`, e.target.value)}
                        placeholder="URL" className="flex-1" />
                      <Button variant="ghost" size="icon" className="shrink-0"
                        onClick={() => {
                          const links = col.links.filter((_, k) => k !== j);
                          updateConfig(`footer.columns.${i}.links`, links);
                        }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm"
                    onClick={() => updateConfig(`footer.columns.${i}.links`, [...col.links, { text: '', url: '#' }])}>
                    <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Bağlantı' : 'Add Link'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm"
            onClick={() => updateConfig('footer.columns', [
              ...config.footer.columns,
              { heading: '', links: [] },
            ])}>
            <Plus className="h-4 w-4 mr-1" /> {lang === 'tr' ? 'Sütun Ekle' : 'Add Column'}
          </Button>
        </div>

        <Separator />
        <div className="grid grid-cols-2 gap-3">
          <Field label={lang === 'tr' ? 'Telif Hakkı' : 'Copyright'}
            value={config.footer.copyright}
            onChange={v => updateConfig('footer.copyright', v)} />
          <Field label={lang === 'tr' ? 'Sağ Yan Yazı' : 'Side Text'}
            value={config.footer.side_text}
            onChange={v => updateConfig('footer.side_text', v)} />
        </div>
      </SectionCard>

      {/* Save bar */}
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...') : (lang === 'tr' ? 'Tüm Değişiklikleri Kaydet' : 'Save All Changes')}
        </Button>
      </div>
    </div>
  );
}
