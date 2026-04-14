# Global Settings Inheritance System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a general-purpose global settings system where super_admin configures system-wide defaults and individual sites inherit or override them.

**Architecture:** Uses existing `global_settings` and `settings` tables. New utility functions resolve effective values via `site_settings[key] ?? global_settings[key] ?? default`. New `/api/global-settings` route for super_admin. Admin panel gets a Global Settings page + "Global" badges on inherited site settings.

**Tech Stack:** Hono (Cloudflare Workers), D1 (SQLite), React + shadcn/ui, Zustand

---

### Task 1: Settings Utility — `getEffectiveSettings`

**Files:**
- Create: `src/lib/settings.ts`

**Step 1: Create the settings utility file**

```typescript
// src/lib/settings.ts

/**
 * Settings inheritance utility.
 * Resolution order: site_settings[key] → global_settings[key] → hardcoded default
 */

export interface EffectiveSettingsResult {
  /** Resolved key-value pairs (site value if exists, else global value, else default) */
  values: Record<string, string>;
  /** Keys whose values came from global_settings (no site-level override) */
  inherited: string[];
}

/**
 * Resolve multiple settings keys with inheritance.
 * @param db - D1Database instance
 * @param siteId - Site ID to check site-level settings
 * @param keys - Setting keys to resolve. If empty, returns ALL settings (site + global merged).
 */
export async function getEffectiveSettings(
  db: D1Database,
  siteId: number,
  keys?: string[]
): Promise<EffectiveSettingsResult> {
  let siteRows: { key: string; value: string }[];
  let globalRows: { key: string; value: string }[];

  if (keys && keys.length > 0) {
    // Fetch only requested keys from both tables
    const placeholders = keys.map(() => '?').join(',');

    const [siteResult, globalResult] = await Promise.all([
      db.prepare(
        `SELECT key, value FROM settings WHERE site_id = ? AND key IN (${placeholders})`
      ).bind(siteId, ...keys).all(),
      db.prepare(
        `SELECT key, value FROM global_settings WHERE key IN (${placeholders})`
      ).bind(...keys).all(),
    ]);

    siteRows = siteResult.results as any[];
    globalRows = globalResult.results as any[];
  } else {
    // Fetch ALL settings from both tables
    const [siteResult, globalResult] = await Promise.all([
      db.prepare('SELECT key, value FROM settings WHERE site_id = ?').bind(siteId).all(),
      db.prepare('SELECT key, value FROM global_settings').all(),
    ]);

    siteRows = siteResult.results as any[];
    globalRows = globalResult.results as any[];
  }

  const siteMap = new Map(siteRows.map(r => [r.key, r.value]));
  const globalMap = new Map(globalRows.map(r => [r.key, r.value]));

  const values: Record<string, string> = {};
  const inherited: string[] = [];

  // Merge: global first, then site overrides
  for (const [k, v] of globalMap) {
    if (siteMap.has(k)) {
      values[k] = siteMap.get(k)!;
    } else {
      values[k] = v;
      inherited.push(k);
    }
  }

  // Add site-only keys (not in global)
  for (const [k, v] of siteMap) {
    if (!values[k]) {
      values[k] = v;
    }
  }

  return { values, inherited };
}

/**
 * Resolve a single setting key with inheritance.
 */
export async function getEffectiveSetting(
  db: D1Database,
  siteId: number,
  key: string,
  defaultValue: string = ''
): Promise<{ value: string; inherited: boolean }> {
  // Check site-level first
  const siteRow = await db.prepare(
    'SELECT value FROM settings WHERE site_id = ? AND key = ?'
  ).bind(siteId, key).first<{ value: string }>();

  if (siteRow) {
    return { value: siteRow.value, inherited: false };
  }

  // Fallback to global
  const globalRow = await db.prepare(
    'SELECT value FROM global_settings WHERE key = ?'
  ).bind(key).first<{ value: string }>();

  if (globalRow) {
    return { value: globalRow.value, inherited: true };
  }

  return { value: defaultValue, inherited: false };
}
```

**Step 2: Commit**

```bash
git add src/lib/settings.ts
git commit -m "feat: add settings inheritance utility (getEffectiveSettings)"
```

---

### Task 2: Global Settings API Route

**Files:**
- Create: `src/routes/api/global-settings.ts`
- Modify: `src/index.ts` (add route registration, 2 lines)

**Step 1: Create the global-settings route**

```typescript
// src/routes/api/global-settings.ts
import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';

const globalSettings = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All global-settings endpoints require super_admin — no site context needed
globalSettings.use('*', authMiddleware);

// GET /api/global-settings
globalSettings.get('/', requireRole('super_admin'), async (c) => {
  const result = await c.env.DB.prepare('SELECT key, value FROM global_settings').all();
  const data = Object.fromEntries(
    (result.results as any[]).map((r: any) => [r.key, r.value])
  );
  return c.json({ success: true, data });
});

// PUT /api/global-settings
globalSettings.put('/', requireRole('super_admin'), async (c) => {
  const body = await c.req.json<Record<string, string>>();

  // Protect system keys from being modified via this endpoint
  const protectedKeys = ['version', 'setup_complete'];

  for (const [key, value] of Object.entries(body)) {
    if (protectedKeys.includes(key)) continue;
    await c.env.DB.prepare(
      'INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
    ).bind(key, value, value).run();
  }

  return c.json({ success: true, data: body });
});

export default globalSettings;
```

**Step 2: Register the route in `src/index.ts`**

Add import at line ~30 (after contactRoutes import):
```typescript
import globalSettingsRoutes from './routes/api/global-settings';
```

Add route at line ~92 (after contactRoutes):
```typescript
app.route('/api/global-settings', globalSettingsRoutes);
```

**Step 3: Commit**

```bash
git add src/routes/api/global-settings.ts src/index.ts
git commit -m "feat: add GET/PUT /api/global-settings route (super_admin only)"
```

---

### Task 3: Update Site Settings API with Inheritance

**Files:**
- Modify: `src/routes/api/settings.ts`

**Step 1: Update the GET handler**

Replace the current GET `/` handler (lines 10-17) with this version that includes `_inherited` info:

```typescript
// GET /api/settings — returns effective settings (site + global merged)
settings.get('/', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  // Fetch both site-level and global settings
  const [siteResult, globalResult] = await Promise.all([
    c.env.DB.prepare('SELECT key, value FROM settings WHERE site_id = ?').bind(siteId).all(),
    c.env.DB.prepare('SELECT key, value FROM global_settings').all(),
  ]);

  const siteMap = new Map((siteResult.results as any[]).map((r: any) => [r.key, r.value]));
  const globalMap = new Map((globalResult.results as any[]).map((r: any) => [r.key, r.value]));

  const data: Record<string, string> = {};
  const inherited: string[] = [];

  // Global values first, then site overrides
  for (const [k, v] of globalMap) {
    // Skip system keys
    if (k === 'version' || k === 'setup_complete') continue;
    if (siteMap.has(k)) {
      data[k] = siteMap.get(k)!;
    } else {
      data[k] = v;
      inherited.push(k);
    }
  }

  // Site-only keys
  for (const [k, v] of siteMap) {
    if (!(k in data)) {
      data[k] = v;
    }
  }

  return c.json({ success: true, data, _inherited: inherited });
});
```

**Step 2: Add DELETE endpoint for "reset to global"**

Add after the last `settings.put(...)` block (before `export default settings`):

```typescript
// DELETE /api/settings/:key — remove site-level override (revert to global value)
settings.delete('/:key', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const key = c.req.param('key');

  await c.env.DB.prepare(
    'DELETE FROM settings WHERE site_id = ? AND key = ?'
  ).bind(siteId, key).run();

  return c.json({ success: true });
});
```

**Step 3: Commit**

```bash
git add src/routes/api/settings.ts
git commit -m "feat: add inheritance to GET /api/settings + DELETE reset endpoint"
```

---

### Task 4: Update reCAPTCHA to Use Inheritance

**Files:**
- Modify: `src/lib/recaptcha.ts`

**Step 1: Update `getRecaptchaSettings` to use inheritance**

Replace the current `getRecaptchaSettings` function (lines 65-93) with:

```typescript
/**
 * Helper to get reCAPTCHA settings from DB — uses inheritance
 * (site settings override global settings)
 */
export async function getRecaptchaSettings(
  db: D1Database,
  siteId: number
): Promise<{
  enabled: boolean;
  siteKey: string;
  secretKey: string;
  scoreThreshold: number;
  onComments: boolean;
  onContact: boolean;
}> {
  const keys = [
    'recaptcha_enabled',
    'recaptcha_site_key',
    'recaptcha_secret_key',
    'recaptcha_score_threshold',
    'recaptcha_on_comments',
    'recaptcha_on_contact',
  ];

  // Fetch site + global in parallel
  const placeholders = keys.map(() => '?').join(',');
  const [siteResult, globalResult] = await Promise.all([
    db.prepare(
      `SELECT key, value FROM settings WHERE site_id = ? AND key IN (${placeholders})`
    ).bind(siteId, ...keys).all(),
    db.prepare(
      `SELECT key, value FROM global_settings WHERE key IN (${placeholders})`
    ).bind(...keys).all(),
  ]);

  // Build merged map: global first, site overrides
  const settings: Record<string, string> = {};
  for (const row of globalResult.results as any[]) {
    settings[row.key] = row.value;
  }
  for (const row of siteResult.results as any[]) {
    settings[row.key] = row.value;
  }

  return {
    enabled: settings.recaptcha_enabled === 'true',
    siteKey: settings.recaptcha_site_key || '',
    secretKey: settings.recaptcha_secret_key || '',
    scoreThreshold: parseFloat(settings.recaptcha_score_threshold || '0.5'),
    onComments: settings.recaptcha_on_comments !== 'false',
    onContact: settings.recaptcha_on_contact !== 'false',
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/recaptcha.ts
git commit -m "feat: update getRecaptchaSettings to use global+site inheritance"
```

---

### Task 5: Admin API Client — Global Settings Methods

**Files:**
- Modify: `admin/src/lib/api.ts`

**Step 1: Add two methods to the ApiClient class**

Add before the closing `}` of the class (before `export const api = new ApiClient()`):

```typescript
  // Global Settings (super_admin)
  async getGlobalSettings() {
    return this.request<{ success: boolean; data: Record<string, string> }>('/global-settings');
  }

  async updateGlobalSettings(data: Record<string, string>) {
    return this.request('/global-settings', { method: 'PUT', body: data });
  }

  // Delete site-level setting override (reset to global)
  async deleteSiteSetting(key: string) {
    return this.request(`/settings/${key}`, { method: 'DELETE' });
  }
```

**Step 2: Commit**

```bash
git add admin/src/lib/api.ts
git commit -m "feat: add global settings API methods to admin client"
```

---

### Task 6: i18n — Add Translation Keys

**Files:**
- Modify: `admin/src/lib/i18n.ts`

**Step 1: Add translation keys**

In the Turkish (`tr`) translations object, add:
```typescript
'nav.global_settings': 'Global Ayarlar',
```

In the English (`en`) translations object, add:
```typescript
'nav.global_settings': 'Global Settings',
```

**Step 2: Commit**

```bash
git add admin/src/lib/i18n.ts
git commit -m "feat: add global settings translation keys"
```

---

### Task 7: Global Settings Admin Page

**Files:**
- Create: `admin/src/pages/settings/GlobalSettings.tsx`

**Step 1: Create the GlobalSettings page**

This page is super_admin only. It shows the same reCAPTCHA and Comment cards as GeneralSettings, but saves to `/api/global-settings`. Follow the exact same UI pattern as `GeneralSettings.tsx`.

```typescript
// admin/src/pages/settings/GlobalSettings.tsx
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Save, Globe, Shield, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/toast-notification';

export function GlobalSettings() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getGlobalSettings();
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateGlobalSettings(settings);
      toast(lang === 'tr' ? 'Global ayarlar kaydedildi' : 'Global settings saved', 'success');
    } catch {
      toast(lang === 'tr' ? 'Kaydetme ba\u015Far\u0131s\u0131z' : 'Save failed', 'error');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-4">{lang === 'tr' ? 'Y\u00FCkleniyor...' : 'Loading...'}</div>;

  const recaptchaEnabled = settings.recaptcha_enabled === 'true';
  const commentsEnabled = settings.comments_enabled === 'true';

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            {lang === 'tr' ? 'Global Ayarlar' : 'Global Settings'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'tr'
              ? 'Bu ayarlar t\u00FCm sitelerde varsay\u0131lan olarak ge\u00E7erlidir. Siteler kendi ayarlar\u0131ndan ge\u00E7ersiz k\u0131labilir.'
              : 'These settings apply as defaults across all sites. Individual sites can override them.'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...') : (lang === 'tr' ? 'Kaydet' : 'Save')}
        </Button>
      </div>

      {/* reCAPTCHA v3 Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            reCAPTCHA v3
          </CardTitle>
          <CardDescription>
            {lang === 'tr'
              ? 'T\u00FCm sitelerde ge\u00E7erli reCAPTCHA ayarlar\u0131. Siteler kendi ayarlar\u0131ndan ge\u00E7ersiz k\u0131labilir.'
              : 'System-wide reCAPTCHA settings. Sites can override from their own settings.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                {lang === 'tr' ? 'reCAPTCHA Aktif' : 'Enable reCAPTCHA'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {lang === 'tr' ? 'T\u00FCm sitelerde spam korumas\u0131' : 'Spam protection across all sites'}
              </p>
            </div>
            <Switch
              checked={recaptchaEnabled}
              onCheckedChange={(checked) => updateSetting('recaptcha_enabled', String(checked))}
            />
          </div>

          {recaptchaEnabled && (
            <>
              <Separator />
              <div>
                <Label>Site Key</Label>
                <Input
                  value={settings.recaptcha_site_key || ''}
                  onChange={(e) => updateSetting('recaptcha_site_key', e.target.value)}
                  placeholder="6Lc..."
                />
              </div>
              <div>
                <Label>Secret Key</Label>
                <Input
                  type="password"
                  value={settings.recaptcha_secret_key || ''}
                  onChange={(e) => updateSetting('recaptcha_secret_key', e.target.value)}
                  placeholder="6Lc..."
                />
              </div>
              <div>
                <Label>{lang === 'tr' ? 'Skor E\u015Fi\u011Fi' : 'Score Threshold'}</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.recaptcha_score_threshold || '0.5'}
                  onChange={(e) => updateSetting('recaptcha_score_threshold', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === 'tr' ? '0.0 (bot) - 1.0 (insan), \u00F6nerilen: 0.5' : '0.0 (bot) - 1.0 (human), recommended: 0.5'}
                </p>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {lang === 'tr' ? 'Koruma Alanlar\u0131' : 'Protection Areas'}
                </Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{lang === 'tr' ? '\u0130leti\u015Fim Formu' : 'Contact Form'}</span>
                  <Switch
                    checked={settings.recaptcha_on_contact !== 'false'}
                    onCheckedChange={(checked) => updateSetting('recaptcha_on_contact', String(checked))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{lang === 'tr' ? 'Yorum Formu' : 'Comment Form'}</span>
                  <Switch
                    checked={settings.recaptcha_on_comments !== 'false'}
                    onCheckedChange={(checked) => updateSetting('recaptcha_on_comments', String(checked))}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Comment Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {lang === 'tr' ? 'Yorum Ayarlar\u0131' : 'Comment Settings'}
          </CardTitle>
          <CardDescription>
            {lang === 'tr'
              ? 'T\u00FCm sitelerde ge\u00E7erli varsay\u0131lan yorum ayarlar\u0131'
              : 'Default comment settings applied across all sites'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                {lang === 'tr' ? 'Yorumlar\u0131 Etkinle\u015Ftir' : 'Enable Comments'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {lang === 'tr' ? 'T\u00FCm sitelerde yorumlara izin ver' : 'Allow comments across all sites'}
              </p>
            </div>
            <Switch
              checked={commentsEnabled}
              onCheckedChange={(checked) => updateSetting('comments_enabled', String(checked))}
            />
          </div>

          {commentsEnabled && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    {lang === 'tr' ? 'Yorum Moderasyonu' : 'Comment Moderation'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'tr' ? 'Yorumlar yay\u0131nlanmadan \u00F6nce onay gereksin' : 'Comments require approval before publishing'}
                  </p>
                </div>
                <Switch
                  checked={settings.comment_moderation === 'true'}
                  onCheckedChange={(checked) => updateSetting('comment_moderation', String(checked))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    {lang === 'tr' ? 'Varsay\u0131lan Yorum Durumu' : 'Default Comment Status'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'tr' ? 'Yeni yaz\u0131larda yorumlar a\u00E7\u0131k m\u0131 olsun?' : 'Should new posts have comments open?'}
                  </p>
                </div>
                <Switch
                  checked={settings.default_comment_status !== 'closed'}
                  onCheckedChange={(checked) => updateSetting('default_comment_status', checked ? 'open' : 'closed')}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add admin/src/pages/settings/GlobalSettings.tsx
git commit -m "feat: add GlobalSettings admin page (super_admin only)"
```

---

### Task 8: Register Route + Sidebar Menu

**Files:**
- Modify: `admin/src/App.tsx` (add import + route)
- Modify: `admin/src/components/layout/Sidebar.tsx` (add menu item)

**Step 1: Update `admin/src/App.tsx`**

Add import after line 19 (after GeneralSettings import):
```typescript
import { GlobalSettings } from '@/pages/settings/GlobalSettings';
```

Add route after line 87 (after `<Route path="settings" element={<GeneralSettings />} />`):
```typescript
          <Route path="global-settings" element={<GlobalSettings />} />
```

**Step 2: Update `admin/src/components/layout/Sidebar.tsx`**

Add a new nav item in the `navStructure` array after the `nav.sites` entry (line 45). Insert at line 46:
```typescript
  { key: 'nav.global_settings', href: '/global-settings', icon: Globe, roles: ['super_admin'] },
```

Note: `Globe` icon is already imported.

**Step 3: Commit**

```bash
git add admin/src/App.tsx admin/src/components/layout/Sidebar.tsx
git commit -m "feat: register GlobalSettings route + sidebar menu (super_admin)"
```

---

### Task 9: Site Settings — "Global" Badge + "Reset to Global" Button

**Files:**
- Modify: `admin/src/pages/settings/GeneralSettings.tsx`

This is the most nuanced task. We need to:
1. Track which keys are `_inherited` from the API response
2. Show a purple/blue "Global" badge next to inherited settings
3. Show a "Reset to Global" button for overridden settings that have a global counterpart

**Step 1: Update state and loadSettings**

Add state after `const [pages, setPages]` (line 24):
```typescript
const [inherited, setInherited] = useState<string[]>([]);
```

Update `loadSettings` to capture `_inherited`:
```typescript
const loadSettings = async () => {
  setLoading(true);
  const res = await api.getSettings() as any;
  setLoading(false);
  if (res.success && res.data) {
    const data = res.data as Record<string, string>;
    setSettings(data);
    setInherited(res._inherited || []);
  }
};
```

**Step 2: Add helper components inside the GeneralSettings function**

Add after `const updateSetting = ...` and before `const handleSave = ...`:

```typescript
// Badge for inherited settings
const GlobalBadge = ({ settingKey }: { settingKey: string }) => {
  if (!inherited.includes(settingKey)) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 cursor-help"
      title={lang === 'tr' ? 'Bu de\u011Fer global ayarlardan al\u0131nm\u0131\u015Ft\u0131r' : 'This value is inherited from global settings'}
    >
      <Globe className="h-3 w-3" />
      Global
    </span>
  );
};

// Reset button for overridden settings (shows when key exists in global but has site override)
const ResetToGlobalButton = ({ settingKey }: { settingKey: string }) => {
  // Only show if this key is NOT inherited (meaning site has an override)
  // AND the key is a known global key (recaptcha_*, comments_*, comment_*, default_comment_*)
  const isGlobalKey = settingKey.startsWith('recaptcha_') ||
    settingKey.startsWith('comments_') ||
    settingKey.startsWith('comment_') ||
    settingKey.startsWith('default_comment_');
  if (inherited.includes(settingKey) || !isGlobalKey) return null;

  const handleReset = async () => {
    try {
      await api.deleteSiteSetting(settingKey);
      await loadSettings(); // Reload to get fresh values
      toast(lang === 'tr' ? 'Global de\u011Fere s\u0131f\u0131rland\u0131' : 'Reset to global value', 'success');
    } catch {
      toast(lang === 'tr' ? '\u0130\u015Flem ba\u015Far\u0131s\u0131z' : 'Operation failed', 'error');
    }
  };

  return (
    <button
      onClick={handleReset}
      className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 underline"
    >
      {lang === 'tr' ? 'Globale S\u0131f\u0131rla' : 'Reset to Global'}
    </button>
  );
};
```

Add `Globe` to the imports from lucide-react (line 14):
```typescript
import { Save, Home, FileText, List, Type, Blocks, Shield, MessageSquare, Globe } from 'lucide-react';
```

**Step 3: Add badges/buttons to reCAPTCHA and Comment settings**

For each setting Label in the reCAPTCHA card and Comment Settings card, add the badge and reset button next to the label. For example, for the reCAPTCHA enable toggle label:

```tsx
<Label className="text-sm font-medium">
  {lang === 'tr' ? 'reCAPTCHA Aktif' : 'Enable reCAPTCHA'}
  {' '}<GlobalBadge settingKey="recaptcha_enabled" />
</Label>
<div className="flex items-center gap-2">
  <p className="text-xs text-muted-foreground">...</p>
  <ResetToGlobalButton settingKey="recaptcha_enabled" />
</div>
```

Apply the same pattern to all recaptcha and comment setting keys:
- `recaptcha_enabled`
- `recaptcha_site_key`
- `recaptcha_secret_key`
- `recaptcha_score_threshold`
- `recaptcha_on_contact`
- `recaptcha_on_comments`
- `comments_enabled`
- `comment_moderation`
- `default_comment_status`

**Step 4: Commit**

```bash
git add admin/src/pages/settings/GeneralSettings.tsx
git commit -m "feat: add Global badge + Reset to Global on site settings"
```

---

### Task 10: Build and Deploy

**Step 1: Build admin panel**

```bash
cd "C:/Users/Administrator/CLAUDECODE/WP-WORKER/admin" && npm run build
```

Expected: Build succeeds, output in `admin/dist/`

**Step 2: Deploy to Cloudflare Workers**

```bash
cd "C:/Users/Administrator/CLAUDECODE/WP-WORKER" && npx wrangler deploy
```

Expected: Deployment succeeds

**Step 3: Commit build output if needed**

```bash
git add -A && git commit -m "build: compile admin panel with global settings feature"
```

---

## Verification Checklist

1. **Backend:**
   - `GET /api/global-settings` returns global settings (super_admin only, 403 for others)
   - `PUT /api/global-settings` saves settings to `global_settings` table
   - `GET /api/settings` merges site + global, returns `_inherited` array
   - `DELETE /api/settings/:key` removes site override
   - `getRecaptchaSettings()` falls back to global values

2. **Admin Panel:**
   - Super admin sees "Global Ayarlar" in sidebar
   - Global Settings page loads/saves correctly
   - Site Settings page shows purple "Global" badge on inherited keys
   - Overriding a value removes the badge
   - "Globale Sifirla" button removes site override and badge reappears
   - Non-super_admin users don't see Global Settings

3. **Inheritance Flow:**
   - Set reCAPTCHA in Global Settings → all sites get it via `GET /api/settings`
   - Override reCAPTCHA in one site → that site uses its own value
   - Reset override → site falls back to global value
   - reCAPTCHA verification works with inherited values
