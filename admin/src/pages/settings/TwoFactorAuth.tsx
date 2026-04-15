import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Badge } from '@ui/badge';
import { Shield, ShieldCheck, ShieldOff, Copy, CheckCircle } from 'lucide-react';

interface SetupData {
  secret: string;
  uri: string;
}

export function TwoFactorAuth() {
  const { lang, user } = useAuthStore();

  // Setup flow state
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Disable flow state
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  // Feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const is2FAEnabled = !!(user as any)?.totp_enabled;

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleStartSetup = async () => {
    clearMessages();
    setSetupLoading(true);
    try {
      const res = await api.request<{ success: boolean; data: SetupData; error?: string }>('/auth/2fa/setup', {
        method: 'POST',
      });
      if (res.success) {
        setSetupData(res.data);
      } else {
        setError(res.error || (lang === 'tr' ? '2FA kurulumu baslatilirken hata olustu.' : 'Failed to start 2FA setup.'));
      }
    } catch (err: any) {
      setError(err.message || (lang === 'tr' ? 'Bir hata olustu.' : 'An error occurred.'));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!setupData) return;
    if (verifyCode.length !== 6) {
      setError(lang === 'tr' ? 'Lutfen 6 haneli kodu girin.' : 'Please enter a 6-digit code.');
      return;
    }

    setVerifyLoading(true);
    try {
      const res = await api.request<{ success: boolean; error?: string }>('/auth/2fa/verify', {
        method: 'POST',
        body: { code: verifyCode, secret: setupData.secret },
      });
      if (res.success) {
        setSuccess(lang === 'tr' ? 'Iki faktorlu dogrulama basariyla etkinlestirildi!' : 'Two-factor authentication enabled successfully!');
        setSetupData(null);
        setVerifyCode('');
        // Update user in localStorage to reflect totp_enabled
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const u = JSON.parse(userStr);
            u.totp_enabled = true;
            localStorage.setItem('user', JSON.stringify(u));
            useAuthStore.setState({ user: u });
          } catch {
            // ignore
          }
        }
      } else {
        setError(res.error || (lang === 'tr' ? 'Kod dogrulanamadi. Tekrar deneyin.' : 'Code verification failed. Please try again.'));
      }
    } catch (err: any) {
      setError(err.message || (lang === 'tr' ? 'Bir hata olustu.' : 'An error occurred.'));
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!disablePassword) {
      setError(lang === 'tr' ? 'Lutfen sifrenizi girin.' : 'Please enter your password.');
      return;
    }

    setDisableLoading(true);
    try {
      const res = await api.request<{ success: boolean; error?: string }>('/auth/2fa/disable', {
        method: 'POST',
        body: { password: disablePassword },
      });
      if (res.success) {
        setSuccess(lang === 'tr' ? 'Iki faktorlu dogrulama devre disi birakildi.' : 'Two-factor authentication has been disabled.');
        setShowDisable(false);
        setDisablePassword('');
        // Update user in localStorage to reflect totp_enabled
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const u = JSON.parse(userStr);
            u.totp_enabled = false;
            localStorage.setItem('user', JSON.stringify(u));
            useAuthStore.setState({ user: u });
          } catch {
            // ignore
          }
        }
      } else {
        setError(res.error || (lang === 'tr' ? 'Sifre yanlis veya bir hata olustu.' : 'Incorrect password or an error occurred.'));
      }
    } catch (err: any) {
      setError(err.message || (lang === 'tr' ? 'Bir hata olustu.' : 'An error occurred.'));
    } finally {
      setDisableLoading(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleCancelSetup = () => {
    setSetupData(null);
    setVerifyCode('');
    clearMessages();
  };

  const handleCancelDisable = () => {
    setShowDisable(false);
    setDisablePassword('');
    clearMessages();
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">
        {lang === 'tr' ? 'Iki Faktorlu Dogrulama (2FA)' : 'Two-Factor Authentication (2FA)'}
      </h1>

      {/* Feedback Messages */}
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30 rounded-md flex items-center gap-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {is2FAEnabled ? (
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                  <Shield className="h-6 w-6" />
                </div>
              )}
              <div>
                <CardTitle>
                  {lang === 'tr' ? 'Hesap Guvenligi' : 'Account Security'}
                </CardTitle>
                <CardDescription>
                  {lang === 'tr'
                    ? 'TOTP tabanli iki faktorlu dogrulama ile hesabinizi koruyun'
                    : 'Protect your account with TOTP-based two-factor authentication'}
                </CardDescription>
              </div>
            </div>
            <Badge variant={is2FAEnabled ? 'default' : 'secondary'}>
              {is2FAEnabled
                ? (lang === 'tr' ? 'Etkin' : 'Enabled')
                : (lang === 'tr' ? 'Devre Disi' : 'Disabled')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {is2FAEnabled
              ? (lang === 'tr'
                ? 'Iki faktorlu dogrulama etkin. Hesabiniz ek bir guvenlik katmaniyla korunuyor.'
                : 'Two-factor authentication is enabled. Your account is protected with an additional security layer.')
              : (lang === 'tr'
                ? 'Iki faktorlu dogrulama etkin degil. Hesabinizi daha guvenli hale getirmek icin etkinlestirmeniz onerilir.'
                : 'Two-factor authentication is not enabled. It is recommended to enable it to make your account more secure.')}
          </p>

          {is2FAEnabled ? (
            !showDisable && (
              <Button
                variant="destructive"
                onClick={() => { clearMessages(); setShowDisable(true); }}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                {lang === 'tr' ? '2FA\'yi Devre Disi Birak' : 'Disable 2FA'}
              </Button>
            )
          ) : (
            !setupData && (
              <Button onClick={handleStartSetup} disabled={setupLoading}>
                <Shield className="h-4 w-4 mr-2" />
                {setupLoading
                  ? (lang === 'tr' ? 'Hazirlaniyor...' : 'Setting up...')
                  : (lang === 'tr' ? '2FA\'yi Etkinlestir' : 'Enable 2FA')}
              </Button>
            )
          )}
        </CardContent>
      </Card>

      {/* Setup Flow - When 2FA is OFF and user clicked Enable */}
      {!is2FAEnabled && setupData && (
        <>
          {/* Step 1: Secret & URI */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {lang === 'tr' ? 'Adim 1: Authenticator Uygulamasina Ekle' : 'Step 1: Add to Authenticator App'}
              </CardTitle>
              <CardDescription>
                {lang === 'tr'
                  ? 'Asagidaki gizli anahtari authenticator uygulamaniza (Google Authenticator, Authy vb.) manuel olarak ekleyin.'
                  : 'Manually add the secret key below to your authenticator app (Google Authenticator, Authy, etc.).'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Secret Key */}
              <div className="space-y-2">
                <Label>{lang === 'tr' ? 'Gizli Anahtar (Base32)' : 'Secret Key (Base32)'}</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all select-all">
                    {setupData.secret}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(setupData.secret, 'secret')}
                    className="flex-shrink-0"
                  >
                    {copiedField === 'secret' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Provisioning URI */}
              <div className="space-y-2">
                <Label>{lang === 'tr' ? 'Provizyon URI\'si' : 'Provisioning URI'}</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-md font-mono text-xs break-all select-all max-h-20 overflow-y-auto">
                    {setupData.uri}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(setupData.uri, 'uri')}
                    className="flex-shrink-0"
                  >
                    {copiedField === 'uri' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {lang === 'tr'
                    ? 'Bu URI\'yi bazi authenticator uygulamalarinda QR kodu yerine kullanabilirsiniz.'
                    : 'You can use this URI in some authenticator apps instead of a QR code.'}
                </p>
              </div>

              {/* Instructions */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <p className="font-medium">
                  {lang === 'tr' ? 'Nasil eklenir:' : 'How to add:'}
                </p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400">
                  <li>
                    {lang === 'tr'
                      ? 'Authenticator uygulamanizi acin (Google Authenticator, Authy, vb.)'
                      : 'Open your authenticator app (Google Authenticator, Authy, etc.)'}
                  </li>
                  <li>
                    {lang === 'tr'
                      ? '"Manuel olarak gir" veya "+" secenegine tiklayin'
                      : 'Tap "Enter manually" or "+"'}
                  </li>
                  <li>
                    {lang === 'tr'
                      ? 'Yukaridaki gizli anahtari yapistirin'
                      : 'Paste the secret key shown above'}
                  </li>
                  <li>
                    {lang === 'tr'
                      ? 'Uygulamanin olusturdugu 6 haneli kodu asagiya girin'
                      : 'Enter the 6-digit code generated by the app below'}
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Verify */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {lang === 'tr' ? 'Adim 2: Kodu Dogrula' : 'Step 2: Verify Code'}
              </CardTitle>
              <CardDescription>
                {lang === 'tr'
                  ? 'Authenticator uygulamanizda gosterilen 6 haneli kodu girin.'
                  : 'Enter the 6-digit code shown in your authenticator app.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verify-code">
                    {lang === 'tr' ? 'Dogrulama Kodu' : 'Verification Code'}
                  </Label>
                  <Input
                    id="verify-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-40 font-mono text-lg tracking-widest text-center"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={verifyLoading || verifyCode.length !== 6}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {verifyLoading
                      ? (lang === 'tr' ? 'Dogrulaniyor...' : 'Verifying...')
                      : (lang === 'tr' ? 'Dogrula ve Etkinlestir' : 'Verify & Enable')}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelSetup}>
                    {lang === 'tr' ? 'Iptal' : 'Cancel'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      {/* Disable Flow - When 2FA is ON and user clicked Disable */}
      {is2FAEnabled && showDisable && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">
              {lang === 'tr' ? '2FA\'yi Devre Disi Birak' : 'Disable 2FA'}
            </CardTitle>
            <CardDescription>
              {lang === 'tr'
                ? 'Devam etmek icin mevcut sifrenizi girin. Bu islem, hesabinizdaki iki faktorlu dogrulamayi kaldiacaktir.'
                : 'Enter your current password to continue. This will remove two-factor authentication from your account.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDisable} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="disable-password">
                  {lang === 'tr' ? 'Mevcut Sifre' : 'Current Password'}
                </Label>
                <Input
                  id="disable-password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder={lang === 'tr' ? 'Sifrenizi girin' : 'Enter your password'}
                  className="max-w-sm"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" variant="destructive" disabled={disableLoading || !disablePassword}>
                  <ShieldOff className="h-4 w-4 mr-2" />
                  {disableLoading
                    ? (lang === 'tr' ? 'Devre disi birakiliyor...' : 'Disabling...')
                    : (lang === 'tr' ? 'Onayla ve Devre Disi Birak' : 'Confirm & Disable')}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelDisable}>
                  {lang === 'tr' ? 'Iptal' : 'Cancel'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
