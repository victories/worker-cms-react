import { registerShortcode, getShortcodeRenderer } from '../registry';
import { getRecaptchaSettings } from '../../recaptcha';

/**
 * [iletisim-formu] / [contact-form] shortcode renderer.
 *
 * Emits a contact form styled with the same Tailwind / shadcn utility
 * classes used elsewhere in the publisher theme (no inline styles),
 * plus a tiny inline submit handler that POSTs to `/api/contact`.
 *
 * The recipient email, subject template etc. are resolved server-side
 * in `/api/contact` — this renderer does not need them. Only the
 * reCAPTCHA site key has to reach the client, so we embed it as a
 * `data-rc-key` attribute and load `api.js?render=...` lazily.
 *
 * Faz 7: moved from hand-written inline CSS (`.sc-contact-form`) to
 * full Tailwind classes so the form inherits the active shadcn palette
 * without any bespoke stylesheet.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Shadcn-style utility class bundles used by the emitted HTML.
// Keep them here (not inlined below) so the Tailwind content scanner
// picks them up as part of the source file and doesn't tree-shake
// anything away when this shortcode is the only consumer.
const INPUT_CLS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
  'ring-offset-background placeholder:text-muted-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const TEXTAREA_CLS = INPUT_CLS + ' min-h-[120px] resize-y';

const LABEL_CLS = 'mb-1 block text-xs font-medium text-foreground/80';

const BUTTON_CLS =
  'inline-flex h-10 items-center justify-center gap-2 rounded-md ' +
  'bg-primary px-4 text-sm font-medium text-primary-foreground shadow ' +
  'transition-colors hover:bg-primary/90 disabled:pointer-events-none ' +
  'disabled:opacity-50';

const CARD_CLS =
  'sc-contact-form rounded-lg border border-border bg-card p-5 text-card-foreground ' +
  'shadow-sm max-w-xl my-6';

const MSG_SUCCESS_CLS =
  'mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 ' +
  'dark:border-green-900 dark:bg-green-950 dark:text-green-300';

const MSG_ERROR_CLS =
  'mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 ' +
  'dark:border-red-900 dark:bg-red-950 dark:text-red-300';

registerShortcode('iletisim-formu', async (params, _inner, ctx) => {
  const tr = ctx.lang === 'tr';
  const baslik =
    params.baslik || params.title || (tr ? 'Bize Ulaşın' : 'Contact Us');

  const labels = {
    name: tr ? 'Adınız' : 'Your Name',
    email: tr ? 'E-posta' : 'Email',
    subject: tr ? 'Konu' : 'Subject',
    message: tr ? 'Mesajınız' : 'Your Message',
    send: tr ? 'Gönder' : 'Send',
    success: tr ? 'Mesajınız gönderildi!' : 'Your message has been sent!',
    error: tr
      ? 'Bir hata oluştu. Tekrar deneyin.'
      : 'An error occurred. Please try again.',
  };

  const recaptcha = await getRecaptchaSettings(ctx.db, ctx.siteId);
  const useRecaptcha = recaptcha.enabled && recaptcha.onContact && recaptcha.siteKey;

  const formId = `cf-${Date.now()}`;

  const recaptchaScript = useRecaptcha
    ? `<script src="https://www.google.com/recaptcha/api.js?render=${esc(recaptcha.siteKey)}"></script>`
    : '';

  return (
    `<div id="${formId}" class="${CARD_CLS}">` +
    `<h3 class="mb-4 text-lg font-semibold tracking-tight">${esc(baslik)}</h3>` +
    `<form class="flex flex-col gap-3" data-action="/api/contact" data-rc-key="${
      useRecaptcha ? esc(recaptcha.siteKey) : ''
    }" onsubmit="return wcmsContactSubmit(event,'${formId}')">` +
    `<div><label class="${LABEL_CLS}">${esc(labels.name)}</label>` +
    `<input type="text" name="name" required class="${INPUT_CLS}"/></div>` +
    `<div><label class="${LABEL_CLS}">${esc(labels.email)}</label>` +
    `<input type="email" name="email" required class="${INPUT_CLS}"/></div>` +
    `<div><label class="${LABEL_CLS}">${esc(labels.subject)}</label>` +
    `<input type="text" name="subject" required class="${INPUT_CLS}"/></div>` +
    `<div><label class="${LABEL_CLS}">${esc(labels.message)}</label>` +
    `<textarea name="message" rows="5" required class="${TEXTAREA_CLS}"></textarea></div>` +
    `<button type="submit" class="${BUTTON_CLS}">${esc(labels.send)}</button>` +
    `<div class="sc-form-msg" data-ok="${esc(MSG_SUCCESS_CLS)}" data-err="${esc(MSG_ERROR_CLS)}" style="display:none"></div>` +
    `</form>` +
    `</div>` +
    recaptchaScript +
    `<script>` +
    `if(!window.wcmsContactSubmit){window.wcmsContactSubmit=function(e,id){` +
    `e.preventDefault();var f=e.target,w=document.getElementById(id),msg=w.querySelector('.sc-form-msg'),btn=f.querySelector('button[type="submit"]');` +
    `btn.disabled=true;msg.style.display='none';` +
    `var rcKey=f.dataset.rcKey;` +
    `function doSend(token){` +
    `var data={name:f.name.value,email:f.email.value,subject:f.subject.value,message:f.message.value};` +
    `if(token)data.recaptcha_token=token;` +
    `fetch(f.dataset.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})` +
    `.then(function(r){if(r.ok){msg.textContent=${JSON.stringify(labels.success)};msg.className='sc-form-msg '+msg.dataset.ok;f.reset()}` +
    `else{msg.textContent=${JSON.stringify(labels.error)};msg.className='sc-form-msg '+msg.dataset.err}})` +
    `.catch(function(){msg.textContent=${JSON.stringify(labels.error)};msg.className='sc-form-msg '+msg.dataset.err})` +
    `.finally(function(){btn.disabled=false;msg.style.display='block'});` +
    `}` +
    `if(rcKey&&typeof grecaptcha!=='undefined'){` +
    `grecaptcha.ready(function(){grecaptcha.execute(rcKey,{action:'contact'}).then(doSend);});` +
    `}else{doSend(null);}` +
    `return false;` +
    `};}` +
    `</script>`
  );
});

// English alias
registerShortcode('contact-form', async (params, inner, ctx) => {
  const renderer = getShortcodeRenderer('iletisim-formu');
  if (renderer) return renderer(params, inner, ctx);
  return '<!-- [contact-form] renderer not found -->';
});
