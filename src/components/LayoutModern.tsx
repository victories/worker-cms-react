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

export const LayoutModern: FC<PropsWithChildren<LayoutProps>> = (props) => {
  const { siteName, theme, lang, defaultLang, head, navItems, children, pluginHead, pluginBodyStart, pluginBodyEnd, currentPath, sidebarData, hidePoweredBy } = props;
  const fontFamily = theme.font_family || 'DM Sans';
  const headingFont = theme.heading_font_family || 'Playfair Display';
  const primaryColor = theme.primary_color || '#0d9488';
  const lp = langPrefix(lang, defaultLang);
  const isGooey = theme.nav_style === 'gooey';

  const renderW = (widget: any, wrapClass: string) =>
    renderWidget({ widget, wrapClass, sidebarData, lang, lp });

  const hasFooterWidgets = sidebarData && (
    sidebarData.footerWidgets['footer-1'].length > 0 ||
    sidebarData.footerWidgets['footer-2'].length > 0 ||
    sidebarData.footerWidgets['footer-3'].length > 0
  );

  // GooeyNav JS — same as Starter (particle animation engine)
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
tE.classList.remove('active');void tE.offsetWidth;tE.classList.add('active');mp(fE)}
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
        {head}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        {raw(`<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;600;700&family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;600;700&family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap"></noscript>`)}
        <link rel="alternate" type="application/rss+xml" title={`${siteName} RSS`} href={`${lp}/feed`} />
        <style dangerouslySetInnerHTML={{ __html: `
:root {
  --primary: ${primaryColor};
  --primary-light: ${primaryColor}15;
  --primary-hover: ${primaryColor}dd;
  --secondary: ${theme.secondary_color || '#f59e0b'};
  --bg: ${theme.bg_color || '#fafaf9'};
  --surface: ${theme.surface_color || '#ffffff'};
  --text: ${theme.text_color || '#292524'};
  --text-secondary: ${theme.text_secondary_color || '#78716c'};
  --border: ${theme.border_color || '#e7e5e4'};
  --header-bg: ${theme.header_bg_color || '#1c1917'};
  --header-text: ${theme.header_text_color || '#fafaf9'};
  --footer-bg: ${theme.footer_bg_color || '#1c1917'};
  --footer-text: ${theme.footer_text_color || '#a8a29e'};
  --link: ${theme.link_color || primaryColor};
  --link-hover: ${theme.link_hover_color || '#0f766e'};
  --font: '${fontFamily}', system-ui, -apple-system, sans-serif;
  --heading-font: '${headingFont}', Georgia, serif;
  --radius: 0.5rem;
  --shadow-sm: 0 1px 2px rgb(0 0 0/0.03);
  --shadow-md: 0 4px 12px rgb(0 0 0/0.06);
  --shadow-lg: 0 12px 28px rgb(0 0 0/0.08);
  --gn-color-1: #5eead4; --gn-color-2: #fbbf24; --gn-color-3: #34d399; --gn-color-4: #fb923c;
}
*{margin:0;padding:0;box-sizing:border-box}
html{overflow-x:hidden;max-width:100vw}
h1,h2,h3,h4,h5,h6{font-family:var(--heading-font);font-weight:700;letter-spacing:-0.02em}
body{font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.8;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:var(--link);text-decoration:none;transition:color 0.2s ease}
a:hover{color:var(--link-hover)}
img{max-width:100%;height:auto;display:block}
::selection{background:var(--primary);color:#fff}

/* ========== HEADER AD BAR ========== */
.m-header-ad{text-align:center;padding:0;font-size:0.85rem;max-width:100vw;overflow:hidden;box-sizing:border-box}
.m-header-ad>*{max-width:100%;overflow:hidden}

/* ========== HEADER (Dark, NOT fixed) ========== */
.m-header{background:var(--header-bg);padding:1.25rem 0;border-bottom:none}
.m-header .container{display:flex;align-items:center;justify-content:space-between;gap:1.5rem}
.m-brand{display:flex;align-items:center;gap:0.75rem}
.m-logo{height:2rem;width:auto;border-radius:0.25rem}
.m-site-title{font-family:var(--heading-font);font-size:1.4rem;font-weight:700;color:var(--header-text);letter-spacing:-0.01em}
.m-site-title a{color:inherit;text-decoration:none}
.m-site-title a:hover{opacity:0.85}
.m-tagline{color:var(--footer-text);font-size:0.75rem;margin-top:0.1rem;font-weight:400}

/* Modern Nav — underline style */
.m-nav{display:flex;gap:0.125rem;align-items:center}
.m-nav .nav-menu{display:flex;list-style:none;margin:0;padding:0;gap:0.125rem;align-items:center}
.m-nav .nav-menu-item{position:relative}
.m-nav .nav-menu-item>a{display:block;color:rgba(255,255,255,0.65);font-size:0.875rem;font-weight:500;padding:0.5rem 0.875rem;position:relative;transition:color 0.2s ease;text-decoration:none}
.m-nav .nav-menu-item>a::after{content:'';position:absolute;bottom:0;left:0.875rem;right:0.875rem;height:2px;background:var(--primary);transform:scaleX(0);transform-origin:left;transition:transform 0.25s ease}
.m-nav .nav-menu-item>a:hover{color:#fff;text-decoration:none}
.m-nav .nav-menu-item>a:hover::after{transform:scaleX(1)}
.m-nav .nav-menu-item>a.nav-active{color:#fff}
.m-nav .nav-menu-item>a.nav-active::after{transform:scaleX(1);background:var(--secondary)}
.m-nav .nav-menu-item.has-children>a::after{content:'';position:static;display:inline-block;width:0;height:0;margin-left:0.35rem;border-left:3.5px solid transparent;border-right:3.5px solid transparent;border-top:3.5px solid currentColor;vertical-align:middle;background:none;transform:none}
.m-nav .sub-menu{display:none;position:absolute;top:100%;left:0;min-width:180px;background:var(--header-bg);border:1px solid rgba(255,255,255,0.12);border-radius:0.5rem;box-shadow:0 8px 24px rgba(0,0,0,0.25);padding:0.375rem;z-index:110;list-style:none;margin:0}
.m-nav .nav-menu-item:hover>.sub-menu{display:block}
.m-nav .sub-menu .nav-menu-item>a{font-size:0.825rem;padding:0.45rem 0.75rem;border-radius:0.375rem;white-space:nowrap}
.m-nav .sub-menu .nav-menu-item>a::after{display:none}
.m-nav a{color:rgba(255,255,255,0.65);font-size:0.875rem;font-weight:500;padding:0.5rem 0.875rem;position:relative;transition:color 0.2s ease}
.m-nav a::after{content:'';position:absolute;bottom:0;left:0.875rem;right:0.875rem;height:2px;background:var(--primary);transform:scaleX(0);transform-origin:left;transition:transform 0.25s ease}
.m-nav a:hover{color:#fff;text-decoration:none}
.m-nav a:hover::after{transform:scaleX(1)}
.m-nav a.nav-active{color:#fff}
.m-nav a.nav-active::after{transform:scaleX(1);background:var(--secondary)}
.mobile-sub-item{padding-left:1.5rem!important;font-size:0.85rem!important;opacity:0.7}

/* Search form in header */
.m-header .search-form{display:flex;gap:0.4rem}
.m-header .search-form input{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:var(--radius);padding:0.4rem 0.75rem;font-size:0.8rem;color:#fff;font-family:var(--font);width:180px;transition:all 0.2s}
.m-header .search-form input::placeholder{color:rgba(255,255,255,0.35)}
.m-header .search-form input:focus{background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.25);outline:none}
.m-header .search-form button{display:none}

/* Mobile hamburger */
.m-toggle{display:none;background:none;border:1px solid rgba(255,255,255,0.2);border-radius:var(--radius);padding:0.4rem 0.5rem;cursor:pointer;color:rgba(255,255,255,0.8)}
.m-toggle svg{display:block}
@media(max-width:767px){
  .m-toggle{display:flex;align-items:center}
  .m-nav,.m-header .header-right,.gooey-container{display:none!important}
}
.m-mobile-nav{display:none;flex-direction:column;position:absolute;top:100%;left:0;right:0;background:var(--header-bg);border-bottom:1px solid rgba(255,255,255,0.1);padding:0.75rem 1.5rem 1rem;z-index:99}
.m-mobile-nav.open{display:flex}
.m-mobile-nav a{display:block;padding:0.6rem 0;color:rgba(255,255,255,0.7);font-weight:500;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.9rem}
.m-mobile-nav a:last-child{border-bottom:none}
.m-mobile-nav a:hover{color:#fff}
.m-mobile-nav .search-form{margin-top:0.75rem}
.m-mobile-nav .search-form input{width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:var(--radius);padding:0.5rem 0.75rem;font-size:0.85rem;color:#fff;font-family:var(--font)}
.m-mobile-nav .search-form input::placeholder{color:rgba(255,255,255,0.35)}

/* GooeyNav reuse — same classes as Starter */
.gooey-header{background:var(--header-bg);border-bottom:none;padding:0.75rem 0}
.gooey-header .m-site-title a{color:var(--header-text)}
.gooey-header .m-tagline{color:var(--footer-text)}
.gooey-header .header-right{display:flex;align-items:center;gap:1rem}
.gooey-header .m-toggle{border-color:rgba(255,255,255,0.2);color:#fff}
.gooey-container{position:relative}
.gooey-nav{display:flex;position:relative;transform:translate3d(0,0,0.01px)}
.gooey-nav>ul{display:flex;gap:0;list-style:none;padding:0 0.5rem;margin:0;position:relative;z-index:3;color:#fff;text-shadow:0 1px 1px hsl(205deg 30% 10%/0.2)}
.gooey-nav>ul>li{border-radius:9999px;position:relative;cursor:pointer;transition:background-color 0.3s,color 0.3s;color:#fff}
.gooey-nav>ul>li>a{outline:none;padding:0.6em 1em;display:inline-block;color:inherit;text-decoration:none;font-weight:500;font-size:0.875rem}
.gooey-nav>ul>li>a:hover{text-decoration:none}
.gooey-nav>ul>li.active{color:var(--header-bg);text-shadow:none}
.gooey-nav>ul>li::after{content:"";position:absolute;inset:0;border-radius:8px;background:#fff;opacity:0;transform:scale(0);transition:all 0.3s ease;z-index:-1}
.gooey-nav>ul>li.active::after{opacity:1;transform:scale(1)}
.gn-effect{position:absolute;opacity:1;pointer-events:none;display:grid;place-items:center;z-index:1}
.gn-effect.gn-text{color:#fff;transition:color 0.3s ease}
.gn-effect.gn-text.active{color:var(--header-bg)}
.gn-effect.gn-filter{filter:url(#goo-filter)}
.gn-effect.gn-filter::after,.gn-effect.gn-text::after{content:"";position:absolute;inset:0;background:#fff;transform:scale(0);opacity:0;z-index:-1;border-radius:9999px}
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
.gooey-nav .gn-sub-menu{display:none!important;position:absolute;top:100%;left:50%;transform:translateX(-50%);min-width:170px;background:var(--header-bg);border:1px solid rgba(255,255,255,0.12);border-radius:0.5rem;box-shadow:0 8px 24px rgba(0,0,0,0.35);padding:0.375rem;z-index:120;list-style:none;margin:0.25rem 0 0;flex-direction:column}
.gn-sub-menu li{border-radius:0.375rem}
.gn-sub-menu li::after{display:none}
.gn-sub-menu li a{padding:0.45rem 0.75rem;font-size:0.825rem;color:rgba(255,255,255,0.85);white-space:nowrap;display:block;border-radius:0.375rem;text-shadow:none}
.gn-sub-menu li a:hover{background:rgba(255,255,255,0.1);color:#fff}
.gooey-nav .gn-has-children:hover>.gn-sub-menu{display:block!important}
.gooey-header .search-form input{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15);color:#fff}
.gooey-header .search-form input::placeholder{color:rgba(255,255,255,0.35)}
.gooey-header .search-form input:focus{background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.3)}

/* ========== LAYOUT — Single Column ========== */
.container{max-width:1140px;margin:0 auto;padding:0 1.5rem}
.m-content{max-width:780px;margin:0 auto;padding:2.5rem 0}
main{min-height:60vh;width:100%;overflow:hidden}

/* ========== POST CARDS — Horizontal Style ========== */
.post-card{display:flex;flex-direction:row;background:var(--surface);border-radius:var(--radius);overflow:hidden;margin-bottom:1.75rem;border:1px solid var(--border);border-left:3px solid var(--primary);transition:all 0.25s ease;box-shadow:var(--shadow-sm)}
.post-card:hover{box-shadow:var(--shadow-md);transform:translateX(4px)}
.post-card.sticky{border-left-color:var(--secondary)}
.post-card .card-img-wrap,.post-card .card-thumb{flex:0 0 280px;overflow:hidden;position:relative}
.post-card .featured-img{width:100%;height:100%;object-fit:cover;transition:transform 0.5s ease}
.post-card:hover .featured-img{transform:scale(1.05)}
.post-card .card-body{flex:1;padding:1.5rem 1.75rem;display:flex;flex-direction:column;justify-content:center}
.post-card h2{font-size:1.2rem;margin-bottom:0.4rem;line-height:1.35;font-weight:700}
.post-card h2 a{color:var(--text);text-decoration:none}
.post-card h2 a:hover{color:var(--primary)}
.post-meta{color:var(--text-secondary);font-size:0.8rem;margin-bottom:0.6rem;display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center}
.post-meta .author{font-weight:500;color:var(--text)}
.post-meta .sep{color:var(--border)}
.post-meta .tag{background:var(--primary-light);color:var(--primary);padding:0.15rem 0.55rem;border-radius:999px;font-size:0.7rem;font-weight:600;text-decoration:none;transition:all 0.15s}
.post-meta .tag:hover{background:var(--primary);color:#fff;text-decoration:none}
.post-excerpt{color:var(--text-secondary);margin-bottom:0.75rem;font-size:0.9rem;line-height:1.65;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.read-more{font-weight:600;font-size:0.85rem;display:inline-flex;align-items:center;gap:0.35rem;color:var(--primary);transition:gap 0.2s}
.read-more:hover{gap:0.6rem;text-decoration:none}
.read-more svg{width:16px;height:16px}

@media(max-width:640px){
  .post-card{flex-direction:column}
  .post-card .card-img-wrap,.post-card .card-thumb{flex:0 0 auto;height:200px}
  .post-card .card-body{padding:1.25rem}
}

/* ========== POST SINGLE — Full-width Hero ========== */
.post-single{background:var(--surface);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm);border:1px solid var(--border)}
.post-hero{position:relative;width:100%;aspect-ratio:21/9;overflow:hidden}
.post-hero img{width:100%;height:100%;object-fit:cover}
.post-hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.7) 100%);display:flex;align-items:flex-end}
.post-hero-content{padding:2rem 2.5rem;color:#fff;width:100%}
.post-hero-content h1{font-size:2.25rem;line-height:1.2;font-weight:800;margin-bottom:0.5rem;text-shadow:0 2px 8px rgba(0,0,0,0.3)}
.post-hero-content .post-meta{color:rgba(255,255,255,0.8)}
.post-hero-content .post-meta .author{color:#fff}
.post-hero-content .post-meta .tag{background:rgba(255,255,255,0.2);color:#fff}
.post-hero-content .post-meta .tag:hover{background:var(--primary)}
.post-single-body{padding:2.5rem}
@media(max-width:767px){
  .post-hero{aspect-ratio:16/9}
  .post-hero-content{padding:1.5rem}
  .post-hero-content h1{font-size:1.5rem}
  .post-single-body{padding:1.5rem}
}
/* Non-hero post single (no featured image) */
.post-single-noimg{padding:2.5rem}
.post-single-noimg h1{font-size:2.25rem;margin-bottom:0.75rem;line-height:1.25;font-weight:800;letter-spacing:-0.025em;color:var(--text)}
@media(max-width:767px){.post-single-noimg{padding:1.5rem}.post-single-noimg h1{font-size:1.65rem}}

.post-content{line-height:1.85;font-size:1.05rem;color:var(--text)}
.post-content h2{font-size:1.5rem;margin:2rem 0 0.75rem;font-weight:700;color:var(--text);letter-spacing:-0.01em}
.post-content h3{font-size:1.25rem;margin:1.5rem 0 0.5rem;font-weight:600;color:var(--text)}
.post-content p{margin-bottom:1.25rem}
.post-content ul,.post-content ol{margin:1rem 0 1.25rem;padding-left:1.75rem}
.post-content li{margin-bottom:0.35rem}
.post-content blockquote{border-left:3px solid var(--secondary);padding:1rem 1.5rem;margin:1.5rem 0;background:var(--primary-light);border-radius:0 var(--radius) var(--radius) 0;color:var(--text-secondary);font-style:italic}
.post-content pre{background:#1c1917;color:#e7e5e4;padding:1.25rem 1.5rem;border-radius:var(--radius);overflow-x:auto;margin:1.5rem 0;font-size:0.875rem;line-height:1.7}
.post-content code{background:var(--primary-light);padding:0.15rem 0.4rem;border-radius:0.25rem;font-size:0.875em;color:var(--primary)}
.post-content pre code{background:none;padding:0;color:inherit}
.post-content img{border-radius:var(--radius);margin:1.5rem 0}
.post-content a{text-decoration:underline;text-underline-offset:2px;text-decoration-color:var(--primary-light)}
.post-content a:hover{text-decoration-color:var(--primary)}
.post-content table{width:100%;border-collapse:collapse;margin:1.5rem 0;border:1px solid var(--border);border-radius:0.5rem;overflow:hidden}
.post-content th,.post-content td{padding:0.75rem 1rem;text-align:left;border:1px solid var(--border)}
.post-content th{font-weight:600;background:var(--primary-light);font-size:0.875rem;color:var(--text-secondary)}
.post-tags{margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border);display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center}
.post-tags .label{color:var(--text-secondary);font-size:0.8rem;font-weight:600;margin-right:0.25rem}
.post-tags a{font-size:0.8rem;background:var(--primary-light);color:var(--primary);padding:0.25rem 0.75rem;border-radius:999px;transition:all 0.15s}
.post-tags a:hover{background:var(--primary);color:#fff;text-decoration:none}

/* ========== SIDEBAR — Bottom 3-Grid ========== */
.m-sidebar-section{max-width:780px;margin:0 auto 2rem;padding:2rem 0 0;border-top:2px solid var(--border)}
.m-sidebar-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
@media(max-width:767px){.m-sidebar-grid{grid-template-columns:1fr}}
.m-sidebar-widget{background:var(--surface);border-radius:var(--radius);padding:1.5rem;border:1px solid var(--border)}
.m-sidebar-widget h3{font-family:var(--heading-font);font-size:0.95rem;font-weight:700;color:var(--text);margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:2px solid var(--primary)}
.m-sidebar-widget ul{list-style:none}
.m-sidebar-widget li{padding:0.35rem 0}
.m-sidebar-widget li a{color:var(--text-secondary);font-size:0.875rem;display:flex;align-items:center;justify-content:space-between;transition:color 0.15s}
.m-sidebar-widget li a:hover{color:var(--primary)}
.m-sidebar-widget li .count{background:var(--primary-light);color:var(--primary);font-size:0.7rem;padding:0.1rem 0.45rem;border-radius:999px;font-weight:600}
.m-sidebar-widget .tag-cloud{display:flex;flex-wrap:wrap;gap:0.4rem}
.m-sidebar-widget .tag-cloud .tag-link{font-size:0.8rem;background:var(--primary-light);color:var(--primary);padding:0.25rem 0.65rem;border-radius:999px;transition:all 0.15s;text-decoration:none}
.m-sidebar-widget .tag-cloud .tag-link:hover{background:var(--primary);color:#fff;text-decoration:none}
.m-sidebar-widget .widget-text{font-size:0.9rem;color:var(--text-secondary);line-height:1.6}

/* ========== COMMENTS ========== */
.comments-section{margin-top:2.5rem;padding-top:2rem;border-top:2px solid var(--border)}
.comments-section h3{font-size:1.15rem;font-weight:700;margin-bottom:1.25rem;color:var(--text)}
.comment{padding:1.25rem 0;border-bottom:1px solid var(--border)}
.comment:last-child{border-bottom:none}
.comment-header{display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem}
.comment-avatar{width:2.25rem;height:2.25rem;border-radius:999px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);font-weight:700;font-size:0.8rem;flex-shrink:0}
.comment-author{font-weight:600;font-size:0.9rem;color:var(--text)}
.comment-date{font-size:0.75rem;color:var(--text-secondary)}
.comment-content{font-size:0.925rem;color:var(--text-secondary);line-height:1.6;padding-left:3rem}

/* ========== SEARCH (Header) ========== */
.search-form{display:flex;gap:0.5rem}
.search-form input{flex:1;padding:0.55rem 0.875rem;border:1px solid var(--border);border-radius:var(--radius);font-size:0.875rem;font-family:var(--font);background:var(--surface);transition:border-color 0.15s;outline:none;color:var(--text)}
.search-form input:focus{border-color:var(--primary)}
.search-form button{padding:0.55rem 1rem;background:var(--primary);color:#fff;border:none;border-radius:var(--radius);cursor:pointer;font-size:0.875rem;font-family:var(--font);font-weight:500;transition:opacity 0.15s}
.search-form button:hover{opacity:0.9}

/* ========== FOOTER ========== */
.m-footer{padding:0;color:var(--footer-text);font-size:0.8rem;border-top:none;margin-top:3rem;background:var(--footer-bg)}
.m-footer-widgets{display:flex;gap:2rem;padding:3rem 1.5rem 2rem;flex-wrap:wrap}
.m-footer-area{flex:1;min-width:200px}
.m-footer-widget{margin-bottom:1rem}
.m-footer-widget h3{font-family:var(--heading-font);font-size:0.9rem;font-weight:700;color:var(--header-text);margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:2px solid rgba(255,255,255,0.08)}
.m-footer-widget ul{list-style:none;padding:0;margin:0}
.m-footer-widget li{padding:0.3rem 0}
.m-footer-widget li a{color:var(--footer-text);font-size:0.85rem;text-decoration:none;transition:color 0.15s}
.m-footer-widget li a:hover{color:var(--primary)}
.m-footer-widget .sc-menu-horizontal>ul{display:flex;flex-wrap:wrap;gap:0.25rem}
.m-footer-widget .sc-menu-horizontal .sc-menu-item>a{display:inline-block;padding:0.35rem 0.75rem}
.m-footer-widget .sc-menu-vertical .sc-menu-item>a{display:inline;padding:0}
.m-footer-widget .tag-cloud{display:flex;flex-wrap:wrap;gap:0.35rem}
.m-footer-widget .widget-text{color:var(--footer-text);font-size:0.85rem;line-height:1.6}
.m-footer-bottom{text-align:center;padding:1.5rem 0;font-size:0.8rem;color:var(--footer-text);border-top:1px solid rgba(255,255,255,0.06)}
@media(max-width:767px){.m-footer-widgets{flex-direction:column;gap:1.5rem}}

/* ========== PAGINATION ========== */
.pagination{display:flex;justify-content:center;gap:0.375rem;margin:2.5rem 0;flex-wrap:wrap}
.pagination a,.pagination span{padding:0.5rem 0.875rem;border-radius:var(--radius);font-size:0.875rem;font-weight:500;transition:all 0.15s}
.pagination a{background:var(--surface);border:1px solid var(--border);color:var(--text-secondary)}
.pagination a:hover{background:var(--primary-light);border-color:var(--primary);color:var(--primary);text-decoration:none}
.pagination .current{background:var(--primary);color:#fff;border:1px solid var(--primary)}
.pagination .dots{color:var(--text-secondary);border:none;background:none;padding:0.5rem 0.375rem}
.pagination .prev,.pagination .next{font-weight:600}

/* ========== ARCHIVE & SEARCH ========== */
.archive-header{margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:2px solid var(--border)}
.archive-header h1{font-size:1.75rem;margin-bottom:0.35rem;font-weight:800;letter-spacing:-0.02em}
.archive-header p{color:var(--text-secondary);font-size:0.925rem}
.search-results-header{margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:2px solid var(--border)}
.search-results-header h1{font-size:1.5rem;font-weight:700;letter-spacing:-0.01em}
.search-results-header p{color:var(--text-secondary);font-size:0.875rem;margin-top:0.25rem}
.empty-state{text-align:center;padding:5rem 2rem;color:var(--text-secondary)}
.empty-state svg{margin:0 auto 1rem;opacity:0.4}
.empty-state p{font-size:1.05rem}

/* ========== LANG SWITCH ========== */
.lang-switch{display:inline-flex;gap:0.25rem;font-size:0.8rem}
.lang-switch a{padding:0.2rem 0.5rem;border-radius:0.25rem;color:rgba(255,255,255,0.5)}
.lang-switch a.active{background:var(--primary);color:#fff}
.lang-switch a:hover{text-decoration:none;color:#fff}

/* ========== Page Layout Builder ========== */
.wp-layout{max-width:1200px;margin:0 auto;padding:1rem 0}
.wp-row{display:flex;gap:20px;margin-bottom:24px}
.wp-row:last-child{margin-bottom:0}
.wp-col{min-width:0;box-sizing:border-box}
@media(max-width:768px){.wp-row{flex-direction:column;gap:1rem}.wp-col{flex:0 0 100%!important}}

/* ========== SHORTCODE STYLES ========== */
.static-homepage{min-height:40vh;width:100%;max-width:100%;overflow:hidden;word-wrap:break-word;overflow-wrap:break-word}
.static-homepage table{width:100%;border-collapse:collapse;margin:1.5rem 0;border:1px solid var(--border);border-radius:0.5rem;overflow:hidden}
.static-homepage th,.static-homepage td{padding:0.75rem 1rem;text-align:left;border:1px solid var(--border)}
.static-homepage th{font-weight:600;background:var(--primary-light);font-size:0.875rem;color:var(--text-secondary)}
.sc-posts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.5rem;margin-bottom:2rem}
.sc-posts-list-view{display:flex;flex-direction:column;gap:1rem;margin-bottom:2rem}
.sc-category-block{margin-bottom:2.5rem}
.sc-category-header h2{font-size:1.35rem;font-weight:700;margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:2px solid var(--border)}
.sc-category-header h2 a{color:var(--text);text-decoration:none}
.sc-category-header h2 a:hover{color:var(--primary)}
.sc-posts-list ul{list-style:none;padding:0}
.sc-list-item{display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--border)}
.sc-list-item a{color:var(--text);font-weight:500;text-decoration:none}
.sc-list-item a:hover{color:var(--primary)}
.sc-date{color:var(--text-secondary);font-size:0.8rem;white-space:nowrap;margin-left:1rem}
.sc-posts-mini{display:flex;flex-wrap:wrap;gap:0.5rem}
.sc-posts-mini a{background:var(--primary-light);color:var(--primary);padding:0.4rem 0.8rem;border-radius:0.375rem;font-size:0.85rem;text-decoration:none;transition:all 0.15s}
.sc-posts-mini a:hover{background:var(--primary);color:#fff}
.sc-post-short{margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border)}
.sc-post-short h3{margin-bottom:0.25rem}
.sc-post-short h3 a{color:var(--text);text-decoration:none}
.sc-post-short h3 a:hover{color:var(--primary)}
.sc-post-full{margin-bottom:2rem}
.sc-post-full h2 a{color:var(--text);text-decoration:none}
.sc-post-full h2 a:hover{color:var(--primary)}
.sc-empty{text-align:center;padding:3rem 2rem;color:var(--text-secondary);font-size:0.95rem}

.sc-menu ul{list-style:none;padding:0;margin:0}
.sc-menu-horizontal>ul{display:flex;flex-wrap:wrap;gap:0.25rem}
.sc-menu-horizontal .sc-menu-item>a{display:block;padding:0.5rem 1rem;color:var(--text-secondary);border-radius:0.375rem;transition:all 0.15s;text-decoration:none;font-weight:500}
.sc-menu-horizontal .sc-menu-item>a:hover{background:var(--primary);color:#fff}
.sc-menu-vertical .sc-menu-item>a{display:block;padding:0.5rem 0;color:var(--text-secondary);border-bottom:1px solid var(--border);text-decoration:none}
.sc-menu-vertical .sc-menu-item>a:hover{color:var(--primary)}
.sc-submenu{padding-left:1.25rem}

.sc-spacer{width:100%}
.sc-divider{border:none;border-top:1px solid var(--border);margin:1.5rem auto}

.sc-search-form{margin:1.5rem 0}
.sc-search-inner{display:flex;gap:0.5rem}
.sc-search-input{flex:1;padding:0.65rem 1rem;border:1px solid var(--border);border-radius:var(--radius);font-size:0.95rem;outline:none;transition:border-color 0.15s}
.sc-search-input:focus{border-color:var(--primary)}
.sc-search-btn{padding:0.65rem 1.25rem;background:var(--primary);color:#fff;border:none;border-radius:var(--radius);font-weight:600;cursor:pointer;transition:opacity 0.15s}
.sc-search-btn:hover{opacity:0.9}

.sc-gallery{display:grid;gap:0.75rem;margin:1.5rem 0}
.sc-gallery-cols-2{grid-template-columns:repeat(2,1fr)}
.sc-gallery-cols-3{grid-template-columns:repeat(3,1fr)}
.sc-gallery-cols-4{grid-template-columns:repeat(4,1fr)}
.sc-gallery-item{margin:0;overflow:hidden;border-radius:var(--radius)}
.sc-gallery-item img{width:100%;height:auto;display:block;transition:transform 0.3s}
.sc-gallery-item:hover img{transform:scale(1.05)}
.sc-gallery-item figcaption{padding:0.5rem;font-size:0.8rem;color:var(--text-secondary);text-align:center}

.sc-video{margin:1.5rem 0;text-align:center}
.sc-video iframe,.sc-video video{max-width:100%;border-radius:var(--radius)}

.sc-social-links{display:flex;flex-wrap:wrap;gap:0.5rem;margin:1rem 0;align-items:center}
.sc-social-link{display:inline-flex;align-items:center;gap:0.4rem;color:var(--text-secondary);text-decoration:none;padding:0.5rem;border-radius:0.375rem;transition:all 0.15s}
.sc-social-link:hover{color:var(--primary);background:var(--primary-light)}
.sc-social-link svg{width:20px;height:20px}

.sc-contact-form{max-width:600px;margin:2rem auto;background:var(--surface);border-radius:var(--radius);padding:2rem;box-shadow:var(--shadow-sm);border:1px solid var(--border)}
.sc-contact-title{font-size:1.25rem;font-weight:700;margin-bottom:1.25rem}
.sc-form-group{margin-bottom:1rem}
.sc-form-group label{display:block;font-weight:500;margin-bottom:0.35rem;font-size:0.875rem;color:var(--text-secondary)}
.sc-input,.sc-textarea{width:100%;padding:0.6rem 0.85rem;border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem;transition:border-color 0.15s;box-sizing:border-box;color:var(--text)}
.sc-input:focus,.sc-textarea:focus{outline:none;border-color:var(--primary)}
.sc-submit-btn{padding:0.65rem 1.5rem;background:var(--primary);color:#fff;border:none;border-radius:var(--radius);font-weight:600;cursor:pointer;font-size:0.95rem;transition:opacity 0.15s}
.sc-submit-btn:hover{opacity:0.9}
.sc-submit-btn:disabled{opacity:0.5;cursor:not-allowed}
.sc-form-msg{margin-top:1rem;padding:0.75rem;border-radius:var(--radius);font-size:0.875rem}
.sc-form-msg.sc-success{background:#dcfce7;color:#166534}
.sc-form-msg.sc-error{background:#fee2e2;color:#991b1b}

.sc-widget-area{margin:1.5rem 0}
.sc-widget{margin-bottom:1rem}
.sc-widget .widget-title{font-size:1.1rem;font-weight:700;margin-bottom:0.75rem}
.sc-custom-html{margin:1rem 0}

.hero-slider-wrap{margin-bottom:2rem}
.hero-slider{position:relative;overflow:hidden;border-radius:var(--radius)}
.hero-slide{position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;transition:opacity 0.6s ease}
.hero-slide.active{position:relative;opacity:1}
.hero-overlay{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:rgba(0,0,0,0.35)}
.hero-content{text-align:center;padding:2rem;color:#fff}
.hero-title{font-size:2rem;font-weight:800;margin-bottom:0.5rem;text-shadow:0 2px 4px rgba(0,0,0,0.3)}
.hero-subtitle{font-size:1.1rem;opacity:0.9;margin-bottom:1.25rem}
.hero-btn{display:inline-block;padding:0.7rem 1.75rem;background:var(--primary);color:#fff;border-radius:var(--radius);font-weight:600;text-decoration:none;transition:opacity 0.15s}
.hero-btn:hover{opacity:0.9;color:#fff}
.hero-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);border:none;color:#fff;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.2s;backdrop-filter:blur(4px)}
.hero-nav:hover{background:rgba(255,255,255,0.4)}
.hero-prev{left:1rem}
.hero-next{right:1rem}
.hero-dots{position:absolute;bottom:1rem;left:50%;transform:translateX(-50%);display:flex;gap:0.5rem}
.hero-dot{width:10px;height:10px;border-radius:50%;border:2px solid #fff;background:transparent;cursor:pointer;transition:background 0.2s;padding:0}
.hero-dot.active{background:#fff}

@media(max-width:767px){
.sc-posts-grid{grid-template-columns:1fr}
.sc-gallery-cols-3,.sc-gallery-cols-4{grid-template-columns:repeat(2,1fr)}
.hero-title{font-size:1.5rem}
.hero-subtitle{font-size:0.95rem}
.sc-search-inner{flex-direction:column}
.sc-contact-form{padding:1.25rem}
}

/* ========== SCROLL TO TOP — Rounded Square ========== */
.scroll-top-btn{position:fixed;bottom:2rem;right:2rem;width:44px;height:44px;border-radius:var(--radius);background:var(--primary);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:90;box-shadow:var(--shadow-md);opacity:0;visibility:hidden;transform:translateY(16px);transition:all 0.35s ease}
.scroll-top-btn.visible{opacity:1;visibility:visible;transform:translateY(0)}
.scroll-top-btn:hover{background:var(--link-hover);transform:translateY(-2px);box-shadow:var(--shadow-lg)}
.scroll-top-btn:active{transform:translateY(0)}
.scroll-top-btn svg{width:20px;height:20px}
@media(max-width:767px){.scroll-top-btn{bottom:1.25rem;right:1.25rem;width:40px;height:40px}}
` }} />
        {pluginHead && raw(pluginHead)}
        {props.analyticsHead && raw(props.analyticsHead)}
      </head>
      <body>
        {/* Header Ad Bar — embed HTML from aurora worker + custom code */}
        {(theme.header_ad_embed_html || theme.header_ad_code) && (
          <div class="m-header-ad">
            {theme.header_ad_embed_html && raw(theme.header_ad_embed_html)}
            {theme.header_ad_code && raw(theme.header_ad_code)}
          </div>
        )}
        <header class={isGooey ? 'm-header gooey-header' : 'm-header'} style="position:relative">
          <div class="container">
            <div class="m-brand">
              {theme.site_logo && <a href={`${lp}/`}><img class="m-logo" src={theme.site_logo} alt={siteName} /></a>}
              <div>
                <div class="m-site-title"><a href={`${lp}/`}>{siteName}</a></div>
                {props.siteTagline && <div class="m-tagline">{props.siteTagline}</div>}
              </div>
            </div>
            {/* Mobile hamburger */}
            <button class="m-toggle" onclick="document.getElementById('m-mobile-nav').classList.toggle('open')" aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            {isGooey && navItems && navItems.length > 0 ? (
              <div class="header-right">
                <div class="gooey-container" id="gooey-nav"
                  data-anim-time={String(theme.nav_animation_time)}
                  data-particle-count={String(theme.nav_particle_count)}>
                  <nav class="gooey-nav">
                    <ul>
                      {navItems.map((item, i) => {
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
                <form class="search-form" action={`${lp}/search`} method="get">
                  <input type="text" name="q" placeholder={lang === 'tr' ? 'Ara...' : 'Search...'} />
                </form>
              </div>
            ) : (
              <div class="header-right" style="display:flex;align-items:center;gap:0.5rem">
                <nav class="m-nav">
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
                <form class="search-form" action={`${lp}/search`} method="get">
                  <input type="text" name="q" placeholder={lang === 'tr' ? 'Ara...' : 'Search...'} />
                </form>
              </div>
            )}
            {/* Mobile nav dropdown */}
            <div class="m-mobile-nav" id="m-mobile-nav">
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
              <form class="search-form" action={`${lp}/search`} method="get">
                <input type="text" name="q" placeholder={lang === 'tr' ? 'Ara...' : 'Search...'} />
              </form>
            </div>
          </div>
        </header>
        {props.isHomepage && pluginBodyStart && raw(pluginBodyStart)}

        <div class="container">
          <div class="m-content">
            <main>{children}</main>
          </div>
          {/* Sidebar as bottom 3-grid */}
          {sidebarData && sidebarData.widgets.length > 0 && (
            <div class="m-sidebar-section">
              <div class="m-sidebar-grid">
                {sidebarData.widgets.map((widget) => renderW(widget, 'm-sidebar-widget'))}
              </div>
            </div>
          )}
        </div>

        <footer class="m-footer">
          {hasFooterWidgets && sidebarData && (
            <div class="container m-footer-widgets">
              {(['footer-1', 'footer-2', 'footer-3'] as const).map((area) => {
                const areaWidgets = sidebarData.footerWidgets[area];
                if (areaWidgets.length === 0) return null;
                return (
                  <div class="m-footer-area">
                    {areaWidgets.map((widget) => renderW(widget, 'm-footer-widget'))}
                  </div>
                );
              })}
            </div>
          )}
          <div class="container m-footer-bottom">
            {hidePoweredBy ? (theme.footer_text || '') : (theme.footer_text || `Powered by Worker CMS`)}
          </div>
        </footer>
        {/* Scroll to Top — Rounded Square */}
        <button class="scroll-top-btn" id="scrollTopBtn" aria-label="Scroll to top" title={lang === 'tr' ? 'Basza don' : 'Back to top'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        {raw(`<script>
(function(){
var b=document.getElementById('scrollTopBtn');if(!b)return;
var t=150;
window.addEventListener('scroll',function(){
  if(window.scrollY>t){b.classList.add('visible')}else{b.classList.remove('visible')}
},{passive:true});
b.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});
})();
(function(){var ad=document.querySelector('.m-header-ad');if(ad&&ad.innerHTML.trim())document.body.classList.add('has-header-ad')})();
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
