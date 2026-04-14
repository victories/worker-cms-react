import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image,
  Settings,
  Sliders,
} from 'lucide-react';

interface Slide {
  id: number;
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  imageUrl: string;
  order: number;
}

interface SliderSettingsData {
  slides: string;
  autoPlay: boolean;
  interval: number;
  showDots: boolean;
  showArrows: boolean;
  height: string;
  overlayOpacity: number;
}

export function SliderSettings() {
  const { lang } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pluginId, setPluginId] = useState<number | null>(null);

  // Slides state
  const [slides, setSlides] = useState<Slide[]>([]);

  // General settings state
  const [autoPlay, setAutoPlay] = useState(true);
  const [interval, setInterval] = useState(5000);
  const [height, setHeight] = useState('500px');
  const [showDots, setShowDots] = useState(true);
  const [showArrows, setShowArrows] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Find hero-slider plugin
      const pluginsRes = await api.request<{ success: boolean; data: any[] }>('/plugins');
      if (!pluginsRes.success || !pluginsRes.data) {
        setError(lang === 'tr' ? 'Eklentiler yüklenemedi' : 'Failed to load plugins');
        setLoading(false);
        return;
      }

      const heroSlider = pluginsRes.data.find((p: any) => p.slug === 'hero-slider');
      if (!heroSlider) {
        setError(lang === 'tr' ? 'Hero Slider eklentisi bulunamadi' : 'Hero Slider plugin not found');
        setLoading(false);
        return;
      }

      setPluginId(heroSlider.id);

      // Step 2: Load settings
      const settingsRes = await api.request<{
        success: boolean;
        data: { settings: SliderSettingsData; schema: any };
      }>(`/plugins/${heroSlider.id}/settings`);

      if (!settingsRes.success || !settingsRes.data) {
        setError(lang === 'tr' ? 'Ayarlar yüklenemedi' : 'Failed to load settings');
        setLoading(false);
        return;
      }

      const s = settingsRes.data.settings;

      // Parse slides from JSON string
      let parsedSlides: Slide[] = [];
      try {
        parsedSlides = typeof s.slides === 'string' ? JSON.parse(s.slides) : s.slides || [];
      } catch {
        parsedSlides = [];
      }

      setSlides(parsedSlides);
      setAutoPlay(s.autoPlay ?? true);
      setInterval(s.interval ?? 5000);
      setHeight(s.height ?? '500px');
      setShowDots(s.showDots ?? true);
      setShowArrows(s.showArrows ?? true);
      setOverlayOpacity(s.overlayOpacity ?? 0.4);
    } catch (err: any) {
      setError(err.message || (lang === 'tr' ? 'Bir hata olustu' : 'An error occurred'));
    }

    setLoading(false);
  }, [lang]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!pluginId) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const settingsPayload: SliderSettingsData = {
        slides: JSON.stringify(slides),
        autoPlay,
        interval,
        showDots,
        showArrows,
        height,
        overlayOpacity,
      };

      const res = await api.request<{ success: boolean }>(`/plugins/${pluginId}/settings`, {
        method: 'PUT',
        body: settingsPayload,
      });

      if (res.success) {
        setSuccessMsg(lang === 'tr' ? 'Ayarlar kaydedildi' : 'Settings saved successfully');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(lang === 'tr' ? 'Kaydetme basarisiz' : 'Failed to save settings');
      }
    } catch (err: any) {
      setError(err.message || (lang === 'tr' ? 'Bir hata olustu' : 'An error occurred'));
    }

    setSaving(false);
  };

  const addSlide = () => {
    const newId = slides.length > 0 ? Math.max(...slides.map((s) => s.id)) + 1 : 1;
    setSlides([
      ...slides,
      {
        id: newId,
        title: '',
        description: '',
        buttonText: '',
        buttonUrl: '',
        imageUrl: '',
        order: slides.length,
      },
    ]);
  };

  const removeSlide = (id: number) => {
    setSlides(slides.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i })));
  };

  const updateSlide = (id: number, field: keyof Slide, value: string) => {
    setSlides(slides.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSlides.length) return;

    [newSlides[index], newSlides[targetIndex]] = [newSlides[targetIndex], newSlides[index]];
    setSlides(newSlides.map((s, i) => ({ ...s, order: i })));
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sliders className="h-5 w-5 animate-spin" />
          {t('common.loading', lang)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/plugins')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('action.back', lang)}
          </Button>
          <div className="flex items-center gap-2">
            <Sliders className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">
              {lang === 'tr' ? 'Hero Slider Ayarlari' : 'Hero Slider Settings'}
            </h1>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving
            ? lang === 'tr'
              ? 'Kaydediliyor...'
              : 'Saving...'
            : t('action.save', lang)}
        </Button>
      </div>

      {/* Status messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {successMsg}
        </div>
      )}

      {/* Slides Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="h-5 w-5" />
            {lang === 'tr' ? 'Slaytlar' : 'Slides'}
            <Badge variant="secondary" className="ml-2">
              {slides.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {slides.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {lang === 'tr' ? 'Henuz slayt eklenmemis.' : 'No slides added yet.'}
            </p>
          )}

          {slides.map((slide, index) => (
            <Card key={slide.id} className="border-dashed">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    <span className="font-medium text-sm">
                      {slide.title || (lang === 'tr' ? 'Basliklsiz Slayt' : 'Untitled Slide')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSlide(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSlide(index, 'down')}
                      disabled={index === slides.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => removeSlide(slide.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Image preview */}
                {slide.imageUrl && (
                  <div className="rounded-lg overflow-hidden border bg-muted h-40 flex items-center justify-center">
                    <img
                      src={slide.imageUrl}
                      alt={slide.title || 'Slide preview'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{lang === 'tr' ? 'Baslik' : 'Title'}</Label>
                    <Input
                      value={slide.title}
                      onChange={(e) => updateSlide(slide.id, 'title', e.target.value)}
                      placeholder={lang === 'tr' ? 'Slayt basligi' : 'Slide title'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === 'tr' ? 'Gorsel URL' : 'Image URL'}</Label>
                    <Input
                      value={slide.imageUrl}
                      onChange={(e) => updateSlide(slide.id, 'imageUrl', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{lang === 'tr' ? 'Aciklama' : 'Description'}</Label>
                  <Textarea
                    value={slide.description}
                    onChange={(e) => updateSlide(slide.id, 'description', e.target.value)}
                    placeholder={lang === 'tr' ? 'Slayt aciklamasi' : 'Slide description'}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{lang === 'tr' ? 'Buton Metni' : 'Button Text'}</Label>
                    <Input
                      value={slide.buttonText}
                      onChange={(e) => updateSlide(slide.id, 'buttonText', e.target.value)}
                      placeholder={lang === 'tr' ? 'Devamini Oku' : 'Read More'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{lang === 'tr' ? 'Buton URL' : 'Button URL'}</Label>
                    <Input
                      value={slide.buttonUrl}
                      onChange={(e) => updateSlide(slide.id, 'buttonUrl', e.target.value)}
                      placeholder="/about"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full" onClick={addSlide}>
            <Plus className="h-4 w-4 mr-2" />
            {lang === 'tr' ? 'Slayt Ekle' : 'Add Slide'}
          </Button>
        </CardContent>
      </Card>

      {/* General Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            {lang === 'tr' ? 'Genel Ayarlar' : 'General Settings'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Auto Play */}
            <div className="flex items-center justify-between">
              <Label htmlFor="autoPlay">
                {lang === 'tr' ? 'Otomatik Oynat' : 'Auto Play'}
              </Label>
              <Switch
                id="autoPlay"
                checked={autoPlay}
                onCheckedChange={setAutoPlay}
              />
            </div>

            {/* Show Dots */}
            <div className="flex items-center justify-between">
              <Label htmlFor="showDots">
                {lang === 'tr' ? 'Noktalari Goster' : 'Show Dots'}
              </Label>
              <Switch
                id="showDots"
                checked={showDots}
                onCheckedChange={setShowDots}
              />
            </div>

            {/* Show Arrows */}
            <div className="flex items-center justify-between">
              <Label htmlFor="showArrows">
                {lang === 'tr' ? 'Oklari Goster' : 'Show Arrows'}
              </Label>
              <Switch
                id="showArrows"
                checked={showArrows}
                onCheckedChange={setShowArrows}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Interval */}
            <div className="space-y-2">
              <Label htmlFor="interval">
                {lang === 'tr' ? 'Aralik (ms)' : 'Interval (ms)'}
              </Label>
              <Input
                id="interval"
                type="number"
                min={1000}
                step={500}
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
              />
            </div>

            {/* Height */}
            <div className="space-y-2">
              <Label htmlFor="height">
                {lang === 'tr' ? 'Yukseklik' : 'Height'}
              </Label>
              <Input
                id="height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="500px"
              />
            </div>

            {/* Overlay Opacity */}
            <div className="space-y-2">
              <Label htmlFor="overlayOpacity">
                {lang === 'tr' ? 'Kaplama Opakligi' : 'Overlay Opacity'}
              </Label>
              <Input
                id="overlayOpacity"
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving
            ? lang === 'tr'
              ? 'Kaydediliyor...'
              : 'Saving...'
            : t('action.save', lang)}
        </Button>
      </div>
    </div>
  );
}
