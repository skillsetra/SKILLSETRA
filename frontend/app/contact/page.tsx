"use client";
import {FormEvent,useEffect,useState} from "react";
import PublicPage from "../../components/PublicPage";
import {api} from "../../lib/api";
import {Send,CheckCircle2,Mail,MessageSquareText,ShieldQuestion,Bug,Clock3} from "lucide-react";

const initial={name:"",email:"",subject:"",message:"",category:"Product question"};
export default function Contact(){
 const[form,setForm]=useState(initial);const[busy,setBusy]=useState(false),[done,setDone]=useState(""),[error,setError]=useState("");
 useEffect(()=>{const t=new URLSearchParams(window.location.search).get("topic");const map:Record<string,string>={privacy:"Privacy or data request",bug:"Technical issue",accessibility:"Accessibility",security:"Security concern"};if(t&&map[t])setForm(x=>({...x,category:map[t]}))},[]);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setDone("");setError("");try{const data:any=await api("/api/v1/contact/public",{method:"POST",body:JSON.stringify({...form,name:form.name.trim(),email:form.email.trim()||null,subject:form.subject.trim(),message:form.message.trim()})});setDone(data.message||"Your message was recorded.");setForm(initial)}catch(e:any){setError(e.message||"We could not record your message. Please try again.")}finally{setBusy(false)}}
 return <PublicPage eyebrow="Contact" title="Tell SKILLSETRA what needs attention.">
  <div className="legal-intro"><p>Use this page for product questions, bugs, accessibility feedback, privacy/data requests or AI-provider issues. In this demo, public messages are held in temporary server-process memory only. They may be lost on restart; there is no durable inbox, ticketing system or email delivery. Do not include sensitive or urgent requests.</p></div>
  <div className="contact-layout">
   <section className="contact-intro-panel">
    <div className="contact-card"><MessageSquareText/><div><b>Product & role workflow</b><p>Ask about target roles, evidence, assessments, learning, projects or competency mapping.</p></div></div>
    <div className="contact-card"><Bug/><div><b>Bug reports</b><p>Tell us the page, action, expected behavior, actual behavior and steps to reproduce.</p></div></div>
    <div className="contact-card"><ShieldQuestion/><div><b>Privacy & security</b><p>Use the privacy category for data requests. Never send passwords, API keys, GitHub tokens or secrets.</p></div></div>
    <div className="contact-card"><Clock3/><div><b>Response expectations</b><p>The demo has no support SLA. A production deployment should publish its support channel and response time.</p></div></div>
   </section>
   <section className="contact-form-panel">
    <div className="form-panel-head"><div><div className="eyebrow">SEND A MESSAGE</div><h2>Give us enough detail to reproduce it.</h2></div><Mail size={18}/></div>
    {done&&<div className="notice" role="status"><CheckCircle2 size={15}/> {done}</div>}
    {error&&<div className="error" role="alert">{error}</div>}
    <form className="public-contact-form" onSubmit={submit}><div className="form-grid">
      <div className="field"><label htmlFor="contact-name">NAME</label><input id="contact-name" required maxLength={120} autoComplete="name" value={form.name} onChange={e=>setForm(x=>({...x,name:e.target.value}))}/></div>
      <div className="field"><label htmlFor="contact-email">EMAIL · OPTIONAL</label><input id="contact-email" type="email" maxLength={320} autoComplete="email" value={form.email} onChange={e=>setForm(x=>({...x,email:e.target.value}))}/></div>
      <div className="field"><label htmlFor="contact-category">CATEGORY</label><select id="contact-category" value={form.category} onChange={e=>setForm(x=>({...x,category:e.target.value}))}><option>Product question</option><option>Technical issue</option><option>AI provider issue</option><option>Privacy or data request</option><option>Security concern</option><option>Accessibility</option><option>Other</option></select></div>
      <div className="field"><label htmlFor="contact-subject">SUBJECT</label><input id="contact-subject" required maxLength={200} value={form.subject} onChange={e=>setForm(x=>({...x,subject:e.target.value}))}/></div>
      <div className="field full"><label htmlFor="contact-message">MESSAGE</label><textarea id="contact-message" required minLength={10} maxLength={6000} className="big-textarea" value={form.message} onChange={e=>setForm(x=>({...x,message:e.target.value}))} placeholder="What happened? What did you expect? What page and action caused it?"/></div>
    </div><div className="contact-form-foot"><small>Do not include credentials, API keys, tokens or other secrets.</small><button className="btn primary" disabled={busy}>{busy?"Recording…":<>Send message <Send size={14}/></>}</button></div></form>
   </section>
  </div>
 </PublicPage>
}
