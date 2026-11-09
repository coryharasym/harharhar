'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
export type ScoreOffer={id:string;score:number;rank:number};
export function useScoreOffer(runId:string|null){
 const current=useRef<ScoreOffer|null>(null);
 const [confirmation,setConfirmation]=useState<ScoreOffer|null>(null),[confirmationOpen,setOpen]=useState(false);
 const clearOffer=useCallback(()=>{current.current=null;setConfirmation(null);setOpen(false);},[]);
 useEffect(()=>{if(current.current?.id!==runId)clearOffer();},[runId,clearOffer]);
 const offerScore=useCallback((value:ScoreOffer)=>{current.current=value;setConfirmation(value);setOpen(true);},[]);
 const openConfirmation=useCallback(()=>{if(current.current)setOpen(true);},[]);
 const closeConfirmation=useCallback(()=>setOpen(false),[]);
 const hasPending=useCallback(()=>!!current.current,[]);
 return {confirmation,confirmationOpen,offerScore,clearOffer,openConfirmation,closeConfirmation,hasPending};
}
