import { registerShortcode } from '../registry';
import { getRecaptchaSettings } from '../../recaptcha';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

registerShortcode('iletisim-formu', async (params, _inner, ctx) => {
  const baslik = params.baslik || params.title || (ctx.lang === 'tr' ? 'Bize Ulasin' : 'Contact Us');

  const tr = ctx.lang === 'tr';
  const labels = {
    name: tr ? 'Adiniz' : 'Your Name',
    email: tr ? 'E-posta' : 'Email',
    subject: tr ? 'Konu' : 'Subject',
    message: tr ? 'Mesajiniz' : 'Your Message',
    send: tr ? 'Gonder' : 'Send',
    success: tr ? 'Mesajiniz gonderildi!' : 'Your message has been sent!',
    error: tr ? 'Bir hata olustu. Tekrar deneyin.' : 'An error occurred. Please try again.',
  };

  // Check reCAPTCHA settings
  const recaptcha = await getRecaptchaSettings(ctx.db, ctx.siteId);
  const useRecaptcha = recaptcha.enabled && recaptcha.onContact && recaptcha.siteKey;

  const formId = `cf-${Date.now()}`;

  const recaptchaScript = useRecaptcha
    ? `<script src="https://www.google.com/recaptcha/api.js?render=${esc(recaptcha.siteKey)}"><\/script>`
    : '';

  return `<div class="sc-contact-form" id="${formId}">
    <h3 class="sc-contact-title">${esc(baslik)}</h3>
    <form class="sc-contact-inner" data-action="/api/contact" data-rc-key="${useRecaptcha ? esc(recaptcha.siteKey) : ''}" onsubmit="return handleContactForm(event, '${formId}')">
      <div class="sc-form-group">
        <label>${esc(labels.name)}</label>
        <input type="text" name="name" required class="sc-input"/>
      </div>
      <div class="sc-form-group">
        <label>${esc(labels.email)}</label>
        <input type="email" name="email" required class="sc-input"/>
      </div>
      <div class="sc-form-group">
        <label>${esc(labels.subject)}</label>
        <input type="text" name="subject" required class="sc-input"/>
      </div>
      <div class="sc-form-group">
        <label>${esc(labels.message)}</label>
        <textarea name="message" rows="5" required class="sc-textarea"></textarea>
      </div>
      <button type="submit" class="sc-submit-btn">${esc(labels.send)}</button>
      <div class="sc-form-msg" style="display:none"></div>
    </form>
  </div>
  ${recaptchaScript}
  <script>
  function handleContactForm(e,id){e.preventDefault();var f=e.target,w=document.getElementById(id),msg=w.querySelector('.sc-form-msg'),btn=f.querySelector('.sc-submit-btn');
  btn.disabled=true;msg.style.display='none';
  var rcKey=f.dataset.rcKey;
  function doSend(token){
    var data={name:f.name.value,email:f.email.value,subject:f.subject.value,message:f.message.value};
    if(token)data.recaptcha_token=token;
    fetch(f.dataset.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(function(r){if(r.ok){msg.textContent='${labels.success}';msg.className='sc-form-msg sc-success';f.reset()}else{msg.textContent='${labels.error}';msg.className='sc-form-msg sc-error'}})
    .catch(function(){msg.textContent='${labels.error}';msg.className='sc-form-msg sc-error'})
    .finally(function(){btn.disabled=false;msg.style.display='block'});
  }
  if(rcKey&&typeof grecaptcha!=='undefined'){
    grecaptcha.ready(function(){grecaptcha.execute(rcKey,{action:'contact'}).then(doSend);});
  }else{doSend(null);}
  return false}
  <\/script>`;
});

// English alias
registerShortcode('contact-form', async (params, _inner, ctx) => {
  const { getShortcodeRenderer } = await import('../registry');
  const renderer = getShortcodeRenderer('iletisim-formu');
  if (renderer) return renderer(params, _inner, ctx);
  return '<!-- [contact-form] renderer not found -->';
});
