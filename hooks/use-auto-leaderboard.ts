'use client';
import {useState,useEffect,useRef,useCallback} from 'react';
import {TIMBER_BATCH_CHARS,timberHash} from '../lib/timber';
import {THREES_BATCH_CHARS,threesHash} from '../lib/threes-session';
import {FLIGHT_BATCH_CHARS,flightHistoryHash} from '../lib/flight-sync';
import {BLOCK_BATCH_CHARS,blockHistoryHash} from '../lib/block-sync';
import {useScoreOffer} from './use-score-offer';
import {apiUrl} from '../lib/api';
import {type PlayerProfile} from '../lib/profile';
type Input={game:'2048'|'blocks'|'tunnel'|'threes'|'dots'|'timber';id:string|null;score:number;moves:string;profile:PlayerProfile|null;enabled:boolean;finished:boolean};
const syncKey=(s:Input)=>`${s.moves.length}:${s.finished?1:0}`;
type Result={name?:string;nameEditable?:boolean;qualified?:boolean;finished?:boolean;ok?:boolean;published?:boolean;rank?:number|null;score?:number;error?:string;verifiedOffset?:number;verifiedHash?:number};
export function useAutoLeaderboard(input:Input){
 const offers=useScoreOffer(input.id);
 const latest=useRef(input);latest.current=input;
 const [state,setState]=useState<'idle'|'saving'|'saved'|'error'|'editable'>('idle'),[rank,setRank]=useState<number|null>(null),[revision,setRevision]=useState(0);
 const ack=useRef(new Map<string,string>()),verifiedOffsets=useRef(new Map<string,number>()),pending=useRef<Promise<boolean>|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{setState('idle');setRank(null);},[input.id]);
 const publish=useCallback(async()=>{
  while(pending.current){await pending.current;if(!mounted.current)return false;}
  const s=latest.current;if((s.game==='2048'||s.game==='threes'||s.game==='dots'||s.game==='timber')&&!s.finished)return true;if(!s.id||!s.profile||s.score<=0||ack.current.get(s.id)===syncKey(s))return true;
  if(mounted.current)setState('saving');
  const task=(async()=>{try{let result:Result={},batched=s.game==='blocks'||s.game==='tunnel'||s.game==='threes'||s.game==='timber',hashFn=s.game==='timber'?timberHash:s.game==='threes'?threesHash:s.game==='tunnel'?flightHistoryHash:blockHistoryHash,batchSize=s.game==='timber'?TIMBER_BATCH_CHARS:s.game==='threes'?THREES_BATCH_CHARS:s.game==='tunnel'?FLIGHT_BATCH_CHARS:BLOCK_BATCH_CHARS,offset=batched?(verifiedOffsets.current.get(s.id!)||0):0,conflicts=0;
   do{
    const batch=batched?s.moves.slice(offset,offset+batchSize):s.moves;
    const response=await fetch(apiUrl('/api/leaderboard'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id,name:s.profile!.name.trim()||'Player',moves:batch,profile:s.profile,...(batched?{[s.game==='timber'?'timberOffset':s.game==='threes'?'threesOffset':s.game==='tunnel'?'flightOffset':'blockOffset']:offset,[s.game==='timber'?'timberHash':s.game==='threes'?'threesHash':s.game==='tunnel'?'flightHash':'blockHash']:hashFn(s.moves.slice(0,offset))}:{})}),signal:AbortSignal.timeout(10000)});
    result=await response.json() as Result;
    if(batched&&response.status===409&&conflicts++<3){
     const next=result.verifiedOffset;if(typeof next!=='number'||!Number.isSafeInteger(next)||next<0||next>s.moves.length||next%(s.game==='timber'||s.game==='threes'?1:s.game==='tunnel'?2:4)||hashFn(s.moves.slice(0,next))!==result.verifiedHash)throw Error('This run changed in another tab.');
     offset=next;verifiedOffsets.current.set(s.id!,offset);continue;
    }
    if(!response.ok)throw Error(result.error);
    if(!batched)break;
    const next=offset+batch.length;
    if(result.verifiedOffset!==next||result.verifiedHash!==hashFn(s.moves.slice(0,next)))throw Error('Progress could not be confirmed');
    offset=next;verifiedOffsets.current.set(s.id!,offset);if(offset===s.moves.length)break;
   }while(true);
   ack.current.set(s.id!,syncKey(s));
   if(mounted.current&&latest.current.id===s.id){if(result.finished&&result.published&&result.nameEditable){offers.offerScore({id:s.id!,score:result.score??s.score,rank:result.rank??null,name:result.name||s.profile!.name});setState('editable');}else{offers.clearOffer();setState('saved');}setRank(result.published?result.rank??null:null);}
   if(result.finished&&result.published&&result.rank){const key='hhh-announced-'+s.game;let previous:{id:string;rank:number}|null=null;try{previous=JSON.parse(localStorage.getItem(key)||'null');}catch{}
    try{localStorage.setItem(key,JSON.stringify({id:s.id,rank:result.rank}));}catch{}
    window.dispatchEvent(new CustomEvent('hhh-scores-changed',{detail:{game:s.game}}));
    if(!previous||previous.id!==s.id||result.rank<previous.rank){window.dispatchEvent(new CustomEvent('hhh-leaderboard',{detail:{game:s.game,rank:result.rank,score:result.score||s.score}}));}
   }
  return true;}catch{if(mounted.current)setState('error');return false;}finally{pending.current=null;if(mounted.current)setRevision(v=>v+1);}})();pending.current=task;return await task;
 },[]);
 useEffect(()=>{if((input.game==='tunnel'||input.game==='2048'||input.game==='threes'||input.game==='dots'||input.game==='timber')&&!input.finished)return;if(!input.enabled||!input.id||!input.profile||input.score<=0||state==='error'||pending.current||ack.current.get(input.id)===syncKey(input))return;const timer=setTimeout(()=>{void publish();},650);return()=>clearTimeout(timer);},[input.game,input.id,input.score,input.moves,input.finished,input.profile?.id,input.profile?.name,input.profile?.icon,input.enabled,revision,state,publish]);
 useEffect(()=>{if(input.game!=='tunnel'||!input.enabled||!input.id||!input.profile||state==='error')return;const timer=setInterval(()=>{void publish();},2000);return()=>clearInterval(timer);},[input.game,input.enabled,input.id,input.profile?.id,input.profile?.name,state==='error',publish]);
 useEffect(()=>{if(input.game!=='tunnel'&&input.game!=='threes'&&input.game!=='dots'&&input.game!=='timber')return;const retry=()=>{if(mounted.current){setState('idle');void publish();}};window.addEventListener('online',retry);return()=>window.removeEventListener('online',retry);},[input.game,publish]);
 const flush=useCallback(()=>publish(),[publish]);
 const confirm=useCallback(async(name:string)=>{const ok=await offers.editName(name,latest.current.profile,latest.current.game);if(ok)setState('saved');return ok;},[offers.editName]);
 const retry=useCallback(()=>{setState('idle');void publish();},[publish]);
 return {state,rank,needsName:input.score>0&&!input.profile?.name.trim(),flush,retry,confirm,confirmation:offers.confirmation,confirmationOpen:offers.confirmationOpen,openConfirmation:offers.openConfirmation,closeConfirmation:offers.closeConfirmation};
}
