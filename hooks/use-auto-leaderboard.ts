'use client';
import {useState,useEffect,useRef,useCallback} from 'react';
import {apiUrl} from '../lib/api';
import {type PlayerProfile} from '../lib/profile';
type Input={game:'2048'|'blocks';id:string|null;score:number;moves:string;profile:PlayerProfile|null;enabled:boolean};
type Result={ok?:boolean;published?:boolean;rank?:number|null;score?:number;error?:string};
export function useAutoLeaderboard(input:Input){
 const latest=useRef(input);latest.current=input;
 const [state,setState]=useState<'idle'|'saving'|'saved'|'error'>('idle'),[rank,setRank]=useState<number|null>(null),[revision,setRevision]=useState(0);
 const ack=useRef(new Map<string,number>()),pending=useRef<Promise<void>|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{setState('idle');setRank(null);},[input.id]);
 const publish=useCallback(async()=>{
  if(pending.current){await pending.current;if(!mounted.current)return;}
  const s=latest.current;if(!s.id||!s.profile?.name.trim()||s.score<=0||ack.current.get(s.id)===s.score)return;
  if(mounted.current)setState('saving');
  const task=(async()=>{try{const response=await fetch(apiUrl('/api/leaderboard'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id,name:s.profile!.name,moves:s.moves,profile:s.profile}),signal:AbortSignal.timeout(10000)});const result=await response.json() as Result;if(!response.ok)throw Error(result.error);ack.current.set(s.id!,s.score);
   if(mounted.current&&latest.current.id===s.id){setState('saved');setRank(result.rank??null);}
   if(result.published&&result.rank){const key='hhh-announced-'+s.game;let previous:{id:string;rank:number}|null=null;try{previous=JSON.parse(localStorage.getItem(key)||'null');}catch{}
    try{localStorage.setItem(key,JSON.stringify({id:s.id,rank:result.rank}));}catch{}
    window.dispatchEvent(new CustomEvent('hhh-scores-changed',{detail:{game:s.game}}));
    if(!previous||previous.id!==s.id||result.rank<previous.rank){window.dispatchEvent(new CustomEvent('hhh-leaderboard',{detail:{game:s.game,rank:result.rank,score:result.score||s.score}}));}
   }
  }catch{if(mounted.current)setState('error');}finally{pending.current=null;if(mounted.current)setRevision(v=>v+1);}})();pending.current=task;await task;
 },[]);
 useEffect(()=>{if(!input.enabled||!input.id||!input.profile?.name.trim()||input.score<=0||state==='error'||pending.current||ack.current.get(input.id)===input.score)return;const timer=setTimeout(()=>{void publish();},650);return()=>clearTimeout(timer);},[input.game,input.id,input.score,input.moves,input.profile?.id,input.profile?.name,input.profile?.icon,input.enabled,revision,state,publish]);
 return {state,rank,needsName:input.score>0&&!input.profile?.name.trim(),flush:publish,retry:()=>{setState('idle');void publish();}};
}
