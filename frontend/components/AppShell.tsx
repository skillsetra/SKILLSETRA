"use client";
import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode,type UIEvent} from 'react';
import Link from 'next/link';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {Menu,Search,X,Sun,Moon,MoreHorizontal,Bell,RotateCcw,Target,PanelLeftClose,PanelLeftOpen} from 'lucide-react';
import {RequireAuth,useApp} from './AppProvider';
import Logo from './Logo';
import PersistentAICoachLoader from './PersistentAICoachLoader';
import RequestActivity from './RequestActivity';
import NextStep from './NextStep';
import AppFooter from './AppFooter';
import {SECTIONS,searchNavigation,findActiveItem} from './navigation';
import {api} from '../lib/api';

type SidebarNavProps={activeId?:string;activeSectionId?:string;onNavigate:()=>void;targetRole:string;onChangeRole:()=>void;collapsed?:boolean;scrollStorageKey:string};

/** Static, always-expanded navigation: no section dropdowns and no hidden page links. */
function SidebarNav({activeId,activeSectionId,onNavigate,targetRole,onChangeRole,collapsed=false,scrollStorageKey}:SidebarNavProps){
 const scrollRef=useRef<HTMLDivElement|null>(null);
 const key=`skillsetra_sidebar_scroll:${scrollStorageKey}`;
 const setScrollElement=useCallback((el:HTMLDivElement|null)=>{
  scrollRef.current=el;if(!el)return;
  // Ref callbacks run before paint, so route changes restore the previous sidebar position without a visible jump.
  try{const raw=sessionStorage.getItem(key);const saved=raw===null?0:Number(raw);if(Number.isFinite(saved)&&saved>0)el.scrollTop=saved}catch{}
 },[key]);
 const saveScroll=(event:UIEvent<HTMLDivElement>)=>{try{sessionStorage.setItem(key,String(event.currentTarget.scrollTop))}catch{}};
 return <>
  <div ref={setScrollElement} className="sidebar-scroll" onScroll={saveScroll}>
   <div className="sidebar-role">
    <Target aria-hidden="true"/>
    <div className="sidebar-role-copy"><small>TARGET ROLE</small><b>{targetRole||'Not set yet'}</b></div>
    <button type="button" className="sidebar-role-change" onClick={onChangeRole} aria-label={targetRole?'Change target role':'Choose target role'}><RotateCcw size={13}/><span>{targetRole?'Change':'Choose'}</span></button>
   </div>
   <nav aria-label="Primary navigation">{SECTIONS.map(section=>{
    const Icon=section.icon;const hasActive=activeSectionId===section.id;
    return <section key={section.id} className={`nav-section ${hasActive?'has-active':''}`}>
     <div className="nav-section-head">
      <span className="nav-section-icon"><Icon aria-hidden="true"/></span>
      <span className="nav-section-text"><b>{section.label}</b><small>{section.blurb}</small></span>
     </div>
     <div className="nav-sub always-open" id={`nav-panel-${section.id}`} role="group" aria-label={section.label}>
      <div className="nav-sub-inner">{section.children.map(item=>{const ItemIcon=item.icon;const active=item.id===activeId&&hasActive;return <Link key={`${section.id}-${item.id}`} href={item.href} className={`nav-item ${active?'active':''}`} aria-current={active?'page':undefined} aria-label={collapsed?item.label:undefined} title={collapsed?item.label:undefined} onClick={onNavigate}><ItemIcon aria-hidden="true"/><span>{item.label}</span></Link>})}</div>
     </div>
    </section>})}
   </nav>
  </div>
 </>
}

function ShellInner({children}:{children:ReactNode}){
 const pathname=usePathname(); const searchParams=useSearchParams(); const router=useRouter(); const {user,demo,theme,setTheme,setTargetRole}=useApp();
 const [mobile,setMobile]=useState(false),[collapsed,setCollapsed]=useState(false),[query,setQuery]=useState(''),[searchOpen,setSearchOpen]=useState(false),[more,setMore]=useState(false),[notifications,setNotifications]=useState<any[]>([]),[notifOpen,setNotifOpen]=useState(false),[dataResults,setDataResults]=useState<any[]>([]);
 const searchRef=useRef<HTMLInputElement>(null),notifRef=useRef<HTMLDivElement>(null),moreRef=useRef<HTMLDivElement>(null),searchWrapRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{try{setCollapsed(localStorage.getItem('skillsetra_sidebar_collapsed')==='1')}catch{}},[]);
 const toggleSidebar=()=>setCollapsed(value=>{const next=!value;try{localStorage.setItem('skillsetra_sidebar_collapsed',next?'1':'0')}catch{}return next});
 useEffect(()=>{if(!user||user.targetRole?.trim())return;let alive=true;api<any>('/api/v1/profile').then(profile=>{const role=String(profile?.target_role||'').trim();if(alive&&role)setTargetRole(role)}).catch(()=>{});return()=>{alive=false}},[user?.id,user?.targetRole,setTargetRole]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearchOpen(true);searchRef.current?.focus()} if(e.key==='Escape'){setSearchOpen(false);setNotifOpen(false);setMore(false);setMobile(false)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[]);
 // Close popovers when the user clicks somewhere else.
 useEffect(()=>{const onDown=(e:MouseEvent)=>{const t=e.target as Node;if(notifRef.current&&!notifRef.current.contains(t))setNotifOpen(false);if(moreRef.current&&!moreRef.current.contains(t))setMore(false);if(searchWrapRef.current&&!searchWrapRef.current.contains(t))setSearchOpen(false)};document.addEventListener('mousedown',onDown);return()=>document.removeEventListener('mousedown',onDown)},[]);
 useEffect(()=>{let alive=true;api<any>('/api/v1/notifications').then(r=>{if(alive)setNotifications(r.items||[])}).catch(()=>{if(alive)setNotifications([])});return()=>{alive=false}},[pathname]);
 // Lock page scroll behind the mobile drawer.
 useEffect(()=>{document.body.style.overflow=mobile?'hidden':'';return()=>{document.body.style.overflow=''}},[mobile]);
 useEffect(()=>{setMobile(false);setMore(false);setNotifOpen(false)},[pathname]);
 const navResults=useMemo(()=>searchNavigation(query),[query]);
 useEffect(()=>{if(!query.trim()){setDataResults([]);return}let alive=true;const t=window.setTimeout(()=>api<any>(`/api/v1/search?q=${encodeURIComponent(query)}`).then(r=>{if(alive)setDataResults(r.items||[])}).catch(()=>{if(alive)setDataResults([])}),180);return()=>{alive=false;window.clearTimeout(t)}},[query]);
 const results=[...navResults.map(n=>({id:`nav-${n.id}`,label:n.label,group:n.section,href:n.href,icon:n.icon,description:'Product destination'})),...dataResults.map(x=>({id:`data-${x.type}-${x.id}`,label:x.title,group:String(x.type||'').toUpperCase(),href:x.href,icon:Search,description:x.description}))].slice(0,12);
 const activeItem=useMemo(()=>findActiveItem(pathname,searchParams),[pathname,searchParams]);
 const targetRole=user?.targetRole||'';
 const reselectRole=()=>{
  setMobile(false);setMore(false);
  if(targetRole&&!window.confirm('Change your target role? Your existing evidence, assessment history, projects and learning progress will be kept. The new role changes future questions and recommendations.'))return;
  router.push('/onboarding?reset=1');
 };
 const go=(href:string)=>{setQuery('');setSearchOpen(false);setMobile(false);router.push(href)};
 const crumb=activeItem?`${activeItem.section} › ${activeItem.label}`:'SKILLSETRA';
 const nav=(isCollapsed=false,scrollStorageKey="desktop")=><SidebarNav activeId={activeItem?.id} activeSectionId={activeItem?.sectionId} onNavigate={()=>setMobile(false)} targetRole={targetRole} onChangeRole={reselectRole} collapsed={isCollapsed} scrollStorageKey={scrollStorageKey}/>;
 return <div className={`product-shell ${demo?'is-demo':''} ${collapsed?'sidebar-collapsed':''}`}>
  <aside className="product-sidebar" aria-label="Sidebar">
   <div className="sidebar-brand"><Link href="/" className="sidebar-wordmark" aria-label="SKILLSETRA home" title={collapsed?"SKILLSETRA":""}><span className="sidebar-brand-mark" aria-hidden="true">S</span><span className="sidebar-brand-name">SKILLSETRA</span></Link><button type="button" className="sidebar-collapse-toggle" onClick={toggleSidebar} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} aria-pressed={collapsed} title={collapsed?"Expand sidebar":"Collapse sidebar"}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button></div>
   {nav(collapsed)}
   <div className="sidebar-footer">{demo?<div className="demo-badge">DEMO MODE · LOCAL DATA</div>:<div className="demo-badge live">PRODUCTION MODE</div>}</div>
  </aside>
  {mobile&&<div className="mobile-scrim" onClick={()=>setMobile(false)}><aside className="mobile-sidebar" role="dialog" aria-modal="true" aria-label="Navigation menu" onClick={e=>e.stopPropagation()}><div className="sidebar-brand"><Link href="/" className="sidebar-wordmark" aria-label="SKILLSETRA home" onClick={()=>setMobile(false)}><span className="sidebar-brand-mark" aria-hidden="true">S</span><span className="sidebar-brand-name">SKILLSETRA</span></Link><button type="button" onClick={()=>setMobile(false)} aria-label="Close navigation" autoFocus><X/></button></div>{nav(false,"mobile")}</aside></div>}
  <header className="product-topbar"><div className="topbar-main"><Logo compact/><button type="button" className="mobile-menu-button" onClick={()=>setMobile(true)} aria-label="Open navigation" aria-expanded={mobile}><Menu/></button><div className="breadcrumb" aria-live="polite">{crumb}</div><div ref={searchWrapRef} className={`global-search ${searchOpen?'open':''}`}><Search/><input ref={searchRef} value={query} onFocus={()=>setSearchOpen(true)} onChange={e=>{setQuery(e.target.value);setSearchOpen(true)}} onKeyDown={e=>{if(e.key==='Enter'&&results[0])go(results[0].href);if(e.key==='Escape'){setQuery('');setSearchOpen(false)}}} placeholder="Search features, evidence, projects…" aria-label="Search SKILLSETRA" role="combobox" aria-expanded={searchOpen&&!!query} aria-controls="global-search-results"/><kbd>Ctrl K</kbd>{searchOpen&&query&&<div id="global-search-results" className="global-search-results" role="listbox">{results.length?results.map(n=>{const Icon=n.icon;return <button type="button" role="option" aria-selected="false" key={n.id} onClick={()=>go(n.href)}><Icon/><span><b>{n.label}</b><small>{n.group} · {n.description}</small></span></button>}):<div className="search-empty">No matching SKILLSETRA destination.</div>}</div>}</div></div>
   <div className="topbar-actions"><button type="button" className="icon-button" onClick={()=>setTheme(theme==='dark'?'light':'dark')} aria-label={`Switch to ${theme==='dark'?'light':'dark'} theme`} title={`Switch to ${theme==='dark'?'light':'dark'} theme`}>{theme==='dark'?<Sun/>:<Moon/>}</button><div className="notification-wrap" ref={notifRef}><button type="button" className="icon-button" onClick={()=>setNotifOpen(v=>!v)} aria-label="Notifications" aria-expanded={notifOpen}><Bell/>{notifications.some(n=>!n.read)&&<i/>}</button>{notifOpen&&<div className="notification-popover"><div className="popover-title"><span>Notifications</span>{notifications.some(n=>!n.read)&&<button type="button" className="popover-action" onClick={async()=>{await Promise.all(notifications.filter(n=>!n.read).map(n=>api(`/api/v1/notifications/${n.id}/read`,{method:"POST"}).catch(()=>null)));setNotifications(x=>x.map(n=>({...n,read:true})))}}>Mark all read</button>}</div>{notifications.length?notifications.slice(0,6).map(n=><button type="button" className={`notification-item ${n.read?"read":""}`} key={n.id} onClick={async()=>{if(!n.read){await api(`/api/v1/notifications/${n.id}/read`,{method:"POST"}).catch(()=>{});setNotifications(x=>x.map(v=>v.id===n.id?{...v,read:true}:v))}}}><b>{n.title}</b><span>{n.body}</span></button>):<div className="search-empty">No notifications.</div>}<Link href="/notifications" className="popover-link" onClick={()=>setNotifOpen(false)}>View all notifications</Link></div>}</div><div className="mobile-more-wrap" ref={moreRef}><button type="button" className="icon-button mobile-more" onClick={()=>setMore(v=>!v)} aria-label="More controls" aria-expanded={more}><MoreHorizontal/></button>{more&&<div className="mobile-more-menu"><button type="button" onClick={reselectRole}>Change target role</button><Link href="/settings">Settings</Link><Link href="/help">Help</Link></div>}</div><div className="account-menu"><Link href="/profile" className="account-chip"><span>{(user?.name||'L').slice(0,1).toUpperCase()}</span><div><b>{user?.name||'Learner'}</b><small>{targetRole||'Target role not set'}</small></div></Link></div></div>
  </header>
  <main id="main-content" className="product-main" tabIndex={-1}><div className="route-fade" key={pathname}>{children}</div><NextStep pathname={pathname} /><AppFooter/></main>
  <PersistentAICoachLoader/>
  <RequestActivity/>
 </div>
}
export default function AppShell({children}:{children:ReactNode}){return <RequireAuth><ShellInner>{children}</ShellInner></RequireAuth>}
