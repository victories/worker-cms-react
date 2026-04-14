import { registerShortcode } from '../registry';

registerShortcode('ozel-html', async (_params, innerContent, _ctx) => {
  // Renders inner HTML as-is (user is responsible for content safety)
  if (!innerContent) return '<!-- [ozel-html] icerik yok -->';
  return `<div class="sc-custom-html">${innerContent}</div>`;
});

// English alias
registerShortcode('custom-html', async (_params, innerContent, _ctx) => {
  if (!innerContent) return '<!-- [custom-html] no content -->';
  return `<div class="sc-custom-html">${innerContent}</div>`;
});
