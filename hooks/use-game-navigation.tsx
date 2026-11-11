'use client';
import {createContext,useContext,useEffect,useRef} from 'react';
export type GameLeave=(destination:()=>void)=>void;
export const GameNavigationContext=createContext<((handler:GameLeave)=>()=>void)|null>(null);
/** Global mobile navigation must use each game's pause/save/final-score guard. */
export function useGameNavigation(leave:GameLeave,enabled=true){const register=useContext(GameNavigationContext),latest=useRef(leave);latest.current=leave;useEffect(()=>{if(!register||!enabled)return;return register(destination=>latest.current(destination));},[register,enabled]);}
