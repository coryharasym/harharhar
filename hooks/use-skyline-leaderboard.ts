'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {publishSkylineRun,type SkylineEntry,type SkylineReceipt} from '../lib/skyline-submit';
import {validPlayer,type PlayerProfile} from '../lib/profile';
import {apiUrl} from '../lib/api';
import {useScoreOffer} from './use-score-offer';
const QUEUE='hhh-skyline-score-queue-v1',RECEIPTS='hhh-skyline-score-receipts-v1';
type Input={id:string|null;history:string;finished:boolean;profile:PlayerProfile|null;enabled:boolean};
/** A durable finished-run queue keeps retry fast even when the connection drops. */
export function useSkylineLeaderboard(input:Input){
 const latest=useRef(input);latest.current=input;
 const offers=useScoreOffer(input.id),offerRef=useRef(offers);offerRef.current=offers;
 const queue=useRef<SkylineEntry[]>([]),receipts=useRef<Record<string,SkylineReceipt>>({}),working=useRef(false),mounted=useRef(true),loaded=useRef(false);
 const [revision,setRevision]=useState(0),[saving,setSaving]=useState<string|null>(null),[errors,setErrors]=useState<Record<string,string>>({}),[storageError,setStorageError]=useState(false);
 function changed(){if(mounted.current)setRevision(v=>v+1);}
 function load(){try{
  const list=JSON.parse(localStorage.getItem(QUEUE)||'[]');if(Array.isArray(list))for(const e of list)if(e&&typeof e.id==='string'&&/^[a-f0-9-]{36}$/.test(e.id)&&typeof e.history==='string'&&/^[0-9a-f]+$/.test(e.history)&&e.history.length<=120000&&e.history.length%12===0&&validPlayer(e.profile)&&!queue.current.some(q=>q.id===e.id)&&!receipts.current[e.id])queue.current.push(e);
  const cached=JSON.parse(localStorage.getItem(RECEIPTS)||'{}');for(const [id,r] of Object.entries(cached) as [string,SkylineReceipt][]){if(r&&r.id===id&&Number.isSafeInteger(r.score)&&r.score>=0&&typeof r.published==='boolean'&&typeof r.name==='string'&&!(id in receipts.current))receipts.current[id]=r;}
  queue.current=queue.current.filter(e=>!receipts.current[e.id]);
 }catch{if(mounted.current)setStorageError(true);}}
 function persist(){try{localStorage.setItem(QUEUE,JSON.stringify(queue.current));const values=Object.values(receipts.current).slice(-40);localStorage.setItem(RECEIPTS,JSON.stringify(Object.fromEntries(values.map(r=>[r.id,r]))));}catch{if(mounted.current)setStorageError(true);}}
 const sync=useCallback(async()=>{
  if(working.current)return;working.current=true;load();
  const attempted=new Set<string>();
  try{for(;;){
   const entry=queue.current.find(e=>!attempted.has(e.id)&&!receipts.current[e.id]);if(!entry)break;attempted.add(entry.id);
   if(mounted.current){setSaving(entry.id);setErrors(old=>{const next={...old};delete next[entry.id];return next;});}
   try{const result=await publishSkylineRun(entry,apiUrl('/api/leaderboard'));receipts.current[entry.id]=result;load();queue.current=queue.current.filter(e=>e.id!==entry.id);persist();changed();
    if(result.published){window.dispatchEvent(new CustomEvent('hhh-scores-changed',{detail:{game:'skyline'}}));if(result.rank)window.dispatchEvent(new CustomEvent('hhh-leaderboard',{detail:{game:'skyline',rank:result.rank,score:result.score}}));}
   }catch(e){if(mounted.current)setErrors(old=>({...old,[entry.id]:e instanceof Error?e.message:'Score saving paused.'}));}
  }}finally{working.current=false;if(mounted.current)setSaving(null);}
 },[]);
 useEffect(()=>{mounted.current=true;load();loaded.current=true;changed();void sync();const online=()=>void sync();window.addEventListener('online',online);return()=>{mounted.current=false;window.removeEventListener('online',online);};},[sync]);
 useEffect(()=>{
  if(!loaded.current||!input.enabled||!input.finished||!input.id||!input.profile)return;
  load();if(receipts.current[input.id]){changed();return;}
  if(!queue.current.some(e=>e.id===input.id)){const name=input.profile.name.trim()||'Player';queue.current.push({id:input.id,history:input.history,profile:{...input.profile,name}});persist();changed();void sync();}
 },[input.id,input.history,input.finished,input.profile?.id,input.enabled,sync]);
 const receipt=input.id?receipts.current[input.id]:undefined;
 useEffect(()=>{if(input.finished&&receipt?.published&&receipt.nameEditable)offerRef.current.offerScore({id:receipt.id,score:receipt.score,rank:receipt.rank,name:receipt.name});},[input.finished,receipt?.id,receipt?.nameEditable,revision]);
 const confirm=useCallback(async(name:string)=>{const current=latest.current,r=current.id?receipts.current[current.id]:undefined;const ok=await offerRef.current.editName(name,current.profile,'skyline');if(ok&&r&&name.trim()!==r.name){receipts.current[r.id]={...r,name:name.trim(),nameEditable:false};persist();changed();}return ok;},[]);
 const error=input.id?errors[input.id]:undefined;
 const state=receipt?(receipt.nameEditable&&receipt.published?'editable':'saved'):input.id&&input.id===saving?'saving':error?'error':'idle';
 return {state,rank:receipt?.rank??null,storageError,error,needsName:false,retry:()=>void sync(),confirm,confirmation:offers.confirmation,confirmationOpen:offers.confirmationOpen,openConfirmation:offers.openConfirmation,closeConfirmation:offers.closeConfirmation};
}
