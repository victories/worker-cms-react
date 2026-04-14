import type { FC, PropsWithChildren } from 'hono/jsx';
import { raw } from 'hono/html';
import type { SiteTheme, SidebarData, PublicTaxonomy, MenuItemData } from '../lib/public-db';
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

export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
  const { siteName, theme, lang, defaultLang, head, navItems, children, pluginHead, pluginBodyStart, pluginBodyEnd, currentPath, sidebarData, hidePoweredBy } = props;
  const fontFamily = theme.font_family || 'Inter';
  const headingFont = theme.heading_font_family || fontFamily;
  const primaryColor = theme.primary_color || '#2563eb';
  const lp = langPrefix(lang, defaultLang);
  const isGooey = theme.nav_style === 'gooey';
  const isUnderline = theme.nav_style === 'underline';
  const isFlowing = theme.nav_style === 'flowing';

  // Widget renderer helper using shared component
  const renderW = (widget: any, wrapClass: string) =>
    renderWidget({ widget, wrapClass, sidebarData, lang, lp });

  const hasFooterWidgets = sidebarData && (
    sidebarData.footerWidgets['footer-1'].length > 0 ||
    sidebarData.footerWidgets['footer-2'].length > 0 ||
    sidebarData.footerWidgets['footer-3'].length > 0
  );

  // GooeyNav vanilla JS — particle animation engine (only when nav_style === 'gooey')
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
  --secondary: ${theme.secondary_color || '#10b981'};
  --bg: ${theme.bg_color || '#f8fafc'};
  --surface: ${theme.surface_color || '#ffffff'};
  --text: ${theme.text_color || '#1e293b'};
  --text-secondary: ${theme.text_secondary_color || '#64748b'};
  --border: ${theme.border_color || '#e2e8f0'};
  --header-bg: ${theme.header_bg_color || '#ffffff'};
  --header-text: ${theme.header_text_color || '#0f172a'};
  --footer-bg: ${theme.footer_bg_color || '#0f172a'};
  --footer-text: ${theme.footer_text_color || '#94a3b8'};
  --link: ${theme.link_color || primaryColor};
  --link-hover: ${theme.link_hover_color || primaryColor + 'dd'};
  --font: '${fontFamily}', system-ui, -apple-system, sans-serif;
  --heading-font: '${headingFont}', system-ui, sans-serif;
  --radius: 0.75rem;
  --shadow-sm: 0 1px 2px rgb(0 0 0/0.04), 0 1px 3px rgb(0 0 0/0.06);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0/0.07), 0 2px 4px -2px rgb(0 0 0/0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0/0.08), 0 4px 6px -4px rgb(0 0 0/0.04);
  --gray-50: #f8fafc; --gray-100: #f1f5f9; --gray-200: #e2e8f0; --gray-300: #cbd5e1;
  --gray-400: #94a3b8; --gray-500: #64748b; --gray-600: #475569; --gray-700: #334155;
  --gray-800: #1e293b; --gray-900: #0f172a;
  --gn-color-1: #60a5fa; --gn-color-2: #a78bfa; --gn-color-3: #34d399; --gn-color-4: #f472b6;
}
h1,h2,h3,h4,h5,h6{font-family:var(--heading-font)}
*{margin:0;padding:0;box-sizing:border-box}
html{overflow-x:hidden;max-width:100vw}
body{font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.7;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:hidden}
a{color:var(--link);text-decoration:none;transition:color 0.15s ease}
a:hover{color:var(--link-hover)}
img{max-width:100%;height:auto;display:block}
::selection{background:var(--primary);color:#fff}

/* --- Header Ad Bar --- */
.st-header-ad{text-align:center;padding:0;font-size:0.85rem;max-width:100vw;overflow:hidden;box-sizing:border-box}
.st-header-ad>*{max-width:100%;overflow:hidden}
body.has-header-ad .site-header{position:sticky;top:0}
body.has-header-ad{padding-top:0!important}

/* --- Header --- */
.site-header{background:var(--header-bg);border-bottom:1px solid var(--border);padding:0.875rem 0;position:fixed;top:0;left:0;right:0;z-index:100;backdrop-filter:blur(12px)}
.site-header+*,.site-header~.hero-slider-wrap{margin-top:0}
body{padding-top:60px}
.site-nav a.nav-active{color:var(--primary);background:var(--primary-light)}
.site-header .container{display:flex;align-items:center;justify-content:space-between;gap:1rem}
.site-brand{display:flex;align-items:center;gap:0.75rem}
.site-logo{height:2.25rem;width:auto;border-radius:0.375rem}
.site-title{font-size:1.35rem;font-weight:800;color:var(--header-text);letter-spacing:-0.02em}
.site-title a{color:inherit;text-decoration:none}
.site-title a:hover{color:var(--primary)}
.site-tagline{color:var(--gray-400);font-size:0.8rem;margin-top:0.05rem;font-weight:400}
.site-nav{display:flex;gap:0.25rem;align-items:center}
.nav-menu{display:flex;list-style:none;margin:0;padding:0;gap:0.125rem;align-items:center}
.nav-menu-item{position:relative}
.nav-menu-item>a{display:block;color:var(--gray-600);font-size:0.875rem;font-weight:500;text-decoration:none;padding:0.4rem 0.75rem;border-radius:0.5rem;transition:all 0.15s ease}
.nav-menu-item>a:hover,.nav-menu-item>a.nav-active{color:var(--primary);background:var(--primary-light);text-decoration:none}
.nav-menu-item.has-children>a::after{content:'';display:inline-block;width:0;height:0;margin-left:0.35rem;border-left:3.5px solid transparent;border-right:3.5px solid transparent;border-top:3.5px solid currentColor;vertical-align:middle}
.sub-menu{display:none;position:absolute;top:100%;left:0;min-width:180px;background:var(--bg);border:1px solid var(--border);border-radius:0.5rem;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:0.375rem;z-index:110;list-style:none;margin:0}
.nav-menu-item:hover>.sub-menu{display:block}
.sub-menu .nav-menu-item>a{font-size:0.825rem;padding:0.45rem 0.75rem;border-radius:0.375rem;white-space:nowrap}
.site-nav a{color:var(--gray-600);font-size:0.875rem;font-weight:500;text-decoration:none;padding:0.4rem 0.75rem;border-radius:0.5rem;transition:all 0.15s ease}
.site-nav a:hover{color:var(--primary);background:var(--primary-light);text-decoration:none}
.mobile-sub-item{padding-left:1.5rem!important;font-size:0.85rem!important;color:var(--gray-500)!important}

/* --- Mobile Hamburger --- */
.mobile-toggle{display:none;background:none;border:1px solid var(--gray-200);border-radius:0.5rem;padding:0.4rem 0.5rem;cursor:pointer;color:var(--gray-600)}
.mobile-toggle svg{display:block}
@media(max-width:767px){
  .mobile-toggle{display:flex;align-items:center}
  .site-nav,.header-right,.gooey-container{display:none!important}
}
.mobile-nav{display:none;flex-direction:column;position:absolute;top:100%;left:0;right:0;background:#fff;border-bottom:1px solid var(--gray-200);box-shadow:var(--shadow-md);padding:0.75rem 1.5rem 1rem;z-index:99}
.mobile-nav.open{display:flex}
.mobile-nav a{display:block;padding:0.6rem 0;color:var(--gray-700);font-weight:500;border-bottom:1px solid var(--gray-100)}
.mobile-nav a:last-child{border-bottom:none}
.mobile-nav .search-form{margin-top:0.75rem}

/* --- GooeyNav --- */
.gooey-header{background:var(--gray-900);border-bottom:1px solid var(--gray-700);padding:0.75rem 0;backdrop-filter:none;position:fixed;top:0;left:0;right:0;z-index:100}
.gooey-header .site-title a{color:#f8fafc}
.gooey-header .site-tagline{color:var(--gray-400)}
.gooey-header .header-right{display:flex;align-items:center;gap:1rem}
.gooey-header .mobile-toggle{border-color:rgba(255,255,255,0.2);color:#fff}
.gooey-container{position:relative}
.gooey-nav{display:flex;position:relative;transform:translate3d(0,0,0.01px)}
.gooey-nav>ul{display:flex;gap:0;list-style:none;padding:0 0.5rem;margin:0;position:relative;z-index:3;color:#fff;text-shadow:0 1px 1px hsl(205deg 30% 10%/0.2)}
.gooey-nav>ul>li{border-radius:9999px;position:relative;cursor:pointer;transition:background-color 0.3s,color 0.3s;color:#fff}
.gooey-nav>ul>li>a{outline:none;padding:0.6em 1em;display:inline-block;color:inherit;text-decoration:none;font-weight:500;font-size:0.875rem}
.gooey-nav>ul>li>a:hover{text-decoration:none}
.gooey-nav>ul>li.active{color:var(--gray-900);text-shadow:none}
.gooey-nav>ul>li::after{content:"";position:absolute;inset:0;border-radius:8px;background:#fff;opacity:0;transform:scale(0);transition:all 0.3s ease;z-index:-1}
.gooey-nav>ul>li.active::after{opacity:1;transform:scale(1)}
.gn-effect{position:absolute;opacity:1;pointer-events:none;display:grid;place-items:center;z-index:1}
.gn-effect.gn-text{color:#fff;transition:color 0.3s ease}
.gn-effect.gn-text.active{color:var(--gray-900)}
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
.gooey-nav .gn-sub-menu{display:none!important;position:absolute;top:100%;left:50%;transform:translateX(-50%);min-width:170px;background:var(--gray-800);border:1px solid var(--gray-600);border-radius:0.5rem;box-shadow:0 8px 24px rgba(0,0,0,0.35);padding:0.375rem;z-index:120;list-style:none;margin:0.25rem 0 0;flex-direction:column}
.gn-sub-menu li{border-radius:0.375rem}
.gn-sub-menu li::after{display:none}
.gn-sub-menu li a{padding:0.45rem 0.75rem;font-size:0.825rem;color:rgba(255,255,255,0.85);white-space:nowrap;display:block;border-radius:0.375rem;text-shadow:none}
.gn-sub-menu li a:hover{background:rgba(255,255,255,0.1);color:#fff}
.gooey-nav .gn-has-children:hover>.gn-sub-menu{display:block!important}
.gooey-header .search-form input{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15);color:#fff}
.gooey-header .search-form input::placeholder{color:var(--gray-400)}
.gooey-header .search-form input:focus{background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.3)}

/* --- Page Layout Builder --- */
.wp-layout{max-width:1200px;margin:0 auto;padding:1rem 0}
.wp-row{display:flex;gap:20px;margin-bottom:24px}
.wp-row:last-child{margin-bottom:0}
.wp-col{min-width:0;box-sizing:border-box}
@media(max-width:768px){.wp-row{flex-direction:column;gap:1rem}.wp-col{flex:0 0 100%!important}}

/* --- Layout --- */
.container{max-width:1140px;margin:0 auto;padding:0 1.5rem}
.content-grid{display:grid;grid-template-columns:1fr;gap:2.5rem;padding:2.5rem 0}
@media(min-width:768px){.content-grid{grid-template-columns:1fr 320px}}

main{min-height:60vh;width:100%;overflow:hidden}

/* --- Sidebar --- */
.sidebar{display:flex;flex-direction:column;gap:1.5rem}
.sidebar-widget{background:#fff;border-radius:var(--radius);padding:1.5rem;box-shadow:var(--shadow-sm);border:1px solid var(--gray-100)}
.sidebar-widget h3{font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--gray-400);margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:2px solid var(--gray-100)}
.sidebar-widget ul{list-style:none}
.sidebar-widget li{padding:0.4rem 0}
.sidebar-widget li a{color:var(--gray-600);font-size:0.875rem;display:flex;align-items:center;justify-content:space-between;transition:color 0.15s}
.sidebar-widget li a:hover{color:var(--primary)}
.sidebar-widget li .count{background:var(--gray-100);color:var(--gray-500);font-size:0.75rem;padding:0.1rem 0.5rem;border-radius:999px;font-weight:500}
.tag-cloud{display:flex;flex-wrap:wrap;gap:0.4rem}
.tag-cloud .tag-link{font-size:0.8rem;background:var(--gray-100);color:var(--gray-600);padding:0.25rem 0.65rem;border-radius:999px;transition:all 0.15s;text-decoration:none}
.tag-cloud .tag-link:hover{background:var(--primary-light);color:var(--primary);text-decoration:none}
.widget-text{font-size:0.9rem;color:var(--gray-600);line-height:1.6}

/* --- Search --- */
.search-form{display:flex;gap:0.5rem}
.search-form input{flex:1;padding:0.55rem 0.875rem;border:1px solid var(--gray-200);border-radius:0.5rem;font-size:0.875rem;font-family:var(--font);background:#fff;transition:border-color 0.15s,box-shadow 0.15s;outline:none}
.search-form input:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-light)}
.search-form button{padding:0.55rem 1rem;background:var(--primary);color:#fff;border:none;border-radius:0.5rem;cursor:pointer;font-size:0.875rem;font-family:var(--font);font-weight:500;transition:background 0.15s}
.search-form button:hover{background:var(--primary-hover)}

/* --- Footer --- */
.site-footer{padding:0;color:var(--footer-text);font-size:0.8rem;border-top:1px solid var(--border);margin-top:3rem;background:var(--footer-bg)}
.footer-widgets{display:flex;gap:2rem;padding:2.5rem 1.5rem 1.5rem;flex-wrap:wrap}
.footer-widget-area{flex:1;min-width:200px}
.footer-widget{margin-bottom:1rem}
.footer-widget h3{font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--footer-text);margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:2px solid rgba(255,255,255,0.1)}
.footer-widget ul{list-style:none;padding:0;margin:0}
.footer-widget li{padding:0.3rem 0}
.footer-widget li a{color:var(--gray-600);font-size:0.85rem;text-decoration:none;transition:color 0.15s;display:inline}
.footer-widget li a:hover{color:var(--primary)}
.footer-widget .sc-menu-horizontal>ul{display:flex;flex-wrap:wrap;gap:0.25rem}
.footer-widget .sc-menu-horizontal .sc-menu-item{width:auto}
.footer-widget .sc-menu-horizontal .sc-menu-item>a{display:inline-block;padding:0.35rem 0.75rem}
.footer-widget .sc-menu-vertical .sc-menu-item>a{display:inline;padding:0;border-bottom:none}
.footer-widget .tag-cloud{display:flex;flex-wrap:wrap;gap:0.35rem}
.footer-widget .widget-text{color:var(--gray-600);font-size:0.85rem;line-height:1.6}
.footer-bottom{text-align:center;padding:1.5rem 0;font-size:0.8rem;color:var(--gray-400)}
.footer-widgets+.footer-bottom{border-top:1px solid var(--gray-100)}
@media(max-width:767px){.footer-widgets{flex-direction:column;gap:1.5rem}}

/* --- Post Cards --- */
.post-card{background:var(--surface);border-radius:var(--radius);overflow:hidden;margin-bottom:1.5rem;box-shadow:var(--shadow-sm);border:1px solid var(--border);transition:all 0.2s ease}
.post-card:hover{box-shadow:var(--shadow-lg);transform:translateY(-2px)}
.post-card.sticky{border-left:3px solid var(--primary)}
/* Horizontal layout when post has a thumbnail */
.post-card.has-thumb{display:flex;flex-direction:row;align-items:stretch}
.post-card.has-thumb .card-thumb{flex:0 0 280px;position:relative;overflow:hidden}
.post-card.has-thumb .card-thumb .featured-img{width:100%;height:100%;object-fit:cover;transition:transform 0.4s ease;aspect-ratio:auto}
.post-card.has-thumb:hover .featured-img{transform:scale(1.03)}
.post-card.has-thumb .card-body{flex:1;display:flex;flex-direction:column;justify-content:center}
/* Fallback for old card-img-wrap class */
.post-card .card-img-wrap{position:relative;overflow:hidden}
.post-card .card-img-wrap .featured-img{width:100%;aspect-ratio:16/9;object-fit:cover;transition:transform 0.4s ease}
.post-card:hover .card-img-wrap .featured-img{transform:scale(1.03)}
.post-card .card-body{padding:1.5rem}
.post-card h2{font-size:1.25rem;margin-bottom:0.5rem;line-height:1.35;font-weight:700;letter-spacing:-0.01em}
.post-card h2 a{color:var(--gray-900);text-decoration:none}
.post-card h2 a:hover{color:var(--primary)}
.post-meta{color:var(--gray-400);font-size:0.8rem;margin-bottom:0.75rem;display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center}
.post-meta .author{font-weight:500;color:var(--gray-600)}
.post-meta .sep{color:var(--gray-300)}
.post-meta .tag{background:var(--primary-light);color:var(--primary);padding:0.15rem 0.6rem;border-radius:999px;font-size:0.7rem;font-weight:600;text-decoration:none;transition:all 0.15s}
.post-meta .tag:hover{background:var(--primary);color:#fff;text-decoration:none}
.post-excerpt{color:var(--gray-600);margin-bottom:1rem;font-size:0.925rem;line-height:1.65;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.read-more{font-weight:600;font-size:0.875rem;display:inline-flex;align-items:center;gap:0.35rem;color:var(--primary);transition:gap 0.2s}
.read-more:hover{gap:0.6rem;text-decoration:none}
.read-more svg{width:16px;height:16px}
/* Mobile: horizontal cards stack vertically */
@media(max-width:640px){.post-card.has-thumb{flex-direction:column}.post-card.has-thumb .card-thumb{flex:none;max-height:200px}}

/* --- Post Single --- */
.post-single{background:var(--surface);border-radius:var(--radius);padding:2.5rem;box-shadow:var(--shadow-sm);border:1px solid var(--border)}
@media(max-width:767px){.post-single{padding:1.5rem;border-radius:0}}
.post-single h1{font-size:2.25rem;margin-bottom:0.75rem;line-height:1.25;font-weight:800;letter-spacing:-0.025em;color:var(--gray-900)}
.post-single .featured-img{width:100%;border-radius:var(--radius);margin-bottom:1.75rem;aspect-ratio:16/9;object-fit:cover}
.post-content{line-height:1.85;font-size:1.05rem;color:var(--gray-700)}
.post-content h2{font-size:1.5rem;margin:2rem 0 0.75rem;font-weight:700;color:var(--gray-900);letter-spacing:-0.01em}
.post-content h3{font-size:1.25rem;margin:1.5rem 0 0.5rem;font-weight:600;color:var(--gray-800)}
.post-content p{margin-bottom:1.25rem}
.post-content ul,.post-content ol{margin:1rem 0 1.25rem;padding-left:1.75rem}
.post-content li{margin-bottom:0.35rem}
.post-content blockquote{border-left:3px solid var(--primary);padding:1rem 1.5rem;margin:1.5rem 0;background:var(--gray-50);border-radius:0 var(--radius) var(--radius) 0;color:var(--gray-600);font-style:italic}
.post-content pre{background:var(--gray-900);color:var(--gray-200);padding:1.25rem 1.5rem;border-radius:var(--radius);overflow-x:auto;margin:1.5rem 0;font-size:0.875rem;line-height:1.7}
.post-content code{background:var(--gray-100);padding:0.15rem 0.4rem;border-radius:0.25rem;font-size:0.875em;color:var(--gray-700)}
.post-content pre code{background:none;padding:0;color:inherit}
.post-content img{border-radius:var(--radius);margin:1.5rem 0}
.post-content a{text-decoration:underline;text-underline-offset:2px;text-decoration-color:var(--primary-light)}
.post-content a:hover{text-decoration-color:var(--primary)}
.post-content table{width:100%;border-collapse:collapse;margin:1.5rem 0;border:1px solid var(--gray-200);border-radius:0.5rem;overflow:hidden}
.post-content th,.post-content td{padding:0.75rem 1rem;text-align:left;border:1px solid var(--gray-200)}
.post-content th{font-weight:600;background:var(--gray-50);font-size:0.875rem;color:var(--gray-500)}
.post-tags{margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--gray-200);display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center}
.post-tags .label{color:var(--gray-400);font-size:0.8rem;font-weight:600;margin-right:0.25rem}
.post-tags a{font-size:0.8rem;background:var(--gray-100);color:var(--gray-600);padding:0.25rem 0.75rem;border-radius:999px;transition:all 0.15s}
.post-tags a:hover{background:var(--primary-light);color:var(--primary);text-decoration:none}

/* --- Comments --- */
.comments-section{margin-top:2.5rem;padding-top:2rem;border-top:2px solid var(--gray-100)}
.comments-section h3{font-size:1.15rem;font-weight:700;margin-bottom:1.25rem;color:var(--gray-900)}
.comment{padding:1.25rem 0;border-bottom:1px solid var(--gray-100)}
.comment:last-child{border-bottom:none}
.comment-header{display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem}
.comment-avatar{width:2.25rem;height:2.25rem;border-radius:999px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);font-weight:700;font-size:0.8rem;flex-shrink:0}
.comment-author{font-weight:600;font-size:0.9rem;color:var(--gray-800)}
.comment-date{font-size:0.75rem;color:var(--gray-400)}
.comment-content{font-size:0.925rem;color:var(--gray-600);line-height:1.6;padding-left:3rem}

/* --- Pagination --- */
.pagination{display:flex;justify-content:center;gap:0.375rem;margin:2.5rem 0;flex-wrap:wrap}
.pagination a,.pagination span{padding:0.5rem 0.875rem;border-radius:0.5rem;font-size:0.875rem;font-weight:500;transition:all 0.15s}
.pagination a{background:#fff;border:1px solid var(--gray-200);color:var(--gray-600)}
.pagination a:hover{background:var(--primary-light);border-color:var(--primary);color:var(--primary);text-decoration:none}
.pagination .current{background:var(--primary);color:#fff;border:1px solid var(--primary)}
.pagination .dots{color:var(--gray-400);border:none;background:none;padding:0.5rem 0.375rem}
.pagination .prev,.pagination .next{font-weight:600}

/* --- Archive & Search --- */
.archive-header{margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:2px solid var(--gray-100)}
.archive-header h1{font-size:1.75rem;margin-bottom:0.35rem;font-weight:800;letter-spacing:-0.02em}
.archive-header p{color:var(--gray-500);font-size:0.925rem}

.search-results-header{margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:2px solid var(--gray-100)}
.search-results-header h1{font-size:1.5rem;font-weight:700;letter-spacing:-0.01em}
.search-results-header p{color:var(--gray-500);font-size:0.875rem;margin-top:0.25rem}

.empty-state{text-align:center;padding:5rem 2rem;color:var(--gray-400)}
.empty-state svg{margin:0 auto 1rem;opacity:0.4}
.empty-state p{font-size:1.05rem}

/* --- Language Switch --- */
.lang-switch{display:inline-flex;gap:0.25rem;font-size:0.8rem}
.lang-switch a{padding:0.2rem 0.5rem;border-radius:0.25rem;color:var(--gray-500)}
.lang-switch a.active{background:var(--primary);color:#fff}
.lang-switch a:hover{text-decoration:none}

/* --- Shortcode Styles --- */
.static-homepage{min-height:40vh;width:100%;max-width:100%;overflow:hidden;word-wrap:break-word;overflow-wrap:break-word}
.static-homepage table{width:100%;border-collapse:collapse;margin:1.5rem 0;border:1px solid var(--gray-200);border-radius:0.5rem;overflow:hidden}
.static-homepage th,.static-homepage td{padding:0.75rem 1rem;text-align:left;border:1px solid var(--gray-200)}
.static-homepage th{font-weight:600;background:var(--gray-50);font-size:0.875rem;color:var(--gray-500)}
.sc-posts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.5rem;margin-bottom:2rem}
.sc-posts-list-view{display:flex;flex-direction:column;gap:1rem;margin-bottom:2rem}
.sc-category-block{margin-bottom:2.5rem}
.sc-category-header h2{font-size:1.35rem;font-weight:700;margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:2px solid var(--gray-100)}
.sc-category-header h2 a{color:var(--gray-900);text-decoration:none}
.sc-category-header h2 a:hover{color:var(--primary)}
.sc-posts-list ul{list-style:none;padding:0}
.sc-list-item{display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--gray-100)}
.sc-list-item a{color:var(--gray-800);font-weight:500;text-decoration:none}
.sc-list-item a:hover{color:var(--primary)}
.sc-date{color:var(--gray-400);font-size:0.8rem;white-space:nowrap;margin-left:1rem}
.sc-posts-mini{display:flex;flex-wrap:wrap;gap:0.5rem}
.sc-posts-mini a{background:var(--gray-100);color:var(--gray-700);padding:0.4rem 0.8rem;border-radius:0.375rem;font-size:0.85rem;text-decoration:none;transition:all 0.15s}
.sc-posts-mini a:hover{background:var(--primary);color:#fff}
.sc-post-short{margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--gray-100)}
.sc-post-short h3{margin-bottom:0.25rem}
.sc-post-short h3 a{color:var(--gray-900);text-decoration:none}
.sc-post-short h3 a:hover{color:var(--primary)}
.sc-post-full{margin-bottom:2rem}
.sc-post-full h2 a{color:var(--gray-900);text-decoration:none}
.sc-post-full h2 a:hover{color:var(--primary)}
.sc-empty{text-align:center;padding:3rem 2rem;color:var(--gray-400);font-size:0.95rem}

/* Menu shortcode */
.sc-menu ul{list-style:none;padding:0;margin:0}
.sc-menu-horizontal>ul{display:flex;flex-wrap:wrap;gap:0.25rem}
.sc-menu-horizontal .sc-menu-item>a{display:block;padding:0.5rem 1rem;color:var(--gray-700);border-radius:0.375rem;transition:all 0.15s;text-decoration:none;font-weight:500}
.sc-menu-horizontal .sc-menu-item>a:hover{background:var(--primary);color:#fff}
.sc-menu-vertical .sc-menu-item>a{display:block;padding:0.5rem 0;color:var(--gray-700);border-bottom:1px solid var(--gray-100);text-decoration:none}
.sc-menu-vertical .sc-menu-item>a:hover{color:var(--primary)}
.sc-submenu{padding-left:1.25rem}

/* Spacer & Divider */
.sc-spacer{width:100%}
.sc-divider{border:none;border-top:1px solid var(--gray-200);margin:1.5rem auto}

/* Search form */
.sc-search-form{margin:1.5rem 0}
.sc-search-inner{display:flex;gap:0.5rem}
.sc-search-input{flex:1;padding:0.65rem 1rem;border:1px solid var(--gray-200);border-radius:var(--radius);font-size:0.95rem;outline:none;transition:border-color 0.15s}
.sc-search-input:focus{border-color:var(--primary)}
.sc-search-btn{padding:0.65rem 1.25rem;background:var(--primary);color:#fff;border:none;border-radius:var(--radius);font-weight:600;cursor:pointer;transition:opacity 0.15s}
.sc-search-btn:hover{opacity:0.9}

/* Gallery */
.sc-gallery{display:grid;gap:0.75rem;margin:1.5rem 0}
.sc-gallery-cols-2{grid-template-columns:repeat(2,1fr)}
.sc-gallery-cols-3{grid-template-columns:repeat(3,1fr)}
.sc-gallery-cols-4{grid-template-columns:repeat(4,1fr)}
.sc-gallery-item{margin:0;overflow:hidden;border-radius:var(--radius)}
.sc-gallery-item img{width:100%;height:auto;display:block;transition:transform 0.3s}
.sc-gallery-item:hover img{transform:scale(1.05)}
.sc-gallery-item figcaption{padding:0.5rem;font-size:0.8rem;color:var(--gray-500);text-align:center}

/* Video */
.sc-video{margin:1.5rem 0;text-align:center}
.sc-video iframe,.sc-video video{max-width:100%;border-radius:var(--radius)}

/* Social media */
.sc-social-links{display:flex;flex-wrap:wrap;gap:0.5rem;margin:1rem 0;align-items:center}
.sc-social-link{display:inline-flex;align-items:center;gap:0.4rem;color:var(--gray-600);text-decoration:none;padding:0.5rem;border-radius:0.375rem;transition:all 0.15s}
.sc-social-link:hover{color:var(--primary);background:var(--gray-100)}
.sc-social-link svg{width:20px;height:20px}

/* Contact form */
.sc-contact-form{max-width:600px;margin:2rem auto;background:#fff;border-radius:var(--radius);padding:2rem;box-shadow:var(--shadow-sm);border:1px solid var(--gray-100)}
.sc-contact-title{font-size:1.25rem;font-weight:700;margin-bottom:1.25rem}
.sc-form-group{margin-bottom:1rem}
.sc-form-group label{display:block;font-weight:500;margin-bottom:0.35rem;font-size:0.875rem;color:var(--gray-700)}
.sc-input,.sc-textarea{width:100%;padding:0.6rem 0.85rem;border:1px solid var(--gray-200);border-radius:var(--radius);font-size:0.9rem;transition:border-color 0.15s;box-sizing:border-box}
.sc-input:focus,.sc-textarea:focus{outline:none;border-color:var(--primary)}
.sc-submit-btn{padding:0.65rem 1.5rem;background:var(--primary);color:#fff;border:none;border-radius:var(--radius);font-weight:600;cursor:pointer;font-size:0.95rem;transition:opacity 0.15s}
.sc-submit-btn:hover{opacity:0.9}
.sc-submit-btn:disabled{opacity:0.5;cursor:not-allowed}
.sc-form-msg{margin-top:1rem;padding:0.75rem;border-radius:var(--radius);font-size:0.875rem}
.sc-form-msg.sc-success{background:#dcfce7;color:#166534}
.sc-form-msg.sc-error{background:#fee2e2;color:#991b1b}

/* Widget */
.sc-widget-area{margin:1.5rem 0}
.sc-widget{margin-bottom:1rem}
.sc-widget .widget-title{font-size:1.1rem;font-weight:700;margin-bottom:0.75rem}

/* Custom HTML */
.sc-custom-html{margin:1rem 0}

/* Hero slider */
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

/* --- Scroll to Top Button --- */
.scroll-top-btn{position:fixed;bottom:2rem;right:2rem;width:48px;height:48px;border-radius:50%;background:var(--primary);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:90;box-shadow:0 4px 15px rgba(0,0,0,0.15),0 2px 6px rgba(0,0,0,0.1);opacity:0;visibility:hidden;transform:translateY(20px) scale(0.8);transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1)}
.scroll-top-btn.visible{opacity:1;visibility:visible;transform:translateY(0) scale(1)}
.scroll-top-btn:hover{background:var(--primary-hover);transform:translateY(-3px) scale(1.08);box-shadow:0 8px 25px rgba(0,0,0,0.2),0 4px 10px rgba(0,0,0,0.12)}
.scroll-top-btn:active{transform:translateY(-1px) scale(1.02);transition-duration:0.1s}
.scroll-top-btn svg{width:22px;height:22px;transition:transform 0.3s ease}
.scroll-top-btn:hover svg{transform:translateY(-2px)}
.scroll-top-btn::after{content:'';position:absolute;inset:-3px;border-radius:50%;border:2px solid var(--primary);opacity:0;transform:scale(1);transition:all 0.4s ease;pointer-events:none}
.scroll-top-btn:hover::after{opacity:0.3;transform:scale(1.15)}
@media(max-width:767px){.scroll-top-btn{bottom:1.25rem;right:1.25rem;width:42px;height:42px}}
` }} />
        {pluginHead && raw(pluginHead)}
        {props.analyticsHead && raw(props.analyticsHead)}
      </head>
      <body>
        {/* Header Ad Bar — embed HTML from aurora worker + custom code */}
        {(theme.header_ad_embed_html || theme.header_ad_code) && (
          <div class="st-header-ad">
            {theme.header_ad_embed_html && raw(theme.header_ad_embed_html)}
            {theme.header_ad_code && raw(theme.header_ad_code)}
          </div>
        )}
        <header class={isGooey ? 'site-header gooey-header' : 'site-header'}>
          <div class="container">
            <div class="site-brand">
              {theme.site_logo && <a href={`${lp}/`}><img class="site-logo" src={theme.site_logo} alt={siteName} /></a>}
              <div>
                <div class="site-title"><a href={`${lp}/`}>{siteName}</a></div>
                {props.siteTagline && <div class="site-tagline">{props.siteTagline}</div>}
              </div>
            </div>
            {/* Mobile hamburger */}
            <button class="mobile-toggle" onclick="document.getElementById('mobile-nav').classList.toggle('open')" aria-label="Menu">
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
              <nav class="site-nav">
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
                            {item.children!.map((child) => {
                              const childActive = cp.startsWith(child.url);
                              return (
                                <li class={`nav-menu-item${childActive ? ' active' : ''}`}>
                                  <a href={child.url} target={child.target}>{child.title}</a>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <form class="search-form" action={`${lp}/search`} method="get">
                  <input type="text" name="q" placeholder={lang === 'tr' ? 'Ara...' : 'Search...'} />
                </form>
              </nav>
            )}
            {/* Mobile nav dropdown */}
            <div class="mobile-nav" id="mobile-nav">
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

        <div class="container content-grid">
          <main>{children}</main>
          {sidebarData && sidebarData.widgets.length > 0 && (
            <aside class="sidebar">
              {sidebarData.widgets.map((widget) => renderW(widget, 'sidebar-widget'))}
            </aside>
          )}
        </div>

        <footer class="site-footer">
          {hasFooterWidgets && sidebarData && (
            <div class="container footer-widgets">
              {(['footer-1', 'footer-2', 'footer-3'] as const).map((area) => {
                const areaWidgets = sidebarData.footerWidgets[area];
                if (areaWidgets.length === 0) return null;
                return (
                  <div class="footer-widget-area">
                    {areaWidgets.map((widget) => renderW(widget, 'footer-widget'))}
                  </div>
                );
              })}
            </div>
          )}
          <div class="container footer-bottom">
            {hidePoweredBy ? (theme.footer_text || '') : (theme.footer_text || `Powered by Worker CMS`)}
          </div>
        </footer>
        {/* Scroll to Top Button */}
        <button class="scroll-top-btn" id="scrollTopBtn" aria-label="Scroll to top" title={lang === 'tr' ? 'Başa dön' : 'Back to top'}>
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
(function(){var ad=document.querySelector('.st-header-ad');if(ad)document.body.classList.add('has-header-ad')})();
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
