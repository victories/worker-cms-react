import type { FC, PropsWithChildren } from 'hono/jsx';
import { raw } from 'hono/html';
import type { SiteTheme, SidebarData } from '../lib/public-db';
import type { NavItem } from '../lib/nav-utils';
import { langPrefix } from '../lib/lang';
import { renderWidget } from './WidgetRenderer';

interface LayoutProps {
  siteName: string;
  siteTagline?: string;
  theme: SiteTheme;
  lang: string;
  defaultLang: string;
  head?: any;
  navItems?: NavItem[];
  pluginHead?: string;
  pluginBodyStart?: string;
  pluginBodyEnd?: string;
  analyticsHead?: string;
  analyticsBody?: string;
  isHomepage?: boolean;
  currentPath?: string;
  sidebarData?: SidebarData;
  hidePoweredBy?: boolean;
}

export const LayoutVelvet: FC<PropsWithChildren<LayoutProps>> = (props) => {
  const { siteName, theme, lang, defaultLang, head, navItems, children, pluginHead, pluginBodyStart, pluginBodyEnd, currentPath, sidebarData, hidePoweredBy } = props;
  const fontFamily = theme.font_family || 'Plus Jakarta Sans';
  const headingFont = theme.heading_font_family || 'Outfit';
  const primaryColor = theme.primary_color || '#b9a9f5';
  const lp = langPrefix(lang, defaultLang);
  const isGooey = theme.nav_style === 'gooey';
  const isUnderline = theme.nav_style === 'underline';

  const renderW = (widget: any, wrapClass: string) =>
    renderWidget({ widget, wrapClass, sidebarData, lang, lp });

  const hasFooterWidgets = sidebarData && (
    sidebarData.footerWidgets['footer-1'].length > 0 ||
    sidebarData.footerWidgets['footer-2'].length > 0 ||
    sidebarData.footerWidgets['footer-3'].length > 0 ||
    sidebarData.footerWidgets['footer-4'].length > 0
  );

  const hasSlider = theme.slider_enabled && sidebarData && sidebarData.sliderWidgets && sidebarData.sliderWidgets.length > 0;

  // GooeyNav JS — particle animation engine (reused from Starter/Modern)
  const gooeyScript = `<script>
(function(){
var c=document.getElementById('gooey-nav');if(!c)return;
var aT=parseInt(c.dataset.animTime)||600,pC=parseInt(c.dataset.particleCount)||15;
var pD=[90,10],pR=100,tV=300,cols=[1,2,3,1,2,3,1,4];
var fE=c.querySelector('.gn-filter'),tE=c.querySelector('.gn-text');
var items=c.querySelectorAll('.gooey-nav>ul>li'),aI=0;
var cp=window.location.pathname;
items.forEach(function(li,idx){var h=li.querySelector('a').getAttribute('href');if(h&&h!=='/'&&cp.indexOf(h)===0){aI=idx}});
items.forEach(function(li,idx){if(idx===aI)li.classList.add('active');else li.classList.remove('active')});
function rn(v){v=v||1;return v/2-Math.random()*v}
function xy(d,i,t){var a=((360+rn(8))/t)*i*(Math.PI/180);return[d*Math.cos(a),d*Math.sin(a)]}
function mkP(i,t){var ro=rn(pR/10);return{s:xy(pD[0],pC-i,pC),e:xy(pD[1]+rn(7),pC-i,pC),t:t,sc:1+rn(.2),co:cols[Math.floor(Math.random()*cols.length)],ro:ro>0?(ro+pR/20)*10:(ro-pR/20)*10}}
function mp(el){var bt=aT*2+tV;el.style.setProperty('--time',bt+'ms');
for(var i=0;i<pC;i++){(function(i){var t=aT*2+rn(tV*2),p=mkP(i,t);el.classList.remove('active');
setTimeout(function(){var pa=document.createElement('span'),po=document.createElement('span');
pa.className='gn-particle';pa.style.setProperty('--start-x',p.s[0]+'px');pa.style.setProperty('--start-y',p.s[1]+'px');
pa.style.setProperty('--end-x',p.e[0]+'px');pa.style.setProperty('--end-y',p.e[1]+'px');
pa.style.setProperty('--time',p.t+'ms');pa.style.setProperty('--scale',''+p.sc);
pa.style.setProperty('--color','var(--gn-color-'+p.co+')');pa.style.setProperty('--rotate',p.ro+'deg');
po.className='gn-point';pa.appendChild(po);el.appendChild(pa);
requestAnimationFrame(function(){el.classList.add('active')});
setTimeout(function(){try{el.removeChild(pa)}catch(e){}},p.t)},30)})(i)}}
function up(el){var cr=c.getBoundingClientRect(),pr=el.getBoundingClientRect();
var s={left:(pr.x-cr.x)+'px',top:(pr.y-cr.y)+'px',width:pr.width+'px',height:pr.height+'px'};
Object.assign(fE.style,s);Object.assign(tE.style,s);tE.innerText=el.querySelector('a').innerText}
function hc(li,idx){if(aI===idx)return;items[aI].classList.remove('active');aI=idx;li.classList.add('active');
up(li);var op=fE.querySelectorAll('.gn-particle');op.forEach(function(p){fE.removeChild(p)});
tE.classList.remove('active');requestAnimationFrame(function(){requestAnimationFrame(function(){tE.classList.add('active')})});mp(fE)}
if(items[aI]){up(items[aI]);tE.classList.add('active')}
items.forEach(function(li,idx){li.querySelector('a').addEventListener('click',function(e){e.preventDefault();hc(li,idx);
var h=this.getAttribute('href');if(h)setTimeout(function(){window.location.href=h},350)})});
new ResizeObserver(function(){if(items[aI])up(items[aI])}).observe(c);
})();
<\/script>`;

  return (
    <>
    {raw('<!DOCTYPE html>')}
    <html lang={lang}>
      <head>
        {/* Flash prevention — set theme before first paint */}
        {raw(`<script>(function(){var t=localStorage.getItem('vl-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light')})()</script>`)}
        {head}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        {raw(`<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;500;600;700;800&family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;500;600;700;800&family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap"></noscript>`)}
        <link rel="alternate" type="application/rss+xml" title={`${siteName} RSS`} href={`${lp}/feed`} />
        <style dangerouslySetInnerHTML={{ __html: `
/* ============================================================
   VELVET THEME — Dark/Light Pastel Blog
   ============================================================ */
:root {
  --vl-primary: ${primaryColor};
  --vl-primary-light: ${primaryColor}18;
  --vl-primary-glow: ${primaryColor}30;
  --vl-secondary: ${theme.secondary_color || '#f5a9c7'};
  --vl-bg: ${theme.bg_color || '#13111a'};
  --vl-surface: ${theme.surface_color || '#1d1b26'};
  --vl-surface-2: #252336;
  --vl-text: ${theme.text_color || '#e8e4f0'};
  --vl-text-muted: ${theme.text_secondary_color || '#9892b3'};
  --vl-text-faint: #5a5572;
  --vl-border: ${theme.border_color || '#2e2b40'};
  --vl-header-bg: ${theme.header_bg_color || '#0e0c17'};
  --vl-header-text: ${theme.header_text_color || '#e8e4f0'};
  --vl-footer-bg: ${theme.footer_bg_color || '#0e0c17'};
  --vl-footer-text: ${theme.footer_text_color || '#9892b3'};
  --vl-link: ${theme.link_color || primaryColor};
  --vl-link-hover: ${theme.link_hover_color || '#d4c8fa'};
  --vl-font: '${fontFamily}', system-ui, -apple-system, sans-serif;
  --vl-heading-font: '${headingFont}', system-ui, sans-serif;
  --vl-radius: 0.75rem;
  --vl-shadow-sm: 0 2px 8px rgba(0,0,0,0.25);
  --vl-shadow-md: 0 4px 16px rgba(0,0,0,0.3);
  --vl-shadow-lg: 0 8px 32px rgba(0,0,0,0.35);
  --vl-glass-bg: rgba(29,27,38,0.72);
  --vl-glass-border: rgba(185,169,245,0.08);
  --vl-card-glow: 0 0 0 1px rgba(185,169,245,0.06), 0 4px 16px rgba(0,0,0,0.3);
  --gn-color-1: #b9a9f5; --gn-color-2: #f5a9c7; --gn-color-3: #a9f5d4; --gn-color-4: #f5d4a9;
}
/* === LIGHT MODE OVERRIDES === */
html[data-theme="light"] {
  --vl-primary: #7c6bc4;
  --vl-primary-light: #7c6bc415;
  --vl-primary-glow: #7c6bc420;
  --vl-secondary: #d4789b;
  --vl-bg: #faf8ff;
  --vl-surface: #ffffff;
  --vl-surface-2: #f3f0fa;
  --vl-text: #2d2640;
  --vl-text-muted: #6b6085;
  --vl-text-faint: #9990ad;
  --vl-border: #e8e0f0;
  --vl-header-bg: #ffffff;
  --vl-header-text: #2d2640;
  --vl-link: #7c6bc4;
  --vl-link-hover: #5a49a8;
  --vl-shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
  --vl-shadow-md: 0 4px 16px rgba(0,0,0,0.08);
  --vl-shadow-lg: 0 8px 32px rgba(0,0,0,0.1);
  --vl-glass-bg: rgba(255,255,255,0.82);
  --vl-glass-border: rgba(124,107,196,0.1);
  --vl-card-glow: 0 0 0 1px rgba(124,107,196,0.08), 0 4px 16px rgba(0,0,0,0.06);
  --gn-color-1: #7c6bc4; --gn-color-2: #d4789b; --gn-color-3: #4dab8a; --gn-color-4: #c49a5e;
}
/* Footer stays dark in light mode */
html[data-theme="light"] .vl-footer { --vl-footer-bg: #1e1a2e; --vl-footer-text: #9892b3; }

/* === RESET & BASE === */
*{margin:0;padding:0;box-sizing:border-box}
html{overflow-x:hidden;max-width:100vw}
h1,h2,h3,h4,h5,h6{font-family:var(--vl-heading-font);font-weight:700;letter-spacing:-0.02em;color:var(--vl-text)}
body{font-family:var(--vl-font);background:var(--vl-bg);color:var(--vl-text);line-height:1.75;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;padding-top:64px;transition:background-color 0.35s ease,color 0.35s ease;overflow-x:hidden}
a{color:var(--vl-link);text-decoration:none;transition:color 0.2s ease}
a:hover{color:var(--vl-link-hover)}
img{max-width:100%;height:auto;display:block}
::selection{background:var(--vl-primary);color:#fff}

/* === CONTAINER === */
.vl-container{max-width:1200px;margin:0 auto;padding:0 1.5rem}

/* === HEADER AD BAR === */
.vl-header-ad{text-align:center;padding:0;font-size:0.85rem;max-width:100vw;overflow:hidden;box-sizing:border-box}
.vl-header-ad>*{max-width:100%;overflow:hidden}
body.has-header-ad{padding-top:0!important}
body.has-header-ad .vl-header{position:sticky;top:0}

/* === STICKY GLASS HEADER === */
.vl-header{position:fixed;top:0;left:0;right:0;z-index:100;background:var(--vl-glass-bg);backdrop-filter:blur(16px) saturate(1.6);-webkit-backdrop-filter:blur(16px) saturate(1.6);border-bottom:1px solid var(--vl-glass-border);padding:0.75rem 0;transition:background 0.35s ease}
.vl-header .vl-container{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:1.5rem}

/* Brand */
.vl-brand{display:flex;align-items:center;gap:0.75rem}
.vl-logo{height:2.25rem;width:auto;border-radius:0.375rem}
.vl-site-title{font-family:var(--vl-heading-font);font-size:1.35rem;font-weight:800;color:var(--vl-header-text);letter-spacing:-0.02em}
.vl-site-title a{color:inherit;text-decoration:none}
.vl-site-title a:hover{opacity:0.8}
.vl-tagline{color:var(--vl-text-faint);font-size:0.75rem;margin-top:0.05rem}

/* Center Nav — default style */
.vl-nav{display:flex;gap:0.125rem;align-items:center;justify-content:center}
.vl-nav .nav-menu{display:flex;list-style:none;margin:0;padding:0;gap:0.125rem;align-items:center}
.vl-nav .nav-menu-item{position:relative}
.vl-nav .nav-menu-item>a{display:block;color:var(--vl-text-muted);font-size:0.875rem;font-weight:500;padding:0.45rem 0.85rem;border-radius:0.5rem;transition:all 0.2s ease;text-decoration:none}
.vl-nav .nav-menu-item>a:hover{color:var(--vl-text);background:var(--vl-primary-light);text-decoration:none}
.vl-nav .nav-menu-item>a.nav-active{color:var(--vl-primary);background:var(--vl-primary-light)}
.vl-nav .nav-menu-item.has-children>a::after{content:'';display:inline-block;width:0;height:0;margin-left:0.35rem;border-left:3.5px solid transparent;border-right:3.5px solid transparent;border-top:3.5px solid currentColor;vertical-align:middle}
.vl-nav .sub-menu{display:none;position:absolute;top:100%;left:0;min-width:180px;background:var(--vl-surface);border:1px solid var(--vl-border);border-radius:0.5rem;box-shadow:var(--vl-shadow-md);padding:0.375rem;z-index:110;list-style:none;margin:0}
.vl-nav .nav-menu-item:hover>.sub-menu{display:block}
.vl-nav .sub-menu .nav-menu-item>a{font-size:0.825rem;padding:0.45rem 0.75rem;border-radius:0.375rem;white-space:nowrap}
.vl-nav a{color:var(--vl-text-muted);font-size:0.875rem;font-weight:500;padding:0.45rem 0.85rem;border-radius:0.5rem;transition:all 0.2s ease}
.vl-nav a:hover{color:var(--vl-text);background:var(--vl-primary-light);text-decoration:none}
.vl-nav a.nav-active{color:var(--vl-primary);background:var(--vl-primary-light)}
.mobile-sub-item{padding-left:1.5rem!important;font-size:0.85rem!important;opacity:0.7}

/* Nav — underline style */
.vl-nav-underline a{position:relative;border-radius:0;background:none!important}
.vl-nav-underline a::after{content:'';position:absolute;bottom:-2px;left:0.85rem;right:0.85rem;height:2px;background:var(--vl-primary);transform:scaleX(0);transform-origin:left;transition:transform 0.25s ease}
.vl-nav-underline a:hover{background:none!important}
.vl-nav-underline a:hover::after{transform:scaleX(1)}
.vl-nav-underline a.nav-active{color:var(--vl-primary);background:none!important}
.vl-nav-underline a.nav-active::after{transform:scaleX(1);background:var(--vl-secondary)}

/* Right section — toggle + search + hamburger */
.vl-header-right{display:flex;align-items:center;gap:0.75rem}

/* Dark/Light Toggle Button */
.vl-theme-toggle{background:none;border:1px solid var(--vl-border);border-radius:0.5rem;padding:0.4rem;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--vl-text-muted);transition:all 0.2s ease;width:36px;height:36px}
.vl-theme-toggle:hover{color:var(--vl-primary);border-color:var(--vl-primary);background:var(--vl-primary-light)}
.vl-icon-sun,.vl-icon-moon{width:18px;height:18px}
.vl-icon-moon{display:none}
html[data-theme="light"] .vl-icon-sun{display:none}
html[data-theme="light"] .vl-icon-moon{display:block}

/* Search form */
.vl-header .search-form{display:flex;gap:0.4rem}
.vl-header .search-form input{background:var(--vl-surface);border:1px solid var(--vl-border);border-radius:0.5rem;padding:0.4rem 0.75rem;font-size:0.8rem;color:var(--vl-text);font-family:var(--vl-font);width:170px;transition:all 0.2s}
.vl-header .search-form input::placeholder{color:var(--vl-text-faint)}
.vl-header .search-form input:focus{border-color:var(--vl-primary);outline:none;box-shadow:0 0 0 3px var(--vl-primary-glow)}
.vl-header .search-form button{display:none}

/* Mobile hamburger */
.vl-toggle{display:none;background:none;border:1px solid var(--vl-border);border-radius:0.5rem;padding:0.4rem 0.5rem;cursor:pointer;color:var(--vl-text-muted)}
.vl-toggle svg{display:block}
@media(max-width:767px){
  .vl-toggle{display:flex;align-items:center}
  .vl-nav,.vl-header-right,.gooey-container{display:none!important}
  .vl-header .vl-container{grid-template-columns:1fr auto}
}
.vl-mobile-nav{display:none;flex-direction:column;position:absolute;top:100%;left:0;right:0;background:var(--vl-surface);border-bottom:1px solid var(--vl-border);box-shadow:var(--vl-shadow-md);padding:0.75rem 1.5rem 1rem;z-index:99}
.vl-mobile-nav.open{display:flex}
.vl-mobile-nav a{display:block;padding:0.6rem 0;color:var(--vl-text-muted);font-weight:500;border-bottom:1px solid var(--vl-border);font-size:0.9rem}
.vl-mobile-nav a:last-child{border-bottom:none}
.vl-mobile-nav a:hover{color:var(--vl-primary)}
.vl-mobile-nav .vl-mobile-extras{display:flex;align-items:center;gap:0.75rem;margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--vl-border)}
.vl-mobile-nav .search-form{flex:1}
.vl-mobile-nav .search-form input{width:100%;background:var(--vl-surface-2);border:1px solid var(--vl-border);border-radius:0.5rem;padding:0.5rem 0.75rem;font-size:0.85rem;color:var(--vl-text);font-family:var(--vl-font)}
.vl-mobile-nav .search-form input::placeholder{color:var(--vl-text-faint)}

/* GooeyNav — particle animation (within velvet header) */
.vl-header.vl-gooey{background:var(--vl-header-bg);backdrop-filter:none;border-bottom:1px solid var(--vl-border)}
.vl-header.vl-gooey .vl-site-title a{color:var(--vl-header-text)}
.vl-header.vl-gooey .vl-toggle{border-color:var(--vl-border);color:var(--vl-text-muted)}
.gooey-container{position:relative}
.gooey-nav{display:flex;position:relative;transform:translate3d(0,0,0.01px)}
.gooey-nav>ul{display:flex;gap:0;list-style:none;padding:0 0.5rem;margin:0;position:relative;z-index:3;color:var(--vl-text);text-shadow:0 1px 1px rgba(0,0,0,0.2)}
.gooey-nav>ul>li{border-radius:9999px;position:relative;cursor:pointer;transition:background-color 0.3s,color 0.3s;color:var(--vl-text)}
.gooey-nav>ul>li>a{outline:none;padding:0.6em 1em;display:inline-block;color:inherit;text-decoration:none;font-weight:500;font-size:0.875rem}
.gooey-nav>ul>li>a:hover{text-decoration:none}
.gooey-nav>ul>li.active{color:var(--vl-header-bg);text-shadow:none}
html[data-theme="light"] .gooey-nav>ul>li.active{color:var(--vl-bg)}
.gooey-nav>ul>li::after{content:"";position:absolute;inset:0;border-radius:8px;background:var(--vl-text);opacity:0;transform:scale(0);transition:all 0.3s ease;z-index:-1}
.gooey-nav>ul>li.active::after{opacity:1;transform:scale(1)}
.gn-effect{position:absolute;opacity:1;pointer-events:none;display:grid;place-items:center;z-index:1}
.gn-effect.gn-text{color:var(--vl-text);transition:color 0.3s ease}
.gn-effect.gn-text.active{color:var(--vl-header-bg)}
html[data-theme="light"] .gn-effect.gn-text.active{color:var(--vl-bg)}
.gn-effect.gn-filter{filter:url(#goo-filter)}
.gn-effect.gn-filter::after,.gn-effect.gn-text::after{content:"";position:absolute;inset:0;background:var(--vl-text);transform:scale(0);opacity:0;z-index:-1;border-radius:9999px}
.gn-effect.active::after{animation:gn-pill 0.3s ease both}
@keyframes gn-pill{to{transform:scale(1);opacity:1}}
.gn-particle,.gn-point{display:block;opacity:0;width:20px;height:20px;border-radius:9999px;transform-origin:center}
.gn-particle{position:absolute;top:calc(50% - 8px);left:calc(50% - 8px);animation:gn-move calc(var(--time)) ease 1 -350ms}
.gn-point{background:var(--color);opacity:1;animation:gn-scale calc(var(--time)) ease 1 -350ms}
@keyframes gn-move{
  0%{transform:rotate(0deg) translate(var(--start-x),var(--start-y));opacity:1;animation-timing-function:cubic-bezier(0.55,0,1,0.45)}
  70%{transform:rotate(calc(var(--rotate)*0.5)) translate(calc(var(--end-x)*1.2),calc(var(--end-y)*1.2));opacity:1;animation-timing-function:ease}
  85%{transform:rotate(calc(var(--rotate)*0.66)) translate(var(--end-x),var(--end-y));opacity:1}
  100%{transform:rotate(calc(var(--rotate)*1.2)) translate(calc(var(--end-x)*0.5),calc(var(--end-y)*0.5));opacity:1}
}
@keyframes gn-scale{
  0%{transform:scale(0);opacity:0;animation-timing-function:cubic-bezier(0.55,0,1,0.45)}
  25%{transform:scale(calc(var(--scale)*0.25))}
  38%{opacity:1}
  65%{transform:scale(var(--scale));opacity:1;animation-timing-function:ease}
  85%{transform:scale(var(--scale));opacity:1}
  100%{transform:scale(0);opacity:0}
}
.gn-arrow{font-size:0.7em;margin-left:0.25rem;opacity:0.6}
.gn-has-children{position:relative}
.gooey-nav .gn-sub-menu{display:none!important;position:absolute;top:100%;left:50%;transform:translateX(-50%);min-width:170px;background:var(--vl-surface);border:1px solid var(--vl-border);border-radius:0.5rem;box-shadow:var(--vl-shadow-md);padding:0.375rem;z-index:120;list-style:none;margin:0.25rem 0 0;flex-direction:column}
.gn-sub-menu li{border-radius:0.375rem}
.gn-sub-menu li::after{display:none}
.gn-sub-menu li a{padding:0.45rem 0.75rem;font-size:0.825rem;color:var(--vl-text-muted);white-space:nowrap;display:block;border-radius:0.375rem;text-shadow:none}
.gn-sub-menu li a:hover{background:var(--vl-surface-2);color:var(--vl-text)}
.gooey-nav .gn-has-children:hover>.gn-sub-menu{display:block!important}
.vl-header.vl-gooey .search-form input{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.1);color:var(--vl-text)}
.vl-header.vl-gooey .search-form input::placeholder{color:var(--vl-text-faint)}
.vl-header.vl-gooey .search-form input:focus{background:rgba(255,255,255,0.1);border-color:var(--vl-primary)}
html[data-theme="light"] .vl-header.vl-gooey{background:var(--vl-surface);border-bottom:1px solid var(--vl-border)}
html[data-theme="light"] .vl-header.vl-gooey .search-form input{background:var(--vl-surface-2);border-color:var(--vl-border);color:var(--vl-text)}

/* === SLIDER AREA === */
.vl-slider-wrap{margin-bottom:0}
.vl-slider-area{padding:2rem 0;background:linear-gradient(180deg,var(--vl-surface) 0%,var(--vl-bg) 100%)}

/* === LAYOUT GRID — Two columns === */
.vl-layout-grid{display:grid;grid-template-columns:1fr;gap:2.5rem;padding:2.5rem 0}
@media(min-width:768px){.vl-layout-grid{grid-template-columns:1fr 320px}}

main{min-height:60vh;width:100%;overflow:hidden}

/* === SIDEBAR === */
.vl-sidebar{display:flex;flex-direction:column;gap:1.5rem}
.vl-widget{background:var(--vl-surface);border-radius:var(--vl-radius);padding:1.5rem;box-shadow:var(--vl-card-glow);border:1px solid var(--vl-border);border-top:3px solid;border-image:linear-gradient(90deg,var(--vl-primary),var(--vl-secondary)) 1;border-image-slice:1 1 0 1;transition:box-shadow 0.3s ease,transform 0.2s ease}
.vl-widget:hover{transform:translateY(-2px);box-shadow:var(--vl-shadow-md)}
.vl-widget h3{font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--vl-text-muted);margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--vl-border)}
.vl-widget ul{list-style:none}
.vl-widget li{padding:0.4rem 0}
.vl-widget li a{color:var(--vl-text-muted);font-size:0.875rem;display:flex;align-items:center;justify-content:space-between;transition:color 0.2s}
.vl-widget li a:hover{color:var(--vl-primary)}
.vl-widget li .count{background:var(--vl-primary-light);color:var(--vl-primary);font-size:0.7rem;padding:0.15rem 0.5rem;border-radius:999px;font-weight:600}
.vl-widget .tag-cloud{display:flex;flex-wrap:wrap;gap:0.4rem}
.vl-widget .tag-cloud .tag-link{font-size:0.8rem;background:var(--vl-primary-light);color:var(--vl-primary);padding:0.25rem 0.65rem;border-radius:999px;transition:all 0.2s;text-decoration:none}
.vl-widget .tag-cloud .tag-link:hover{background:var(--vl-primary);color:#fff;text-decoration:none}
.vl-widget .widget-text{font-size:0.9rem;color:var(--vl-text-muted);line-height:1.65}

/* === SEARCH FORM (standalone) === */
.search-form{display:flex;gap:0.5rem}
.search-form input{flex:1;padding:0.55rem 0.875rem;border:1px solid var(--vl-border);border-radius:0.5rem;font-size:0.875rem;font-family:var(--vl-font);background:var(--vl-surface);color:var(--vl-text);transition:border-color 0.2s,box-shadow 0.2s;outline:none}
.search-form input:focus{border-color:var(--vl-primary);box-shadow:0 0 0 3px var(--vl-primary-glow)}
.search-form button{padding:0.55rem 1rem;background:var(--vl-primary);color:#fff;border:none;border-radius:0.5rem;cursor:pointer;font-size:0.875rem;font-family:var(--vl-font);font-weight:500;transition:opacity 0.15s}
.search-form button:hover{opacity:0.9}

/* === GALLERY / CUSTOM HTML AREA === */
.vl-gallery-area{border-top:1px solid var(--vl-border);border-bottom:1px solid var(--vl-border);padding:2rem 0;margin:0}

/* === FOOTER — 4 columns === */
.vl-footer{padding:0;color:var(--vl-footer-text);font-size:0.8rem;margin-top:3rem;background:var(--vl-footer-bg)}
.vl-footer-widgets{display:grid;grid-template-columns:repeat(4,1fr);gap:2rem;padding:3rem 1.5rem 2rem}
@media(max-width:991px){.vl-footer-widgets{grid-template-columns:repeat(2,1fr)}}
@media(max-width:567px){.vl-footer-widgets{grid-template-columns:1fr}}
.vl-footer-widget{margin-bottom:1rem}
.vl-footer-widget h3{font-family:var(--vl-heading-font);font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.85);margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:2px solid rgba(255,255,255,0.06)}
.vl-footer-widget ul{list-style:none;padding:0;margin:0}
.vl-footer-widget li{padding:0.3rem 0}
.vl-footer-widget li a{color:var(--vl-footer-text);font-size:0.85rem;text-decoration:none;transition:color 0.2s}
.vl-footer-widget li a:hover{color:var(--vl-primary)}
.vl-footer-widget .sc-menu-horizontal>ul{display:flex;flex-wrap:wrap;gap:0.25rem}
.vl-footer-widget .sc-menu-horizontal .sc-menu-item>a{display:inline-block;padding:0.35rem 0.75rem}
.vl-footer-widget .sc-menu-vertical .sc-menu-item>a{display:inline;padding:0}
.vl-footer-widget .tag-cloud{display:flex;flex-wrap:wrap;gap:0.35rem}
.vl-footer-widget .widget-text{color:var(--vl-footer-text);font-size:0.85rem;line-height:1.6}
.vl-footer-bottom{text-align:center;padding:1.5rem 0;font-size:0.8rem;color:rgba(255,255,255,0.4);border-top:1px solid rgba(255,255,255,0.06)}

/* === POST CARDS === */
.post-card{background:var(--vl-surface);border-radius:var(--vl-radius);overflow:hidden;margin-bottom:1.5rem;border:1px solid var(--vl-border);transition:all 0.3s ease;box-shadow:var(--vl-card-glow)}
.post-card:hover{box-shadow:var(--vl-shadow-lg),0 0 20px var(--vl-primary-glow);transform:translateY(-3px)}
.post-card.sticky{border-left:3px solid var(--vl-secondary)}
/* Horizontal layout when post has thumbnail */
.post-card.has-thumb{display:flex;flex-direction:row;align-items:stretch}
.post-card.has-thumb .card-thumb{flex:0 0 280px;position:relative;overflow:hidden}
.post-card.has-thumb .card-thumb .featured-img{width:100%;height:100%;object-fit:cover;transition:transform 0.5s ease;aspect-ratio:auto}
.post-card.has-thumb:hover .featured-img{transform:scale(1.04)}
.post-card.has-thumb .card-body{flex:1;display:flex;flex-direction:column;justify-content:center}
.post-card .card-img-wrap,.post-card .card-thumb{position:relative;overflow:hidden}
.post-card .featured-img{width:100%;aspect-ratio:16/9;object-fit:cover;transition:transform 0.5s ease}
.post-card:hover .featured-img{transform:scale(1.04)}
.post-card .card-body{padding:1.5rem}
.post-card h2{font-size:1.25rem;margin-bottom:0.5rem;line-height:1.35;font-weight:700}
.post-card h2 a{color:var(--vl-text);text-decoration:none}
.post-card h2 a:hover{color:var(--vl-primary)}
.post-meta{color:var(--vl-text-faint);font-size:0.8rem;margin-bottom:0.75rem;display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center}
.post-meta .author{font-weight:500;color:var(--vl-text-muted)}
.post-meta .sep{color:var(--vl-border)}
.post-meta .tag{background:linear-gradient(135deg,var(--vl-primary-light),rgba(245,169,199,0.12));color:var(--vl-primary);padding:0.15rem 0.6rem;border-radius:999px;font-size:0.7rem;font-weight:600;text-decoration:none;transition:all 0.2s}
.post-meta .tag:hover{background:var(--vl-primary);color:#fff;text-decoration:none}
.post-excerpt{color:var(--vl-text-muted);margin-bottom:1rem;font-size:0.925rem;line-height:1.65;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.read-more{font-weight:600;font-size:0.875rem;display:inline-flex;align-items:center;gap:0.35rem;color:var(--vl-primary);transition:gap 0.2s}
.read-more:hover{gap:0.6rem;text-decoration:none}
.read-more svg{width:16px;height:16px}

/* === POST SINGLE === */
.post-single{background:var(--vl-surface);border-radius:var(--vl-radius);padding:2.5rem;box-shadow:var(--vl-card-glow);border:1px solid var(--vl-border)}
@media(max-width:767px){.post-single{padding:1.5rem;border-radius:0}}
.post-single h1{font-size:2.25rem;margin-bottom:0.75rem;line-height:1.25;font-weight:800;letter-spacing:-0.025em;color:var(--vl-text)}
.post-single .featured-img{width:100%;border-radius:var(--vl-radius);margin-bottom:1.75rem;aspect-ratio:16/9;object-fit:cover}
.post-content{line-height:1.85;font-size:1.05rem;color:var(--vl-text)}
.post-content h2{font-size:1.5rem;margin:2rem 0 0.75rem;font-weight:700;color:var(--vl-text);letter-spacing:-0.01em}
.post-content h3{font-size:1.25rem;margin:1.5rem 0 0.5rem;font-weight:600;color:var(--vl-text)}
.post-content p{margin-bottom:1.25rem}
.post-content ul,.post-content ol{margin:1rem 0 1.25rem;padding-left:1.75rem}
.post-content li{margin-bottom:0.35rem}
.post-content blockquote{border-left:3px solid var(--vl-primary);padding:1rem 1.5rem;margin:1.5rem 0;background:var(--vl-surface-2);border-radius:0 var(--vl-radius) var(--vl-radius) 0;color:var(--vl-text-muted);font-style:italic}
.post-content pre{background:#0e0c17;color:#e8e4f0;padding:1.25rem 1.5rem;border-radius:var(--vl-radius);overflow-x:auto;margin:1.5rem 0;font-size:0.875rem;line-height:1.7;border:1px solid var(--vl-border)}
.post-content code{background:var(--vl-surface-2);padding:0.15rem 0.4rem;border-radius:0.25rem;font-size:0.875em;color:var(--vl-primary)}
.post-content pre code{background:none;padding:0;color:inherit}
.post-content img{border-radius:var(--vl-radius);margin:1.5rem 0}
.post-content a{text-decoration:underline;text-underline-offset:2px;text-decoration-color:var(--vl-primary-light)}
.post-content a:hover{text-decoration-color:var(--vl-primary)}
.post-content table{width:100%;border-collapse:collapse;margin:1.5rem 0;background:var(--vl-surface);border-radius:var(--vl-radius);overflow:hidden;border:1px solid var(--vl-border)}
.post-content th,.post-content td{padding:0.75rem 1rem;text-align:left;border:1px solid var(--vl-border)}
.post-content th{font-weight:600;background:var(--vl-surface-2);font-size:0.875rem;color:var(--vl-text-muted)}
.post-content td{color:var(--vl-text)}
.post-tags{margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--vl-border);display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center}
.post-tags .label{color:var(--vl-text-faint);font-size:0.8rem;font-weight:600;margin-right:0.25rem}
.post-tags a{font-size:0.8rem;background:var(--vl-primary-light);color:var(--vl-primary);padding:0.25rem 0.75rem;border-radius:999px;transition:all 0.2s}
.post-tags a:hover{background:var(--vl-primary);color:#fff;text-decoration:none}

/* === COMMENTS === */
.comments-section{margin-top:2.5rem;padding-top:2rem;border-top:2px solid var(--vl-border)}
.comments-section h3{font-size:1.15rem;font-weight:700;margin-bottom:1.25rem;color:var(--vl-text)}
.comment{padding:1.25rem 0;border-bottom:1px solid var(--vl-border)}
.comment:last-child{border-bottom:none}
.comment-header{display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem}
.comment-avatar{width:2.25rem;height:2.25rem;border-radius:999px;background:linear-gradient(135deg,var(--vl-primary-light),rgba(245,169,199,0.15));display:flex;align-items:center;justify-content:center;color:var(--vl-primary);font-weight:700;font-size:0.8rem;flex-shrink:0}
.comment-author{font-weight:600;font-size:0.9rem;color:var(--vl-text)}
.comment-date{font-size:0.75rem;color:var(--vl-text-faint)}
.comment-content{font-size:0.925rem;color:var(--vl-text-muted);line-height:1.6;padding-left:3rem}

/* === PAGINATION === */
.pagination{display:flex;justify-content:center;gap:0.375rem;margin:2.5rem 0;flex-wrap:wrap}
.pagination a,.pagination span{padding:0.5rem 0.875rem;border-radius:0.5rem;font-size:0.875rem;font-weight:500;transition:all 0.2s}
.pagination a{background:var(--vl-surface);border:1px solid var(--vl-border);color:var(--vl-text-muted)}
.pagination a:hover{background:var(--vl-primary-light);border-color:var(--vl-primary);color:var(--vl-primary);text-decoration:none}
.pagination .current{background:var(--vl-primary);color:#fff;border:1px solid var(--vl-primary)}
.pagination .dots{color:var(--vl-text-faint);border:none;background:none;padding:0.5rem 0.375rem}
.pagination .prev,.pagination .next{font-weight:600}

/* === ARCHIVE & SEARCH === */
.archive-header{margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:2px solid var(--vl-border)}
.archive-header h1{font-size:1.75rem;margin-bottom:0.35rem;font-weight:800;letter-spacing:-0.02em}
.archive-header p{color:var(--vl-text-muted);font-size:0.925rem}
.search-results-header{margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:2px solid var(--vl-border)}
.search-results-header h1{font-size:1.5rem;font-weight:700;letter-spacing:-0.01em}
.search-results-header p{color:var(--vl-text-muted);font-size:0.875rem;margin-top:0.25rem}
.empty-state{text-align:center;padding:5rem 2rem;color:var(--vl-text-faint)}
.empty-state svg{margin:0 auto 1rem;opacity:0.4}
.empty-state p{font-size:1.05rem}

/* === LANG SWITCH === */
.lang-switch{display:inline-flex;gap:0.25rem;font-size:0.8rem}
.lang-switch a{padding:0.2rem 0.5rem;border-radius:0.25rem;color:var(--vl-text-faint)}
.lang-switch a.active{background:var(--vl-primary);color:#fff}
.lang-switch a:hover{text-decoration:none;color:var(--vl-primary)}

/* === PAGE LAYOUT BUILDER === */
.wp-layout{max-width:1200px;margin:0 auto;padding:1rem 0}
.wp-row{display:flex;gap:20px;margin-bottom:24px}
.wp-row:last-child{margin-bottom:0}
.wp-col{min-width:0;box-sizing:border-box}
@media(max-width:768px){.wp-row{flex-direction:column;gap:1rem}.wp-col{flex:0 0 100%!important}}

/* === SHORTCODE STYLES === */
.static-homepage{min-height:40vh;width:100%;max-width:100%;overflow:hidden;word-wrap:break-word;overflow-wrap:break-word}
.static-homepage table{width:100%;border-collapse:collapse;margin:1.5rem 0;background:var(--vl-surface);border-radius:var(--vl-radius);overflow:hidden;border:1px solid var(--vl-border)}
.static-homepage th,.static-homepage td{padding:0.75rem 1rem;text-align:left;border:1px solid var(--vl-border)}
.static-homepage th{font-weight:600;background:var(--vl-surface-2);font-size:0.875rem;color:var(--vl-text-muted)}
.static-homepage td{color:var(--vl-text)}
.sc-posts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.5rem;margin-bottom:2rem}
.sc-posts-list-view{display:flex;flex-direction:column;gap:1rem;margin-bottom:2rem}
.sc-category-block{margin-bottom:2.5rem}
.sc-category-header h2{font-size:1.35rem;font-weight:700;margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:2px solid var(--vl-border)}
.sc-category-header h2 a{color:var(--vl-text);text-decoration:none}
.sc-category-header h2 a:hover{color:var(--vl-primary)}
.sc-posts-list ul{list-style:none;padding:0}
.sc-list-item{display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--vl-border)}
.sc-list-item a{color:var(--vl-text);font-weight:500;text-decoration:none}
.sc-list-item a:hover{color:var(--vl-primary)}
.sc-date{color:var(--vl-text-faint);font-size:0.8rem;white-space:nowrap;margin-left:1rem}
.sc-posts-mini{display:flex;flex-wrap:wrap;gap:0.5rem}
.sc-posts-mini a{background:var(--vl-primary-light);color:var(--vl-primary);padding:0.4rem 0.8rem;border-radius:0.375rem;font-size:0.85rem;text-decoration:none;transition:all 0.2s}
.sc-posts-mini a:hover{background:var(--vl-primary);color:#fff}
.sc-post-short{margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--vl-border)}
.sc-post-short h3{margin-bottom:0.25rem}
.sc-post-short h3 a{color:var(--vl-text);text-decoration:none}
.sc-post-short h3 a:hover{color:var(--vl-primary)}
.sc-post-full{margin-bottom:2rem}
.sc-post-full h2 a{color:var(--vl-text);text-decoration:none}
.sc-post-full h2 a:hover{color:var(--vl-primary)}
.sc-empty{text-align:center;padding:3rem 2rem;color:var(--vl-text-faint);font-size:0.95rem}

/* Menu shortcode */
.sc-menu ul{list-style:none;padding:0;margin:0}
.sc-menu-horizontal>ul{display:flex;flex-wrap:wrap;gap:0.25rem}
.sc-menu-horizontal .sc-menu-item>a{display:block;padding:0.5rem 1rem;color:var(--vl-text-muted);border-radius:0.375rem;transition:all 0.2s;text-decoration:none;font-weight:500}
.sc-menu-horizontal .sc-menu-item>a:hover{background:var(--vl-primary);color:#fff}
.sc-menu-vertical .sc-menu-item>a{display:block;padding:0.5rem 0;color:var(--vl-text-muted);border-bottom:1px solid var(--vl-border);text-decoration:none}
.sc-menu-vertical .sc-menu-item>a:hover{color:var(--vl-primary)}
.sc-submenu{padding-left:1.25rem}

/* Spacer & Divider */
.sc-spacer{width:100%}
.sc-divider{border:none;border-top:1px solid var(--vl-border);margin:1.5rem auto}

/* Search form shortcode */
.sc-search-form{margin:1.5rem 0}
.sc-search-inner{display:flex;gap:0.5rem}
.sc-search-input{flex:1;padding:0.65rem 1rem;border:1px solid var(--vl-border);border-radius:var(--vl-radius);font-size:0.95rem;outline:none;transition:border-color 0.2s;background:var(--vl-surface);color:var(--vl-text)}
.sc-search-input:focus{border-color:var(--vl-primary)}
.sc-search-btn{padding:0.65rem 1.25rem;background:var(--vl-primary);color:#fff;border:none;border-radius:var(--vl-radius);font-weight:600;cursor:pointer;transition:opacity 0.15s}
.sc-search-btn:hover{opacity:0.9}

/* Gallery */
.sc-gallery{display:grid;gap:0.75rem;margin:1.5rem 0}
.sc-gallery-cols-2{grid-template-columns:repeat(2,1fr)}
.sc-gallery-cols-3{grid-template-columns:repeat(3,1fr)}
.sc-gallery-cols-4{grid-template-columns:repeat(4,1fr)}
.sc-gallery-item{margin:0;overflow:hidden;border-radius:var(--vl-radius)}
.sc-gallery-item img{width:100%;height:auto;display:block;transition:transform 0.4s}
.sc-gallery-item:hover img{transform:scale(1.05)}
.sc-gallery-item figcaption{padding:0.5rem;font-size:0.8rem;color:var(--vl-text-faint);text-align:center}

/* Video */
.sc-video{margin:1.5rem 0;text-align:center}
.sc-video iframe,.sc-video video{max-width:100%;border-radius:var(--vl-radius)}

/* Social */
.sc-social-links{display:flex;flex-wrap:wrap;gap:0.5rem;margin:1rem 0;align-items:center}
.sc-social-link{display:inline-flex;align-items:center;gap:0.4rem;color:var(--vl-text-muted);text-decoration:none;padding:0.5rem;border-radius:0.375rem;transition:all 0.2s}
.sc-social-link:hover{color:var(--vl-primary);background:var(--vl-primary-light)}
.sc-social-link svg{width:20px;height:20px}

/* Contact form */
.sc-contact-form{max-width:600px;margin:2rem auto;background:var(--vl-surface);border-radius:var(--vl-radius);padding:2rem;box-shadow:var(--vl-card-glow);border:1px solid var(--vl-border)}
.sc-contact-title{font-size:1.25rem;font-weight:700;margin-bottom:1.25rem}
.sc-form-group{margin-bottom:1rem}
.sc-form-group label{display:block;font-weight:500;margin-bottom:0.35rem;font-size:0.875rem;color:var(--vl-text-muted)}
.sc-input,.sc-textarea{width:100%;padding:0.6rem 0.85rem;border:1px solid var(--vl-border);border-radius:var(--vl-radius);font-size:0.9rem;transition:border-color 0.2s;box-sizing:border-box;background:var(--vl-surface);color:var(--vl-text)}
.sc-input:focus,.sc-textarea:focus{outline:none;border-color:var(--vl-primary)}
.sc-submit-btn{padding:0.65rem 1.5rem;background:var(--vl-primary);color:#fff;border:none;border-radius:var(--vl-radius);font-weight:600;cursor:pointer;font-size:0.95rem;transition:opacity 0.15s}
.sc-submit-btn:hover{opacity:0.9}
.sc-submit-btn:disabled{opacity:0.5;cursor:not-allowed}
.sc-form-msg{margin-top:1rem;padding:0.75rem;border-radius:var(--vl-radius);font-size:0.875rem}
.sc-form-msg.sc-success{background:rgba(52,211,153,0.15);color:#34d399}
.sc-form-msg.sc-error{background:rgba(248,113,113,0.15);color:#f87171}

/* Widget area */
.sc-widget-area{margin:1.5rem 0}
.sc-widget{margin-bottom:1rem}
.sc-widget .widget-title{font-size:1.1rem;font-weight:700;margin-bottom:0.75rem}
.sc-custom-html{margin:1rem 0}

/* Hero slider */
.hero-slider-wrap{margin-bottom:2rem}
.hero-slider{position:relative;overflow:hidden;border-radius:var(--vl-radius)}
.hero-slide{position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;transition:opacity 0.6s ease}
.hero-slide.active{position:relative;opacity:1}
.hero-overlay{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(0,0,0,0.35)}
.hero-content{text-align:center;padding:2rem;color:#fff}
.hero-title{font-size:2rem;font-weight:800;margin-bottom:0.5rem;text-shadow:0 2px 4px rgba(0,0,0,0.3)}
.hero-subtitle{font-size:1.1rem;opacity:0.9;margin-bottom:1.25rem}
.hero-btn{display:inline-block;padding:0.7rem 1.75rem;background:var(--vl-primary);color:#fff;border-radius:var(--vl-radius);font-weight:600;text-decoration:none;transition:opacity 0.15s}
.hero-btn:hover{opacity:0.9;color:#fff}
.hero-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.2s;backdrop-filter:blur(4px)}
.hero-nav:hover{background:rgba(255,255,255,0.3)}
.hero-prev{left:1rem}
.hero-next{right:1rem}
.hero-dots{position:absolute;bottom:1rem;left:50%;transform:translateX(-50%);display:flex;gap:0.5rem}
.hero-dot{width:10px;height:10px;border-radius:50%;border:2px solid #fff;background:transparent;cursor:pointer;transition:background 0.2s;padding:0}
.hero-dot.active{background:#fff}

@media(max-width:767px){
.sc-posts-grid{grid-template-columns:1fr}
.post-card.has-thumb{flex-direction:column}
.post-card.has-thumb .card-thumb{flex:none;max-height:200px}
.sc-gallery-cols-3,.sc-gallery-cols-4{grid-template-columns:repeat(2,1fr)}
.hero-title{font-size:1.5rem}
.hero-subtitle{font-size:0.95rem}
.sc-search-inner{flex-direction:column}
.sc-contact-form{padding:1.25rem}
}

/* === SCROLL TO TOP — Diamond === */
.vl-scroll-top{position:fixed;bottom:2rem;right:2rem;width:46px;height:46px;border-radius:0.75rem;transform:rotate(45deg) translateY(20px) scale(0.8);background:linear-gradient(135deg,var(--vl-primary),var(--vl-secondary));color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:90;box-shadow:0 4px 20px rgba(185,169,245,0.25);opacity:0;visibility:hidden;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1)}
.vl-scroll-top.visible{opacity:1;visibility:visible;transform:rotate(45deg) translateY(0) scale(1)}
.vl-scroll-top:hover{box-shadow:0 6px 28px rgba(185,169,245,0.4);transform:rotate(45deg) translateY(-3px) scale(1.08)}
.vl-scroll-top:active{transform:rotate(45deg) translateY(-1px) scale(1.02);transition-duration:0.1s}
.vl-scroll-top svg{transform:rotate(-45deg);width:20px;height:20px;transition:transform 0.3s}
.vl-scroll-top:hover svg{transform:rotate(-45deg) translateY(-2px)}
.vl-scroll-top::after{content:'';position:absolute;inset:-3px;border-radius:0.85rem;border:2px solid var(--vl-primary);opacity:0;transform:scale(1);transition:all 0.4s ease;pointer-events:none}
.vl-scroll-top:hover::after{opacity:0.4;transform:scale(1.12)}
@media(max-width:767px){.vl-scroll-top{bottom:1.25rem;right:1.25rem;width:40px;height:40px}}

/* === FADE-UP ANIMATIONS === */
@keyframes vl-fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.vl-layout-grid main .post-card{animation:vl-fadeUp 0.5s ease both}
.vl-layout-grid main .post-card:nth-child(2){animation-delay:0.08s}
.vl-layout-grid main .post-card:nth-child(3){animation-delay:0.16s}
.vl-layout-grid main .post-card:nth-child(4){animation-delay:0.24s}
.vl-layout-grid main .post-card:nth-child(5){animation-delay:0.32s}
` }} />
        {pluginHead && raw(pluginHead)}
        {props.analyticsHead && raw(props.analyticsHead)}
      </head>
      <body>
        {/* Header Ad Bar — embed HTML from aurora worker + custom code */}
        {(theme.header_ad_embed_html || theme.header_ad_code) && (
          <div class="vl-header-ad">
            {theme.header_ad_embed_html && raw(theme.header_ad_embed_html)}
            {theme.header_ad_code && raw(theme.header_ad_code)}
          </div>
        )}

        {/* Sticky Glass Header */}
        <header class={isGooey ? 'vl-header vl-gooey' : 'vl-header'}>
          <div class="vl-container">
            {/* Left — Brand */}
            <div class="vl-brand">
              {theme.site_logo && <a href={`${lp}/`}><img class="vl-logo" src={theme.site_logo} alt={siteName} /></a>}
              <div>
                <div class="vl-site-title"><a href={`${lp}/`}>{siteName}</a></div>
                {props.siteTagline && <div class="vl-tagline">{props.siteTagline}</div>}
              </div>
            </div>

            {/* Mobile hamburger */}
            <button class="vl-toggle" onclick="document.getElementById('vl-mobile-nav').classList.toggle('open')" aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>

            {/* Center — Navigation */}
            {isGooey && navItems && navItems.length > 0 ? (
              <div class="gooey-container" id="gooey-nav"
                data-anim-time={String(theme.nav_animation_time)}
                data-particle-count={String(theme.nav_particle_count)}>
                <nav class="gooey-nav">
                  <ul>
                    {navItems.map((item) => {
                      const cp = currentPath || '/';
                      const isActive = item.url === '/' || item.url === lp + '/'
                        ? cp === '/' || cp === lp + '/' || cp === lp
                        : cp.startsWith(item.url);
                      const hasChildren = item.children && item.children.length > 0;
                      return (
                        <li class={`${isActive ? 'active' : ''}${hasChildren ? ' gn-has-children' : ''}`}>
                          <a href={item.url}>{item.title}{hasChildren && <span class="gn-arrow">▾</span>}</a>
                          {hasChildren && (
                            <ul class="gn-sub-menu">
                              {item.children!.map((child) => (
                                <li><a href={child.url} target={child.target}>{child.title}</a></li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <span class="gn-effect gn-filter"></span>
                <span class="gn-effect gn-text"></span>
              </div>
            ) : (
              <nav class={`vl-nav${isUnderline ? ' vl-nav-underline' : ''}`}>
                <ul class="nav-menu">
                  {navItems && navItems.map((item) => {
                    const cp = currentPath || '/';
                    const isActive = item.url === '/' || item.url === lp + '/'
                      ? cp === '/' || cp === lp + '/' || cp === lp
                      : cp.startsWith(item.url);
                    const hasChildren = item.children && item.children.length > 0;
                    return (
                      <li class={`nav-menu-item${isActive ? ' active' : ''}${hasChildren ? ' has-children' : ''}`}>
                        <a href={item.url} class={isActive ? 'nav-active' : ''}>{item.title}</a>
                        {hasChildren && (
                          <ul class="sub-menu">
                            {item.children!.map((child) => (
                              <li class="nav-menu-item">
                                <a href={child.url} target={child.target}>{child.title}</a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}

            {/* Right — Toggle + Search */}
            <div class="vl-header-right">
              {/* Dark/Light Toggle */}
              <button class="vl-theme-toggle" onclick="vlToggleTheme()" aria-label={lang === 'tr' ? 'Tema degistir' : 'Toggle theme'}>
                {/* Sun icon — shown in dark mode */}
                <svg class="vl-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                {/* Moon icon — shown in light mode */}
                <svg class="vl-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </button>
              <form class="search-form" action={`${lp}/search`} method="get">
                <input type="text" name="q" placeholder={lang === 'tr' ? 'Ara...' : 'Search...'} />
              </form>
            </div>

            {/* Mobile nav dropdown */}
            <div class="vl-mobile-nav" id="vl-mobile-nav">
              {navItems && navItems.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                return (
                  <>
                    <a href={item.url}>{item.title}</a>
                    {hasChildren && item.children!.map((child) => (
                      <a href={child.url} class="mobile-sub-item" target={child.target}>{child.title}</a>
                    ))}
                  </>
                );
              })}
              <div class="vl-mobile-extras">
                <button class="vl-theme-toggle" onclick="vlToggleTheme()" aria-label={lang === 'tr' ? 'Tema degistir' : 'Toggle theme'}>
                  <svg class="vl-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                  <svg class="vl-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                </button>
                <form class="search-form" action={`${lp}/search`} method="get">
                  <input type="text" name="q" placeholder={lang === 'tr' ? 'Ara...' : 'Search...'} />
                </form>
              </div>
            </div>
          </div>
        </header>

        {props.isHomepage && pluginBodyStart && raw(pluginBodyStart)}

        {/* Slider Area */}
        {hasSlider && sidebarData && (
          <div class="vl-slider-wrap">
            <div class="vl-slider-area">
              <div class="vl-container">
                {sidebarData.sliderWidgets.map((widget) => renderW(widget, 'vl-widget'))}
              </div>
            </div>
          </div>
        )}

        {/* Two-column layout grid */}
        <div class="vl-container vl-layout-grid">
          <main>{children}</main>
          {sidebarData && sidebarData.widgets.length > 0 && (
            <aside class="vl-sidebar">
              {sidebarData.widgets.map((widget) => renderW(widget, 'vl-widget'))}
            </aside>
          )}
        </div>

        {/* Gallery / Custom HTML Area */}
        {theme.gallery_section_code && (
          <div class="vl-gallery-area">
            <div class="vl-container">
              {raw(theme.gallery_section_code)}
            </div>
          </div>
        )}

        {/* 4-Column Footer */}
        <footer class="vl-footer">
          {hasFooterWidgets && sidebarData && (
            <div class="vl-container vl-footer-widgets">
              {(['footer-1', 'footer-2', 'footer-3', 'footer-4'] as const).map((area) => {
                const areaWidgets = sidebarData.footerWidgets[area];
                if (areaWidgets.length === 0) return null;
                return (
                  <div class="vl-footer-area">
                    {areaWidgets.map((widget) => renderW(widget, 'vl-footer-widget'))}
                  </div>
                );
              })}
            </div>
          )}
          <div class="vl-container vl-footer-bottom">
            {hidePoweredBy ? (theme.footer_text || '') : (theme.footer_text || `Powered by Worker CMS`)}
          </div>
        </footer>

        {/* Scroll to Top — Diamond */}
        <button class="vl-scroll-top" id="vlScrollTop" aria-label={lang === 'tr' ? 'Basa don' : 'Back to top'} title={lang === 'tr' ? 'Basa don' : 'Back to top'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>

        {/* Theme toggle + scroll-top scripts */}
        {raw(`<script>
function vlToggleTheme(){var h=document.documentElement;var isDark=h.getAttribute('data-theme')!=='light';h.setAttribute('data-theme',isDark?'light':'dark');localStorage.setItem('vl-theme',isDark?'light':'dark')}
(function(){var b=document.getElementById('vlScrollTop');if(!b)return;window.addEventListener('scroll',function(){if(window.scrollY>150){b.classList.add('visible')}else{b.classList.remove('visible')}},{passive:true});b.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})})})();
(function(){var ad=document.querySelector('.vl-header-ad');if(ad)document.body.classList.add('has-header-ad')})();
<\/script>`)}

        {isGooey && raw('<svg style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs><filter id="goo-filter" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"/></filter></defs></svg>')}
        {isGooey && raw(gooeyScript)}
        {props.analyticsBody && raw(props.analyticsBody)}
        {pluginBodyEnd && raw(pluginBodyEnd)}
      </body>
    </html>
    </>
  );
};
