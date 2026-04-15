/** @jsxImportSource react */
import type { ReactNode } from 'react';
import type { Site } from '../../types';

/**
 * Hero Slider Plugin — v2 (React hooks).
 *
 * A full-width image slider injected at `ui.bodyStart` on every page
 * for the site. Shadcn-token-friendly colours (no hardcoded hex), but
 * the slide layout itself lives in a scoped `<style>` block so the CSS
 * variables can vary at runtime without rebuilding Tailwind.
 *
 * Hooks:
 *   - `ui.head`       → scoped `<style>` block
 *   - `ui.bodyStart`  → slider DOM (static HTML, hydrated by the JS boot)
 *   - `ui.bodyEnd`    → tiny vanilla-JS boot script (autoplay + taps)
 */

interface Slide {
  id: number;
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  imageUrl: string;
  order: number;
}

function parseSlides(settings: Record<string, any>): Slide[] {
  try {
    const raw = typeof settings.slides === 'string'
      ? JSON.parse(settings.slides)
      : settings.slides;
    if (!Array.isArray(raw)) return [];
    return raw.sort((a: Slide, b: Slide) => (a.order || 0) - (b.order || 0));
  } catch {
    return [];
  }
}

function buildSliderCss(height: string, overlayOpacity: number): string {
  return (
    `.hero-slider{position:relative;width:100%;height:${height};overflow:hidden;margin-bottom:2rem;border-radius:var(--radius)}` +
    `.hero-slider .slide{position:absolute;inset:0;opacity:0;transition:opacity .8s ease;display:flex;align-items:center;justify-content:center}` +
    `.hero-slider .slide.active{opacity:1;z-index:1}` +
    `.hero-slider .slide-bg{position:absolute;inset:0;background-size:cover;background-position:center}` +
    `.hero-slider .slide-overlay{position:absolute;inset:0;background:rgba(0,0,0,${overlayOpacity})}` +
    `.hero-slider .slide-content{position:relative;z-index:2;text-align:center;color:#fff;padding:2rem;max-width:700px}` +
    `.hero-slider .slide-content h2{font-size:2.5rem;font-weight:700;margin-bottom:1rem;text-shadow:0 2px 8px rgba(0,0,0,.3);line-height:1.2}` +
    `.hero-slider .slide-content p{font-size:1.15rem;margin-bottom:1.5rem;opacity:.95;text-shadow:0 1px 4px rgba(0,0,0,.2)}` +
    `.hero-slider .slide-btn{display:inline-block;padding:.75rem 2rem;background:hsl(var(--primary));color:hsl(var(--primary-foreground));border-radius:var(--radius);font-weight:600;font-size:1rem;text-decoration:none;transition:transform .2s,box-shadow .2s}` +
    `.hero-slider .slide-btn:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.3);text-decoration:none}` +
    `.hero-slider .slider-dots{position:absolute;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:3;display:flex;gap:.5rem}` +
    `.hero-slider .dot{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,.5);cursor:pointer;border:0;transition:background .3s}` +
    `.hero-slider .dot.active{background:#fff}` +
    `.hero-slider .slider-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:3;background:rgba(255,255,255,.2);border:0;color:#fff;font-size:1.5rem;padding:.75rem 1rem;cursor:pointer;border-radius:var(--radius);transition:background .3s;backdrop-filter:blur(4px)}` +
    `.hero-slider .slider-arrow:hover{background:rgba(255,255,255,.4)}` +
    `.hero-slider .slider-prev{left:1rem}.hero-slider .slider-next{right:1rem}` +
    `@media(max-width:768px){.hero-slider{height:350px}.hero-slider .slide-content h2{font-size:1.5rem}.hero-slider .slide-content p{font-size:.95rem}.hero-slider .slider-arrow{display:none}}`
  );
}

function buildSliderHtml(
  slides: Slide[],
  opts: { autoPlay: boolean; interval: number; showDots: boolean; showArrows: boolean }
): string {
  const { autoPlay, interval, showDots, showArrows } = opts;

  const slidesHtml = slides
    .map(
      (s, i) =>
        `<div class="slide${i === 0 ? ' active' : ''}" data-index="${i}">` +
        `<div class="slide-bg" style="background-image:url('${s.imageUrl}')"></div>` +
        `<div class="slide-overlay"></div>` +
        `<div class="slide-content">` +
        `<h2>${s.title}</h2>` +
        `<p>${s.description}</p>` +
        (s.buttonText
          ? `<a href="${s.buttonUrl}" class="slide-btn">${s.buttonText}</a>`
          : '') +
        `</div>` +
        `</div>`
    )
    .join('');

  const dotsHtml = showDots
    ? `<div class="slider-dots">${slides
        .map((_, i) => `<button class="dot${i === 0 ? ' active' : ''}" data-index="${i}"></button>`)
        .join('')}</div>`
    : '';

  const arrowsHtml =
    showArrows && slides.length > 1
      ? `<button class="slider-arrow slider-prev">&#10094;</button><button class="slider-arrow slider-next">&#10095;</button>`
      : '';

  return (
    `<div class="hero-slider" data-autoplay="${autoPlay}" data-interval="${interval}">` +
    slidesHtml +
    dotsHtml +
    arrowsHtml +
    `</div>`
  );
}

const SLIDER_BOOT =
  `(function(){var s=document.querySelector('.hero-slider');if(!s||s.querySelectorAll('.slide').length<=1)return;` +
  `var slides=s.querySelectorAll('.slide'),dots=s.querySelectorAll('.dot'),cur=0,total=slides.length,timer=null;` +
  `function go(n){slides[cur].classList.remove('active');if(dots[cur])dots[cur].classList.remove('active');` +
  `cur=(n+total)%total;slides[cur].classList.add('active');if(dots[cur])dots[cur].classList.add('active');}` +
  `var prev=s.querySelector('.slider-prev'),next=s.querySelector('.slider-next');` +
  `if(prev)prev.onclick=function(){go(cur-1);reset()};if(next)next.onclick=function(){go(cur+1);reset()};` +
  `dots.forEach(function(d,i){d.onclick=function(){go(i);reset()}});` +
  `function reset(){clearInterval(timer);if(s.dataset.autoplay==='true')timer=setInterval(function(){go(cur+1)},parseInt(s.dataset.interval||5000))}` +
  `if(s.dataset.autoplay==='true')timer=setInterval(function(){go(cur+1)},parseInt(s.dataset.interval||5000));` +
  `s.addEventListener('mouseenter',function(){clearInterval(timer)});s.addEventListener('mouseleave',function(){reset()});` +
  `var tx=0;s.addEventListener('touchstart',function(e){tx=e.touches[0].clientX},{passive:true});` +
  `s.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>50){dx>0?go(cur-1):go(cur+1);reset()}},{passive:true});})();`;

export function register(
  engine: { register: (slug: string, hook: string, handler: Function, priority?: number) => void },
  settings: Record<string, any>
): void {
  const SLUG = 'hero-slider';
  const slides = parseSlides(settings);
  if (slides.length === 0) return;

  const autoPlay = settings.autoPlay !== false;
  const interval = typeof settings.interval === 'number' ? settings.interval : 5000;
  const showDots = settings.showDots !== false;
  const showArrows = settings.showArrows !== false;
  const height = typeof settings.height === 'string' ? settings.height : '500px';
  const overlayOpacity =
    typeof settings.overlayOpacity === 'number' ? settings.overlayOpacity : 0.4;

  const css = buildSliderCss(height, overlayOpacity);
  const sliderHtml = buildSliderHtml(slides, { autoPlay, interval, showDots, showArrows });

  // ── Hook: ui.head ──
  engine.register(SLUG, 'ui.head', (nodes: ReactNode[], _site: Site): ReactNode[] => {
    return [
      ...nodes,
      <style key="hero-slider-css" dangerouslySetInnerHTML={{ __html: css }} />,
    ];
  }, 5);

  // ── Hook: ui.bodyStart ──
  engine.register(SLUG, 'ui.bodyStart', (nodes: ReactNode[], _site: Site): ReactNode[] => {
    return [
      ...nodes,
      <div
        key="hero-slider-dom"
        className="wcms-hero-slider-mount"
        dangerouslySetInnerHTML={{ __html: sliderHtml }}
      />,
    ];
  }, 5);

  // ── Hook: ui.bodyEnd ──
  engine.register(SLUG, 'ui.bodyEnd', (nodes: ReactNode[], _site: Site): ReactNode[] => {
    return [
      ...nodes,
      <script key="hero-slider-boot" dangerouslySetInnerHTML={{ __html: SLIDER_BOOT }} />,
    ];
  }, 5);
}
