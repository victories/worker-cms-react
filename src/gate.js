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

// Dönüş: null (geç, CMS devam etsin) | Response (engellendi, bunu döndür)
export async function runGate(request, env) {
  const url = new URL(request.url);

  // Muaf yollar
  for (const p of BYPASS_PATHS) {
    if (url.pathname === p || url.pathname.startsWith(p + "/")) return null;
  }

  // Debug: /__info  (proxy sorgusu yapmaz) | /__info?check=1 (ham skoru gösterir)
  if (url.pathname === "/__info") {
    const info = await evaluate(request, env, { skipProxy: true });
    if (url.searchParams.get("check") === "1") {
      const ip = request.headers.get("CF-Connecting-IP");
      info.proxycheck = await queryProxycheck(ip, env);
      info.whitelisted = IP_WHITELIST.includes(ip);
    }
    return json(info);
  }

  const info = await evaluate(request, env);
  if (info.allowed) return null; // geç

  const wantsHtml = (request.headers.get("Accept") || "").includes("text/html");
  return wantsHtml ? htmlMessage(info.failReason) : new Response("Forbidden", { status: 403 });
}

async function evaluate(request, env, opts = {}) {
  const country = request.cf?.country || "XX";

  const ua = request.headers.get("User-Agent") || "";
  const chMobile = request.headers.get("Sec-CH-UA-Mobile");
  const isMobile = chMobile === "?1" || /Android|iPhone|iPad|iPod|Mobile|Windows Phone|Opera Mini/i.test(ua);

  const acceptLang = request.headers.get("Accept-Language") || "";
  const primaryLang = acceptLang.split(",")[0].trim().toLowerCase();
  const isTurkish = primaryLang.startsWith("tr");

  let failReason = null;
  let isProxy = false;

  if (REQUIRE_MOBILE && !isMobile) failReason = "device";
  else if (REQUIRE_TURKISH && !isTurkish) failReason = "language";
  else if (REQUIRE_COUNTRY && country !== REQUIRE_COUNTRY) failReason = "country";
  else if (REQUIRE_NO_PROXY && !opts.skipProxy) {
    const verdict = await checkProxy(request, env);
    if (verdict === "block") { failReason = "proxy"; isProxy = true; }
  }

  return {
    country,
    device: isMobile ? "mobile" : "desktop",
    language: primaryLang,
    isProxy,
    allowed: failReason === null,
    failReason,
    ip: request.headers.get("CF-Connecting-IP") || null,
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
    };
  } catch (err) {
    return { ok: false, error: "fetch_failed" };
  }
}

async function checkProxy(request, env) {
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return "block";
  if (IP_WHITELIST.includes(ip)) return "allow";
  if (!resolveKey(env)) return "block";

  if (env.IPCACHE) {
    const cached = await env.IPCACHE.get("ip:" + ip);
    if (cached === "block") return "block";
    if (cached === "allow") return "allow";
  }

  const q = await queryProxycheck(ip, env);
  if (!q.ok) return "block"; // fail-closed

  let verdict, ttl = CACHE_RESIDENTIAL_TTL;
  if (!q.proxy) {
    verdict = "allow";
  } else {
    const type = (q.type || "").toLowerCase();
    const risk = q.risk === null ? 100 : q.risk;
    const isResidential = type.includes("residential") || type.includes("wireless") || type.includes("cgnat");
    if (isResidential) {
      verdict = risk >= RESIDENTIAL_RISK_THRESHOLD ? "block" : "allow";
      ttl = CACHE_RESIDENTIAL_TTL;
    } else {
      const blockDc = DATACENTER_ALWAYS_BLOCK || risk >= DATACENTER_RISK_THRESHOLD;
      verdict = blockDc ? "block" : "allow";
      ttl = blockDc ? null : CACHE_RESIDENTIAL_TTL;
    }
  }

  if (env.IPCACHE) {
    const opts = ttl === null ? {} : { expirationTtl: ttl };
    await env.IPCACHE.put("ip:" + ip, verdict, opts);
  }
  return verdict;
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
