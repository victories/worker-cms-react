import type { Post, Site } from '../../types';

/**
 * Contact Form Plugin
 *
 * Replaces the [contact-form] shortcode in post/page content with a
 * fully styled contact form. Includes optional math-based captcha and
 * client-side validation injected via the page.bodyEnd hook.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildContactFormHtml(
  formTitle: string,
  successMessage: string,
  enableCaptcha: boolean
): string {
  // Generate a simple math captcha
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const captchaAnswer = num1 + num2;

  const captchaField = enableCaptcha
    ? `
    <div style="margin-bottom:16px;">
      <label for="cf-captcha" style="display:block;margin-bottom:4px;font-weight:600;font-size:0.9em;color:#333;">
        What is ${num1} + ${num2}? <span style="color:#e53e3e;">*</span>
      </label>
      <input type="number" id="cf-captcha" name="captcha" required
        data-answer="${captchaAnswer}"
        style="width:100%;padding:10px 12px;border:1px solid #d0d0d0;border-radius:4px;font-size:0.95em;box-sizing:border-box;"
        placeholder="Enter your answer" />
      <div class="cf-error" data-field="captcha" style="color:#e53e3e;font-size:0.8em;margin-top:4px;display:none;"></div>
    </div>`
    : '';

  return `<div class="contact-form-container" style="
    max-width:600px;
    margin:24px auto;
    padding:24px;
    background:#fafafa;
    border:1px solid #e0e0e0;
    border-radius:8px;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  ">
  <h3 style="margin:0 0 20px 0;font-size:1.3em;color:#222;border-bottom:2px solid #4a90d9;padding-bottom:10px;">
    ${escapeHtml(formTitle)}
  </h3>

  <div class="cf-success-message" style="
    display:none;
    padding:16px;
    background:#c6f6d5;
    color:#22543d;
    border-radius:4px;
    margin-bottom:16px;
    font-weight:500;
  ">${escapeHtml(successMessage)}</div>

  <form class="contact-form" method="POST" action="/api/contact" novalidate>
    <div style="margin-bottom:16px;">
      <label for="cf-name" style="display:block;margin-bottom:4px;font-weight:600;font-size:0.9em;color:#333;">
        Name <span style="color:#e53e3e;">*</span>
      </label>
      <input type="text" id="cf-name" name="name" required
        style="width:100%;padding:10px 12px;border:1px solid #d0d0d0;border-radius:4px;font-size:0.95em;box-sizing:border-box;"
        placeholder="Your name" />
      <div class="cf-error" data-field="name" style="color:#e53e3e;font-size:0.8em;margin-top:4px;display:none;"></div>
    </div>

    <div style="margin-bottom:16px;">
      <label for="cf-email" style="display:block;margin-bottom:4px;font-weight:600;font-size:0.9em;color:#333;">
        Email <span style="color:#e53e3e;">*</span>
      </label>
      <input type="email" id="cf-email" name="email" required
        style="width:100%;padding:10px 12px;border:1px solid #d0d0d0;border-radius:4px;font-size:0.95em;box-sizing:border-box;"
        placeholder="your@email.com" />
      <div class="cf-error" data-field="email" style="color:#e53e3e;font-size:0.8em;margin-top:4px;display:none;"></div>
    </div>

    <div style="margin-bottom:16px;">
      <label for="cf-subject" style="display:block;margin-bottom:4px;font-weight:600;font-size:0.9em;color:#333;">
        Subject <span style="color:#e53e3e;">*</span>
      </label>
      <input type="text" id="cf-subject" name="subject" required
        style="width:100%;padding:10px 12px;border:1px solid #d0d0d0;border-radius:4px;font-size:0.95em;box-sizing:border-box;"
        placeholder="Message subject" />
      <div class="cf-error" data-field="subject" style="color:#e53e3e;font-size:0.8em;margin-top:4px;display:none;"></div>
    </div>

    <div style="margin-bottom:16px;">
      <label for="cf-message" style="display:block;margin-bottom:4px;font-weight:600;font-size:0.9em;color:#333;">
        Message <span style="color:#e53e3e;">*</span>
      </label>
      <textarea id="cf-message" name="message" required rows="5"
        style="width:100%;padding:10px 12px;border:1px solid #d0d0d0;border-radius:4px;font-size:0.95em;box-sizing:border-box;resize:vertical;"
        placeholder="Your message..."></textarea>
      <div class="cf-error" data-field="message" style="color:#e53e3e;font-size:0.8em;margin-top:4px;display:none;"></div>
    </div>

    ${captchaField}

    <button type="submit" style="
      display:inline-block;
      padding:12px 24px;
      background:#4a90d9;
      color:#fff;
      border:none;
      border-radius:4px;
      font-size:1em;
      font-weight:600;
      cursor:pointer;
      transition:background 0.2s;
    ">Send Message</button>
  </form>
</div>`;
}

function buildValidationScript(successMessage: string, enableCaptcha: boolean): string {
  return `<script>
(function() {
  // ── reCAPTCHA v3 auto-detection ──
  var __rcCfg = null;
  fetch('/api/contact/recaptcha-config')
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(d.success && d.data && d.data.enabled && d.data.onContact && d.data.siteKey){
        __rcCfg = d.data;
        var s = document.createElement('script');
        s.src = 'https://www.google.com/recaptcha/api.js?render=' + d.data.siteKey;
        document.head.appendChild(s);
      }
    }).catch(function(){});

  var forms = document.querySelectorAll('.contact-form');
  forms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var isValid = true;

      // Clear previous errors
      form.querySelectorAll('.cf-error').forEach(function(el) {
        el.style.display = 'none';
        el.textContent = '';
      });

      // Reset input borders
      form.querySelectorAll('input, textarea').forEach(function(el) {
        el.style.borderColor = '#d0d0d0';
      });

      // Validate required fields
      var fields = [
        { name: 'name', label: 'Name' },
        { name: 'email', label: 'Email' },
        { name: 'subject', label: 'Subject' },
        { name: 'message', label: 'Message' }
      ];

      fields.forEach(function(field) {
        var input = form.querySelector('[name="' + field.name + '"]');
        var error = form.querySelector('.cf-error[data-field="' + field.name + '"]');
        if (!input || !error) return;

        var value = input.value.trim();
        if (!value) {
          error.textContent = field.label + ' is required.';
          error.style.display = 'block';
          input.style.borderColor = '#e53e3e';
          isValid = false;
        } else if (field.name === 'email') {
          var emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
          if (!emailPattern.test(value)) {
            error.textContent = 'Please enter a valid email address.';
            error.style.display = 'block';
            input.style.borderColor = '#e53e3e';
            isValid = false;
          }
        }
      });

      ${enableCaptcha ? `
      // Validate math captcha (fallback when reCAPTCHA is not configured)
      var captchaInput = form.querySelector('[name="captcha"]');
      var captchaError = form.querySelector('.cf-error[data-field="captcha"]');
      if (captchaInput && captchaError) {
        var answer = parseInt(captchaInput.getAttribute('data-answer'), 10);
        var userAnswer = parseInt(captchaInput.value, 10);
        if (isNaN(userAnswer) || userAnswer !== answer) {
          captchaError.textContent = 'Incorrect answer. Please try again.';
          captchaError.style.display = 'block';
          captchaInput.style.borderColor = '#e53e3e';
          isValid = false;
        }
      }` : ''}

      if (!isValid) return;

      // Collect form data
      var formData = new FormData(form);
      var data = {};
      formData.forEach(function(value, key) { if(key !== 'captcha') data[key] = value; });

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
      }

      function __doSend(token) {
        if (token) data.recaptcha_token = token;
        fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(function(response) {
          if (response.ok) {
            var successEl = form.parentElement.querySelector('.cf-success-message');
            if (successEl) {
              successEl.style.display = 'block';
            }
            form.reset();
            form.style.display = 'none';
          } else {
            throw new Error('Submission failed');
          }
        })
        .catch(function(err) {
          console.error('[Contact Form] Submission error:', err);
          alert('There was an error sending your message. Please try again later.');
        })
        .finally(function() {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
          }
        });
      }

      // If reCAPTCHA v3 is enabled, get token first
      if (__rcCfg && typeof grecaptcha !== 'undefined') {
        grecaptcha.ready(function(){
          grecaptcha.execute(__rcCfg.siteKey, {action:'contact'}).then(__doSend);
        });
      } else {
        __doSend(null);
      }
    });
  });

  // Add focus/blur styling
  document.querySelectorAll('.contact-form input, .contact-form textarea').forEach(function(el) {
    el.addEventListener('focus', function() {
      this.style.borderColor = '#4a90d9';
      this.style.outline = 'none';
      this.style.boxShadow = '0 0 0 2px rgba(74,144,217,0.2)';
    });
    el.addEventListener('blur', function() {
      this.style.borderColor = '#d0d0d0';
      this.style.boxShadow = 'none';
    });
  });
})();
</script>`;
}

export function register(
  engine: { register: (slug: string, hook: string, handler: Function, priority?: number) => void },
  settings: Record<string, any>
): void {
  const SLUG = 'contact-form';

  const successMessage = settings.successMessage || 'Thank you for your message!';
  const formTitle = settings.formTitle || 'Contact Us';
  const enableCaptcha = settings.enableCaptcha === true;

  // ── Hook: post.beforeRender ──
  // Replace [contact-form] shortcode with rendered form HTML.
  engine.register(SLUG, 'post.beforeRender', (html: string, _post: Post): string => {
    if (!html || !html.includes('[contact-form]')) return html;

    const formHtml = buildContactFormHtml(formTitle, successMessage, enableCaptcha);
    return html.replace(/\[contact-form\]/g, formHtml);
  }, 15);

  // ── Hook: page.bodyEnd ──
  // Inject client-side form validation and submission handling.
  engine.register(SLUG, 'page.bodyEnd', (html: string, _site: Site): string => {
    const validationScript = buildValidationScript(successMessage, enableCaptcha);
    return html + validationScript;
  }, 15);
}
