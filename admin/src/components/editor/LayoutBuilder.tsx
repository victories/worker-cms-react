import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select';
import { LayoutGrid, Plus, X, Columns, ChevronDown, ChevronUp } from 'lucide-react';
import {
  type PageLayout,
  type LayoutRow,
  LAYOUT_PRESETS,
  WIDTH_PRESETS,
  generateRowId,
  cloneLayoutWithNewIds,
} from './LayoutPresets';
import { SHORTCODE_DEFINITIONS } from './blocks/shortcodeDefinitions';

type LayoutMode = 'none' | 'preset' | 'custom';

interface LayoutBuilderProps {
  layout: PageLayout | null;
  onLayoutChange: (layout: PageLayout | null) => void;
  lang: string;
}

// "icerik" is a special option that embeds the editor content
const SHORTCODE_OPTIONS = [
  { name: 'icerik', description: 'Editör İçeriği', descriptionEn: 'Editor Content', category: 'ozel' },
  ...SHORTCODE_DEFINITIONS,
];

export function LayoutBuilder({ layout, onLayoutChange, lang }: LayoutBuilderProps) {
  const tr = lang === 'tr';

  // Determine initial mode from existing layout
  const getInitialMode = (): LayoutMode => {
    if (!layout || !layout.rows || layout.rows.length === 0) return 'none';
    // Check if it matches a preset
    const matchedPreset = LAYOUT_PRESETS.find((p) => {
      if (p.layout.rows.length !== layout.rows.length) return false;
      return p.layout.rows.every((pr, i) => {
        const lr = layout.rows[i];
        if (pr.columns.length !== lr.columns.length) return false;
        return pr.columns.every((pc, j) => pc.width === lr.columns[j].width);
      });
    });
    return matchedPreset ? 'preset' : 'custom';
  };

  const [mode, setMode] = useState<LayoutMode>(getInitialMode);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newColCount, setNewColCount] = useState(2);
  const [newWidths, setNewWidths] = useState<number[]>([50, 50]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleModeChange = (newMode: LayoutMode) => {
    setMode(newMode);
    if (newMode === 'none') {
      onLayoutChange(null);
    } else if (newMode === 'custom' && !layout) {
      onLayoutChange({ rows: [] });
    }
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = LAYOUT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onLayoutChange(cloneLayoutWithNewIds(preset.layout));
    }
  };

  const handleAddRow = () => {
    if (!layout) return;
    const newRow: LayoutRow = {
      id: generateRowId(),
      columns: newWidths.map((w) => ({ width: w, shortcode: '', params: {} })),
    };
    onLayoutChange({ rows: [...layout.rows, newRow] });
    setShowAddRow(false);
  };

  const handleRemoveRow = (rowId: string) => {
    if (!layout) return;
    onLayoutChange({ rows: layout.rows.filter((r) => r.id !== rowId) });
  };

  const handleShortcodeChange = (rowId: string, colIndex: number, shortcodeName: string) => {
    if (!layout) return;
    const newRows = layout.rows.map((row) => {
      if (row.id !== rowId) return row;
      const newCols = row.columns.map((col, i) => {
        if (i !== colIndex) return col;
        return { ...col, shortcode: shortcodeName === '__empty__' ? '' : shortcodeName, params: {} };
      });
      return { ...row, columns: newCols };
    });
    onLayoutChange({ rows: newRows });
  };

  const handleParamChange = (rowId: string, colIndex: number, paramName: string, value: string) => {
    if (!layout) return;
    const newRows = layout.rows.map((row) => {
      if (row.id !== rowId) return row;
      const newCols = row.columns.map((col, i) => {
        if (i !== colIndex) return col;
        return { ...col, params: { ...col.params, [paramName]: value } };
      });
      return { ...row, columns: newCols };
    });
    onLayoutChange({ rows: newRows });
  };

  const handleColCountChange = (count: number) => {
    setNewColCount(count);
    const presets = WIDTH_PRESETS[count];
    if (presets && presets.length > 0) {
      setNewWidths(presets[0]);
    }
  };

  const toggleRowExpand = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const getShortcodeDef = (name: string) => SHORTCODE_OPTIONS.find((s) => s.name === name);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <LayoutGrid className="h-4 w-4" />
          {tr ? 'Sayfa Duzeni' : 'Page Layout'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mode Selector */}
        <div className="space-y-1.5">
          {(['none', 'preset', 'custom'] as LayoutMode[]).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="layout-mode"
                checked={mode === m}
                onChange={() => handleModeChange(m)}
                className="rounded-full"
              />
              <span>
                {m === 'none' && (tr ? 'Duzen yok (varsayilan)' : 'No layout (default)')}
                {m === 'preset' && (tr ? 'Hazir Sablon' : 'Preset Template')}
                {m === 'custom' && (tr ? 'Ozel Duzen' : 'Custom Layout')}
              </span>
            </label>
          ))}
        </div>

        {/* Preset Grid */}
        {mode === 'preset' && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            {LAYOUT_PRESETS.map((preset) => {
              const isActive =
                layout &&
                layout.rows.length === preset.layout.rows.length &&
                preset.layout.rows.every((pr, i) => {
                  const lr = layout.rows[i];
                  if (!lr || pr.columns.length !== lr.columns.length) return false;
                  return pr.columns.every((pc, j) => pc.width === lr.columns[j].width);
                });

              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`p-2 rounded-lg border text-left transition-all text-xs ${
                    isActive
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  {/* Mini visual preview */}
                  <div className="space-y-1 mb-1.5">
                    {preset.layout.rows.map((row, ri) => (
                      <div key={ri} className="flex gap-0.5">
                        {row.columns.map((col, ci) => (
                          <div
                            key={ci}
                            className={`h-2.5 rounded-sm ${isActive ? 'bg-primary/60' : 'bg-muted-foreground/30'}`}
                            style={{ width: `${col.width}%` }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="font-medium">{tr ? preset.name : preset.nameEn}</div>
                  <div className="text-muted-foreground text-[10px]">
                    {tr ? preset.description : preset.descriptionEn}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Row List (when layout exists) */}
        {layout && layout.rows.length > 0 && (mode === 'preset' || mode === 'custom') && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs text-muted-foreground">
              {tr ? 'Satirlar ve Icerik' : 'Rows & Content'}
            </Label>
            {layout.rows.map((row, rowIndex) => {
              const isExpanded = expandedRows.has(row.id);
              return (
                <div key={row.id} className="border rounded-lg overflow-hidden">
                  {/* Row header */}
                  <div className="flex items-center justify-between bg-muted/30 px-2 py-1.5">
                    <button
                      onClick={() => toggleRowExpand(row.id)}
                      className="flex items-center gap-1.5 text-xs font-medium flex-1 text-left"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      <Columns className="h-3 w-3 text-muted-foreground" />
                      <span>
                        {tr ? `Satir ${rowIndex + 1}` : `Row ${rowIndex + 1}`}
                      </span>
                      <span className="text-muted-foreground font-normal">
                        ({row.columns.map((c) => `${c.width}%`).join(' + ')})
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => handleRemoveRow(row.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Row visual bar */}
                  <div className="flex gap-0.5 px-2 py-1 bg-muted/10">
                    {row.columns.map((col, ci) => (
                      <div
                        key={ci}
                        className={`h-1.5 rounded-sm ${col.shortcode ? 'bg-primary/50' : 'bg-muted-foreground/20'}`}
                        style={{ width: `${col.width}%` }}
                      />
                    ))}
                  </div>

                  {/* Expanded: shortcode selectors */}
                  {isExpanded && (
                    <div className="p-2 space-y-2">
                      {row.columns.map((col, colIndex) => {
                        const scDef = col.shortcode ? getShortcodeDef(col.shortcode) : null;
                        return (
                          <div key={colIndex} className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">
                              {tr
                                ? `Sutun ${colIndex + 1} (%${col.width})`
                                : `Column ${colIndex + 1} (${col.width}%)`}
                            </Label>
                            <Select
                              value={col.shortcode || '__empty__'}
                              onValueChange={(v) => handleShortcodeChange(row.id, colIndex, v)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue
                                  placeholder={tr ? 'Shortcode sec...' : 'Select shortcode...'}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__empty__">
                                  <span className="text-muted-foreground">
                                    {tr ? '-- Bos --' : '-- Empty --'}
                                  </span>
                                </SelectItem>
                                {SHORTCODE_OPTIONS.map((sc) => (
                                  <SelectItem key={sc.name} value={sc.name}>
                                    <span className="font-mono text-xs">[{sc.name}]</span>
                                    <span className="text-muted-foreground ml-1 text-[10px]">
                                      {tr ? sc.description : sc.descriptionEn}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Param inputs for selected shortcode */}
                            {scDef && 'params' in scDef && (scDef as any).params?.length > 0 && (
                              <div className="pl-2 space-y-1 border-l-2 border-primary/20">
                                {(scDef as any).params.map((param: any) => (
                                  <div key={param.name} className="flex items-center gap-1">
                                    <Label className="text-[10px] text-muted-foreground w-16 shrink-0">
                                      {param.name}
                                    </Label>
                                    <Input
                                      className="h-6 text-xs"
                                      placeholder={param.default || ''}
                                      value={col.params[param.name] || ''}
                                      onChange={(e) =>
                                        handleParamChange(row.id, colIndex, param.name, e.target.value)
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Row (custom mode or after preset) */}
        {(mode === 'custom' || mode === 'preset') && layout && (
          <div className="pt-1">
            {!showAddRow ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowAddRow(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {tr ? 'Satir Ekle' : 'Add Row'}
              </Button>
            ) : (
              <div className="border rounded-lg p-2 space-y-2 bg-muted/10">
                <Label className="text-xs font-medium">
                  {tr ? 'Yeni Satir' : 'New Row'}
                </Label>

                {/* Column count */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    {tr ? 'Sutun sayisi' : 'Columns'}
                  </Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <Button
                        key={n}
                        variant={newColCount === n ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 w-8 text-xs"
                        onClick={() => handleColCountChange(n)}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Width presets */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    {tr ? 'Genislik oranlari' : 'Width ratios'}
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {(WIDTH_PRESETS[newColCount] || []).map((preset, pi) => {
                      const isSelected = preset.every((w, i) => newWidths[i] === w);
                      return (
                        <Button
                          key={pi}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => setNewWidths(preset)}
                        >
                          {preset.join('/')}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Visual preview */}
                <div className="flex gap-0.5">
                  {newWidths.map((w, i) => (
                    <div
                      key={i}
                      className="h-3 rounded-sm bg-primary/40"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>

                <div className="flex gap-1">
                  <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAddRow}>
                    {tr ? 'Ekle' : 'Add'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowAddRow(false)}
                  >
                    {tr ? 'Iptal' : 'Cancel'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
