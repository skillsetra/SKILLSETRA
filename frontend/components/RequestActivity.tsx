"use client";
import {useEffect,useState} from "react";
import {LoaderCircle} from "lucide-react";
type Pending={id:string;busy:boolean;label:string};
export default function RequestActivity(){
 const [items,setItems]=useState<Pending[]>([]),[visible,setVisible]=useState(false);
 useEffect(()=>{
  const starts=new Map<string,Pending>();let showTimer:number|undefined;
  const onStart=(event:Event)=>{const detail=(event as CustomEvent).detail||{};const item={id:String(detail.id||Date.now()),busy:Boolean(detail.busy),label:String(detail.label||"Working…")};starts.set(item.id,item);setItems([...starts.values()]);if(item.busy&&!showTimer){showTimer=window.setTimeout(()=>{setVisible([...starts.values()].some(x=>x.busy));showTimer=undefined},350)}};
  const onFinish=(event:Event)=>{const id=String((event as CustomEvent).detail?.id||"");starts.delete(id);const next=[...starts.values()];setItems(next);if(!next.some(x=>x.busy)){if(showTimer){window.clearTimeout(showTimer);showTimer=undefined}setVisible(false)}};
  window.addEventListener("skillsetra:request-start",onStart);window.addEventListener("skillsetra:request-finish",onFinish);
  return()=>{window.removeEventListener("skillsetra:request-start",onStart);window.removeEventListener("skillsetra:request-finish",onFinish);if(showTimer)window.clearTimeout(showTimer)};
 },[]);
 const current=[...items].reverse().find(x=>x.busy);
 if(!visible||!current)return null;
 return <div className="request-activity-overlay" role="status" aria-live="polite" aria-busy="true"><div className="request-activity-card"><LoaderCircle size={25} className="request-activity-spinner" aria-hidden="true"/><div><b>{current.label}</b><span>Your request is still running. You can continue using other controls while it finishes.</span></div><div className="request-activity-track"><i/></div></div></div>;
}
