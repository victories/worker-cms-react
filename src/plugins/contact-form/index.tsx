/**
 * Contact Form Plugin — v2.
 *
 * Under the v2 API the form HTML is produced by the
 * `[iletisim-formu]` / `[contact-form]` shortcode renderer in
 * `src/lib/shortcodes/renderers/iletisim-formu.ts` — shadcn-styled
 * Tailwind classes, inline submit handler, optional reCAPTCHA v3.
 * The `/api/contact` route handler reads this plugin's per-site
 * settings (recipientEmail, senderEmail, formTitle, successMessage)
 * directly from D1 when delivering a submission.
 *
 * Because the shortcode + API handler cover the entire functional
 * surface, this `register()` function doesn't add any render hooks —
 * it exists so the built-in plugin registry can resolve the module
 * for `plugins/contact-form`. Keeping the plugin row active in
 * `site_plugins` is what toggles the shortcode on (via reCAPTCHA
 * lookups + email delivery) without any code-level branching.
 */

export function register(
  _engine: {
    register: (
      slug: string,
      hook: string,
      handler: Function,
      priority?: number
    ) => void;
  },
  _settings: Record<string, any>
): void {
  // intentional no-op — see module docstring.
}
