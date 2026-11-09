'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useScoreOffer} from './use-score-offer';
import {apiUrl} from '../lib/api';
import {mapleHash,maplePrefix,MAPLE_BATCH_TICKS,type MapleRun} from '../lib/maple-sync';
import type {PlayerProfile} from '../lib/profile';
type Snapshot={run:MapleRun;tick:number;score:number}|null;
export function useMapleLeaderboard(profile:PlayerProfile|null,snapshot:()=>Snapshot,runId:string|null){
 const offers=useScoreOffer(runId);
 const latest=useRef({profile,snapshot});latest.current={profile,snapshot};const pending=useRef<Promise<boolean>|null>(null),mounted=useRef(false),verified=useRef(new Map<string,number>()),announced=useRef('');
 const [state,setState]=useState('idle'),[rank,setRank]=useState<number|null>(null);
 useEffect(()=>{setRank(null);setState('idle');},[runId]);
 const publish=useCallback(async():Promise<boolean>=>{
  while(pending.current){await pending.current;if(!mounted.current)return false;}
  const p=latest.current.profile,s=latest.current.snapshot();if(!p||!s)return true;
  const key=s.run.id;let offset=verified.current.get(key)||0;if(offset===s.tick)return true;setState('saving');
  const task=(async()=>{try{let conflicts=0,result:{name?:string;nameEditable?:boolean;qualified?:boolean;finished?:boolean;rank?:number|null;published?:boolean;score?:number;verifiedOffset?:number;verifiedHash?:number;error?:string}={};
   do{const end=Math.min(s.tick,offset+MAPLE_BATCH_TICKS),prefix=maplePrefix(s.run.moves,offset),batch=maplePrefix(s.run.moves,end).slice(prefix.length);
    const response=await fetch(apiUrl('/api/leaderboard'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:key,name:p.name.trim()||'Player',profile:p,moves:batch,mapleOffset:offset,mapleHash:mapleHash(prefix),mapleEnd:end}),signal:AbortSignal.timeout(15000)});result=await response.json();if(!mounted.current)return false;
    if(response.status===409&&conflicts++<3){const n=result.verifiedOffset;if(!Number.isSafeInteger(n)||(n as number)<0||(n as number)>s.tick||mapleHash(maplePrefix(s.run.moves,n!))!==result.verifiedHash)throw Error('Progress conflict');offset=n!;verified.current.set(key,offset);continue;}
    if(!response.ok||result.verifiedOffset!==end||result.verifiedHash!==mapleHash(maplePrefix(s.run.moves,end)))throw Error(result.error||'Verification failed');offset=end;verified.current.set(key,offset);
   }while(offset<s.tick&&mounted.current);
   if(!mounted.current||latest.current.snapshot()?.run.id!==key)return false;
   if(result.finished&&result.published&&result.nameEditable){offers.offerScore({id:key,score:result.score??s.score,rank:result.rank??null,name:result.name||p.name});setState('editable');}else{offers.clearOffer();setState('saved');}setRank(result.published?result.rank??null:null);
   if(result.finished&&result.published&&result.rank){window.dispatchEvent(new CustomEvent('hhh-scores-changed',{detail:{game:'maple'}}));const token=key+':'+result.rank;if(announced.current!==token){announced.current=token;window.dispatchEvent(new CustomEvent('hhh-leaderboard',{detail:{game:'maple',rank:result.rank,score:result.score}}));}}
   return true;
  }catch{if(mounted.current)setState('error');return false;}finally{pending.current=null;}})();pending.current=task;return task;
 },[]);
 useEffect(()=>{mounted.current=true;const timer=setInterval(()=>{if(!pending.current)void publish();},2000);const online=()=>void publish();window.addEventListener('online',online);return()=>{mounted.current=false;clearInterval(timer);window.removeEventListener('online',online);};},[publish]);
 const flush=useCallback(()=>publish(),[publish]);
 const confirm=useCallback(async(name:string)=>{const ok=await offers.editName(name,latest.current.profile,'maple');if(ok)setState('saved');return ok;},[offers.editName]);
 const retry=useCallback(()=>{void publish();},[publish]);
 return {state,rank,retry,flush,confirm,needsName:!profile?.name.trim(),confirmation:offers.confirmation,confirmationOpen:offers.confirmationOpen,openConfirmation:offers.openConfirmation,closeConfirmation:offers.closeConfirmation};
}
