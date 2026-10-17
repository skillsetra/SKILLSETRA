"use client";
import {useRouter} from "next/navigation";
import {StitchShell} from "../../components/StitchShell";
import { Dashboard } from "../../components/stitch-source/components/Screens/Dashboard";
import type {ScreenId} from "../../components/stitch-source/types";
export default function Page(){
 const router=useRouter();
 const onNavigate=(s:ScreenId)=>{const map:Record<ScreenId,string>={landing:"/",dashboard:"/dashboard",competencies:"/competencies",challenges:"/challenges","project-upgrade":"/projects",career:"/career",roadmap:"/roadmap","project-defense":"/project-defense",diagnostic:"/assessment",profile:"/profile",settings:"/settings"};router.push(map[s]||"/dashboard")};
 return <StitchShell screen="dashboard"><Dashboard onNavigate={onNavigate}/></StitchShell>
}
