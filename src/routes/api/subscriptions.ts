import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { getMailSettings, sendEmailViaResend, buildSubscriptionEmail } from '../../lib/email';
import { verifyStripeSignature } from '../../lib/stripe-signature';
import { verifyCreemSignature } from '../../lib/creem-signature';
import { getCreemConfig } from '../../lib/creem';
import { recomputeUserEntitlements } from '../../lib/entitlements';

const subscriptions = new Hono<{ Bindings: Bindings; Variables: Variables }>();
subscriptions.use('*', authMiddleware);

// GET /api/subscriptions/my - Get current user's active subscription
subscriptions.get('/my', async (c) => {
  const user = c.get('user')!;

  const sub = await c.env.DB.prepare(
    `SELECT s.*, p.name as package_name, p.max_sites, p.max_storage_mb, p.max_posts_per_site, p.features as package_features, p.price_monthly, p.price_yearly, p.white_label
     FROM subscriptions s
     JOIN packages p ON s.package_id = p.id
     WHERE s.user_id = ? AND s.status = 'active'
     ORDER BY s.created_at DESC LIMIT 1`
  ).bind(user.sub).first();

  return c.json({ success: true, data: sub || null });
});

// GET /api/subscriptions/prorate - Calculate proration credit for upgrade
subscriptions.get('/prorate', async (c) => {
  const user = c.get('user')!;
  const targetPackageId = parseInt(c.req.query('package_id') || '0');
  const targetBillingPeriod = c.req.query('billing_period') || 'monthly';

  if (!targetPackageId) {
    return c.json({ success: false, error: 'package_id required' }, 400);
  }

  // Get target package
  const targetPkg = await c.env.DB.prepare(
    'SELECT * FROM packages WHERE id = ? AND is_active = 1'
  ).bind(targetPackageId).first<any>();
  if (!targetPkg) return c.json({ success: false, error: 'Paket bulunamadı' }, 404);

  // Get current active subscription
  const currentSub = await c.env.DB.prepare(
    `SELECT s.*, p.price_monthly, p.price_yearly, p.name as package_name
     FROM subscriptions s
     JOIN packages p ON s.package_id = p.id
     WHERE s.user_id = ? AND s.status = 'active'
     ORDER BY s.created_at DESC LIMIT 1`
  ).bind(user.sub).first<any>();

  const targetPrice = targetBillingPeriod === 'yearly' ? targetPkg.price_yearly : targetPkg.price_monthly;

  if (!currentSub) {
    // No active subscription — no credit
    return c.json({
      success: true,
      data: {
        has_active_sub: false,
        credit: 0,
        original_price: targetPrice,
        prorated_price: targetPrice,
        days_remaining: 0,
        total_days: 0,
        current_package_name: null,
      },
    });
  }

  // Calculate remaining days and credit
  const now = new Date();
  const periodEnd = new Date(currentSub.current_period_end);
  const periodStart = new Date(currentSub.current_period_start);

  const totalDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Price paid for the current subscription
  const currentPrice = currentSub.billing_period === 'yearly'
    ? parseFloat(currentSub.price_yearly || 0)
    : parseFloat(currentSub.price_monthly || 0);

  // Credit = (remaining days / total days) * price paid
  const credit = Math.round((daysRemaining / totalDays) * currentPrice * 100) / 100;

  // Prorated price = new package price - credit (minimum $0)
  const proratedPrice = Math.max(0, Math.round((targetPrice - credit) * 100) / 100);

  return c.json({
    success: true,
    data: {
      has_active_sub: true,
      credit: credit,
      original_price: targetPrice,
      prorated_price: proratedPrice,
      days_remaining: daysRemaining,
      total_days: totalDays,
      current_package_name: currentSub.package_name,
      current_package_id: currentSub.package_id,
      current_subscription_id: currentSub.id,
    },
  });
});

// POST /api/subscriptions/checkout - Create Stripe checkout session
subscriptions.post('/checkout', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{ package_id: number; billing_period: 'monthly' | 'yearly' }>();

  const pkg = await c.env.DB.prepare('SELECT * FROM packages WHERE id = ? AND is_active = 1').bind(body.package_id).first<any>();
  if (!pkg) return c.json({ success: false, error: 'Paket bulunamadı' }, 404);

  // Get Stripe secret key from global_settings
  const stripeKeyRow = await c.env.DB.prepare(
    "SELECT value FROM global_settings WHERE key = 'stripe_secret_key'"
  ).first<{ value: string }>();

  if (!stripeKeyRow?.value) {
    return c.json({ success: false, error: 'Stripe yapılandırılmamış' }, 500);
  }

  const priceId = body.billing_period === 'yearly' ? pkg.stripe_price_yearly_id : pkg.stripe_price_monthly_id;
  if (!priceId) {
    return c.json({ success: false, error: 'Bu paket için Stripe fiyatı tanımlanmamış' }, 400);
  }

  // Check if user already has a Stripe customer ID
  const existingSub = await c.env.DB.prepare(
    "SELECT stripe_customer_id FROM subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL ORDER BY id DESC LIMIT 1"
  ).bind(user.sub).first<{ stripe_customer_id: string }>();

  // Create Stripe Checkout Session
  const adminDomain = c.env.ADMIN_DOMAIN || '';
  const params: Record<string, string> = {
    'mode': 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'success_url': `https://${adminDomain}/admin/upgrade?success=1`,
    'cancel_url': `https://${adminDomain}/admin/upgrade?cancelled=1`,
    'metadata[user_id]': String(user.sub),
    'metadata[package_id]': String(body.package_id),
    'metadata[billing_period]': body.billing_period,
    'client_reference_id': String(user.sub),
  };

  if (existingSub?.stripe_customer_id) {
    params['customer'] = existingSub.stripe_customer_id;
  } else {
    params['customer_email'] = user.email;
  }

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKeyRow.value}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });

  const session = await stripeRes.json() as any;

  if (session.error) {
    return c.json({ success: false, error: session.error.message || 'Stripe hatası' }, 400);
  }

  return c.json({ success: true, data: { checkout_url: session.url, session_id: session.id } });
});

// POST /api/subscriptions/creem-checkout - Create a Creem.io checkout
// session and return its hosted checkout URL. Mirrors the Stripe flow;
// activation happens in handleCreemWebhook on `checkout.completed`.
subscriptions.post('/creem-checkout', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{ package_id: number; billing_period: 'monthly' | 'yearly' }>();

  const pkg = await c.env.DB.prepare('SELECT * FROM packages WHERE id = ? AND is_active = 1')
    .bind(body.package_id)
    .first<any>();
  if (!pkg) return c.json({ success: false, error: 'Paket bulunamadı' }, 404);

  const cfg = await getCreemConfig(c.env.DB);
  if (!cfg.apiKey) return c.json({ success: false, error: 'Creem yapılandırılmamış' }, 500);

  const productId =
    body.billing_period === 'yearly' ? pkg.creem_product_yearly_id : pkg.creem_product_monthly_id;
  if (!productId) {
    return c.json({ success: false, error: 'Bu paket için Creem ürünü tanımlanmamış' }, 400);
  }

  const adminDomain = c.env.ADMIN_DOMAIN || '';
  const res = await fetch(`${cfg.baseUrl}/v1/checkouts`, {
    method: 'POST',
    headers: { 'x-api-key': cfg.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: productId,
      // request_id is echoed back on the webhook; metadata carries the
      // routing info we need to activate the right user's subscription.
      request_id: `${user.sub}_${body.package_id}_${body.billing_period}`,
      success_url: `https://${adminDomain}/admin/upgrade?success=1`,
      customer: { email: user.email },
      metadata: {
        user_id: String(user.sub),
        package_id: String(body.package_id),
        billing_period: body.billing_period,
      },
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok || !data?.checkout_url) {
    return c.json(
      { success: false, error: data?.message || data?.error || 'Creem hatası' },
      400
    );
  }

  return c.json({ success: true, data: { checkout_url: data.checkout_url, checkout_id: data.id } });
});

// POST /api/subscriptions/addon-checkout - Create a Creem.io checkout for an
// add-on. Mirrors /creem-checkout; activation happens in handleCreemWebhook on
// `checkout.completed` when metadata.kind === 'addon'.
subscriptions.post('/addon-checkout', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{ addon_id: number; units?: number; billing_period: 'monthly' | 'yearly' }>();
  const addon = await c.env.DB.prepare('SELECT * FROM addons WHERE id = ? AND is_active = 1').bind(body.addon_id).first<any>();
  if (!addon) return c.json({ success: false, error: 'Eklenti bulunamadı' }, 404);

  const cfg = await getCreemConfig(c.env.DB);
  if (!cfg.apiKey) return c.json({ success: false, error: 'Creem yapılandırılmamış' }, 500);
  const productId = body.billing_period === 'yearly' ? addon.creem_product_yearly_id : addon.creem_product_monthly_id;
  if (!productId) return c.json({ success: false, error: 'Bu eklenti için Creem ürünü tanımlanmamış' }, 400);

  const units = addon.type === 'unit' ? Math.max(1, Math.min(addon.max_units || 9999, body.units || 1)) : 1;
  const adminDomain = c.env.ADMIN_DOMAIN || '';
  const res = await fetch(`${cfg.baseUrl}/v1/checkouts`, {
    method: 'POST',
    headers: { 'x-api-key': cfg.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: productId,
      units,
      request_id: `${user.sub}_addon${body.addon_id}_${body.billing_period}`,
      success_url: `https://${adminDomain}/admin/upgrade?success=1`,
      customer: { email: user.email },
      metadata: { user_id: String(user.sub), addon_id: String(body.addon_id), units: String(units), billing_period: body.billing_period, kind: 'addon' },
    }),
  });
  const data = (await res.json()) as any;
  if (!res.ok || !data?.checkout_url) return c.json({ success: false, error: data?.message || 'Creem hatası' }, 400);
  return c.json({ success: true, data: { checkout_url: data.checkout_url } });
});

// POST /api/subscriptions/crypto - Submit crypto payment
subscriptions.post('/crypto', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{
    package_id: number;
    billing_period: 'monthly' | 'yearly';
    chain: string;
    tx_hash: string;
  }>();

  const pkg = await c.env.DB.prepare('SELECT * FROM packages WHERE id = ? AND is_active = 1').bind(body.package_id).first<any>();
  if (!pkg) return c.json({ success: false, error: 'Paket bulunamadı' }, 404);
  if (!pkg.crypto_enabled) return c.json({ success: false, error: 'Bu paket için crypto ödeme kapalı' }, 400);

  const price = body.billing_period === 'yearly' ? pkg.price_yearly : pkg.price_monthly;

  // Check for active subscription and calculate proration
  const currentSub = await c.env.DB.prepare(
    `SELECT s.*, p.price_monthly, p.price_yearly
     FROM subscriptions s
     JOIN packages p ON s.package_id = p.id
     WHERE s.user_id = ? AND s.status = 'active'
     ORDER BY s.created_at DESC LIMIT 1`
  ).bind(user.sub).first<any>();

  let credit = 0;
  let actualAmount = price;

  if (currentSub) {
    const now2 = new Date();
    const periodEnd2 = new Date(currentSub.current_period_end);
    const periodStart2 = new Date(currentSub.current_period_start);
    const totalDays = Math.max(1, Math.ceil((periodEnd2.getTime() - periodStart2.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((periodEnd2.getTime() - now2.getTime()) / (1000 * 60 * 60 * 24)));
    const currentPrice = currentSub.billing_period === 'yearly'
      ? parseFloat(currentSub.price_yearly || 0)
      : parseFloat(currentSub.price_monthly || 0);
    credit = Math.round((daysRemaining / totalDays) * currentPrice * 100) / 100;
    actualAmount = Math.max(0, Math.round((price - credit) * 100) / 100);
  }

  // Calculate period
  const now = new Date();
  const periodEnd = new Date(now);
  if (body.billing_period === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Create subscription with pending_crypto status (super_admin will approve)
  const result = await c.env.DB.prepare(
    `INSERT INTO subscriptions (user_id, package_id, status, billing_period, payment_method, crypto_tx_hash, crypto_chain, crypto_amount, current_period_start, current_period_end) VALUES (?, ?, 'pending_crypto', ?, 'crypto', ?, ?, ?, ?, ?) RETURNING *`
  ).bind(
    user.sub,
    body.package_id,
    body.billing_period,
    body.tx_hash,
    body.chain,
    String(actualAmount),
    now.toISOString(),
    periodEnd.toISOString()
  ).first();

  // Send notification email to super admins
  try {
    const mailSettings = await getMailSettings(c.env.DB, c.env.RESEND_API_KEY);
    console.log('[CryptoPayment] Mail settings:', { enabled: mailSettings.enabled, hasApiKey: !!mailSettings.apiKey, apiKeyPrefix: mailSettings.apiKey?.substring(0, 10), fromAddress: mailSettings.fromAddress });
    if (mailSettings.enabled && mailSettings.apiKey) {
      const admins = await c.env.DB.prepare(
        "SELECT email FROM users WHERE role = 'super_admin'"
      ).all<{ email: string }>();
      console.log('[CryptoPayment] Super admins:', admins.results?.map((a: any) => a.email));

      const chainLabel = body.chain.toUpperCase();
      const explorerUrls: Record<string, string> = {
        ethereum: `https://etherscan.io/tx/${body.tx_hash}`,
        bsc: `https://bscscan.com/tx/${body.tx_hash}`,
        polygon: `https://polygonscan.com/tx/${body.tx_hash}`,
        arbitrum: `https://arbiscan.io/tx/${body.tx_hash}`,
        optimism: `https://optimistic.etherscan.io/tx/${body.tx_hash}`,
        avalanche: `https://snowtrace.io/tx/${body.tx_hash}`,
        solana: `https://solscan.io/tx/${body.tx_hash}`,
        tron: `https://tronscan.org/#/transaction/${body.tx_hash}`,
      };
      const explorerUrl = explorerUrls[body.chain] || '#';
      const txHashShort = body.tx_hash.length > 20 ? body.tx_hash.substring(0, 10) + '...' + body.tx_hash.substring(body.tx_hash.length - 10) : body.tx_hash;

      const emailHtml = `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
          <h2 style="color:#f59e0b">Yeni Crypto Odeme Bildirimi</h2>
          <p>Bir kullanici crypto odeme gonderdi. Lutfen kontrol edip onaylayin.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">Kullanici</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${user.email}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">Paket</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${pkg.name}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">Tutar</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">$${actualAmount} USDT/USDC${credit > 0 ? ` (Orijinal: $${price}, Kredi: -$${credit})` : ''}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">Ag</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${chainLabel}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600">Donem</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${body.billing_period === 'yearly' ? 'Yillik' : 'Aylik'}</td></tr>
            <tr><td style="padding:8px;font-weight:600">TX Hash</td><td style="padding:8px;word-break:break-all;font-family:monospace;font-size:12px"><a href="${explorerUrl}" style="color:#2563eb;text-decoration:underline">${body.tx_hash}</a></td></tr>
          </table>
          <div style="margin-top:16px;display:flex;gap:8px">
            <a href="${explorerUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Explorer'da Dogrula</a>
            <a href="https://${c.env.ADMIN_DOMAIN || ''}/admin/packages" style="display:inline-block;background:#f59e0b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Odemeleri Yonet</a>
          </div>
        </div>
      `;

      for (const admin of admins.results || []) {
        console.log('[CryptoPayment] Sending email to:', admin.email);
        const emailResult = await sendEmailViaResend(mailSettings.apiKey, {
          to: admin.email,
          from: `${mailSettings.fromName || 'WP-CMS'} <${mailSettings.fromAddress}>`,
          subject: `Yeni Crypto Odeme - ${pkg.name}`,
          html: emailHtml,
        });
        console.log('[CryptoPayment] Email result for', admin.email, ':', JSON.stringify(emailResult));
      }
    } else {
      console.log('[CryptoPayment] Email skipped - enabled:', mailSettings.enabled, 'hasKey:', !!mailSettings.apiKey);
    }
  } catch (emailErr: any) {
    console.error('[CryptoPayment] Email error:', emailErr?.message, emailErr?.stack);
  }

  return c.json({ success: true, data: result });
});

// POST /api/subscriptions/assign - Super admin assigns package to user
subscriptions.post('/assign', requireRole('super_admin'), async (c) => {
  const admin = c.get('user')!;
  const body = await c.req.json<{
    user_id: number;
    package_id: number;
    billing_period?: 'monthly' | 'yearly';
    duration_days?: number;
  }>();

  const pkg = await c.env.DB.prepare('SELECT * FROM packages WHERE id = ?').bind(body.package_id).first<any>();
  if (!pkg) return c.json({ success: false, error: 'Paket bulunamadı' }, 404);

  // Mark existing active subscription as 'upgraded'
  await c.env.DB.prepare(
    "UPDATE subscriptions SET status = 'upgraded', updated_at = datetime('now') WHERE user_id = ? AND status = 'active'"
  ).bind(body.user_id).run();

  const now = new Date();
  const periodEnd = new Date(now);
  const period = body.billing_period || 'monthly';
  if (body.duration_days) {
    periodEnd.setDate(periodEnd.getDate() + body.duration_days);
  } else if (period === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO subscriptions (user_id, package_id, status, billing_period, payment_method, current_period_start, current_period_end, assigned_by) VALUES (?, ?, 'active', ?, 'manual', ?, ?, ?) RETURNING *`
  ).bind(
    body.user_id,
    body.package_id,
    period,
    now.toISOString(),
    periodEnd.toISOString(),
    admin.sub
  ).first();

  // Update user's package_id and max_sites
  await c.env.DB.prepare(
    'UPDATE users SET package_id = ?, max_sites = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(body.package_id, pkg.max_sites, body.user_id).run();

  // Send confirmation email
  try {
    const userInfo = await c.env.DB.prepare('SELECT email, display_name FROM users WHERE id = ?').bind(body.user_id).first<any>();
    if (userInfo) {
      const mailSettings = await getMailSettings(c.env.DB, c.env.RESEND_API_KEY);
      if (mailSettings.enabled && mailSettings.apiKey) {
        const html = buildSubscriptionEmail({
          userName: userInfo.display_name || userInfo.email,
          packageName: pkg.name || 'Unknown',
          billingPeriod: period,
          periodEnd: periodEnd.toLocaleDateString('tr-TR'),
          paymentMethod: 'manual',
        });
        await sendEmailViaResend(mailSettings.apiKey, {
          to: userInfo.email,
          from: `${mailSettings.fromName || 'WP-CMS'} <${mailSettings.fromAddress}>`,
          subject: '🎉 Aboneliğiniz Aktif / Your Subscription is Active',
          html,
        });
      }
    }
  } catch (emailErr) {
    console.error('Failed to send subscription email:', emailErr);
  }

  return c.json({ success: true, data: result }, 201);
});

// GET /api/subscriptions/pending - List pending crypto payments (super_admin)
subscriptions.get('/pending', requireRole('super_admin'), async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT s.*, p.name as package_name, u.email as user_email, u.display_name as user_name
     FROM subscriptions s
     JOIN packages p ON s.package_id = p.id
     JOIN users u ON s.user_id = u.id
     WHERE s.status = 'pending_crypto'
     ORDER BY s.created_at DESC`
  ).all();
  return c.json({ success: true, data: result.results });
});

// POST /api/subscriptions/:id/approve - Approve crypto payment (super_admin)
subscriptions.post('/:id/approve', requireRole('super_admin'), async (c) => {
  const id = parseInt(c.req.param('id'));

  const sub = await c.env.DB.prepare(
    "SELECT * FROM subscriptions WHERE id = ? AND status = 'pending_crypto'"
  ).bind(id).first<any>();

  if (!sub) return c.json({ success: false, error: 'Bekleyen ödeme bulunamadı' }, 404);

  // Mark existing active subscription as 'upgraded' (not cancelled or rejected)
  await c.env.DB.prepare(
    "UPDATE subscriptions SET status = 'upgraded', updated_at = datetime('now') WHERE user_id = ? AND status = 'active'"
  ).bind(sub.user_id).run();

  // Activate this subscription
  await c.env.DB.prepare(
    "UPDATE subscriptions SET status = 'active', updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();

  // Get package info and update user
  const pkg = await c.env.DB.prepare('SELECT * FROM packages WHERE id = ?').bind(sub.package_id).first<any>();
  if (pkg) {
    await c.env.DB.prepare(
      'UPDATE users SET package_id = ?, max_sites = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(sub.package_id, pkg.max_sites, sub.user_id).run();
  }

  // Send confirmation email
  try {
    const userInfo = await c.env.DB.prepare('SELECT email, display_name FROM users WHERE id = ?').bind(sub.user_id).first<any>();
    if (userInfo) {
      const mailSettings = await getMailSettings(c.env.DB, c.env.RESEND_API_KEY);
      if (mailSettings.enabled && mailSettings.apiKey) {
        const html = buildSubscriptionEmail({
          userName: userInfo.display_name || userInfo.email,
          packageName: pkg?.name || 'Unknown',
          billingPeriod: sub.billing_period,
          periodEnd: new Date(sub.current_period_end).toLocaleDateString('tr-TR'),
          paymentMethod: 'crypto',
        });
        await sendEmailViaResend(mailSettings.apiKey, {
          to: userInfo.email,
          from: `${mailSettings.fromName || 'WP-CMS'} <${mailSettings.fromAddress}>`,
          subject: '🎉 Aboneliğiniz Aktif / Your Subscription is Active',
          html,
        });
      }
    }
  } catch (emailErr) {
    console.error('Failed to send subscription email:', emailErr);
  }

  return c.json({ success: true, data: { message: 'Ödeme onaylandı ve abonelik aktif' } });
});

// POST /api/subscriptions/:id/reject - Reject crypto payment (super_admin)
subscriptions.post('/:id/reject', requireRole('super_admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  await c.env.DB.prepare(
    "UPDATE subscriptions SET status = 'rejected', updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();
  return c.json({ success: true, data: { message: 'Ödeme reddedildi' } });
});

// GET /api/subscriptions/all - List all subscriptions (super_admin)
subscriptions.get('/all', requireRole('super_admin'), async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT s.*, p.name as package_name, u.email as user_email, u.display_name as user_name
     FROM subscriptions s
     JOIN packages p ON s.package_id = p.id
     JOIN users u ON s.user_id = u.id
     ORDER BY s.created_at DESC
     LIMIT 100`
  ).all();
  return c.json({ success: true, data: result.results });
});

// Stripe webhook handler (no auth — must be verified by HMAC signature).
//
// Stripe sends a `Stripe-Signature` header of the form:
//   t=<timestamp>,v1=<hex hmac sha256 of `${timestamp}.${rawBody}`>,v1=<...>
// We compute the HMAC with the configured webhook secret and reject the
// request if no v1 candidate matches in constant time. Without this check,
// anyone can POST fake events and grant themselves subscriptions.
export async function handleStripeWebhook(c: any) {
  const db: D1Database = c.env.DB;
  const stripeKeyRow = await db.prepare(
    "SELECT value FROM global_settings WHERE key = 'stripe_webhook_secret'"
  ).first<{ value: string }>();

  if (!stripeKeyRow?.value) {
    console.error('Stripe webhook secret not configured');
    return c.json({ error: 'Webhook secret not configured' }, 500);
  }

  const body = await c.req.text();
  const sigHeader = c.req.header('stripe-signature') || '';

  const verified = await verifyStripeSignature(body, sigHeader, stripeKeyRow.value);
  if (!verified) {
    console.warn('Stripe webhook signature verification failed');
    return c.json({ error: 'Invalid signature' }, 400);
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = parseInt(session.metadata?.user_id || session.client_reference_id);
    const packageId = parseInt(session.metadata?.package_id);
    const billingPeriod = session.metadata?.billing_period || 'monthly';
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    if (!userId || !packageId) return c.json({ received: true });

    // Mark existing active subscriptions as 'upgraded'
    await db.prepare(
      "UPDATE subscriptions SET status = 'upgraded', updated_at = datetime('now') WHERE user_id = ? AND status = 'active'"
    ).bind(userId).run();

    // Create subscription
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingPeriod === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    await db.prepare(
      `INSERT INTO subscriptions (user_id, package_id, status, billing_period, payment_method, stripe_subscription_id, stripe_customer_id, current_period_start, current_period_end) VALUES (?, ?, 'active', ?, 'stripe', ?, ?, ?, ?)`
    ).bind(userId, packageId, billingPeriod, subscriptionId, customerId, now.toISOString(), periodEnd.toISOString()).run();

    // Update user
    const pkg = await db.prepare('SELECT max_sites FROM packages WHERE id = ?').bind(packageId).first<any>();
    await db.prepare(
      'UPDATE users SET package_id = ?, max_sites = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(packageId, pkg?.max_sites || 1, userId).run();

    // Send confirmation email
    try {
      const userInfo = await db.prepare('SELECT email, display_name FROM users WHERE id = ?').bind(userId).first<any>();
      const mailSettings = await getMailSettings(db, c.env.RESEND_API_KEY);
      if (userInfo && mailSettings.enabled && mailSettings.apiKey) {
        const pkgName = pkg ? (await db.prepare('SELECT name FROM packages WHERE id = ?').bind(packageId).first<any>())?.name : 'Unknown';
        const emailHtml = buildSubscriptionEmail({
          userName: userInfo.display_name || userInfo.email,
          packageName: pkgName || 'Unknown',
          billingPeriod: billingPeriod,
          periodEnd: periodEnd.toLocaleDateString('tr-TR'),
          paymentMethod: 'stripe',
        });
        await sendEmailViaResend(mailSettings.apiKey, {
          to: userInfo.email,
          from: `${mailSettings.fromName || 'WP-CMS'} <${mailSettings.fromAddress}>`,
          subject: '🎉 Aboneliğiniz Aktif / Your Subscription is Active',
          html: emailHtml,
        });
      }
    } catch (emailErr) {
      console.error('Failed to send subscription email:', emailErr);
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    if (subscriptionId) {
      // Renew: update period end
      const sub = await db.prepare(
        "SELECT * FROM subscriptions WHERE stripe_subscription_id = ?"
      ).bind(subscriptionId).first<any>();
      if (sub) {
        const periodEnd = new Date();
        if (sub.billing_period === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        else periodEnd.setMonth(periodEnd.getMonth() + 1);
        await db.prepare(
          "UPDATE subscriptions SET current_period_end = ?, status = 'active', updated_at = datetime('now') WHERE id = ?"
        ).bind(periodEnd.toISOString(), sub.id).run();
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    await db.prepare(
      "UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now') WHERE stripe_subscription_id = ?"
    ).bind(subscription.id).run();
  }

  return c.json({ received: true });
}

// Creem.io webhook handler (no auth — verified by HMAC signature).
//
// Creem signs the raw body with HMAC-SHA256 and sends the hex digest in
// the `creem-signature` header. The event shape is
// `{ eventType, object: { ..., metadata, customer, subscription } }`.
// Activation mirrors the Stripe flow: checkout.completed creates the
// subscription, subscription.paid renews it, and cancel/expire ends it.
export async function handleCreemWebhook(c: any) {
  const db: D1Database = c.env.DB;
  const cfg = await getCreemConfig(db);
  if (!cfg.webhookSecret) {
    console.error('Creem webhook secret not configured');
    return c.json({ error: 'Webhook secret not configured' }, 500);
  }

  const rawBody = await c.req.text();
  const sig = c.req.header('creem-signature') || '';
  const ok = await verifyCreemSignature(rawBody, sig, cfg.webhookSecret);
  if (!ok) {
    console.warn('Creem webhook signature verification failed');
    return c.json({ error: 'Invalid signature' }, 400);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const type: string = event.eventType || event.type || '';
  const obj: any = event.object || {};
  const meta: any = obj.metadata || {};
  const userId = parseInt(meta.user_id || '0');
  const packageId = parseInt(meta.package_id || '0');
  const billingPeriod = meta.billing_period === 'yearly' ? 'yearly' : 'monthly';
  const creemSubId =
    typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id || null;
  const creemCustId =
    typeof obj.customer === 'string' ? obj.customer : obj.customer?.id || null;
  const creemCheckoutId = typeof obj.id === 'string' ? obj.id : null;

  // Add-on checkout — handle and early-return BEFORE the package branch so
  // the base-plan logic never runs for add-on purchases.
  if (type === 'checkout.completed' && meta.kind === 'addon') {
    const addonId = parseInt(meta.addon_id || '0');
    const units = parseInt(meta.units || '1');
    if (!userId || !addonId) return c.json({ received: true });
    if (creemCheckoutId) {
      const dupe = await db.prepare('SELECT id FROM user_addons WHERE creem_checkout_id = ?').bind(creemCheckoutId).first();
      if (dupe) return c.json({ received: true });
    }
    const now = new Date(); const periodEnd = new Date(now);
    if (billingPeriod === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1); else periodEnd.setMonth(periodEnd.getMonth() + 1);
    await db.prepare(
      `INSERT INTO user_addons (user_id, addon_id, units, billing_period, status, creem_checkout_id, creem_subscription_id, creem_customer_id, current_period_start, current_period_end)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`
    ).bind(userId, addonId, units, billingPeriod, creemCheckoutId, creemSubId, creemCustId, now.toISOString(), periodEnd.toISOString()).run();
    await recomputeUserEntitlements(db, userId);
    return c.json({ received: true });
  }

  if (type === 'checkout.completed') {
    if (!userId || !packageId) return c.json({ received: true });

    // Idempotency — Creem may retry deliveries; never double-activate.
    if (creemCheckoutId) {
      const dupe = await db
        .prepare('SELECT id FROM subscriptions WHERE creem_checkout_id = ?')
        .bind(creemCheckoutId)
        .first();
      if (dupe) return c.json({ received: true });
    }

    await db
      .prepare(
        "UPDATE subscriptions SET status = 'upgraded', updated_at = datetime('now') WHERE user_id = ? AND status = 'active'"
      )
      .bind(userId)
      .run();

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingPeriod === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    await db
      .prepare(
        `INSERT INTO subscriptions (user_id, package_id, status, billing_period, payment_method, creem_checkout_id, creem_subscription_id, creem_customer_id, current_period_start, current_period_end) VALUES (?, ?, 'active', ?, 'creem', ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        packageId,
        billingPeriod,
        creemCheckoutId,
        creemSubId,
        creemCustId,
        now.toISOString(),
        periodEnd.toISOString()
      )
      .run();

    const pkg = await db
      .prepare('SELECT max_sites, name FROM packages WHERE id = ?')
      .bind(packageId)
      .first<any>();
    await db
      .prepare(
        "UPDATE users SET package_id = ?, max_sites = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(packageId, pkg?.max_sites || 1, userId)
      .run();

    try {
      const userInfo = await db
        .prepare('SELECT email, display_name FROM users WHERE id = ?')
        .bind(userId)
        .first<any>();
      const mailSettings = await getMailSettings(db, c.env.RESEND_API_KEY);
      if (userInfo && mailSettings.enabled && mailSettings.apiKey) {
        const emailHtml = buildSubscriptionEmail({
          userName: userInfo.display_name || userInfo.email,
          packageName: pkg?.name || 'Unknown',
          billingPeriod,
          periodEnd: periodEnd.toLocaleDateString('tr-TR'),
          paymentMethod: 'creem',
        });
        await sendEmailViaResend(mailSettings.apiKey, {
          to: userInfo.email,
          from: `${mailSettings.fromName || 'WP-CMS'} <${mailSettings.fromAddress}>`,
          subject: '🎉 Aboneliğiniz Aktif / Your Subscription is Active',
          html: emailHtml,
        });
      }
    } catch (emailErr) {
      console.error('Failed to send subscription email:', emailErr);
    }
  }

  if (type === 'subscription.paid' && creemSubId) {
    // Renewal — extend only when the period is actually near/past its end,
    // so the invoice that accompanies the initial checkout doesn't grant a
    // second period on top of the one checkout.completed just created.
    const sub = await db
      .prepare("SELECT * FROM subscriptions WHERE creem_subscription_id = ? AND status = 'active'")
      .bind(creemSubId)
      .first<any>();
    if (sub) {
      const currentEnd = new Date(sub.current_period_end).getTime();
      const soon = Date.now() + 3 * 24 * 60 * 60 * 1000;
      if (currentEnd <= soon) {
        const periodEnd = new Date();
        if (sub.billing_period === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        else periodEnd.setMonth(periodEnd.getMonth() + 1);
        await db
          .prepare(
            "UPDATE subscriptions SET current_period_end = ?, status = 'active', updated_at = datetime('now') WHERE id = ?"
          )
          .bind(periodEnd.toISOString(), sub.id)
          .run();
      }
    }
  }

  if ((type === 'subscription.canceled' || type === 'subscription.expired') && creemSubId) {
    await db
      .prepare(
        "UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now') WHERE creem_subscription_id = ?"
      )
      .bind(creemSubId)
      .run();
  }

  // Add-on cancel/expire — runs in addition to the base-plan cancel branch
  // above; keys on creem_subscription_id in the user_addons table.
  if ((type === 'subscription.canceled' || type === 'subscription.expired') && creemSubId) {
    const ua = await db.prepare("SELECT user_id FROM user_addons WHERE creem_subscription_id = ? AND status = 'active'").bind(creemSubId).first<{ user_id: number }>();
    if (ua) {
      await db.prepare("UPDATE user_addons SET status = 'cancelled', updated_at = datetime('now') WHERE creem_subscription_id = ?").bind(creemSubId).run();
      await recomputeUserEntitlements(db, ua.user_id);
    }
  }

  return c.json({ received: true });
}

// Exported function for cron: expire subscriptions
export async function expireSubscriptions(db: D1Database) {
  const now = new Date().toISOString();
  // Find active one-off subscriptions past their period end. Recurring
  // providers (Stripe, Creem) renew/cancel via webhook, so they're excluded.
  const expired = await db.prepare(
    "SELECT s.id, s.user_id FROM subscriptions s WHERE s.status = 'active' AND s.payment_method NOT IN ('stripe', 'creem') AND s.current_period_end < ?"
  ).bind(now).all<{ id: number; user_id: number }>();

  for (const sub of expired.results || []) {
    await db.prepare(
      "UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE id = ?"
    ).bind(sub.id).run();
    // Reset user's package
    await db.prepare(
      "UPDATE users SET package_id = NULL, max_sites = 1, updated_at = datetime('now') WHERE id = ?"
    ).bind(sub.user_id).run();
  }
}

export default subscriptions;
