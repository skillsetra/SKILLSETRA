"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {PublicLanding} from "../components/stitch-source/components/Screens/PublicLanding";
import {useApp} from "../components/AppProvider";
export default function Home(){
  const router=useRouter();
  const {demoAvailable,startDemo}=useApp();
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const begin=async()=>{
    if(busy)return;
    if(!demoAvailable){setError("Demo mode is disabled for this deployment. Use Let’s Get Started to create an account.");return}
    setError("");setBusy(true);
    try{await startDemo();router.push("/onboarding")}
    catch(e:any){setError(e?.message||"Could not start the demo. Please try again.")}
    finally{setBusy(false)}
  };
  return <>
    {(error||busy)&&<div role={error?"alert":"status"} style={{position:"fixed",top:12,left:"50%",transform:"translateX(-50%)",zIndex:1000,maxWidth:"92vw",padding:"10px 16px",borderRadius:10,background:error?"#7f1d1d":"#134e4a",color:"#fff",fontSize:14,boxShadow:"0 6px 24px rgba(0,0,0,.35)"}}>{error||"Starting your demo workspace…"}</div>}
    <PublicLanding onDemo={begin}/>
  </>;
}
