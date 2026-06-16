import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { formatDate } from '@ui/lib/utils';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Badge } from '@ui/badge';
import { User, Mail, Lock, Shield, Save, CheckCircle, CreditCard, Loader2, Plus, Minus, Check } from 'lucide-react';
import { useToast } from '@ui/toast-notification';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface SubPackage {
  id: number;
  status: string;
  billing_period: 'monthly' | 'yearly';
  payment_method?: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number | boolean;
  creem_subscription_id?: string | null;
  package_name: string;
  max_sites: number;
  price_monthly: number;
  price_yearly: number;
}

interface SubAddon {
  id: number;
  units: number;
  billing_period: 'monthly' | 'yearly';
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: number | boolean;
  creem_subscription_id?: string | null;
  addon_name: string;
  type: 'unit' | 'feature';
  unit_label?: string | null;
  feature_key?: string | null;
  price_monthly: number;
  price_yearly: number;
}

interface SiteRow {
  id: number;
  name: string;
  slug: string;
  status: 'active' | 'paused';
}

interface SubOverview {
  max_sites: number;
  sites_used: number;
  package: SubPackage | null;
  addons: SubAddon[];
  sites: SiteRow[];
}

export function Profile() {
  const { user, lang } = useAuthStore();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [overview, setOverview] = useState<SubOverview | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ kind: 'package' | 'addon'; id: number; name: string } | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [unitBusyId, setUnitBusyId] = useState<number | null>(null);

  const [pausePrompt, setPausePrompt] = useState<{ addon: SubAddon; nextUnits: number; mustPause: number } | null>(null);
  const [selectedPauseIds, setSelectedPauseIds] = useState<number[]>([]);
  const [pauseBusy, setPauseBusy] = useState(false);

  const [activatingId, setActivatingId] = useState<number | null>(null);

  const loadOverview = async () => {
    try {
      const res = await api.request<{ success: boolean; data: SubOverview }>('/subscriptions/overview');
      if (res.success) setOverview(res.data);
    } catch {}
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const fmtDate = (d: string | null) => formatDate(d, lang);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const { kind, id } = cancelTarget;
    const rowKey = `${kind}:${id}`;
    setCancelingId(rowKey);
    try {
      const res = await api.request<{ success: boolean; data?: { period_end: string }; error?: string }>(
        '/subscriptions/cancel',
        { method: 'POST', body: { kind, id } }
      );
      if (res.success) {
        toast(lang === 'tr' ? 'Dönem sonunda iptal edilecek' : 'Will cancel at period end', 'success');
        await loadOverview();
      } else {
        toast(res.error || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred'), 'error');
      }
    } catch (err: any) {
      toast(err.message || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred'), 'error');
    }
    setCancelingId(null);
    setCancelTarget(null);
  };

  // Change a unit add-on's quantity (e.g. 2 sites → 1) via Creem proration.
  // Dropping to 0 isn't allowed here — that's a full Cancel.
  const changeUnits = async (addon: SubAddon, next: number) => {
    if (next < 1) return;
    // Lowering units may put the user over quota. If so, ask which active
    // sites to pause before calling the API.
    if (overview && next < addon.units) {
      const resultingMax = overview.max_sites + (next - addon.units);
      const mustPause = Math.max(0, (overview.sites_used ?? 0) - resultingMax);
      if (mustPause > 0) {
        setPausePrompt({ addon, nextUnits: next, mustPause });
        setSelectedPauseIds([]);
        return;
      }
    }
    setUnitBusyId(addon.id);
    try {
      const res = await api.request<{ success: boolean; error?: string }>(
        `/subscriptions/addon/${addon.id}/units`,
        { method: 'POST', body: { units: next } }
      );
      if (res.success) {
        toast(lang === 'tr' ? 'Adet güncellendi' : 'Quantity updated', 'success');
        await loadOverview();
      } else {
        toast(res.error || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred'), 'error');
      }
    } catch (err: any) {
      toast(err.message || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred'), 'error');
    }
    setUnitBusyId(null);
  };

  // Confirm lowering units, pausing the selected sites to fit the new quota.
  const confirmPause = async () => {
    if (!pausePrompt) return;
    if (selectedPauseIds.length !== pausePrompt.mustPause) return;
    setPauseBusy(true);
    try {
      const res = await api.request<{ success: boolean; error?: string }>(
        `/subscriptions/addon/${pausePrompt.addon.id}/units`,
        { method: 'POST', body: { units: pausePrompt.nextUnits, pause_site_ids: selectedPauseIds } }
      );
      if (res.success) {
        toast(
          lang === 'tr'
            ? 'Adet güncellendi ve seçilen siteler duraklatıldı'
            : 'Quantity updated and selected sites paused',
          'success'
        );
        setPausePrompt(null);
        setSelectedPauseIds([]);
        await loadOverview();
      } else {
        toast(res.error || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred'), 'error');
      }
    } catch (err: any) {
      toast(err.message || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred'), 'error');
    }
    setPauseBusy(false);
  };

  const togglePauseId = (id: number) => {
    setSelectedPauseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Reactivate a paused site (subject to the backend quota check).
  const activateSite = async (siteId: number) => {
    setActivatingId(siteId);
    try {
      const res = await api.request<{ success: boolean; error?: string }>(
        `/sites/${siteId}/activate`,
        { method: 'POST', body: {} }
      );
      if (res.success) {
        toast(lang === 'tr' ? 'Site aktifleştirildi' : 'Site activated', 'success');
        await loadOverview();
      } else {
        toast(res.error || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred'), 'error');
      }
    } catch (err: any) {
      toast(err.message || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred'), 'error');
    }
    setActivatingId(null);
  };

  const periodPrice = (priceMonthly: number, priceYearly: number, period: 'monthly' | 'yearly') =>
    period === 'yearly' ? priceYearly : priceMonthly;

  const perLabel = (period: 'monthly' | 'yearly') =>
    period === 'yearly' ? (lang === 'tr' ? 'yıl' : 'yr') : (lang === 'tr' ? 'ay' : 'mo');

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const body: any = {};
      if (displayName !== user?.display_name) body.display_name = displayName;
      if (email !== user?.email) body.email = email;

      if (Object.keys(body).length === 0) {
        setProfileMsg({ type: 'error', text: lang === 'tr' ? 'Değişiklik yok' : 'No changes' });
        setSavingProfile(false);
        return;
      }

      const res = await api.request<{ success: boolean; data: any; error?: string }>(
        `/users/${user?.id}`,
        { method: 'PUT', body }
      );

      if (res.success) {
        // Update local storage and auth store
        const updatedUser = { ...user!, ...res.data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        useAuthStore.setState({ user: updatedUser });
        toast(lang === 'tr' ? 'Profil güncellendi' : 'Profile updated', 'success');
        setProfileMsg({ type: 'success', text: lang === 'tr' ? 'Profil güncellendi' : 'Profile updated' });
      } else {
        toast(res.error || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred'), 'error');
        setProfileMsg({ type: 'error', text: res.error || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred') });
      }
    } catch (err: any) {
      toast(err.message || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred'), 'error');
      setProfileMsg({ type: 'error', text: err.message || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred') });
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async () => {
    setSavingPassword(true);
    setPasswordMsg(null);

    if (!newPassword) {
      setPasswordMsg({ type: 'error', text: lang === 'tr' ? 'Yeni şifre gerekli' : 'New password required' });
      setSavingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: lang === 'tr' ? 'Şifre en az 8 karakter olmalı' : 'Password must be at least 8 characters' });
      setSavingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: lang === 'tr' ? 'Şifreler eşleşmiyor' : 'Passwords do not match' });
      setSavingPassword(false);
      return;
    }

    try {
      const res = await api.request<{ success: boolean; error?: string }>(
        `/users/${user?.id}`,
        { method: 'PUT', body: { password: newPassword } }
      );

      if (res.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast(lang === 'tr' ? 'Şifre değiştirildi' : 'Password changed', 'success');
        setPasswordMsg({ type: 'success', text: lang === 'tr' ? 'Şifre değiştirildi' : 'Password changed' });
      } else {
        toast(res.error || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred'), 'error');
        setPasswordMsg({ type: 'error', text: res.error || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred') });
      }
    } catch (err: any) {
      toast(err.message || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred'), 'error');
      setPasswordMsg({ type: 'error', text: err.message || (lang === 'tr' ? 'Hata oluştu' : 'Error occurred') });
    }
    setSavingPassword(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{lang === 'tr' ? 'Profil' : 'Profile'}</h1>

      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            {lang === 'tr' ? 'Profil Bilgileri' : 'Profile Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar + Role Badge */}
          <div className="flex items-center gap-4 pb-2">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              {user?.display_name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{user?.display_name}</p>
              <Badge variant={user?.role === 'super_admin' ? 'destructive' : 'default'}>
                <Shield className="h-3 w-3 mr-1" />
                {user?.role}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">{lang === 'tr' ? 'Görünen Ad' : 'Display Name'}</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={lang === 'tr' ? 'Adınız' : 'Your name'}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {lang === 'tr' ? 'E-posta' : 'Email'}
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          {profileMsg && (
            <div className={`flex items-center gap-2 text-sm ${profileMsg.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {profileMsg.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {profileMsg.text}
            </div>
          )}

          <Button onClick={handleSaveProfile} disabled={savingProfile}>
            <Save className="h-4 w-4 mr-2" />
            {savingProfile
              ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...')
              : (lang === 'tr' ? 'Profili Kaydet' : 'Save Profile')
            }
          </Button>
        </CardContent>
      </Card>

      {/* Subscription & Add-ons Card */}
      {overview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {lang === 'tr' ? 'Abonelik & Eklentiler' : 'Subscription & Add-ons'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quota line */}
            <div className="text-sm text-muted-foreground">
              {overview.sites_used} / {overview.max_sites} {lang === 'tr' ? 'site' : 'sites'}
            </div>

            {/* Package row */}
            <div className="space-y-2">
              <Label className="text-sm">{lang === 'tr' ? 'Paket' : 'Package'}</Label>
              {overview.package ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{overview.package.package_name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${periodPrice(overview.package.price_monthly, overview.package.price_yearly, overview.package.billing_period).toFixed(2)}
                      {' '}/ {perLabel(overview.package.billing_period)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {lang === 'tr' ? 'Yenileme' : 'Renews'}: {fmtDate(overview.package.current_period_end)}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {overview.package.cancel_at_period_end ? (
                      <span className="text-xs text-muted-foreground">
                        {lang === 'tr'
                          ? `Dönem sonunda iptal edilecek (${fmtDate(overview.package!.current_period_end)})`
                          : `Cancels on ${fmtDate(overview.package!.current_period_end)}`}
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                        disabled={cancelingId === `package:${overview.package.id}`}
                        onClick={() =>
                          setCancelTarget({ kind: 'package', id: overview.package!.id, name: overview.package!.package_name })
                        }
                      >
                        {cancelingId === `package:${overview.package.id}` && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        {lang === 'tr' ? 'İptal Et' : 'Cancel'}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {lang === 'tr' ? 'Aktif paket yok' : 'No active package'}
                </p>
              )}
            </div>

            {/* Add-on rows */}
            {overview.addons.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">{lang === 'tr' ? 'Eklentiler' : 'Add-ons'}</Label>
                {overview.addons.map((addon) => {
                  const unitPrice = periodPrice(addon.price_monthly, addon.price_yearly, addon.billing_period);
                  const total = addon.type === 'unit' ? unitPrice * addon.units : unitPrice;
                  const rowKey = `addon:${addon.id}`;
                  return (
                    <div
                      key={addon.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold">
                          {addon.addon_name}
                          {addon.type === 'unit' && (
                            <span className="ml-1 text-sm font-normal text-muted-foreground">
                              × {addon.units} {addon.unit_label || (lang === 'tr' ? 'birim' : 'unit')}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${total.toFixed(2)} / {perLabel(addon.billing_period)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {lang === 'tr' ? 'Yenileme' : 'Renews'}: {fmtDate(addon.current_period_end)}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {addon.cancel_at_period_end ? (
                          <span className="text-xs text-muted-foreground">
                            {lang === 'tr'
                              ? `Dönem sonunda iptal edilecek (${fmtDate(addon.current_period_end)})`
                              : `Cancels on ${fmtDate(addon.current_period_end)}`}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {addon.type === 'unit' && (
                              <div className="flex items-center gap-1" title={lang === 'tr' ? 'Adedi değiştir' : 'Change quantity'}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  disabled={unitBusyId === addon.id || addon.units <= 1}
                                  onClick={() => changeUnits(addon, addon.units - 1)}
                                >
                                  {unitBusyId === addon.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Minus className="h-3.5 w-3.5" />}
                                </Button>
                                <Input
                                  type="number"
                                  min={1}
                                  key={`units-${addon.id}-${addon.units}`}
                                  defaultValue={addon.units}
                                  disabled={unitBusyId === addon.id}
                                  title={lang === 'tr' ? 'Adet girin' : 'Enter quantity'}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                  }}
                                  onBlur={(e) => {
                                    const v = Math.floor(Number(e.target.value));
                                    if (!Number.isFinite(v) || v < 1) {
                                      e.target.value = String(addon.units);
                                      return;
                                    }
                                    if (v !== addon.units) changeUnits(addon, v);
                                  }}
                                  className="h-8 w-16 text-center px-1 tabular-nums"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  disabled={unitBusyId === addon.id}
                                  onClick={() => changeUnits(addon, addon.units + 1)}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                              disabled={cancelingId === rowKey}
                              onClick={() => setCancelTarget({ kind: 'addon', id: addon.id, name: addon.addon_name })}
                            >
                              {cancelingId === rowKey && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                              {lang === 'tr' ? 'İptal Et' : 'Cancel'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sites list */}
            {overview.sites.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">{lang === 'tr' ? 'Siteler' : 'Sites'}</Label>
                {overview.sites.map((site) => (
                  <div
                    key={site.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="font-medium truncate">{site.name}</span>
                      <Badge variant={site.status === 'paused' ? 'destructive' : 'default'}>
                        {site.status === 'paused'
                          ? (lang === 'tr' ? 'Duraklatıldı' : 'Paused')
                          : (lang === 'tr' ? 'Aktif' : 'Active')}
                      </Badge>
                    </div>
                    {site.status === 'paused' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={activatingId === site.id}
                        onClick={() => activateSite(site.id)}
                      >
                        {activatingId === site.id && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        {lang === 'tr' ? 'Aktifleştir' : 'Activate'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {lang === 'tr' ? 'Şifre Değiştir' : 'Change Password'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm">{lang === 'tr' ? 'Yeni Şifre' : 'New Password'}</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={lang === 'tr' ? 'En az 8 karakter' : 'At least 8 characters'}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm">{lang === 'tr' ? 'Şifre Tekrar' : 'Confirm Password'}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={lang === 'tr' ? 'Şifreyi tekrar girin' : 'Re-enter password'}
            />
          </div>

          {passwordMsg && (
            <div className={`flex items-center gap-2 text-sm ${passwordMsg.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {passwordMsg.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {passwordMsg.text}
            </div>
          )}

          <Button onClick={handleChangePassword} disabled={savingPassword} variant="outline">
            <Lock className="h-4 w-4 mr-2" />
            {savingPassword
              ? (lang === 'tr' ? 'Değiştiriliyor...' : 'Changing...')
              : (lang === 'tr' ? 'Şifre Değiştir' : 'Change Password')
            }
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => { if (!open) setCancelTarget(null); }}
        onConfirm={confirmCancel}
        title={lang === 'tr' ? 'Aboneliği İptal Et' : 'Cancel Subscription'}
        description={
          cancelTarget
            ? (lang === 'tr'
                ? `"${cancelTarget.name}" dönem sonunda iptal edilecek. O zamana kadar kullanmaya devam edebilirsiniz.`
                : `"${cancelTarget.name}" will be canceled at the end of the period. You can keep using it until then.`)
            : undefined
        }
        confirmLabel={lang === 'tr' ? 'İptal Et' : 'Cancel Plan'}
        cancelLabel={lang === 'tr' ? 'Vazgeç' : 'Keep'}
        variant="destructive"
      />

      {/* Pause-sites dialog (shown when lowering units would exceed quota) */}
      {pausePrompt && (
        <Dialog open onOpenChange={(open) => { if (!open) setPausePrompt(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {lang === 'tr' ? 'Hangi siteleri duraklatalım?' : 'Which sites to pause?'}
              </DialogTitle>
              <DialogDescription>
                {lang === 'tr'
                  ? `Kotayı düşürmek için tam olarak ${pausePrompt.mustPause} site duraklatmalısınız.`
                  : `You must pause exactly ${pausePrompt.mustPause} site(s) to lower the quota.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(overview?.sites.filter((s) => s.status === 'active').length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">
                  {lang === 'tr' ? 'Duraklatılacak aktif site yok.' : 'No active sites to pause.'}
                </p>
              )}
              {overview?.sites.filter((s) => s.status === 'active').map((site) => {
                const selected = selectedPauseIds.includes(site.id);
                return (
                  <button
                    type="button"
                    key={site.id}
                    aria-pressed={selected}
                    onClick={() => togglePauseId(site.id)}
                    className={`w-full flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className="font-medium truncate">{site.name}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <DialogFooter className="items-center sm:justify-between">
              <span className="text-sm text-muted-foreground tabular-nums">
                {selectedPauseIds.length}/{pausePrompt.mustPause}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPausePrompt(null)} disabled={pauseBusy}>
                  {lang === 'tr' ? 'Vazgeç' : 'Cancel'}
                </Button>
                <Button
                  onClick={confirmPause}
                  disabled={pauseBusy || selectedPauseIds.length !== pausePrompt.mustPause}
                >
                  {pauseBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {lang === 'tr' ? 'Duraklat ve düşür' : 'Pause & lower'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
