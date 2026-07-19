// Cloudflare Turnstile — görünmez/otomatik "insan doğrulama" interstitial'ı.
// Gate'in coğrafya/cihaz/proxy kurallarını geçen ziyaretçiye, içerik açılmadan
// önce arka planda çalışan (tıklamasız) bir Turnstile challenge sunar. Token
// alan (gerçek tarayıcı) imzalı bir çerez kazanır ve N saat tekrar sorulmaz;
// token alamayan (bot/headless) giremez. Manuel çözme yok — widget "Invisible"
// veya "Non-interactive" modda oluşturulur.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const COOKIE = '__zg_human';
const TTL_SEC = 86400; // 24 saat

const enc = (s: string) => new TextEncoder().encode(s);

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Set-Cookie değeri: `<expiry>.<hmac(expiry)>`, imzalı, HttpOnly.
export async function makeHumanCookie(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const sig = await hmacHex(secret, String(exp));
  return `${COOKIE}=${exp}.${sig}; Path=/; Max-Age=${TTL_SEC}; HttpOnly; Secure; SameSite=Lax`;
}

export async function hasValidHumanCookie(request: Request, secret: string): Promise<boolean> {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=(\\d+)\\.([0-9a-f]{64})`));
  if (!m) return false;
  const exp = parseInt(m[1], 10);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
  const expect = await hmacHex(secret, m[1]);
  // sabit-zamanlı karşılaştırma
  if (expect.length !== m[2].length) return false;
  let diff = 0;
  for (let i = 0; i < expect.length; i++) diff |= expect.charCodeAt(i) ^ m[2].charCodeAt(i);
  return diff === 0;
}

export async function verifyTurnstile(token: string, secret: string, ip?: string | null): Promise<boolean> {
  if (!token || !secret) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const r = await fetch(VERIFY_URL, { method: 'POST', body });
    const data = (await r.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

// Güvenli iç yönlendirme yolu (açık yönlendirme koruması).
function safePath(p: string | null): string {
  if (!p || !p.startsWith('/') || p.startsWith('//')) return '/';
  return p;
}

// Görünmez Turnstile interstitial sayfası — token gelince otomatik POST eder.
export function interstitialHtml(siteKey: string, returnPath: string): Response {
  const rp = safePath(returnPath);
  const body = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Doğrulanıyor…</title>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<style>body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
.b{text-align:center;padding:24px;max-width:420px}
.s{width:34px;height:34px;border:3px solid #e5e7eb;border-top-color:#16a34a;border-radius:50%;animation:sp 1s linear infinite;margin:0 auto 16px}
@keyframes sp{to{transform:rotate(360deg)}}.cf-turnstile{display:flex;justify-content:center;margin-top:14px}</style>
</head><body>
<div class="b">
  <div class="s"></div>
  <p style="color:#555;margin:0">Bağlantınız doğrulanıyor, lütfen bekleyin…<br><span style="font-size:13px;color:#999">Verifying your connection…</span></p>
  <form id="zgf" method="POST" action="/__ts-verify">
    <input type="hidden" name="rp" value="${rp.replace(/"/g, '&quot;')}">
    <input type="hidden" name="cf-turnstile-response" id="zgt">
  </form>
  <div class="cf-turnstile" data-sitekey="${siteKey}" data-callback="zgok" data-error-callback="zgerr" data-timeout-callback="zgerr"></div>
</div>
<script>
function zgok(t){document.getElementById('zgt').value=t;document.getElementById('zgf').submit();}
function zgerr(){document.body.innerHTML='<div class="b"><div style="font-size:38px">&#9888;&#65039;</div><h2 style="color:#222;font-size:20px;margin:8px 0">Doğrulama Başarısız</h2><p style="color:#555;font-size:14px">Bağlantınız doğrulanamadı. Lütfen normal internet bağlantınızla tekrar deneyin.</p><h3 style="color:#444;font-size:15px;margin:14px 0 4px">Verification Failed</h3><p style="color:#888;font-size:12px">Your connection could not be verified.</p></div>';}
</script>
</body></html>`;
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export const TS_COOKIE = COOKIE;
export { safePath };
