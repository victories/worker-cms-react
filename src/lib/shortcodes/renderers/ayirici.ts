import { registerShortcode } from '../registry';

registerShortcode('ayirici', async (params, _inner, _ctx) => {
  const style = params.stil || params.style || 'duz'; // duz | noktali | cizgili
  const color = params.renk || params.color || '';
  const width = params.genislik || params.width || '100';

  let borderStyle = 'solid';
  if (style === 'noktali' || style === 'dotted') borderStyle = 'dotted';
  if (style === 'cizgili' || style === 'dashed') borderStyle = 'dashed';

  const colorCss = color ? `border-color:${color.replace(/[^a-zA-Z0-9#,().% -]/g, '')}` : '';
  const widthCss = `width:${parseInt(width) || 100}%`;

  return `<hr class="sc-divider sc-divider-${borderStyle}" style="${widthCss};border-style:${borderStyle};${colorCss}"/>`;
});

// English alias
registerShortcode('divider', async (params, _inner, _ctx) => {
  const style = params.style || params.stil || 'solid';
  const color = params.color || params.renk || '';
  const width = params.width || params.genislik || '100';

  let borderStyle = style;
  if (!['solid', 'dotted', 'dashed'].includes(borderStyle)) borderStyle = 'solid';

  const colorCss = color ? `border-color:${color.replace(/[^a-zA-Z0-9#,().% -]/g, '')}` : '';
  const widthCss = `width:${parseInt(width) || 100}%`;

  return `<hr class="sc-divider sc-divider-${borderStyle}" style="${widthCss};border-style:${borderStyle};${colorCss}"/>`;
});
