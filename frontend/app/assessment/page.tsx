"use client";
import {useRouter} from "next/navigation";import {useEffect,useState} from "react";
import {StitchShell} from "../../components/StitchShell";
import { DiagnosticAssessment } from "../../components/stitch-source/components/Screens/DiagnosticAssessment";
import type {ScreenId} from "../../components/stitch-source/types";
export default function Page(){
 const router=useRouter();const [retestInfo,setRetestInfo]=useState("");useEffect(()=>{const q=new URLSearchParams(window.location.search);if(q.get("mode")==="retest"&&q.get("role"))setRetestInfo(q.get("role")||"")},[]);
 const onNavigate=(s:ScreenId)=>{const map:Record<ScreenId,string>={landing:"/",dashboard:"/dashboard",competencies:"/competencies",challenges:"/challenges","project-upgrade":"/projects",career:"/career",roadmap:"/roadmap","project-defense":"/project-defense",diagnostic:"/assessment",profile:"/profile",settings:"/settings"};router.push(map[s]||"/dashboard")};
 return <StitchShell screen="diagnostic">{retestInfo&&<div className="panel" style={{margin:"18px 18px 0",padding:14}}><div className="eyebrow">Role-specific retest requested</div><b>{retestInfo}</b><p className="muted">Use this assessment to validate your current skills. Check the question set against the selected role before treating the result as role-specific.</p></div>}<DiagnosticAssessment onNavigate={onNavigate}/></StitchShell>
}
