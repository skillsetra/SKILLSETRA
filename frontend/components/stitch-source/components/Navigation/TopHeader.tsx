"use client";
import React from 'react';import type {ScreenId} from '../../types';
export interface TopHeaderProps{currentScreen:ScreenId;onNavigate:(screen:ScreenId)=>void;demoMode?:boolean;setDemoMode?:(value:boolean)=>void;theme?:'dark'|'light';onToggleTheme?:()=>void;onToggleMobileNav?:()=>void;sidebarCollapsed?:boolean;onToggleSidebar?:()=>void}
export const TopHeader:React.FC<TopHeaderProps>=()=>null;
export default TopHeader;
