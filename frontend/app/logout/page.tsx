"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
import Logo from "../../components/Logo";
import {useApp} from "../../components/AppProvider";
export default function Logout(){
 const {signOut}=useApp();const router=useRouter();
 useEffect(()=>{signOut().finally(()=>router.replace("/"))},[]);
 return <div className="locked-page"><div className="auth-card" style={{textAlign:"center"}}><Logo/><h2>Signing you out…</h2><p className="muted">Your private SKILLSETRA session is being closed.</p></div></div>
}
