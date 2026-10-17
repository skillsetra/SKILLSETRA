"use client";
import {useEffect} from 'react';
import {AlertTriangle,RefreshCw,ArrowLeft} from 'lucide-react';
export default function Error({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error('SKILLSETRA route error',error)},[error]);
 return <main className="error-screen"><div className="error-card"><div className="error-icon"><AlertTriangle/></div><div className="eyebrow">Something went wrong</div><h1>This SKILLSETRA page could not finish loading.</h1><p>The workspace caught the runtime error so the rest of the application remains recoverable. Try the page again or return to the dashboard.</p><div className="action-row"><button className="button primary" onClick={()=>reset()}><RefreshCw size={14}/> Try again</button><a className="button" href="/dashboard"><ArrowLeft size={14}/> Dashboard</a></div>{error?.digest&&<small>Reference: {error.digest}</small>}</div></main>
}
