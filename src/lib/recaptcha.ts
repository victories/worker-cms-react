/**
 * reCAPTCHA v3 verification utility
 * Verifies tokens via Google's siteverify API
 */

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export interface RecaptchaResult {
  success: boolean;
  score?: number;
  error?: string;
}

/**
 * Verify a reCAPTCHA v3 token with Google's API
 */
export async function verifyRecaptcha(
  secretKey: string,
  token: string,
  scoreThreshold: number = 0.5
): Promise<RecaptchaResult> {
  if (!secretKey || !token) {
    return { success: false, error: 'Missing reCAPTCHA secret key or token' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });

    const data = await response.json() as RecaptchaVerifyResponse;

    if (!data.success) {
      const errors = data['error-codes']?.join(', ') || 'Unknown error';
      return { success: false, score: data.score, error: `reCAPTCHA verification failed: ${errors}` };
    }

    // Check score threshold (v3 returns 0.0 - 1.0, higher = more likely human)
    if (data.score !== undefined && data.score < scoreThreshold) {
      return {
        success: false,
        score: data.score,
        error: `reCAPTCHA score too low: ${data.score} (threshold: ${scoreThreshold})`,
      };
    }

    return { success: true, score: data.score };
  } catch (err: any) {
    return { success: false, error: `reCAPTCHA verification error: ${err.message}` };
  }
}

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
