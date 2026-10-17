import "./globals.css";import "./polish.css";import Script from "next/script";import {Suspense} from "react";import type {Metadata,Viewport} from "next";import {AppProvider} from "../components/AppProvider";import LocalSessionHeartbeat from "../components/LocalSessionHeartbeat";import {SITE_URL} from "../lib/site";
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover"};
export const metadata:Metadata={
  metadataBase:new URL(SITE_URL),
  title:{default:"Don't Just Say You Know It. Prove It. | SKILLSETRA",template:"%s | SKILLSETRA"},
  description:"Turn skill claims into credible evidence with role-based competencies, project reviews, focused learning, assessments and measurable progress in SKILLSETRA.",
  applicationName:"SKILLSETRA",
  alternates:{canonical:"/"},
  icons:{icon:[{url:"/skillsetra-logo.png",type:"image/png",sizes:"500x500"}],apple:"/skillsetra-logo.png"},
  openGraph:{type:"website",siteName:"SKILLSETRA",title:"Don't Just Say You Know It. Prove It. | SKILLSETRA",description:"Turn skill claims into credible evidence, find role-specific gaps and measure progress through learning, projects and retesting.",images:[{url:"/skillsetra-social.png",width:1200,height:630,alt:"SKILLSETRA — Learn, Build, Prove, Grow"}]},
  twitter:{card:"summary_large_image",title:"Don't Just Say You Know It. Prove It. | SKILLSETRA",description:"Turn skill claims into credible evidence and measurable progress.",images:["/skillsetra-social.png"]},
  robots:{index:true,follow:true,googleBot:{index:true,follow:true,"max-image-preview":"large","max-snippet":-1,"max-video-preview":-1}}
};
const themeBoot=`(()=>{try{const t=localStorage.getItem("skillsetra_theme");const chosen=localStorage.getItem("skillsetra_theme_user_set_v2");const theme=chosen==="1"&&(t==="dark"||t==="light")?t:"light";document.documentElement.dataset.theme=theme;if(chosen!=="1")localStorage.setItem("skillsetra_theme","light")}catch(e){document.documentElement.dataset.theme="light"}})()`;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body><LocalSessionHeartbeat/><a className="skip-to-content" href="#main-content">Skip to main content</a><Script id="skillsetra-theme-boot" strategy="beforeInteractive">{themeBoot}</Script><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({"@context":"https://schema.org","@type":"SoftwareApplication","name":"SKILLSETRA","applicationCategory":"EducationalApplication","operatingSystem":"Web","url":SITE_URL+"/","description":"An evidence-driven competency intelligence platform that helps learners connect target roles, skills, proof, learning and assessments.","image":SITE_URL+"/skillsetra-social.png"})}}/><AppProvider><Suspense fallback={<main className="boot" aria-label="Loading SKILLSETRA"><div className="boot-line" aria-hidden="true"><span/></div></main>}>{children}</Suspense></AppProvider></body></html>}
