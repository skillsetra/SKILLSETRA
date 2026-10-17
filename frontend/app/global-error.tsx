"use client";
import {RefreshCw} from "lucide-react";
export default function GlobalError(){return <html lang="en"><body><main className="error-screen"><div className="error-card"><img src="/skillsetra-logo.png" alt="SKILLSETRA" style={{width:220,maxWidth:"72vw",height:"auto",display:"block",margin:"0 auto 20px"}}/><h1>We hit an unexpected application error.</h1><p>Reload the workspace to recover the application.</p><button className="button primary" onClick={()=>location.reload()}><RefreshCw size={14}/> Reload</button></div></main></body></html>}
