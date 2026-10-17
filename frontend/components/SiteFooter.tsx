"use client";
import Link from "next/link";
import Logo from "./Logo";
import {ArrowUp,Mail,ShieldCheck,FileText,Bug,Accessibility} from "lucide-react";

/** Full footer for public pages (landing, About, Features, Privacy, Terms, Contact, …). */
export default function SiteFooter(){
 const top=()=>{if(typeof window==="undefined")return;const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;window.scrollTo({top:0,behavior:reduce?"auto":"smooth"})};
 return <footer className="site-footer" aria-label="Site footer">
  <div className="site-footer-grid">
   <div className="site-footer-brand">
    <div className="marketing-brand footer-brand"><Logo/></div>
    <p>Learn · Build · Prove · Grow</p>
    <small>Competency intelligence that keeps claims, evidence and AI interpretation clearly separate.</small>
   </div>
   <div><h2>Product</h2><Link href="/how-it-works">How it works</Link><Link href="/features">Features</Link><Link href="/roadmap">Roadmaps</Link><Link href="/about">About</Link></div>
   <div><h2>Trust &amp; policy</h2><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms of use</Link><Link href="/privacy#privacy-03">AI processing</Link><Link href="/privacy#privacy-08">Your controls</Link></div>
   <div><h2>Support</h2><Link href="/help">Help &amp; getting started</Link><Link href="/contact"><Mail size={13}/> Contact support</Link><Link href="/contact?topic=privacy"><ShieldCheck size={13}/> Privacy &amp; data request</Link><Link href="/contact?topic=bug"><Bug size={13}/> Report a bug</Link><Link href="/contact?topic=accessibility"><Accessibility size={13}/> Accessibility feedback</Link></div>
  </div>
  <div className="site-footer-bottom">
   <span>© 2026 SKILLSETRA · <FileText size={12} aria-hidden="true"/> Last reviewed 11 October 2026</span>
   <span>AI output can be wrong — review it before consequential decisions.</span>
   <button type="button" className="back-to-top" onClick={top}><ArrowUp size={14}/> Back to top</button>
  </div>
 </footer>
}
