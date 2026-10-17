"use client";
import {createContext,useContext,useEffect,useMemo,useState} from "react";
import type {Session} from "@supabase/supabase-js";
import {supabase} from "../lib/supabase";
import Logo from "./Logo";
import {DEMO_ENABLED} from "../lib/demo";

type User={id:string;name:string;email:string;targetRole:string;isDemo?:boolean};
type SignUpResult={authenticated:boolean;confirmationRequired:boolean};
type Ctx={user:User|null;loading:boolean;demo:boolean;demoAvailable:boolean;language:string;setLanguage:(x:string)=>void;theme:"dark"|"light";setTheme:(x:"dark"|"light")=>void;startDemo:()=>Promise<void>;setTargetRole:(x:string)=>void;signIn:(e:string,p:string)=>Promise<void>;signUp:(n:string,e:string,p:string)=>Promise<SignUpResult>;signOut:()=>Promise<void>};
const demoEnabled=DEMO_ENABLED;
const C=createContext<Ctx>({user:null,loading:true,demo:false,demoAvailable:demoEnabled,language:"English",setLanguage:()=>{},theme:"light",setTheme:()=>{},startDemo:async()=>{},signIn:async()=>{},signUp:async()=>({authenticated:false,confirmationRequired:true}),signOut:async()=>{},setTargetRole:()=>{}});
function readStorage(key:string){try{return localStorage.getItem(key)}catch{return null}}
function writeStorage(key:string,value:string){try{localStorage.setItem(key,value);return true}catch{return false}}
function removeStorage(key:string){try{localStorage.removeItem(key)}catch{}}
function saveSessionCookie(name:string){try{document.cookie=`${name}=1; Path=/; SameSite=Lax${location.protocol==="https:"?"; Secure":""}`}catch{}}
function clearSessionCookie(name:string){try{document.cookie=`${name}=; Path=/; Max-Age=0; SameSite=Lax${location.protocol==="https:"?"; Secure":""}`}catch{}}
function newId(){try{if(typeof crypto!=="undefined"&&crypto.randomUUID)return crypto.randomUUID();if(typeof crypto!=="undefined"&&crypto.getRandomValues){const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&0x0f)|0x40;b[8]=(b[8]&0x3f)|0x80;const h=Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`}}catch{}return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==="x"?r:(r&0x3|0x8)).toString(16)})}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function saveDemo(u:User){const demoUser={...u,isDemo:true,email:""};writeStorage("skillsetra_demo_session_id",demoUser.id);writeStorage("skillsetra_demo_user",JSON.stringify(demoUser));removeStorage("skillsetra_access_token");saveSessionCookie("skillsetra_demo_session");clearSessionCookie("skillsetra_session")}
function clearDemo(){removeStorage("skillsetra_demo_user");removeStorage("skillsetra_demo_session_id");clearSessionCookie("skillsetra_demo_session")}
function savedTargetRole(userId:string,fallback:string=""){return readStorage(`skillsetra_target_role:${userId}`)||fallback}
function restoreDemoUser():User|null{
 try{
  const raw=readStorage("skillsetra_demo_user"),sessionId=readStorage("skillsetra_demo_session_id");
  if(!raw||!sessionId){if(raw||sessionId)clearDemo();return null}
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed.id!=="string"||!UUID.test(parsed.id)||parsed.id!==sessionId){clearDemo();return null}
  return {id:parsed.id,name:String(parsed.name||"Demo Learner"),email:"",targetRole:String(parsed.targetRole||""),isDemo:true};
 }catch{clearDemo();return null}
}
function applySupabaseSession(session:Session){
 const u=session.user;
 clearDemo();
 writeStorage("skillsetra_access_token",session.access_token);saveSessionCookie("skillsetra_session");
 return {id:u.id,name:String(u.user_metadata?.name||u.email?.split("@")[0]||"Learner"),email:u.email||"",targetRole:savedTargetRole(u.id,String(u.user_metadata?.target_role||"")),isDemo:false};
}
export function AppProvider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[language,setLanguageState]=useState("English"),[theme,setThemeState]=useState<"dark"|"light">("light"),[preferencesReady,setPreferencesReady]=useState(false);
 useEffect(()=>{
  let active=true;let authSubscription:{unsubscribe:()=>void}|undefined;
  const storedLanguage=readStorage("skillsetra_language");if(storedLanguage&&["English","Hindi","Gujarati","Spanish"].includes(storedLanguage))setLanguageState(storedLanguage);
  const storedTheme=readStorage("skillsetra_theme"),chosen=readStorage("skillsetra_theme_user_set_v2");
  if(chosen==="1"&&(storedTheme==="dark"||storedTheme==="light"))setThemeState(storedTheme);else setThemeState("light");
  setPreferencesReady(true);
  const init=async()=>{
   try{
    if(supabase){
     const {data,error}=await supabase.auth.getSession();if(error)throw error;if(!active)return;
     if(data.session){setUser(applySupabaseSession(data.session))}
     else{removeStorage("skillsetra_access_token");clearSessionCookie("skillsetra_session");setUser(restoreDemoUser())}
     const listener=supabase.auth.onAuthStateChange((event,session)=>{
      if(!active)return;
      if(session){setUser(applySupabaseSession(session))}
      else if(event==="SIGNED_OUT"){
       removeStorage("skillsetra_access_token");clearSessionCookie("skillsetra_session");setUser(null)
      }
     });authSubscription=listener.data.subscription;
    }else{
     if(active)setUser(restoreDemoUser());
    }
   }catch{
    if(active){removeStorage("skillsetra_access_token");clearSessionCookie("skillsetra_session");setUser(restoreDemoUser())}
   }finally{if(active)setLoading(false)}
  };
  void init();
  return()=>{active=false;authSubscription?.unsubscribe()};
 },[]);
 useEffect(()=>{if(!preferencesReady)return;try{document.documentElement.dataset.theme=theme;writeStorage("skillsetra_theme",theme)}catch{}},[theme,preferencesReady]);
 useEffect(()=>{if(!preferencesReady)return;try{document.documentElement.lang=language==="Hindi"?"hi":language==="Gujarati"?"gu":language==="Spanish"?"es":"en";writeStorage("skillsetra_language",language)}catch{}},[language,preferencesReady]);
 const startDemo=async()=>{
  if(!demoEnabled)throw new Error("Demo mode is disabled in this deployment.");
  if(supabase&&!user?.isDemo){try{await supabase.auth.signOut()}catch{/* Local demo remains separate even if the remote sign-out request fails. */}}
  clearDemo();removeStorage("skillsetra_access_token");clearSessionCookie("skillsetra_session");setUser(null);
  const sessionId=newId();if(!writeStorage("skillsetra_demo_session_id",sessionId))throw new Error("Browser storage is unavailable. Enable site storage to start a demo workspace.");
  const ctrl=new AbortController();const timer=window.setTimeout(()=>ctrl.abort(),10000);let response:Response;
  try{response=await fetch("/api/v1/demo/reset",{method:"POST",headers:{"X-SKILLSETRA-Demo-Session":sessionId},signal:ctrl.signal})}
  catch{removeStorage("skillsetra_demo_session_id");throw new Error("Cannot reach the SKILLSETRA backend. Start the API and try again.")}
  finally{window.clearTimeout(timer)}
  if(!response.ok){removeStorage("skillsetra_demo_session_id");throw new Error(response.status===404||response.status===503?"Demo is not enabled on the backend. Set DEMO_MODE=true; on production also set ALLOW_PRODUCTION_DEMO=true only if you want public demo access.":`Could not create a fresh demo workspace (HTTP ${response.status}). Please retry.`)}
  const u:User={id:sessionId,name:"Demo Learner",email:"",targetRole:"",isDemo:true};saveDemo(u);setUser(u);
 };
 const signIn=async(e:string,p:string)=>{
  if(!supabase)throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then rebuild/redeploy.");
  const {data,error}=await supabase.auth.signInWithPassword({email:e,password:p});if(error||!data.session||!data.user)throw new Error(error?.message||"Unable to sign in");
  clearDemo();setUser(applySupabaseSession(data.session));
 };
 const signUp=async(n:string,e:string,p:string):Promise<SignUpResult>=>{
  if(p.length<8)throw new Error("Use at least 8 characters.");
  if(!supabase)throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then rebuild/redeploy.");
  const {data,error}=await supabase.auth.signUp({email:e,password:p,options:{data:{name:n,target_role:""}}});if(error)throw new Error(error.message);
  if(data.session&&data.user){clearDemo();setUser(applySupabaseSession(data.session));return {authenticated:true,confirmationRequired:false}}
  return {authenticated:false,confirmationRequired:Boolean(data.user)};
 };
 const setTargetRole=(role:string)=>{
  if(!user)return;const next={...user,targetRole:role};setUser(next);writeStorage(`skillsetra_target_role:${user.id}`,role);
  if(user.isDemo){saveDemo(next);return}
  if(supabase){void supabase.auth.updateUser({data:{target_role:role}}).catch(()=>undefined);void (async()=>{try{await supabase.from("profiles").upsert({id:user.id,name:user.name,target_role:role,updated_at:new Date().toISOString()},{onConflict:"id"})}catch{/* The local role remains usable if the optional profile update is temporarily unavailable. */}})()}
 };
 const signOut=async()=>{
  if(user?.isDemo){clearDemo();setUser(null);return}
  if(supabase){const {error}=await supabase.auth.signOut();if(error)throw error}
  removeStorage("skillsetra_access_token");clearSessionCookie("skillsetra_session");setUser(null)
 };
 const value=useMemo(()=>({user,loading,demo:Boolean(user?.isDemo),demoAvailable:demoEnabled,language,setLanguage:(x:string)=>setLanguageState(x),theme,setTheme:(x:"dark"|"light")=>{writeStorage("skillsetra_theme_user_set_v2","1");setThemeState(x)},startDemo,setTargetRole,signIn,signUp,signOut}),[user,loading,language,theme]);
 return <C.Provider value={value}>{children}</C.Provider>
}
export const useApp=()=>useContext(C);
export function RequireAuth({children}:{children:React.ReactNode}){
 const {user,loading,demoAvailable,startDemo}=useApp();const [mounted,setMounted]=useState(false);const [demoError,setDemoError]=useState("");useEffect(()=>{setMounted(true)},[]);
 async function beginDemo(){setDemoError("");try{await startDemo();window.location.assign("/onboarding")}catch(e:any){setDemoError(e?.message||"Could not start the demo.")}}
 if(!mounted||loading)return <main className="boot" aria-label="Loading SKILLSETRA"><img className="loading-logo" src="/skillsetra-logo.png" alt="SKILLSETRA"/><div className="boot-line" aria-hidden="true"><span/></div></main>;
 if(!user)return <div className="locked"><div className="auth-card"><Logo/><h2>Your competency workspace is private.</h2><p>Sign in or create an account to continue your evidence-driven career workspace.</p><div className="action-row"><a className="button primary" href="/sign-in">Sign in</a><a className="button" href="/sign-up">Let's Start</a></div>{demoAvailable&&<button type="button" className="button" onClick={beginDemo} style={{width:"100%",marginTop:10}}>Try a Demo</button>}{demoError&&<p role="alert" className="error">{demoError}</p>}</div></div>;
 return <>{children}</>;
}
