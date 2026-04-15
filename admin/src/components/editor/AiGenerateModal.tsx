import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/dialog';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { useToast } from '@ui/toast-notification';
import { cn } from '@ui/lib/utils';
import {
  Bot, Wand2, Sparkles, Loader2, Copy, FileText, RefreshCw,
  Languages, Scissors, Expand, RotateCcw, Search,
} from 'lucide-react';

interface AiGenerateModalProps {
  open: boolean;
  onClose: () => void;
  currentContent: string;
  currentTitle: string;
  onInsertContent: (content: string) => void;
  onReplaceContent: (content: string) => void;
  onSetTitle: (title: string) => void;
  onSetExcerpt?: (excerpt: string) => void;
  onSetSeoTitle?: (seoTitle: string) => void;
  onSetSeoDescription?: (seoDescription: string) => void;
  onSetSeoKeywords?: (seoKeywords: string) => void;
  onSetFeaturedImage?: (src: string) => void;
}

interface ProviderDef {
  slug: string;
  name: string;
  models: { id: string; name: string }[];
}

interface PromptTemplate {
  id: number;
  name: string;
  system_prompt: string;
  user_prompt: string;
  default_provider_slug: string;
  default_model: string;
  default_word_count: number;
  default_language: string;
  default_tone: string;
  image_enabled: number | boolean;
  image_model: string;
  image_style: string;
  image_count: number;
  image_layout: string; // JSON string
}

type TabKey = 'generate' | 'improve';
type ImproveAction = 'rewrite' | 'summarize' | 'expand' | 'translate' | 'seo_meta';

const LANGUAGES = [
  { value: 'tr', label: 'Turkce' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Francais' },
  { value: 'es', label: 'Espanol' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ru', label: 'Russian' },
];

const TONES = [
  { value: 'professional', label: { tr: 'Profesyonel', en: 'Professional' } },
  { value: 'casual', label: { tr: 'Samimi', en: 'Casual' } },
  { value: 'academic', label: { tr: 'Akademik', en: 'Academic' } },
  { value: 'creative', label: { tr: 'Yaratici', en: 'Creative' } },
  { value: 'news', label: { tr: 'Haber', en: 'News' } },
  { value: 'seo', label: { tr: 'SEO Odakli', en: 'SEO Focused' } },
];

export function AiGenerateModal({
  open,
  onClose,
  currentContent,
  currentTitle,
  onInsertContent,
  onReplaceContent,
  onSetTitle,
  onSetExcerpt,
  onSetSeoTitle,
  onSetSeoDescription,
  onSetSeoKeywords,
  onSetFeaturedImage,
}: AiGenerateModalProps) {
  const { lang } = useAuthStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('generate');
  const [providers, setProviders] = useState<ProviderDef[]>([]);
  const [enabledProviders, setEnabledProviders] = useState<{ slug: string; default_model: string }[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [resultTitle, setResultTitle] = useState('');

  // Generate tab state
  const [genMode, setGenMode] = useState<'template' | 'manual'>('template');
  const [genProvider, setGenProvider] = useState('');
  const [genModel, setGenModel] = useState('');
  const [genPromptId, setGenPromptId] = useState<string>('custom');
  const [genTopic, setGenTopic] = useState('');
  const [genCustomPrompt, setGenCustomPrompt] = useState('');
  const [genSystemPrompt, setGenSystemPrompt] = useState('');
  const [genWordCount, setGenWordCount] = useState(800);
  const [genLanguage, setGenLanguage] = useState('tr');
  const [genTone, setGenTone] = useState('professional');

  // Dynamic model fetching (for providers like AIML)
  const [dynamicModels, setDynamicModels] = useState<Record<string, { id: string; name: string }[]>>({});
  const [loadingModels, setLoadingModels] = useState(false);

  // Improve tab state
  const [impProvider, setImpProvider] = useState('');
  const [impModel, setImpModel] = useState('');
  const [impAction, setImpAction] = useState<ImproveAction>('rewrite');
  const [impTargetLang, setImpTargetLang] = useState('en');

  useEffect(() => {
    if (open) {
      loadData();
      setResult('');
      setResultTitle('');
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [defRes, provRes, promptRes] = await Promise.all([
        api.getAiProviderDefinitions(),
        api.getAiProviders(),
        api.getAiPrompts(),
      ]);

      if (defRes.success) setProviders(defRes.data);
      if (provRes.success) {
        const enabled = provRes.data.filter((p: any) => p.is_enabled || p.enabled);
        setEnabledProviders(enabled.map((p: any) => ({
          slug: p.provider_slug || p.slug,
          default_model: p.default_model,
        })));
        // Set default provider
        if (enabled.length > 0 && !genProvider) {
          const first = enabled[0];
          const slug = first.provider_slug || first.slug;
          setGenProvider(slug);
          setGenModel(first.default_model || '');
          setImpProvider(slug);
          setImpModel(first.default_model || '');
        }
        // Fetch dynamic models for all enabled providers
        const defs = defRes.success ? defRes.data : [];
        for (const ep of enabled) {
          const slug = ep.provider_slug || ep.slug;
          const def = defs.find((d: any) => d.slug === slug);
          if (!def?.models?.length) {
            api.getAiProviderModels(slug).then((res) => {
              if (res.success && res.data?.length) {
                setDynamicModels((prev) => ({
                  ...prev,
                  [slug]: res.data.map((m: any) => ({ id: m.id, name: m.name || m.id })),
                }));
              }
            }).catch(() => {});
          }
        }
      }
      if (promptRes.success) {
        setPrompts(promptRes.data.filter((p: any) => p.is_active));
      }
    } catch (err) {
      console.error('Failed to load AI data:', err);
    }
    setLoading(false);
  };

  const getModelsForProvider = (slug: string) => {
    // Check dynamic models first (for AIML etc.)
    if (dynamicModels[slug]?.length) return dynamicModels[slug];
    const def = providers.find((p) => p.slug === slug);
    return def?.models || [];
  };

  const fetchDynamicModels = async (slug: string) => {
    if (dynamicModels[slug]) return; // Already fetched
    const def = providers.find((p) => p.slug === slug);
    if (def?.models?.length) return; // Has static models
    setLoadingModels(true);
    try {
      const res = await api.getAiProviderModels(slug);
      if (res.success && res.data?.length) {
        setDynamicModels((prev) => ({ ...prev, [slug]: res.data.map((m: any) => ({ id: m.id, name: m.name || m.id })) }));
      }
    } catch (err) {
      console.error('Failed to fetch models for', slug, err);
    }
    setLoadingModels(false);
  };

  const handleProviderChange = (slug: string, tab: 'gen' | 'imp') => {
    const ep = enabledProviders.find((p) => p.slug === slug);
    const models = getModelsForProvider(slug);
    const defaultModel = ep?.default_model || models[0]?.id || '';

    if (tab === 'gen') {
      setGenProvider(slug);
      setGenModel(defaultModel);
    } else {
      setImpProvider(slug);
      setImpModel(defaultModel);
    }
    // Fetch dynamic models if needed
    fetchDynamicModels(slug);
  };

  const handlePromptSelect = async (val: string) => {
    setGenPromptId(val);
    if (val !== 'custom') {
      const prompt = prompts.find((p) => String(p.id) === val);
      if (prompt) {
        setGenSystemPrompt(prompt.system_prompt || '');
        setGenCustomPrompt(prompt.user_prompt || '');
        if (prompt.default_provider_slug) {
          const ep = enabledProviders.find((p) => p.slug === prompt.default_provider_slug);
          if (ep) {
            setGenProvider(prompt.default_provider_slug);
            // Use template's model if available, otherwise provider default
            if (prompt.default_model) {
              // Ensure dynamic models are loaded for this provider
              await fetchDynamicModels(prompt.default_provider_slug);
              setGenModel(prompt.default_model);
            } else {
              setGenModel(ep.default_model || '');
            }
          }
        }
        if (prompt.default_word_count) setGenWordCount(prompt.default_word_count);
        if (prompt.default_language) setGenLanguage(prompt.default_language);
        if (prompt.default_tone) setGenTone(prompt.default_tone);
      }
    } else {
      setGenSystemPrompt('');
      setGenCustomPrompt('');
    }
  };

  const buildPromptText = () => {
    let prompt = genCustomPrompt || '';
    // Replace template variables
    prompt = prompt.replace(/\{\{title\}\}/g, genTopic || currentTitle || '');
    prompt = prompt.replace(/\{\{topic\}\}/g, genTopic || '');
    prompt = prompt.replace(/\{\{language\}\}/g, genLanguage);
    prompt = prompt.replace(/\{\{word_count\}\}/g, String(genWordCount));
    prompt = prompt.replace(/\{\{tone\}\}/g, genTone);

    if (!prompt && genTopic) {
      const langLabel = LANGUAGES.find((l) => l.value === genLanguage)?.label || genLanguage;
      const toneLabel = TONES.find((t) => t.value === genTone)?.label[lang as 'tr' | 'en'] || genTone;
      prompt = lang === 'tr'
        ? `"${genTopic}" konusunda ${genWordCount} kelimelik, ${toneLabel.toLowerCase()} tonda, ${langLabel} dilinde bir makale yaz. Baslik ve icerik uret. HTML formatinda yaz.`
        : `Write a ${genWordCount}-word article about "${genTopic}" in a ${toneLabel.toLowerCase()} tone, in ${langLabel}. Generate title and content. Write in HTML format.`;
    }

    // Always append HTML format instruction if not already present
    if (prompt && !prompt.toLowerCase().includes('html')) {
      prompt += lang === 'tr'
        ? '\n\nIcerigi HTML formatinda yaz (h2, h3, p, ul, ol, strong, em etiketlerini kullan).'
        : '\n\nWrite the content in HTML format (use h2, h3, p, ul, ol, strong, em tags).';
    }

    return prompt;
  };

  const handleGenerate = async () => {
    if (!genProvider) {
      toast(lang === 'tr' ? 'Lutfen bir saglayici secin' : 'Please select a provider', 'error');
      return;
    }
    if (!genTopic && !genCustomPrompt) {
      toast(lang === 'tr' ? 'Lutfen konu veya prompt girin' : 'Please enter a topic or prompt', 'error');
      return;
    }

    setGenerating(true);
    setResult('');
    setResultTitle('');

    try {
      const promptText = buildPromptText();
      const selectedTemplate = genPromptId !== 'custom'
        ? prompts.find((p) => String(p.id) === genPromptId)
        : null;

      const generatePayload: Record<string, unknown> = {
        provider_slug: genProvider,
        model: genModel || undefined,
        prompt_text: promptText,
        system_prompt: genSystemPrompt || undefined,
        max_tokens: Math.min(genWordCount * 3, 8000),
        temperature: 0.7,
        word_count: genWordCount,
      };

      // Add image settings if template has them
      if (selectedTemplate?.image_enabled) {
        generatePayload.image_enabled = true;
        generatePayload.image_model = selectedTemplate.image_model;
        generatePayload.image_style = selectedTemplate.image_style;
        generatePayload.image_count = selectedTemplate.image_count;
        try {
          generatePayload.image_layout = JSON.parse(selectedTemplate.image_layout || '[]');
        } catch {
          generatePayload.image_layout = [];
        }
      }

      const res = await api.generateAiContent(generatePayload);

      if (res.success && res.data) {
        const generated = res.data.content || '';

        // Use backend-parsed title first, then try frontend parsing
        let parsedTitle = res.data.title || '';
        let contentBody = res.data.body || generated;

        if (!parsedTitle) {
          // Frontend fallback: try to extract from h1, h2, title tags, or markdown
          const titleMatch = generated.match(/^#\s+(.+)\n/m)
            || generated.match(/<h1[^>]*>(.*?)<\/h1>/i)
            || generated.match(/<title>(.*?)<\/title>/i);

          if (titleMatch) {
            parsedTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
            contentBody = generated.replace(titleMatch[0], '').trim();
          }
        }

        // Strip HTML-only title remnants (e.g. leading <h1>...</h1>)
        if (parsedTitle) {
          parsedTitle = parsedTitle.replace(/<[^>]+>/g, '').trim();
        }

        setResultTitle(parsedTitle);
        setResult(contentBody);

        const tokens = res.data.tokens?.total || res.data.total_tokens || res.data.totalTokens || 0;

        if (res.data.image_warning) {
          toast(res.data.image_warning, 'error');
        }

        toast(
          lang === 'tr'
            ? `Icerik uretildi (${tokens} token)`
            : `Content generated (${tokens} tokens)`,
          'success'
        );
      } else {
        toast(res.error || (lang === 'tr' ? 'Uretim basarisiz' : 'Generation failed'), 'error');
      }
    } catch (err: any) {
      toast(err.message || (lang === 'tr' ? 'Uretim hatasi' : 'Generation error'), 'error');
    }

    setGenerating(false);
  };

  const handleImprove = async () => {
    if (!impProvider) {
      toast(lang === 'tr' ? 'Lutfen bir saglayici secin' : 'Please select a provider', 'error');
      return;
    }
    if (!currentContent) {
      toast(lang === 'tr' ? 'Editorde icerik yok' : 'No content in editor', 'error');
      return;
    }

    setGenerating(true);
    setResult('');
    setResultTitle('');

    try {
      const res = await api.improveAiContent({
        provider_slug: impProvider,
        model: impModel || undefined,
        content: currentContent,
        action: impAction,
        target_language: impAction === 'translate' ? impTargetLang : undefined,
      });

      if (res.success && res.data) {
        setResult(res.data.content || '');
        const tokens = res.data.tokens?.total || res.data.total_tokens || res.data.totalTokens || 0;
        toast(
          lang === 'tr'
            ? `Icerik iyilestirildi (${tokens} token)`
            : `Content improved (${tokens} tokens)`,
          'success'
        );
      } else {
        toast(res.error || (lang === 'tr' ? 'Iyilestirme basarisiz' : 'Improvement failed'), 'error');
      }
    } catch (err: any) {
      toast(err.message || (lang === 'tr' ? 'Iyilestirme hatasi' : 'Improvement error'), 'error');
    }

    setGenerating(false);
  };

  /**
   * Extract "Haber Özeti" / "Summary" / "Özet" section from AI content.
   * Returns { excerpt, cleanContent } where excerpt is the summary text
   * and cleanContent is the content without the summary section.
   */
  const extractExcerpt = (html: string): { excerpt: string; cleanContent: string } => {
    // Match patterns where heading CONTAINS "Haber Özeti", "Özet", "Summary" etc.
    // The heading can be compound like "Yapay Zeka ile Gözetim: Haber Özeti"
    const patterns = [
      // <h2>...Haber Özeti...</h2> or <h2>...Özet...</h2> followed by content until next heading or end
      /<h[2-6][^>]*>[^<]*(?:Haber\s*[Öö]zeti|[Öö]zet|Summary|News\s*Summary)[^<]*<\/h[2-6]>\s*([\s\S]*?)(?=<h[2-6]|$)/i,
      // <p><strong>...Haber Özeti...:</strong> content</p>
      /<p>\s*<strong>[^<]*(?:Haber\s*[Öö]zeti|[Öö]zet|Summary)[^<]*:?\s*<\/strong>\s*([\s\S]*?)<\/p>/i,
      // <strong>...Haber Özeti...:</strong> content (without p wrapper)
      /<strong>[^<]*(?:Haber\s*[Öö]zeti|[Öö]zet|Summary)[^<]*:?\s*<\/strong>\s*([\s\S]*?)(?=<h[2-6]|<p>|$)/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const excerptHtml = match[1].trim();
        // Strip HTML tags from excerpt to get plain text
        const excerptText = excerptHtml
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (excerptText.length > 20) {
          // Remove the entire matched section from content (heading + content)
          const cleanContent = html.replace(match[0], '').trim();
          return { excerpt: excerptText, cleanContent };
        }
      }
    }

    return { excerpt: '', cleanContent: html };
  };

  /**
   * Extract keywords from content by analysing headings, bold text and
   * frequently used meaningful words. Returns comma-separated keywords.
   */
  const extractKeywords = (html: string, titleText: string): string => {
    // 1. Collect "important" text: headings + bold/strong words
    const importantTexts: string[] = [];
    const headingMatches = html.matchAll(/<h[2-6][^>]*>(.*?)<\/h[2-6]>/gi);
    for (const m of headingMatches) importantTexts.push(m[1]);
    const boldMatches = html.matchAll(/<(?:strong|b)>(.*?)<\/(?:strong|b)>/gi);
    for (const m of boldMatches) importantTexts.push(m[1]);
    if (titleText) importantTexts.push(titleText);

    // 2. Strip tags and merge
    const merged = importantTexts
      .map((t) => t.replace(/<[^>]+>/g, '').trim())
      .join(' ');

    // 3. Tokenize – Turkish + English stopwords
    const stopwords = new Set([
      'bir', 'bu', 'de', 'da', 've', 'ile', 'icin', 'için', 'ise', 'olan',
      'gibi', 'daha', 'en', 'hem', 'ya', 'her', 'ne', 'kadar', 'nasil',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to',
      'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'and', 'or',
      'as', 'it', 'its', 'this', 'that', 'but', 'not', 'how', 'what',
    ]);

    const words = merged
      .toLowerCase()
      .replace(/[^a-zçğıöşüâîûéèêàäñ0-9\s-]/gi, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));

    // 4. Count frequencies and pick top keywords
    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);

    // Also look for bigrams (2-word phrases) from important texts
    const bigrams: string[] = [];
    for (const text of importantTexts) {
      const clean = text.replace(/<[^>]+>/g, '').trim().toLowerCase();
      const parts = clean.split(/\s+/).filter((w) => w.length > 2 && !stopwords.has(w));
      for (let i = 0; i < parts.length - 1; i++) {
        bigrams.push(`${parts[i]} ${parts[i + 1]}`);
      }
    }

    const bigramFreq = new Map<string, number>();
    for (const bg of bigrams) bigramFreq.set(bg, (bigramFreq.get(bg) || 0) + 1);

    // Sort by frequency
    const topBigrams = Array.from(bigramFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([w]) => w);

    const topWords = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w]) => w);

    // Merge bigrams first, then fill with single words
    const keywords: string[] = [...topBigrams];
    for (const w of topWords) {
      if (keywords.length >= 8) break;
      if (!keywords.some((kw) => kw.includes(w))) keywords.push(w);
    }

    return keywords.join(', ');
  };

  const applyContent = (contentToApply: string, mode: 'insert' | 'replace') => {
    const { excerpt, cleanContent } = extractExcerpt(contentToApply);

    if (mode === 'insert') {
      onInsertContent(cleanContent);
    } else {
      onReplaceContent(cleanContent);
    }

    if (resultTitle && (mode === 'replace' || !currentTitle)) {
      onSetTitle(resultTitle);
    }

    if (excerpt && onSetExcerpt) {
      onSetExcerpt(excerpt);
    }

    // Auto-fill SEO title and description
    const titleForSeo = resultTitle || '';
    if (titleForSeo && onSetSeoTitle) {
      // SEO title: max 60 chars
      onSetSeoTitle(titleForSeo.length > 60 ? titleForSeo.slice(0, 57) + '...' : titleForSeo);
    }
    if (onSetSeoDescription) {
      // SEO description: use excerpt if available, otherwise first ~155 chars of content
      if (excerpt) {
        onSetSeoDescription(excerpt.length > 160 ? excerpt.slice(0, 157) + '...' : excerpt);
      } else {
        const plainText = cleanContent
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (plainText) {
          onSetSeoDescription(plainText.length > 160 ? plainText.slice(0, 157) + '...' : plainText);
        }
      }
    }

    // Auto-fill SEO keywords
    if (onSetSeoKeywords) {
      const keywords = extractKeywords(cleanContent, titleForSeo);
      if (keywords) onSetSeoKeywords(keywords);
    }

    // Auto-set first image as featured image
    if (onSetFeaturedImage) {
      const imgMatch = cleanContent.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        onSetFeaturedImage(imgMatch[1]);
      }
    }

    toast(
      lang === 'tr'
        ? (mode === 'insert' ? 'Icerik editore eklendi' : 'Icerik degistirildi')
        : (mode === 'insert' ? 'Content inserted to editor' : 'Content replaced'),
      'success'
    );
    onClose();
  };

  const handleInsert = () => {
    if (result) applyContent(result, 'insert');
  };

  const handleReplace = () => {
    if (result) applyContent(result, 'replace');
  };

  const enabledProviderDefs = providers.filter((p) =>
    enabledProviders.some((ep) => ep.slug === p.slug)
  );

  const improveActions: { value: ImproveAction; label: string; icon: any }[] = [
    { value: 'rewrite', label: t('ai.action_rewrite', lang), icon: RotateCcw },
    { value: 'summarize', label: t('ai.action_summarize', lang), icon: Scissors },
    { value: 'expand', label: t('ai.action_expand', lang), icon: Expand },
    { value: 'translate', label: t('ai.action_translate', lang), icon: Languages },
    { value: 'seo_meta', label: t('ai.action_seo_meta', lang), icon: Search },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        // Prevent closing by outside click if there's generated content
        if (result) {
          // Still allow close but preserve content by calling onClose directly
          onClose();
        } else {
          onClose();
        }
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0" onInteractOutside={(e) => {
        // Prevent closing on outside click when there's generated content
        if (result) e.preventDefault();
      }}>
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {lang === 'tr' ? 'AI Icerik Asistani' : 'AI Content Assistant'}
          </DialogTitle>
        </DialogHeader>

        {/* Tab Buttons */}
        <div className="flex border-b px-6">
          <button
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === 'generate'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => { setActiveTab('generate'); setResult(''); setResultTitle(''); }}
          >
            <Sparkles className="h-4 w-4 inline mr-1.5" />
            {t('ai.generate', lang)}
          </button>
          <button
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === 'improve'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => { setActiveTab('improve'); setResult(''); setResultTitle(''); }}
          >
            <Wand2 className="h-4 w-4 inline mr-1.5" />
            {t('ai.improve', lang)}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : enabledProviderDefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Bot className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t('ai.no_providers', lang)}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('ai.configure_first', lang)}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto px-6 py-4">
            {/* ====== GENERATE TAB ====== */}
            {activeTab === 'generate' && (
              <div className="space-y-4">
                {/* Mode selector: Template vs Manual */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setGenMode('template'); setGenPromptId('custom'); }}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-md border p-2.5 text-sm font-medium transition-colors',
                      genMode === 'template'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    {lang === 'tr' ? 'Hazir Prompt' : 'Ready Prompt'}
                  </button>
                  <button
                    onClick={() => { setGenMode('manual'); setGenPromptId('custom'); setGenSystemPrompt(''); setGenCustomPrompt(''); }}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-md border p-2.5 text-sm font-medium transition-colors',
                      genMode === 'manual'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <Wand2 className="h-4 w-4" />
                    {lang === 'tr' ? 'Manuel' : 'Manual'}
                  </button>
                </div>

                {/* Template mode: show prompt list */}
                {genMode === 'template' && (
                  <>
                    {prompts.length > 0 ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('ai.prompt_template', lang)}</Label>
                        <Select value={genPromptId} onValueChange={handlePromptSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder={lang === 'tr' ? 'Sablon secin...' : 'Select template...'} />
                          </SelectTrigger>
                          <SelectContent>
                            {prompts.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="border rounded-md p-4 text-center text-sm text-muted-foreground">
                        {lang === 'tr'
                          ? 'Henuz prompt sablonu eklenmemis. AI Ayarlari > Prompt Sablonlari bolumunden ekleyebilirsiniz.'
                          : 'No prompt templates yet. You can add them from AI Settings > Prompt Templates.'}
                      </div>
                    )}

                    {/* Show selected template info */}
                    {genPromptId !== 'custom' && (
                      <div className="bg-muted/30 border rounded-md p-3 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{lang === 'tr' ? 'Saglayici:' : 'Provider:'}</span>
                          <span className="font-medium text-foreground">{genProvider || '-'}</span>
                          <span className="mx-1">|</span>
                          <span>{lang === 'tr' ? 'Model:' : 'Model:'}</span>
                          <span className="font-medium text-foreground">{genModel || '-'}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Manual mode: show provider + model */}
                {genMode === 'manual' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('ai.provider', lang)}</Label>
                        <Select value={genProvider} onValueChange={(v) => handleProviderChange(v, 'gen')}>
                          <SelectTrigger>
                            <SelectValue placeholder={lang === 'tr' ? 'Saglayici sec' : 'Select provider'} />
                          </SelectTrigger>
                          <SelectContent>
                            {enabledProviderDefs.map((p) => (
                              <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('ai.model', lang)}</Label>
                        <Select value={genModel} onValueChange={setGenModel}>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingModels ? (lang === 'tr' ? 'Yukleniyor...' : 'Loading...') : ''} />
                          </SelectTrigger>
                          <SelectContent>
                            {getModelsForProvider(genProvider).map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* System + User prompt */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('ai.system_prompt', lang)}</Label>
                      <Textarea
                        value={genSystemPrompt}
                        onChange={(e) => setGenSystemPrompt(e.target.value)}
                        rows={2}
                        placeholder={lang === 'tr' ? 'Sistem talimatlarini yazin (opsiyonel)...' : 'Enter system instructions (optional)...'}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('ai.user_prompt', lang)}</Label>
                      <Textarea
                        value={genCustomPrompt}
                        onChange={(e) => setGenCustomPrompt(e.target.value)}
                        rows={3}
                        placeholder={lang === 'tr'
                          ? 'Prompt yazin... Degiskenler: {{title}}, {{word_count}}, {{language}}, {{tone}}'
                          : 'Enter prompt... Variables: {{title}}, {{word_count}}, {{language}}, {{tone}}'}
                        className="text-sm"
                      />
                    </div>
                  </>
                )}

                {/* Topic */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{lang === 'tr' ? 'Konu / Baslik' : 'Topic / Title'}</Label>
                  <Input
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value)}
                    placeholder={lang === 'tr' ? 'Makalenin konusunu yazin...' : 'Enter the article topic...'}
                  />
                </div>

                {/* Word count, Language, Tone row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('ai.word_count', lang)}</Label>
                    <Input
                      type="number"
                      value={genWordCount}
                      onChange={(e) => setGenWordCount(Number(e.target.value) || 500)}
                      min={100}
                      max={5000}
                      step={100}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('ai.language', lang)}</Label>
                    <Select value={genLanguage} onValueChange={setGenLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('ai.tone', lang)}</Label>
                    <Select value={genTone} onValueChange={setGenTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONES.map((to) => (
                          <SelectItem key={to.value} value={to.value}>
                            {to.label[lang as 'tr' | 'en'] || to.label.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={generating || (genMode === 'template' && genPromptId === 'custom')}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('ai.generating', lang)}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {t('ai.generate', lang)}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* ====== IMPROVE TAB ====== */}
            {activeTab === 'improve' && (
              <div className="space-y-4">
                {/* Action selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{lang === 'tr' ? 'Islem' : 'Action'}</Label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {improveActions.map((a) => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={a.value}
                          onClick={() => setImpAction(a.value)}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors',
                            impAction === a.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:bg-accent'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="truncate">{a.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Provider + Model */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('ai.provider', lang)}</Label>
                    <Select value={impProvider} onValueChange={(v) => handleProviderChange(v, 'imp')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {enabledProviderDefs.map((p) => (
                          <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('ai.model', lang)}</Label>
                    <Select value={impModel} onValueChange={setImpModel}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingModels ? (lang === 'tr' ? 'Yukleniyor...' : 'Loading...') : ''} />
                      </SelectTrigger>
                      <SelectContent>
                        {getModelsForProvider(impProvider).map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Translate target language */}
                {impAction === 'translate' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">{lang === 'tr' ? 'Hedef Dil' : 'Target Language'}</Label>
                    <Select value={impTargetLang} onValueChange={setImpTargetLang}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Current content preview */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{lang === 'tr' ? 'Mevcut Icerik' : 'Current Content'}</Label>
                  <div className="border rounded-md p-3 max-h-32 overflow-auto bg-muted/30">
                    {currentContent ? (
                      <div
                        className="prose prose-sm max-w-none text-xs text-muted-foreground"
                        dangerouslySetInnerHTML={{
                          __html: currentContent.length > 1000
                            ? currentContent.slice(0, 1000) + '...'
                            : currentContent,
                        }}
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        {lang === 'tr' ? 'Editorde icerik yok' : 'No content in editor'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Improve Button */}
                <Button
                  className="w-full"
                  onClick={handleImprove}
                  disabled={generating || !currentContent}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('ai.generating', lang)}
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      {t('ai.improve', lang)}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* ====== RESULT PREVIEW ====== */}
            {result && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {t('ai.content_preview', lang)}
                  </Label>
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(result);
                        toast(lang === 'tr' ? 'Kopyalandi' : 'Copied', 'success');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => activeTab === 'generate' ? handleGenerate() : handleImprove()}
                      disabled={generating}
                    >
                      <RefreshCw className={cn('h-3.5 w-3.5', generating && 'animate-spin')} />
                    </Button>
                  </div>
                </div>

                {resultTitle && (
                  <div className="bg-primary/5 border-l-2 border-primary px-3 py-2 rounded">
                    <span className="text-xs text-muted-foreground">
                      {lang === 'tr' ? 'Baslik:' : 'Title:'}
                    </span>
                    <p className="font-semibold text-sm mt-0.5">{resultTitle}</p>
                  </div>
                )}

                <div className="border rounded-md p-4 max-h-60 overflow-auto bg-card">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: result }}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleInsert}>
                    <FileText className="h-4 w-4" />
                    {t('ai.insert_to_editor', lang)}
                  </Button>
                  <Button className="flex-1" onClick={handleReplace}>
                    <RefreshCw className="h-4 w-4" />
                    {t('ai.replace_content', lang)}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
