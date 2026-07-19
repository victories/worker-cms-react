// gate.js — ziyaretçi kapısı, CMS Worker'ına middleware olarak gömülür.
// Proxy DEĞİL: CMS zaten Worker'da çalıştığı için isteği o karşılıyor,
// biz sadece en başta "geçsin mi / mesaj mı görsün" kararını veriyoruz.
// İç bağlantılar CMS'in kendi ürettiği gibi çalışır, gate her istekte devrededir.
//
// KULLANIM (CMS Worker'ının içinde):
//   import { runGate } from "./gate.js";
//   export default {
//     async fetch(request, env, ctx) {
//       const blocked = await runGate(request, env);
//       if (blocked) return blocked;      // engellendi -> mesaj sayfası
//       // ... buradan sonrası senin CMS'in normal akışı ...
//     }
//   };

// ---------- AYARLAR ----------
const IP_WHITELIST = ["192.30.138.178", "185.248.12.49"];
const PROXYCHECK_KEY = ""; // test için buraya yaz; prod'da "" bırak, env.PROXYCHECK_KEY kullanılır

const RESIDENTIAL_RISK_THRESHOLD = 50;   // residential/CGNAT: bu risk ve üstünü engelle
const DATACENTER_ALWAYS_BLOCK    = true; // datacenter/VPN: her zaman engelle (risk'e bakma)
const DATACENTER_RISK_THRESHOLD  = 0;    // (üstteki false ise) datacenter risk eşiği

const CACHE_RESIDENTIAL_TTL = 86400;     // residential/temiz sonuç -> 24 saat cache

// Hangi kurallar aktif? İhtiyacına göre aç/kapa.
const REQUIRE_MOBILE   = true;
const REQUIRE_TURKISH  = true;
const REQUIRE_COUNTRY  = "TR";           // null yaparsan ülke kontrolü kapanır
const REQUIRE_NO_PROXY = true;

// Belirli yolları gate'ten muaf tut (ör. sağlık kontrolü, statik asset öneki)
const BYPASS_PATHS = ["/health", "/favicon.ico"];
// ------------------------------

// Gerçek ziyaretçi IP'si. Kendi reverse-proxy'miz arkasında olduğumuzda
// CF-Connecting-IP proxy'nin IP'sidir. Proxy asıl ziyaretçi IP'sini
// `X-Forwarded-For`'un ilk kaydında iletir. (DİKKAT: Cloudflare `X-Real-IP`'yi
// bağlanan IP'ye — yani proxy'ye — ezdiği için o header GÜVENİLMEZ.) Önünde
// proxy olmayan doğrudan erişimde CF-Connecting-IP'ye düşülür.
function clientIp(request) {
  const xff = request.headers.get("X-Forwarded-For") || "";
  const first = xff.split(",")[0].trim();
  if (first) return first;
  return request.headers.get("CF-Connecting-IP") || null;
}

// Dönüş: null (geç, CMS devam etsin) | Response (engellendi, bunu döndür)
// gopts.ignoreWhitelist: site bazlı ayar — açıksa IP_WHITELIST yok sayılır
// (muaf IP'ler de kapıya tabi olur; test için).
export async function runGate(request, env, gopts = {}) {
  const url = new URL(request.url);

  // Muaf yollar
  for (const p of BYPASS_PATHS) {
    if (url.pathname === p || url.pathname.startsWith(p + "/")) return null;
  }

  // Debug: /__info  (proxy sorgusu yapmaz) | /__info?check=1 (ham skoru gösterir)
  if (url.pathname === "/__info") {
    const info = await evaluate(request, env, { ...gopts, skipProxy: true });
    // Ham header'lar — proxy'nin hangi header ile ziyaretçi IP'sini ilettiğini
    // görmek için. `ip` = clientIp() ile çözülen gerçek ziyaretçi IP'si.
    info.cf_connecting_ip = request.headers.get("CF-Connecting-IP") || null;
    info.x_real_ip = request.headers.get("X-Real-IP") || null;
    info.x_forwarded_for = request.headers.get("X-Forwarded-For") || null;
    info.cf_country = request.cf?.country || null; // proxy'nin ülkesi (yanıltıcı)
    if (url.searchParams.get("check") === "1") {
      const ip = clientIp(request);
      info.proxycheck = await queryProxycheck(ip, env);
      info.whitelisted = IP_WHITELIST.includes(ip);
      // Gerçek kapıda ülke proxycheck'ten gelir; debug çıktısında da onu göster.
      if (info.proxycheck && info.proxycheck.isocode) info.country = info.proxycheck.isocode;
    }
    return json(info);
  }

  const info = await evaluate(request, env, gopts);
  if (info.allowed) return null; // geç

  const wantsHtml = (request.headers.get("Accept") || "").includes("text/html");
  return wantsHtml ? htmlMessage(info.failReason) : new Response("Forbidden", { status: 403 });
}

async function evaluate(request, env, opts = {}) {
  // Kurallar site bazlı (admin) opts'tan gelir; verilmezse dosyadaki sabit varsayılan.
  const reqMobile  = opts.requireMobile  ?? REQUIRE_MOBILE;
  const reqTurkish = opts.requireTurkish ?? REQUIRE_TURKISH;
  const reqCountry = (opts.requireCountry ?? (REQUIRE_COUNTRY != null)) ? REQUIRE_COUNTRY : null;
  const reqNoProxy = opts.requireNoProxy ?? REQUIRE_NO_PROXY;

  const ua = request.headers.get("User-Agent") || "";
  const chMobile = request.headers.get("Sec-CH-UA-Mobile");
  const isMobile = chMobile === "?1" || /Android|iPhone|iPad|iPod|Mobile|Windows Phone|Opera Mini/i.test(ua);

  const acceptLang = request.headers.get("Accept-Language") || "";
  const primaryLang = acceptLang.split(",")[0].trim().toLowerCase();
  const isTurkish = primaryLang.startsWith("tr");

  const ip = clientIp(request);
  // Proxy arkasında request.cf.country proxy'nin ülkesidir; gerçek ülke ziyaretçi
  // IP'sinden (proxycheck) gelir. Ham fallback yalnızca skipProxy modu içindir.
  let country = request.cf?.country || "XX";
  let failReason = null;
  let isProxy = false;

  if (reqMobile && !isMobile) failReason = "device";
  else if (reqTurkish && !isTurkish) failReason = "language";
  else if (!opts.skipProxy && (reqCountry || reqNoProxy)) {
    const v = await checkVisitor(ip, env, {
      ignoreWhitelist: opts.ignoreWhitelist,
      requireCountry: reqCountry,
      requireNoProxy: reqNoProxy,
    });
    if (v.country) country = v.country;
    if (v.reason) { failReason = v.reason; isProxy = v.reason === "proxy"; }
  }

  return {
    country,
    device: isMobile ? "mobile" : "desktop",
    language: primaryLang,
    isProxy,
    allowed: failReason === null,
    failReason,
    ip,
  };
}

function resolveKey(env) {
  return PROXYCHECK_KEY || (env && env.PROXYCHECK_KEY) || "";
}

async function queryProxycheck(ip, env) {
  const key = resolveKey(env);
  if (!key) return { ok: false, error: "no_key" };
  try {
    const api = `https://proxycheck.io/v2/${ip}?key=${key}&vpn=1&asn=1&risk=1`;
    const r = await fetch(api, { cf: { cacheTtl: 0 } });
    const data = await r.json();
    if (!data || data.status !== "ok") return { ok: false, error: "api_not_ok", raw: data };
    const e = data[ip] || {};
    return {
      ok: true,
      proxy: e.proxy === "yes",
      type: e.type || null,
      provider: e.provider || null,
      risk: typeof e.risk === "number" ? e.risk : null,
      isocode: e.isocode || null,
    };
  } catch (err) {
    return { ok: false, error: "fetch_failed" };
  }
}

// Gerçek ziyaretçi IP'si için birleşik ülke + proxy/VPN kararı. proxy arkasında
// request.cf.country güvenilmez olduğundan ülke de proxycheck'ten (isocode) gelir.
// Dönüş: { verdict:"allow", country } | { reason:"country"|"proxy", country }
async function checkVisitor(ip, env, opts = {}) {
  const reqCountry = opts.requireCountry;   // 'TR' | null
  const reqNoProxy = opts.requireNoProxy;   // bool
  if (!ip) return { reason: "proxy" };               // IP yoksa doğrulanamaz -> engelle
  if (!opts.ignoreWhitelist && IP_WHITELIST.includes(ip)) return { verdict: "allow" };
  if (!resolveKey(env)) return { reason: "proxy" };  // anahtar yoksa -> fail-closed

  // Cache anahtarı kural setini de içermeli (farklı sitelerde farklı kurallar).
  const cacheKey = `ipv:${ip}:${reqCountry || "-"}:${reqNoProxy ? 1 : 0}`;
  if (env.IPCACHE) {
    const cached = await env.IPCACHE.get(cacheKey);
    if (cached) { try { return JSON.parse(cached); } catch (e) { /* yok say */ } }
  }

  const q = await queryProxycheck(ip, env);
  if (!q.ok) return { reason: "proxy" };             // API hatası -> fail-closed

  let result;
  if (reqCountry && q.isocode && q.isocode !== reqCountry) {
    result = { reason: "country", country: q.isocode };
  } else if (reqNoProxy && q.proxy) {
    const type = (q.type || "").toLowerCase();
    const risk = q.risk === null ? 100 : q.risk;
    const isResidential = type.includes("residential") || type.includes("wireless") || type.includes("cgnat");
    const block = isResidential
      ? risk >= RESIDENTIAL_RISK_THRESHOLD
      : (DATACENTER_ALWAYS_BLOCK || risk >= DATACENTER_RISK_THRESHOLD);
    result = block
      ? { reason: "proxy", country: q.isocode }
      : { verdict: "allow", country: q.isocode };
  } else {
    result = { verdict: "allow", country: q.isocode };
  }

  if (env.IPCACHE) {
    await env.IPCACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_RESIDENTIAL_TTL });
  }
  return result;
}

const MESAJLAR = {
  device:   { tr: ["Yalnızca Mobil Cihazlar", "Bu site yalnızca mobil ziyaretçilere hizmet vermektedir. Lütfen telefonunuzdan veya tabletinizden erişiniz."],
              en: ["Mobile Devices Only", "This site serves mobile visitors only."] },
  language: { tr: ["Yalnızca Türkçe Hizmet", "Bu site yalnızca Türkçe bilen müşterilere hizmet vermektedir."],
              en: ["Turkish Language Only", "This site serves Turkish-speaking customers only."] },
  country:  { tr: ["Yalnızca Türkiye'den Erişim", "Bu siteye yalnızca Türkiye içinden erişilebilir."],
              en: ["Access from Turkey Only", "This site is accessible only from Turkey."] },
  proxy:    { tr: ["Bağlantı Doğrulanamadı", "Bu siteye VPN, proxy veya anonimleştirici bağlantılar üzerinden erişilemez. Lütfen normal internet bağlantınızla tekrar deneyiniz."],
              en: ["Connection Not Verified", "This site cannot be accessed through VPN or proxy connections."] },
  error:    { tr: ["Doğrulama Yapılamadı", "Ziyaretçi bilgileriniz doğrulanamadığı için erişim sağlanamıyor."],
              en: ["Verification Failed", "Access is unavailable because visitor information could not be verified."] },
};

function htmlMessage(reason) {
  const m = MESAJLAR[reason] || MESAJLAR.error;
  const body = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${m.tr[0]}</title></head>
<body style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;">
  <div style="text-align:center;padding:24px;max-width:460px;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="font-size:40px;margin-bottom:12px;">&#9888;&#65039;</div>
    <h2 style="margin:0 0 8px;font-size:20px;color:#222;">${m.tr[0]}</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.5;">${m.tr[1]}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
    <h3 style="margin:0 0 6px;font-size:16px;color:#444;">${m.en[0]}</h3>
    <p style="margin:0;font-size:13px;color:#777;line-height:1.5;">${m.en[1]}</p>
  </div>
</body></html>`;
  return new Response(body, { status: 403, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function json(obj) {
  return new Response(JSON.stringify(obj, null, 2), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
