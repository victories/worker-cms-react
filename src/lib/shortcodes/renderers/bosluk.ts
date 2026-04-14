import { registerShortcode } from '../registry';

registerShortcode('bosluk', async (params, _inner, _ctx) => {
  const size = params.boyut || params.size || '40';
  const px = parseInt(size) || 40;
  return `<div class="sc-spacer" style="height:${px}px"></div>`;
});

// English alias
registerShortcode('spacer', async (params, _inner, _ctx) => {
  const size = params.size || params.boyut || '40';
  const px = parseInt(size) || 40;
  return `<div class="sc-spacer" style="height:${px}px"></div>`;
});
