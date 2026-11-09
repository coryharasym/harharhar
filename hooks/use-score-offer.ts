'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {apiUrl} from '../lib/api';
import type {PlayerProfile} from '../lib/profile';
export type ScoreOffer={id:string;score:number;rank:number|null;name:string};
export function useScoreOffer(runId:string|null){
 const current=useRef<ScoreOffer|null>(null);
 const [confirmation,setConfirmation]=useState<ScoreOffer|null>(null),[confirmationOpen,setOpen]=useState(false);
 const clearOffer=useCallback(()=>{current.current=null;setConfirmation(null);setOpen(false);},[]);
 useEffect(()=>{if(current.current?.id!==runId)clearOffer();},[runId,clearOffer]);
 const offerScore=useCallback((value:ScoreOffer)=>{const fresh=current.current?.id!==value.id;current.current=value;setConfirmation(value);if(fresh)setOpen(true);},[]);
 const openConfirmation=useCallback(()=>{if(current.current)setOpen(true);},[]);
 const closeConfirmation=useCallback(()=>setOpen(false),[]);
 const editName=useCallback(async(name:string,profile:PlayerProfile|null,game:string)=>{
  const offer=current.current;if(!offer||!profile)return false;
  if(name.trim()===offer.name){setOpen(false);return true;}
  try{const response=await fetch(apiUrl('/api/leaderboard'),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:offer.id,name,profile:{...profile,name:profile.name.trim()||offer.name}}),signal:AbortSignal.timeout(10000)});if(!response.ok)return false;
   if(current.current?.id===offer.id)clearOffer();window.dispatchEvent(new CustomEvent('hhh-scores-changed',{detail:{game}}));return true;
  }catch{return false;}
 },[clearOffer]);
 return {confirmation,confirmationOpen,offerScore,clearOffer,openConfirmation,closeConfirmation,editName};
}
