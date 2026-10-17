"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";
import {useApp} from "../../components/AppProvider";
import {ArrowRight,ShieldCheck,Sparkles} from "lucide-react";
import Logo from "../../components/Logo";
import {supabase} from "../../lib/supabase";
export default function SignIn(){
 const {signIn,demoAvailable,startDemo}=useApp();const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 async function go(e:FormEvent){e.preventDefault();setError("");setBusy(true);try{await signIn(email.trim(),password);window.location.assign("/dashboard")}catch(x:any){setError(x.message||"Unable to sign in")}finally{setBusy(false)}}
 async function beginDemo(){setError("");setBusy(true);try{await startDemo();window.location.assign("/onboarding")}catch(x:any){setError(x.message||"Could not start the demo.")}finally{setBusy(false)}}
 return <main id="main-content" className="locked"><section className="auth-card"><Logo/><div className="eyebrow" style={{marginTop:25}}>SECURE SIGN IN</div><h1>Welcome back to SKILLSETRA.</h1><p>Continue your target-role, evidence, learning and assessment journey.</p>
 {error&&<div className="error" role="alert">{error}</div>}
 {!supabase&&<div className="auth-context" role="note"><strong><ShieldCheck size={16}/> Connect Supabase to sign in</strong><p>Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>frontend/.env.local</code> or the hosting environment, then rebuild/redeploy. Supabase handles password verification.</p></div>}
 <form onSubmit={go}><div className="form-grid" style={{marginTop:18}}><div className="field full"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div><div className="field full"><label htmlFor="password">Password</label><input id="password" autoComplete="current-password" type="password" required minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></div></div><button className="button primary" style={{width:"100%",marginTop:15}} disabled={busy||!supabase||!email.trim()||password.length<8}>{busy?"Signing in…":<>Enter workspace <ArrowRight size={16}/></>}</button></form>
 <p style={{marginTop:18}}>New here? <Link href="/sign-up">Create an account</Link></p>
 {demoAvailable&&<div className="auth-demo-choice"><span>Want to explore without signing in?</span><button type="button" className="button" disabled={busy} onClick={beginDemo}>{busy?"Starting demo…":<>Try a Demo <Sparkles size={16}/></>}</button><small>Your demo workspace stays separate from your Supabase account.</small></div>}
 <nav className="auth-legal-links" aria-label="Legal and help"><Link href="/how-it-works">How it works</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link></nav></section></main>
}
