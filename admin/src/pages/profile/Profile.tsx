import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Badge } from '@ui/badge';
import { User, Mail, Lock, Shield, Save, CheckCircle } from 'lucide-react';
import { useToast } from '@ui/toast-notification';

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
    </div>
  );
}
