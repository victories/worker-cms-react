import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast-notification';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Type, Hash, Calendar, List, CheckSquare, Image, FileUp, Palette, Link, Mail, GitBranch, AlignLeft, ToggleLeft,
} from 'lucide-react';

interface FieldOption { label: string; value: string; }
interface FieldDef {
  key: string;
  label: string;
  type: string;
  required: boolean;
  default_value: string;
  placeholder: string;
  description: string;
  options: FieldOption[];
  validation: { min?: number; max?: number; pattern?: string; message?: string };
  width: 'full' | 'half';
  relation_type: string;
}

const FIELD_TYPES = [
  { type: 'text', label: 'Metin', icon: Type },
  { type: 'textarea', label: 'Uzun Metin', icon: AlignLeft },
  { type: 'richtext', label: 'Zengin Metin', icon: AlignLeft },
  { type: 'number', label: 'Sayı', icon: Hash },
  { type: 'date', label: 'Tarih', icon: Calendar },
  { type: 'datetime', label: 'Tarih/Saat', icon: Calendar },
  { type: 'select', label: 'Açılır Liste', icon: List },
  { type: 'multiselect', label: 'Çoklu Seçim', icon: List },
  { type: 'checkbox', label: 'Onay Kutusu', icon: CheckSquare },
  { type: 'radio', label: 'Radyo Buton', icon: ToggleLeft },
  { type: 'image', label: 'Görsel', icon: Image },
  { type: 'file', label: 'Dosya', icon: FileUp },
  { type: 'color', label: 'Renk', icon: Palette },
  { type: 'url', label: 'URL', icon: Link },
  { type: 'email', label: 'E-posta', icon: Mail },
  { type: 'relation', label: 'İlişki', icon: GitBranch },
];

const SUPPORTS_OPTIONS = [
  { key: 'title', label: 'Başlık' },
  { key: 'editor', label: 'Editör' },
  { key: 'excerpt', label: 'Özet' },
  { key: 'thumbnail', label: 'Öne Çıkan Görsel' },
  { key: 'comments', label: 'Yorumlar' },
  { key: 'revisions', label: 'Revizyon' },
];

const emptyField = (): FieldDef => ({
  key: '', label: '', type: 'text', required: false,
  default_value: '', placeholder: '', description: '',
  options: [], validation: {}, width: 'full', relation_type: 'post',
});

export function ContentTypeEditor() {
  const { slug: editSlug } = useParams();
  const isEdit = !!editSlug;
  const navigate = useNavigate();
  const { lang } = useAuthStore();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [nameSingular, setNameSingular] = useState('');
  const [namePlural, setNamePlural] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('file-text');
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [supports, setSupports] = useState<string[]>(['title', 'editor', 'excerpt', 'thumbnail']);
  const [taxonomies, setTaxonomies] = useState<string[]>(['category', 'tag']);
  const [hasArchive, setHasArchive] = useState(true);
  const [isHierarchical, setIsHierarchical] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [editingFieldIdx, setEditingFieldIdx] = useState<number | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  useEffect(() => {
    if (isEdit && editSlug) {
      api.request<{ success: boolean; data: any }>(`/content-types/${editSlug}`)
        .then((res) => {
          if (res.success) {
            const ct = res.data;
            setName(ct.name);
            setSlug(ct.slug);
            setNameSingular(ct.name_singular || '');
            setNamePlural(ct.name_plural || '');
            setDescription(ct.description || '');
            setIcon(ct.icon || 'file-text');
            setFields(ct.fields || []);
            setSupports(ct.supports || []);
            setTaxonomies(ct.taxonomies || []);
            setHasArchive(!!ct.has_archive);
            setIsHierarchical(!!ct.is_hierarchical);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [editSlug]);

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  };

  const addField = (type: string) => {
    const f = emptyField();
    f.type = type;
    setFields([...fields, f]);
    setEditingFieldIdx(fields.length);
    setShowFieldPicker(false);
  };

  const updateField = (idx: number, partial: Partial<FieldDef>) => {
    const next = [...fields];
    next[idx] = { ...next[idx], ...partial };
    // Auto-generate key from label
    if (partial.label && !fields[idx].key) {
      next[idx].key = partial.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    }
    setFields(next);
  };

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
    setEditingFieldIdx(null);
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const next = [...fields];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setFields(next);
    setEditingFieldIdx(newIdx);
  };

  const toggleSupport = (key: string) => {
    setSupports(supports.includes(key) ? supports.filter(s => s !== key) : [...supports, key]);
  };

  const toggleTaxonomy = (key: string) => {
    setTaxonomies(taxonomies.includes(key) ? taxonomies.filter(s => s !== key) : [...taxonomies, key]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast('İsim gerekli', 'error');
      return;
    }
    if (!slug.trim()) {
      toast('Slug gerekli', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        slug, name, name_singular: nameSingular || name, name_plural: namePlural || name,
        description, icon, fields, supports, taxonomies,
        has_archive: hasArchive, is_hierarchical: isHierarchical,
      };

      if (isEdit) {
        await api.request(`/content-types/${editSlug}`, { method: 'PUT', body: payload });
      } else {
        await api.request('/content-types', { method: 'POST', body: payload });
      }

      toast(isEdit ? 'İçerik tipi güncellendi' : 'İçerik tipi oluşturuldu', 'success');
      navigate('/content-types');
    } catch (err: any) {
      const msg = err?.error || 'Kayıt hatası';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/content-types')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdit ? t('İçerik Tipi Düzenle', lang) : t('Yeni İçerik Tipi', lang)}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Kaydediliyor...' : t('Kaydet', lang)}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: General Settings */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Genel Ayarlar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>İsim *</Label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ürünler" />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="urunler" disabled={isEdit} className="font-mono" />
              </div>
              <div>
                <Label>Tekil İsim</Label>
                <Input value={nameSingular} onChange={(e) => setNameSingular(e.target.value)} placeholder="Ürün" />
              </div>
              <div>
                <Label>Çoğul İsim</Label>
                <Input value={namePlural} onChange={(e) => setNamePlural(e.target.value)} placeholder="Ürünler" />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>İkon</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['file-text', 'package', 'image', 'shopping-bag', 'briefcase', 'book-open', 'users', 'film', 'music', 'map-pin', 'calendar', 'heart', 'star'].map(i => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Destekler</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {SUPPORTS_OPTIONS.map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <Label className="cursor-pointer">{s.label}</Label>
                  <Switch checked={supports.includes(s.key)} onCheckedChange={() => toggleSupport(s.key)} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Taksonomiler</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {['category', 'tag'].map(tax => (
                <div key={tax} className="flex items-center justify-between">
                  <Label className="cursor-pointer">{tax === 'category' ? 'Kategoriler' : 'Etiketler'}</Label>
                  <Switch checked={taxonomies.includes(tax)} onCheckedChange={() => toggleTaxonomy(tax)} />
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Label>Arşiv Sayfası</Label>
                <Switch checked={hasArchive} onCheckedChange={setHasArchive} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Hiyerarşik</Label>
                <Switch checked={isHierarchical} onCheckedChange={setIsHierarchical} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Field Builder */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Alanlar ({fields.length})</CardTitle>
                <Button size="sm" onClick={() => setShowFieldPicker(!showFieldPicker)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Alan Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Field Type Picker */}
              {showFieldPicker && (
                <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                  {FIELD_TYPES.map(ft => {
                    const Icon = ft.icon;
                    return (
                      <button
                        key={ft.type}
                        onClick={() => addField(ft.type)}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-background border border-transparent hover:border-border transition-colors text-center"
                      >
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs">{ft.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Field List */}
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Henüz alan eklenmedi. "Alan Ekle" butonuna tıklayın.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, idx) => {
                    const ftDef = FIELD_TYPES.find(ft => ft.type === field.type);
                    const Icon = ftDef?.icon || Type;
                    const isExpanded = editingFieldIdx === idx;

                    return (
                      <div key={idx} className="border rounded-lg overflow-hidden">
                        {/* Field Row */}
                        <div
                          className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/30"
                          onClick={() => setEditingFieldIdx(isExpanded ? null : idx)}
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm flex-1">
                            {field.label || '(isimsiz)'}
                          </span>
                          <Badge variant="outline" className="text-xs">{ftDef?.label || field.type}</Badge>
                          {field.required && <Badge variant="secondary" className="text-xs">Zorunlu</Badge>}
                          <span className="text-xs text-muted-foreground font-mono">{field.key}</span>
                        </div>

                        {/* Expanded Settings */}
                        {isExpanded && (
                          <div className="border-t p-4 bg-muted/10 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Etiket *</Label>
                                <Input value={field.label} onChange={e => updateField(idx, { label: e.target.value })} placeholder="Fiyat" />
                              </div>
                              <div>
                                <Label className="text-xs">Key *</Label>
                                <Input value={field.key} onChange={e => updateField(idx, { key: e.target.value })} placeholder="fiyat" className="font-mono" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Placeholder</Label>
                                <Input value={field.placeholder} onChange={e => updateField(idx, { placeholder: e.target.value })} />
                              </div>
                              <div>
                                <Label className="text-xs">Varsayılan Değer</Label>
                                <Input value={field.default_value} onChange={e => updateField(idx, { default_value: e.target.value })} />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Açıklama</Label>
                              <Input value={field.description} onChange={e => updateField(idx, { description: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-2">
                                <Switch checked={field.required} onCheckedChange={v => updateField(idx, { required: v })} />
                                <Label className="text-xs">Zorunlu</Label>
                              </div>
                              <div>
                                <Label className="text-xs">Genişlik</Label>
                                <Select value={field.width} onValueChange={v => updateField(idx, { width: v as 'full' | 'half' })}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="full">Tam</SelectItem>
                                    <SelectItem value="half">Yarım</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Options for select/multiselect/radio */}
                            {['select', 'multiselect', 'radio'].includes(field.type) && (
                              <div>
                                <Label className="text-xs">Seçenekler</Label>
                                <div className="space-y-1 mt-1">
                                  {(field.options || []).map((opt, oi) => (
                                    <div key={oi} className="flex gap-2">
                                      <Input
                                        value={opt.label}
                                        onChange={e => {
                                          const newOpts = [...(field.options || [])];
                                          newOpts[oi] = { ...newOpts[oi], label: e.target.value };
                                          if (!newOpts[oi].value) newOpts[oi].value = e.target.value.toLowerCase().replace(/\s+/g, '_');
                                          updateField(idx, { options: newOpts });
                                        }}
                                        placeholder="Etiket"
                                        className="h-7 text-xs"
                                      />
                                      <Input
                                        value={opt.value}
                                        onChange={e => {
                                          const newOpts = [...(field.options || [])];
                                          newOpts[oi] = { ...newOpts[oi], value: e.target.value };
                                          updateField(idx, { options: newOpts });
                                        }}
                                        placeholder="Değer"
                                        className="h-7 text-xs font-mono w-32"
                                      />
                                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => {
                                        const newOpts = (field.options || []).filter((_, i) => i !== oi);
                                        updateField(idx, { options: newOpts });
                                      }}>
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                                    updateField(idx, { options: [...(field.options || []), { label: '', value: '' }] });
                                  }}>
                                    <Plus className="w-3 h-3 mr-1" /> Seçenek Ekle
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Relation type */}
                            {field.type === 'relation' && (
                              <div>
                                <Label className="text-xs">İlişkili İçerik Tipi</Label>
                                <Input value={field.relation_type} onChange={e => updateField(idx, { relation_type: e.target.value })} placeholder="post" className="font-mono" />
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Button size="sm" variant="outline" onClick={() => moveField(idx, -1)} disabled={idx === 0}>
                                <ChevronUp className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </Button>
                              <div className="flex-1" />
                              <Button size="sm" variant="destructive" onClick={() => removeField(idx)}>
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Sil
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
