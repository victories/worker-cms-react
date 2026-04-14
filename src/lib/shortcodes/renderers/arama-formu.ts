import { registerShortcode } from '../registry';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

registerShortcode('arama-formu', async (params, _inner, ctx) => {
  const placeholder = params.placeholder || (ctx.lang === 'tr' ? 'Ara...' : 'Search...');
  const buttonText = params.buton || params.button || (ctx.lang === 'tr' ? 'Ara' : 'Search');
  const lp = ctx.langPrefix;

  return `<div class="sc-search-form">
    <form action="${lp}/search" method="GET" class="sc-search-inner">
      <input type="text" name="q" placeholder="${esc(placeholder)}" class="sc-search-input" required/>
      <button type="submit" class="sc-search-btn">${esc(buttonText)}</button>
    </form>
  </div>`;
});

// English alias
registerShortcode('search-form', async (params, _inner, ctx) => {
  const placeholder = params.placeholder || (ctx.lang === 'tr' ? 'Ara...' : 'Search...');
  const buttonText = params.button || params.buton || (ctx.lang === 'tr' ? 'Ara' : 'Search');
  const lp = ctx.langPrefix;

  return `<div class="sc-search-form">
    <form action="${lp}/search" method="GET" class="sc-search-inner">
      <input type="text" name="q" placeholder="${esc(placeholder)}" class="sc-search-input" required/>
      <button type="submit" class="sc-search-btn">${esc(buttonText)}</button>
    </form>
  </div>`;
});
