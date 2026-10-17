"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import Logo from "./Logo";
import SiteFooter from "./SiteFooter";
import {ArrowRight, ShieldCheck} from "lucide-react";

const links=[
  ["/how-it-works","How it works"],
  ["/features","Features"],
  ["/roadmap","Roadmaps"],
  ["/privacy","Privacy"],
  ["/terms","Terms"],
  ["/contact","Contact"],
  ["/help","Help"]
] as const;

export default function PublicPage({eyebrow,title,children,showCta=true}:{eyebrow:string;title:string;children:React.ReactNode;showCta?:boolean}){
 const path=usePathname();
 return <div className="marketing public-site">
  <a className="skip-to-content" href="#main-content">Skip to main content</a>
  <header className="marketing-nav" role="banner">
   <div className="marketing-brand"><Logo/></div>
   <nav aria-label="Public navigation">
    {links.map(([href,label])=><Link key={href} className={path===href?"active":""} aria-current={path===href?"page":undefined} href={href}>{label}</Link>)}
   </nav>
   <div className="nav-cta"><Link className="btn ghost small" href="/sign-in">Sign in</Link><Link className="btn primary small" href="/sign-up">Get started</Link></div>
  </header>
  <main id="main-content" className="container public-page" tabIndex={-1}>
   <div className="public-hero">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div>
    <div className="public-hero-note"><ShieldCheck size={17}/><span>Evidence-first · AI-assisted · learner controlled</span></div>
   </div>
   <div className="public-copy">{children}</div>
   {showCta&&<div className="public-actions">
    <Link className="btn primary" href="/sign-up">Start with SKILLSETRA <ArrowRight size={15}/></Link>
    <Link className="btn ghost" href="/">Back home</Link>
   </div>}
  </main>
  <SiteFooter/>
 </div>
}
