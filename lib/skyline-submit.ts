import {SKYLINE_BATCH_CHARS,SKYLINE_DROP_CHARS,skylineHash} from './skyline-sync.ts';
import type {PlayerProfile} from './profile.ts';
export type SkylineEntry={id:string;history:string;profile:PlayerProfile};
export type SkylineReceipt={id:string;score:number;rank:number|null;published:boolean;name:string;nameEditable:boolean};
type Result={error?:string;verifiedOffset?:number;verifiedHash?:number;finished?:boolean;published?:boolean;rank?:number|null;score?:number;name?:string;nameEditable?:boolean};
/** Retries resume verified chunks and reuse the run ID; they cannot create extra entries. */
export async function publishSkylineRun(entry:SkylineEntry,url='/api/leaderboard',fetcher:typeof fetch=fetch):Promise<SkylineReceipt>{
 let offset=0,conflicts=0;
 for(;;){
  const batch=entry.history.slice(offset,offset+SKYLINE_BATCH_CHARS);
  const response=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:entry.id,name:entry.profile.name,moves:batch,profile:entry.profile,skylineOffset:offset,skylineHash:skylineHash(entry.history.slice(0,offset))}),signal:AbortSignal.timeout(10000)});
  const result=await response.json() as Result;
  if(response.status===409&&conflicts++<4){const next=result.verifiedOffset;if(!Number.isSafeInteger(next)||next!<0||next!>entry.history.length||next!%SKYLINE_DROP_CHARS||skylineHash(entry.history.slice(0,next))!==result.verifiedHash)throw Error('This run changed in another tab.');offset=next!;continue;}
  if(!response.ok)throw Error(result.error||'Score could not be saved.');
  const next=offset+batch.length;
  if(result.verifiedOffset!==next||result.verifiedHash!==skylineHash(entry.history.slice(0,next)))throw Error('Score could not be confirmed.');
  offset=next;if(offset<entry.history.length)continue;
  if(!result.finished||!Number.isSafeInteger(result.score)||result.score!<0)throw Error('This run is not finished.');
  return {id:entry.id,score:result.score!,rank:result.published?result.rank??null:null,published:!!result.published,name:result.name||entry.profile.name,nameEditable:!!result.nameEditable&&!!result.published&&typeof result.rank==='number'&&result.rank>=1&&result.rank<=10};
 }
}
