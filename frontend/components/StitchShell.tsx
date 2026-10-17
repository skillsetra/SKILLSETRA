"use client";
import AppShell from './AppShell';
import type {ScreenId} from './stitch-source/types';
export const routes:Record<ScreenId,string>={landing:'/',dashboard:'/dashboard',competencies:'/competencies',challenges:'/challenges','project-upgrade':'/projects',career:'/career',roadmap:'/roadmap','project-defense':'/project-defense',diagnostic:'/assessment',profile:'/profile',settings:'/settings'};
export function StitchShell({children}:{screen:ScreenId;children?:React.ReactNode}){return <AppShell>{children}</AppShell>}
