"use client";
import React from 'react';
import type {ScreenId} from '../../types';
export interface SidebarProps{currentScreen:ScreenId;onNavigate:(screen:ScreenId)=>void;isOpenOnMobile?:boolean;onCloseMobile?:()=>void;collapsed?:boolean;onToggleCollapsed?:()=>void}
export const Sidebar:React.FC<SidebarProps>=()=>null;
export default Sidebar;
