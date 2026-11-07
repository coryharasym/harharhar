'use client';
import {useState,useEffect,useRef,useCallback} from 'react';
import {BLOCK_BATCH_CHARS,blockHistoryHash} from '../lib/block-sync';
import {apiUrl} from '../lib/api';
import {type PlayerProfile} from '../lib/profile';
type Input={game:'2048'|'blocks';id:string|null;score:number;moves:string;profile:PlayerProfile|null;enabled:boolean};
type Result={ok?:boolean;published?:boolean;rank?:number|null;score?:number;error?:string;verifiedOffset?:number;verifiedHash?:number};
export function useAutoLeaderboard(input:Input){
 const latest=useRef(input);latest.current=input;
 const [state,setState]=useState<'idle'|'saving'|'saved'|'error'>('idle'),[rank,setRank]=useState<number|null>(null),[revision,setRevision]=useState(0);
 const ack=useRef(new Map<string,number>()),verifiedOffsets=useRef(new Map<string,number>()),pending=useRef<Promise<void>|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{setState('idle');setRank(null);},[input.id]);
 const publish=useCallback(async()=>{
  if(pending.current){await pending.current;if(!mounted.current)return;}
  const s=latest.current;if(!s.id||!s.profile?.name.trim()||s.score<=0||ack.current.get(s.id)===s.score)return;
  if(mounted.current)setState('saving');
  const task=(async()=>{try{let result:Result={},offset=s.game==='blocks'?(verifiedOffsets.current.get(s.id!)||0):0,conflicts=0;
   do{
    const batch=s.game==='blocks'?s.moves.slice(offset,offset+BLOCK_BATCH_CHARS):s.moves;
    const response=await fetch(apiUrl('/api/leaderboard'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id,name:s.profile!.name,moves:batch,profile:s.profile,...(s.game==='blocks'?{blockOffset:offset,blockHash:blockHistoryHash(s.moves.slice(0,offset))}:{})}),signal:AbortSignal.timeout(10000)});
    result=await response.json() as Result;
    if(s.game==='blocks'&&response.status===409&&conflicts++<3){
     const next=result.verifiedOffset;if(typeof next!=='number'||!Number.isSafeInteger(next)||next<0||next>s.moves.length||next%4||blockHistoryHash(s.moves.slice(0,next))!==result.verifiedHash)throw Error('This run changed in another tab.');
     offset=next;verifiedOffsets.current.set(s.id!,offset);continue;
    }
    if(!response.ok)throw Error(result.error);
    if(s.game!=='blocks')break;
    const next=offset+batch.length;
    if(result.verifiedOffset!==next||result.verifiedHash!==blockHistoryHash(s.moves.slice(0,next)))throw Error('Progress could not be confirmed');
    offset=next;verifiedOffsets.current.set(s.id!,offset);if(offset===s.moves.length)break;
   }while(true);
   ack.current.set(s.id!,s.score);
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
