import { registerShortcode } from '../registry';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

registerShortcode('video', async (params, _inner, _ctx) => {
  const url = params.url || params.src || '';
  const width = params.genislik || params.width || '100%';
  const height = params.yukseklik || params.height || '400';
  const title = params.baslik || params.title || 'Video';

  if (!url) return '<!-- [video] url gerekli -->';

  // YouTube
  const ytId = extractYouTubeId(url);
  if (ytId) {
    return `<div class="sc-video sc-video-youtube">
      <iframe width="${esc(width)}" height="${esc(height)}" src="https://www.youtube-nocookie.com/embed/${esc(ytId)}"
        title="${esc(title)}" frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen loading="lazy"></iframe>
    </div>`;
  }

  // Vimeo
  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return `<div class="sc-video sc-video-vimeo">
      <iframe src="https://player.vimeo.com/video/${esc(vimeoId)}" width="${esc(width)}" height="${esc(height)}"
        title="${esc(title)}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen loading="lazy"></iframe>
    </div>`;
  }

  // Direct video URL
  return `<div class="sc-video sc-video-native">
    <video controls width="${esc(width)}" height="${esc(height)}" preload="metadata">
      <source src="${esc(url)}" />
      ${_ctx.lang === 'tr' ? 'Tarayiciniz video etiketini desteklemiyor.' : 'Your browser does not support the video tag.'}
    </video>
  </div>`;
});
