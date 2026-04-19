import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Switch } from '@ui/switch';
import { EditorWrapper } from '@/components/editor/EditorWrapper';
import { SeoAnalysis } from '@/components/editor/SeoAnalysis';
import { ArrowLeft, Save, Zap, Globe, ExternalLink, MessageSquare, Clock, History, RotateCcw, X, Eye, ImageIcon, Upload, Trash2, Pin, ChevronDown, Package } from 'lucide-react';
import { useToast } from '@ui/toast-notification';
import { mediaUrl } from '@ui/lib/utils';
import { LayoutBuilder } from '@/components/editor/LayoutBuilder';
import { DynamicField as DynamicFieldComponent } from '@/components/fields/DynamicField';
import type { PageLayout } from '@/components/editor/LayoutPresets';

interface PostEditorProps {
  postType?: string;
}

export function PostEditor({ postType = 'post' }: PostEditorProps) {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { lang } = useAuthStore();
  const { sites, activeSite, setActiveSiteById } = useSiteStore();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState('draft');
  const [language, setLanguage] = useState('tr');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [ampEnabled, setAmpEnabled] = useState(true);
  const [commentStatus, setCommentStatus] = useState('open');
  const [isSticky, setIsSticky] = useState(false);
  const [publishedAt, setPublishedAt] = useState('');
  // Track which sidebar accordion sections are open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    tags: false,
    featured: true,
    excerpt: false,
    seo: false,
    amp: false,
    comments: false,
    revisions: false,
    layout: false,
  });
  const [pageLayout, setPageLayout] = useState<PageLayout | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [showRevisions, setShowRevisions] = useState(false);
  const [previewRevision, setPreviewRevision] = useState<any>(null);
  const [restoringRevision, setRestoringRevision] = useState(false);
  const [contentTypeFields, setContentTypeFields] = useState<any[]>([]);
  const [customMeta, setCustomMeta] = useState<Record<string, any>>({});
  const [featuredImageId, setFeaturedImageId] = useState<number | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [featuredImageUploading, setFeaturedImageUploading] = useState(false);
  const featuredImageRef = useRef<HTMLInputElement>(null);

  // Load content type field schema for custom post types
  useEffect(() => {
    if (postType && postType !== 'post' && postType !== 'page' && activeSite) {
      api.getContentType(postType).then((res: any) => {
        if (res.success && res.data?.fields) {
          setContentTypeFields(res.data.fields);
        }
      }).catch(() => {});
    } else {
      setContentTypeFields([]);
    }
  }, [postType, activeSite?.id]);

  useEffect(() => {
    // Wait for activeSite to be available before loading data
    // (on F5 refresh, fetchSites is async so activeSite may be null initially)
    if (!activeSite) return;
    loadTaxonomies();
    if (isEdit) loadPost();
  }, [id, activeSite?.id]);

  // Reload taxonomies when active site changes
  useEffect(() => {
    if (!isEdit) {
      loadTaxonomies();
    }
  }, [activeSite?.id]);

  const loadPost = async () => {
    setLoading(true);
    const res = await api.getPost(Number(id));
    if (res.success) {
      const p = res.data;
      setTitle(p.title || '');
      setSlug(p.slug || '');
      setContent(p.content || '');
      setExcerpt(p.excerpt || '');
      setStatus(p.status || 'draft');
      setLanguage(p.language || 'tr');
      setSeoTitle(p.seo_title || '');
      setSeoDescription(p.seo_description || '');
      setSeoKeywords(p.seo_keywords || '');
      setPublishedAt(p.published_at ? p.published_at.slice(0, 16) : '');
      setAmpEnabled(p.amp_enabled !== undefined ? p.amp_enabled === 1 || p.amp_enabled === true : true);
      setCommentStatus(p.comment_status || 'open');
      setIsSticky(p.is_sticky === 1 || p.is_sticky === true);
      // Backend returns all taxonomies in one array; split by type
      if (p.taxonomies) {
        setSelectedCategories(p.taxonomies.filter((t: any) => t.type === 'category').map((c: any) => c.id));
        setSelectedTags(p.taxonomies.filter((t: any) => t.type === 'tag').map((t: any) => t.id));
      } else {
        if (p.categories) setSelectedCategories(p.categories.map((c: any) => c.id));
        if (p.tags) setSelectedTags(p.tags.map((t: any) => t.id));
      }
      // Load featured image
      if (p.featured_image_id) {
        setFeaturedImageId(p.featured_image_id);
        try {
          const mediaRes = await api.getMediaItem(p.featured_image_id);
          if (mediaRes.success && mediaRes.data?.r2_key) {
            setFeaturedImageUrl(mediaUrl(mediaRes.data.r2_key));
          }
        } catch { /* ignore */ }
      }
      // Load custom meta for content type fields
      if (p.meta) {
        setCustomMeta(p.meta);
      }
      // Load page layout from meta
      if (p.meta?.page_layout) {
        try {
          setPageLayout(JSON.parse(p.meta.page_layout));
        } catch {
          setPageLayout(null);
        }
      }
    }
    setLoading(false);
  };

  const loadTaxonomies = async () => {
    const [catRes, tagRes] = await Promise.all([
      api.getTaxonomies({ type: 'category' }),
      api.getTaxonomies({ type: 'tag' }),
    ]);
    if (catRes.success) setCategories(catRes.data);
    if (tagRes.success) setTags(tagRes.data);
  };

  const loadRevisions = async () => {
    if (!id) return;
    const res = await api.getRevisions(Number(id));
    if (res.success) {
      setRevisions(res.data);
    }
  };

  const handleRestore = async (revisionId: number) => {
    if (!id) return;
    if (!window.confirm(lang === 'tr' ? 'Bu revizyonu geri yuklemek istediginizden emin misiniz?' : 'Are you sure you want to restore this revision?')) return;
    setRestoringRevision(true);
    try {
      const res = await api.restoreRevision(Number(id), revisionId);
      if (res.success) {
        // Reload the full post to get all restored fields
        await loadPost();
        setPreviewRevision(null);
        setShowRevisions(false);
        toast(lang === 'tr' ? 'Revizyon geri yuklendi' : 'Revision restored', 'success');
        loadRevisions();
      }
    } catch {
      toast(lang === 'tr' ? 'Geri yukleme basarisiz' : 'Restore failed', 'error');
    }
    setRestoringRevision(false);
  };

  const handleSave = async (publishStatus?: string) => {
    setSaving(true);
    const data = {
      title,
      slug: slug || undefined,
      content,
      excerpt,
      status: publishStatus || status,
      post_type: postType,
      language,
      seo_title: seoTitle || undefined,
      seo_description: seoDescription || undefined,
      seo_keywords: seoKeywords || undefined,
      published_at: (publishStatus || status) === 'scheduled' && publishedAt ? new Date(publishedAt).toISOString() : undefined,
      amp_enabled: ampEnabled ? 1 : 0,
      comment_status: commentStatus,
      is_sticky: isSticky ? 1 : 0,
      featured_image_id: featuredImageId,
      categories: selectedCategories,
      tags: selectedTags,
      meta: {
        page_layout: pageLayout ? JSON.stringify(pageLayout) : '',
        ...customMeta,
      },
    };

    try {
      if (isEdit) {
        const res = await api.updatePost(Number(id), data) as any;
        if (res.success) {
          toast(lang === 'tr' ? 'Başarıyla kaydedildi' : 'Saved successfully', 'success');
        }
      } else {
        const res = await api.createPost(data) as any;
        if (res.success) {
          toast(lang === 'tr' ? 'Başarıyla oluşturuldu' : 'Created successfully', 'success');
          const navPath = postType === 'page' ? 'pages' : postType === 'post' ? 'posts' : `content/${postType}`;
          navigate(`/${navPath}/${res.data.id}`, { replace: true });
        }
      }
    } catch (err) {
      console.error('Save failed:', err);
      toast(lang === 'tr' ? 'Kaydetme başarısız' : 'Save failed', 'error');
    }
    setSaving(false);
  };

  const handleSiteChange = (siteIdStr: string) => {
    setActiveSiteById(Number(siteIdStr));
    // Reload taxonomies for the new site
    setTimeout(() => loadTaxonomies(), 100);
  };

  const handleFeaturedImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setFeaturedImageUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.uploadMedia(formData) as any;
      if (res.success && res.data) {
        setFeaturedImageId(res.data.id);
        setFeaturedImageUrl(res.data.r2_key ? mediaUrl(res.data.r2_key) : `/uploads/${res.data.filename}`);
      }
    } catch (err) {
      console.error('Featured image upload failed:', err);
      toast(lang === 'tr' ? 'Yükleme başarısız' : 'Upload failed', 'error');
    }
    setFeaturedImageUploading(false);
  };

  const removeFeaturedImage = () => {
    setFeaturedImageId(null);
    setFeaturedImageUrl(null);
    if (featuredImageRef.current) featuredImageRef.current.value = '';
  };

  // Set featured image from an editor image src URL
  const setFeaturedFromSrc = async (src: string) => {
    // The src is like /uploads/s/1/2026/03/image.webp or /uploads/filename.webp
    // Try to find the media item by matching the URL path
    try {
      const res = await api.getMedia({ limit: '200' });
      if (res.success && res.data) {
        const match = res.data.find((m: any) => {
          if (!m.r2_key) return false;
          const mUrl = mediaUrl(m.r2_key);
          return src === mUrl || src.endsWith(mUrl) || mUrl.endsWith(src.split('/').pop() || '___');
        });
        if (match) {
          setFeaturedImageId(match.id);
          setFeaturedImageUrl(mediaUrl(match.r2_key));
          toast(lang === 'tr' ? 'Öne çıkan görsel ayarlandı' : 'Featured image set', 'success');
          return;
        }
      }

      // No match found — try to register the R2 file if it's a local upload URL
      // Convert /uploads/s/{siteId}/path → sites/{siteId}/uploads/path
      const localMatch = src.match(/^\/uploads\/s\/(\d+)\/(.+)$/);
      if (localMatch) {
        const r2Key = `sites/${localMatch[1]}/uploads/${localMatch[2]}`;
        try {
          const regRes = await api.registerR2Media(r2Key);
          if (regRes.success && regRes.data?.id) {
            setFeaturedImageId(regRes.data.id);
            setFeaturedImageUrl(mediaUrl(regRes.data.r2_key));
            toast(lang === 'tr' ? 'Öne çıkan görsel ayarlandı' : 'Featured image set', 'success');
            return;
          }
        } catch {
          // Registration failed, fall through to URL-only fallback
        }
      }

      // Also try /uploads/{path} format → sites/{siteId}/uploads/{path}
      const simpleMatch = src.match(/^\/uploads\/(.+)$/);
      if (simpleMatch && !localMatch) {
        const siteId = api.getSiteId();
        if (siteId) {
          const r2Key = `sites/${siteId}/uploads/${simpleMatch[1]}`;
          try {
            const regRes = await api.registerR2Media(r2Key);
            if (regRes.success && regRes.data?.id) {
              setFeaturedImageId(regRes.data.id);
              setFeaturedImageUrl(mediaUrl(regRes.data.r2_key));
              toast(lang === 'tr' ? 'Öne çıkan görsel ayarlandı' : 'Featured image set', 'success');
              return;
            }
          } catch {
            // Registration failed, fall through
          }
        }
      }

      // Fallback: just use the URL directly without media ID
      setFeaturedImageUrl(src);
      toast(lang === 'tr' ? 'Öne çıkan görsel ayarlandı' : 'Featured image set', 'success');
    } catch {
      setFeaturedImageUrl(src);
      toast(lang === 'tr' ? 'Öne çıkan görsel ayarlandı' : 'Featured image set', 'success');
    }
  };

  const getPrimaryDomain = (site: any) => {
    if (!site?.domains || site.domains.length === 0) return null;
    const primary = site.domains.find((d: any) => d.is_primary === 1);
    return primary || site.domains[0];
  };

  const isPage = postType === 'page';
  const backPath = isPage ? '/pages' : '/posts';

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading || (isEdit && !activeSite)) return <p className="text-muted-foreground">{t('common.loading', lang)}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdit ? t('posts.edit_post', lang) : (isPage ? t('posts.new_page', lang) : t('posts.new_post', lang))}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving}>
            {t('action.draft', lang)}
          </Button>
          {status === 'scheduled' ? (
            <Button onClick={() => handleSave('scheduled')} disabled={saving || !publishedAt}>
              <Clock className="h-4 w-4" />
              {t('action.schedule', lang)}
            </Button>
          ) : (
            <Button onClick={() => handleSave('publish')} disabled={saving}>
              <Save className="h-4 w-4" />
              {t('action.publish', lang)}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder={t('posts.title', lang)}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold border-0 px-0 focus-visible:ring-0"
                />
              </div>
              <EditorWrapper key={id || 'new'} content={content} onChange={setContent} lang={lang} onSetFeaturedImage={!isPage ? setFeaturedFromSrc : undefined} />
            </CardContent>
          </Card>

        </div>

        <div className="space-y-4">
          {/* Site Selector Card */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                {lang === 'tr' ? 'Hedef Site' : 'Target Site'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!isEdit && sites.length > 1 ? (
                <Select
                  value={activeSite ? String(activeSite.id) : undefined}
                  onValueChange={handleSiteChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={lang === 'tr' ? 'Site seçin' : 'Select site'} />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site: any) => {
                      const domain = getPrimaryDomain(site);
                      return (
                        <SelectItem key={site.id} value={String(site.id)}>
                          <div className="flex items-center gap-2">
                            <span>{site.name}</span>
                            {domain && (
                              <span className="text-xs text-muted-foreground font-mono">
                                ({domain.domain})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{activeSite?.name || '-'}</span>
                </div>
              )}
              {activeSite && (() => {
                const domain = getPrimaryDomain(activeSite);
                if (!domain) return null;
                const defaultLang = (activeSite as any).default_language || 'tr';
                const langPrefix = language && language !== defaultLang ? `/${language}` : '';
                const postSlug = slug || '';
                const fullUrl = postSlug
                  ? `https://${domain.domain}${langPrefix}/${postSlug}`
                  : `https://${domain.domain}`;
                return (
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-mono break-all"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {postSlug
                      ? `${domain.domain}${langPrefix}/${postSlug}`
                      : domain.domain}
                  </a>
                );
              })()}
              <p className="text-xs text-muted-foreground">
                {lang === 'tr'
                  ? 'Bu içerik seçili siteye kaydedilecek'
                  : 'Content will be saved to the selected site'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('posts.status', lang)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={status} onValueChange={(val) => {
                setStatus(val);
                if (val === 'scheduled' && !publishedAt) {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setMinutes(0, 0, 0);
                  setPublishedAt(tomorrow.toISOString().slice(0, 16));
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('status.draft', lang)}</SelectItem>
                  <SelectItem value="publish">{t('status.published', lang)}</SelectItem>
                  <SelectItem value="pending">{t('status.pending', lang)}</SelectItem>
                  <SelectItem value="scheduled">{t('status.scheduled', lang)}</SelectItem>
                </SelectContent>
              </Select>

              {status === 'scheduled' && (
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t('posts.publish_date', lang)}
                  </Label>
                  <Input
                    type="datetime-local"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{lang === 'tr' ? 'Dil' : 'Language'}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tr">Turkce</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!isPage && (
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Pin className="h-3 w-3" />
                      {lang === 'tr' ? 'Sabit Yazı' : 'Sticky Post'}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lang === 'tr'
                        ? 'Listelerde her zaman en üstte gösterilir'
                        : 'Always shown at the top of listings'}
                    </p>
                  </div>
                  <Switch checked={isSticky} onCheckedChange={setIsSticky} />
                </div>
              )}
            </CardContent>
          </Card>

          {!isPage && (
            <>
              <Card>
                <CardHeader className="cursor-pointer select-none" onClick={() => toggleSection('categories')}>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{t('nav.categories', lang)}{selectedCategories.length > 0 && <span className="text-xs text-muted-foreground ml-1">({selectedCategories.length})</span>}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.categories ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
                {openSections.categories && (
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {categories.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat.id)}
                            onChange={(e) => {
                              setSelectedCategories(
                                e.target.checked
                                  ? [...selectedCategories, cat.id]
                                  : selectedCategories.filter((id) => id !== cat.id)
                              );
                            }}
                            className="rounded"
                          />
                          {cat.name}
                        </label>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader className="cursor-pointer select-none" onClick={() => toggleSection('tags')}>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{t('nav.tags', lang)}{selectedTags.length > 0 && <span className="text-xs text-muted-foreground ml-1">({selectedTags.length})</span>}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.tags ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
                {openSections.tags && (
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {tags.map((tag) => (
                        <label key={tag.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag.id)}
                            onChange={(e) => {
                              setSelectedTags(
                                e.target.checked
                                  ? [...selectedTags, tag.id]
                                  : selectedTags.filter((id) => id !== tag.id)
                              );
                            }}
                            className="rounded"
                          />
                          {tag.name}
                        </label>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            </>
          )}

          {/* Featured Image Card */}
          {!isPage && (
            <Card>
              <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => toggleSection('featured')}>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    {lang === 'tr' ? 'Öne Çıkan Görsel' : 'Featured Image'}
                    {featuredImageUrl && <span className="h-2 w-2 rounded-full bg-green-500" />}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.featured ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
              {openSections.featured && <CardContent>
                <input
                  ref={featuredImageRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFeaturedImageUpload(file);
                  }}
                />
                {featuredImageUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={featuredImageUrl}
                        alt="Featured"
                        className="w-full h-auto max-h-[180px] object-cover rounded-lg"
                      />
                      {featuredImageUploading && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => featuredImageRef.current?.click()}
                      >
                        <Upload className="h-3 w-3" />
                        {lang === 'tr' ? 'Değiştir' : 'Change'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={removeFeaturedImage}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                    onClick={() => featuredImageRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFeaturedImageUpload(file);
                    }}
                  >
                    {featuredImageUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <p className="text-xs text-muted-foreground">
                          {lang === 'tr' ? 'Yükleniyor...' : 'Uploading...'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {lang === 'tr' ? 'Görsel yükle veya sürükle' : 'Upload or drag image'}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>}
            </Card>
          )}

          <Card>
            <CardHeader className="cursor-pointer select-none" onClick={() => toggleSection('excerpt')}>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{lang === 'tr' ? 'Özet' : 'Excerpt'}{excerpt && <span className="text-xs text-muted-foreground ml-1">✓</span>}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.excerpt ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
            {openSections.excerpt && (
              <CardContent>
                <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} />
              </CardContent>
            )}
          </Card>

          {/* Custom Fields for content types */}
          {contentTypeFields.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer select-none" onClick={() => toggleSection('custom_fields')}>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {lang === 'tr' ? 'Özel Alanlar' : 'Custom Fields'}
                    <span className="text-xs text-muted-foreground">({contentTypeFields.length})</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openSections.custom_fields ? '' : '-rotate-90'}`} />
                </CardTitle>
              </CardHeader>
              {openSections.custom_fields !== false && (
                <CardContent className="space-y-4">
                  {contentTypeFields.map((field: any) => (
                    <DynamicFieldComponent
                      key={field.key}
                      field={field}
                      value={customMeta[field.key]}
                      onChange={(key: string, val: any) => setCustomMeta(prev => ({ ...prev, [key]: val }))}
                    />
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          <SeoAnalysis
            title={title}
            content={content}
            slug={slug}
            seoTitle={seoTitle}
            seoDescription={seoDescription}
            seoKeywords={seoKeywords}
            onSeoTitleChange={setSeoTitle}
            onSeoDescriptionChange={setSeoDescription}
            onSeoKeywordsChange={setSeoKeywords}
            lang={lang}
            collapsed={!openSections.seo}
            onToggle={() => toggleSection('seo')}
          />

          <Card>
            <CardHeader className="cursor-pointer select-none" onClick={() => toggleSection('amp')}>
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  AMP
                  {!openSections.amp && <span className={`text-xs ${ampEnabled ? 'text-green-500' : 'text-muted-foreground'}`}>{ampEnabled ? '✓' : '✗'}</span>}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.amp ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
            {openSections.amp && (
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium">
                      {lang === 'tr' ? 'AMP Versiyonu' : 'AMP Version'}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lang === 'tr'
                        ? 'Bu icerik icin AMP sayfasi olustur'
                        : 'Generate AMP page for this content'}
                    </p>
                  </div>
                  <Switch checked={ampEnabled} onCheckedChange={setAmpEnabled} />
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="cursor-pointer select-none" onClick={() => toggleSection('comments')}>
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {lang === 'tr' ? 'Yorumlar' : 'Comments'}
                  {!openSections.comments && <span className={`text-xs ${commentStatus === 'open' ? 'text-green-500' : 'text-muted-foreground'}`}>{commentStatus === 'open' ? '✓' : '✗'}</span>}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.comments ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
            {openSections.comments && (
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium">
                      {lang === 'tr' ? 'Yorumlara İzin Ver' : 'Allow Comments'}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lang === 'tr'
                        ? 'Bu içerik için yorumları aç/kapat'
                        : 'Enable/disable comments for this content'}
                    </p>
                  </div>
                  <Switch
                    checked={commentStatus === 'open'}
                    onCheckedChange={(checked) => setCommentStatus(checked ? 'open' : 'closed')}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {isEdit && (
            <Card>
              <CardHeader className="cursor-pointer select-none" onClick={() => { toggleSection('revisions'); if (!openSections.revisions) loadRevisions(); }}>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    {lang === 'tr' ? 'Revizyonlar' : 'Revisions'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections.revisions ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
              {openSections.revisions && (
                <CardContent className="space-y-2">
                  {revisions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {lang === 'tr' ? 'Henuz revizyon yok' : 'No revisions yet'}
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {revisions.map((rev) => (
                        <div key={rev.id} className="flex items-center justify-between gap-1 text-xs border rounded px-2 py-1.5 hover:bg-muted/50">
                          <div className="min-w-0 flex-1">
                            <p className="text-muted-foreground truncate">
                              {new Date(rev.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {rev.author_name && <p className="text-muted-foreground/70 truncate">{rev.author_name}</p>}
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPreviewRevision(rev)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRestore(rev.id)} disabled={restoringRevision}>
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => { loadRevisions(); setShowRevisions(true); }}
                  >
                    <History className="h-4 w-4" />
                    {lang === 'tr' ? 'Tumu' : 'View All'}
                  </Button>
                </CardContent>
              )}
            </Card>
          )}

          {/* Revision History Modal */}
          {showRevisions && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowRevisions(false); setPreviewRevision(null); }}>
              <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <History className="h-5 w-5" />
                    {t('revisions.title', lang)}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => { setShowRevisions(false); setPreviewRevision(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {previewRevision ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setPreviewRevision(null)}>
                          <ArrowLeft className="h-4 w-4" />
                          {lang === 'tr' ? 'Geri' : 'Back'}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {new Date(previewRevision.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                          {previewRevision.author_name && ` — ${previewRevision.author_name}`}
                        </span>
                      </div>
                      <div className="border rounded-lg p-4 space-y-2">
                        <h3 className="font-semibold text-lg">{previewRevision.title}</h3>
                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewRevision.content || '' }} />
                      </div>
                      <Button onClick={() => handleRestore(previewRevision.id)} disabled={restoringRevision}>
                        <RotateCcw className="h-4 w-4" />
                        {t('revisions.restore', lang)}
                      </Button>
                    </div>
                  ) : revisions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t('revisions.no_revisions', lang)}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {revisions.map((rev) => (
                        <div
                          key={rev.id}
                          className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{rev.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(rev.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                              {rev.author_name && ` — ${rev.author_name}`}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setPreviewRevision(rev)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRestore(rev.id)} disabled={restoringRevision}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!openSections.layout ? (
            <Card>
              <CardHeader className="cursor-pointer select-none" onClick={() => toggleSection('layout')}>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {lang === 'tr' ? 'Sayfa Düzeni' : 'Page Layout'}
                    {pageLayout && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
            </Card>
          ) : (
            <div>
              <div className="flex justify-end mb-1">
                <button onClick={() => toggleSection('layout')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <ChevronDown className="h-3 w-3 rotate-180" />
                  {lang === 'tr' ? 'Gizle' : 'Collapse'}
                </button>
              </div>
              <LayoutBuilder
                layout={pageLayout}
                onLayoutChange={setPageLayout}
                lang={lang}
              />
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
