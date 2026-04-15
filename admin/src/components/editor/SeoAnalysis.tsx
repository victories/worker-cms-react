import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
import { analyzeSeo, type SeoCheck, type SeoStatus } from '@/lib/seoAnalyzer';
import { Search, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface SeoAnalysisProps {
  title: string;
  content: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  onSeoTitleChange: (v: string) => void;
  onSeoDescriptionChange: (v: string) => void;
  onSeoKeywordsChange: (v: string) => void;
  lang: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

// ─── Score Ring ─────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const bgColor = score >= 80 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted/20"
        />
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold ${bgColor}`}>{score}</span>
        <span className="text-[10px] text-muted-foreground font-medium">/ 100</span>
      </div>
    </div>
  );
}

// ─── Status Icon ─────────────────────────────────────────

function StatusIcon({ status }: { status: SeoStatus }) {
  switch (status) {
    case 'good':
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
  }
}

// ─── Check Item ──────────────────────────────────────────

function CheckItem({ check }: { check: SeoCheck }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <StatusIcon status={check.status} />
      <div className="min-w-0">
        <span className="text-xs font-medium">{check.label}</span>
        <p className="text-xs text-muted-foreground leading-snug">{check.message}</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export function SeoAnalysis({
  title, content, slug,
  seoTitle, seoDescription, seoKeywords,
  onSeoTitleChange, onSeoDescriptionChange, onSeoKeywordsChange,
  lang,
  collapsed,
  onToggle,
}: SeoAnalysisProps) {
  const tr = lang === 'tr';
  const [expanded, setExpanded] = useState(true);
  const isCollapsible = onToggle !== undefined;

  const result = useMemo(
    () => analyzeSeo({ title, content, seoTitle, seoDescription, seoKeywords, slug, lang }),
    [title, content, seoTitle, seoDescription, seoKeywords, slug, lang]
  );

  const goodChecks = result.checks.filter(c => c.status === 'good');
  const issueChecks = result.checks.filter(c => c.status !== 'good');

  const scoreLabel = result.score >= 80
    ? (tr ? 'Harika' : 'Great')
    : result.score >= 50
    ? (tr ? 'İyileştirilebilir' : 'Needs work')
    : (tr ? 'Zayıf' : 'Poor');

  const scoreColor = result.score >= 80 ? 'text-green-500' : result.score >= 50 ? 'text-amber-500' : 'text-red-500';

  return (
    <Card>
      <CardHeader className={`pb-2 ${isCollapsible ? 'cursor-pointer select-none' : ''}`} onClick={onToggle}>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            SEO
            {isCollapsible && collapsed && <span className={`text-xs font-bold ${scoreColor}`}>{result.score}</span>}
          </span>
          {isCollapsible && <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${!collapsed ? 'rotate-180' : ''}`} />}
        </CardTitle>
      </CardHeader>
      {(!isCollapsible || !collapsed) && <CardContent className="space-y-4">
        {/* Score display */}
        <div className="flex items-center gap-4">
          <ScoreRing score={result.score} />
          <div>
            <p className="text-sm font-semibold">{scoreLabel}</p>
            <p className="text-xs text-muted-foreground">
              {tr
                ? `${goodChecks.length}/${result.checks.length} kontrol başarılı`
                : `${goodChecks.length}/${result.checks.length} checks passed`}
            </p>
          </div>
        </div>

        {/* SEO Inputs */}
        <div className="space-y-3 border-t pt-3">
          <div className="space-y-1">
            <Label className="text-xs">SEO Title</Label>
            <Input
              value={seoTitle}
              onChange={(e) => onSeoTitleChange(e.target.value)}
              placeholder={title || (tr ? 'Başlık...' : 'Title...')}
              className="h-8 text-sm"
            />
            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground">
                {tr ? '30-60 karakter önerilir' : '30-60 chars recommended'}
              </span>
              <span className={`text-[10px] font-mono ${
                (seoTitle || title).length > 60 ? 'text-red-500' :
                (seoTitle || title).length >= 30 ? 'text-green-500' : 'text-amber-500'
              }`}>
                {(seoTitle || title).length}/60
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Meta Description</Label>
            <Textarea
              value={seoDescription}
              onChange={(e) => onSeoDescriptionChange(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground">
                {tr ? '120-160 karakter önerilir' : '120-160 chars recommended'}
              </span>
              <span className={`text-[10px] font-mono ${
                seoDescription.length > 160 ? 'text-red-500' :
                seoDescription.length >= 120 ? 'text-green-500' : 'text-amber-500'
              }`}>
                {seoDescription.length}/160
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{tr ? 'Anahtar Kelimeler' : 'Keywords'}</Label>
            <Input
              value={seoKeywords}
              onChange={(e) => onSeoKeywordsChange(e.target.value)}
              placeholder={tr ? 'virgülle ayırın' : 'comma separated'}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Analysis Results */}
        <div className="border-t pt-3">
          {/* Issues first */}
          {issueChecks.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                {tr ? 'İyileştirilecekler' : 'Improvements'}
              </p>
              {issueChecks.map(check => (
                <CheckItem key={check.id} check={check} />
              ))}
            </div>
          )}

          {/* Passed checks (collapsible) */}
          {goodChecks.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                <span>
                  {tr ? `${goodChecks.length} başarılı kontrol` : `${goodChecks.length} passed checks`}
                </span>
              </button>
              {expanded && (
                <div className="space-y-0.5 mt-1 opacity-70">
                  {goodChecks.map(check => (
                    <CheckItem key={check.id} check={check} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>}
    </Card>
  );
}
