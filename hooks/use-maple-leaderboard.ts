'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {apiUrl} from '../lib/api';
import {mapleHash,maplePrefix,MAPLE_BATCH_TICKS,type MapleRun} from '../lib/maple-sync';
import type {PlayerProfile} from '../lib/profile';
type Snapshot={run:MapleRun;tick:number;score:number}|null;
export function useMapleLeaderboard(profile:PlayerProfile|null,snapshot:()=>Snapshot,runId:string|null){
 const latest=useRef({profile,snapshot});latest.current={profile,snapshot};const busy=useRef(false),mounted=useRef(false),verified=useRef(new Map<string,number>()),announced=useRef('');
 const [state,setState]=useState('idle'),[rank,setRank]=useState<number|null>(null);
 useEffect(()=>{setRank(null);setState('idle');},[runId]);
 const publish=useCallback(async()=>{if(busy.current)return;const p=latest.current.profile,s=latest.current.snapshot();if(!p?.name.trim()||!s)return;const key=s.run.id;let offset=verified.current.get(key)||0;if(offset===s.tick)return;busy.current=true;setState('saving');
 try{let conflicts=0,result:{rank?:number|null;published?:boolean;score?:number;verifiedOffset?:number;verifiedHash?:number;error?:string}={};
 do{const end=Math.min(s.tick,offset+MAPLE_BATCH_TICKS),prefix=maplePrefix(s.run.moves,offset),batch=maplePrefix(s.run.moves,end).slice(prefix.length);
 const response=await fetch(apiUrl('/api/leaderboard'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:key,name:p.name,profile:p,moves:batch,mapleOffset:offset,mapleHash:mapleHash(prefix),mapleEnd:end}),signal:AbortSignal.timeout(15000)});result=await response.json();if(!mounted.current)return;
 if(response.status===409&&conflicts++<3){const n=result.verifiedOffset;if(!Number.isSafeInteger(n)||(n as number)<0||(n as number)>s.tick||mapleHash(maplePrefix(s.run.moves,n!))!==result.verifiedHash)throw Error('Progress conflict');offset=n!;verified.current.set(key,offset);continue;}
 if(!response.ok||result.verifiedOffset!==end||result.verifiedHash!==mapleHash(maplePrefix(s.run.moves,end)))throw Error(result.error||'Verification failed');offset=end;verified.current.set(key,offset);
 }while(offset<s.tick&&mounted.current);
 if(!mounted.current||latest.current.snapshot()?.run.id!==key)return;
 setState('saved');setRank(result.rank??null);
 if(result.published&&result.rank){window.dispatchEvent(new CustomEvent('hhh-scores-changed',{detail:{game:'maple'}}));const token=key+':'+result.rank;if(announced.current!==token){announced.current=token;window.dispatchEvent(new CustomEvent('hhh-leaderboard',{detail:{game:'maple',rank:result.rank,score:result.score}}));}}
 }catch{if(mounted.current)setState('error');}finally{busy.current=false;}},[]);
 useEffect(()=>{mounted.current=true;const timer=setInterval(()=>{void publish();},2000);const online=()=>void publish();window.addEventListener('online',online);return()=>{mounted.current=false;clearInterval(timer);window.removeEventListener('online',online);};},[publish]);
 return {state,rank,retry:publish,needsName:!profile?.name.trim()};
}
