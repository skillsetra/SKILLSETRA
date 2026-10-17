"use client";
import {useEffect,useState} from "react";
import AppLayout from "../../components/AppLayout";
import {api} from "../../lib/api";
import {Bell,CheckCheck,RefreshCw} from "lucide-react";
export default function Notifications(){const [items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
async function load(){setLoading(true);try{const r=await api<any>("/api/v1/notifications");setItems(r.items||[]);setError("")}catch(e:any){setError(e.message||"Notifications could not be loaded.")}finally{setLoading(false)}}useEffect(()=>{load()},[]);
async function read(id:string){await api(`/api/v1/notifications/${id}/read`,{method:"POST"}).catch(()=>{});setItems(x=>x.map(n=>n.id===id?{...n,read:true}:n))}
async function all(){await Promise.all(items.filter(x=>!x.read).map(x=>api(`/api/v1/notifications/${x.id}/read`,{method:"POST"}).catch(()=>null)));setItems(x=>x.map(n=>({...n,read:true})))}
return <AppLayout><div className="page"><div className="page-head"><div><div className="eyebrow">Account</div><h1>Notifications</h1><p>Workspace events, evidence updates, challenge results and roadmap changes.</p></div><div className="action-row"><button className="button" onClick={load}><RefreshCw size={13}/> Refresh</button><button className="button" onClick={all}><CheckCheck size={13}/> Mark all read</button></div></div>{error&&<div className="error">{error}</div>}{loading?<div className="empty">Loading notifications…</div>:items.length?<div className="notification-page-list">{items.map(n=><article className={`panel notification-page-item ${n.read?"read":""}`} key={n.id}><Bell size={16}/><div><b>{n.title}</b><p>{n.body}</p><small>{n.created_at||"Recent"}</small></div>{!n.read&&<button className="button" onClick={()=>read(n.id)}>Mark read</button>}</article>)}</div>:<div className="empty">No notifications yet. Complete an assessment, challenge or roadmap step to create one.</div>}</div></AppLayout>}
