import {createSkyline,startSkyline,skylinePosition,landing,dropSkyline,stepSkyline,type Floor,type Skyline} from './skyline.ts';
export const SKYLINE_RULES=1,SKYLINE_DROP_CHARS=12,SKYLINE_BATCH_CHARS=7200,INITIAL_SKYLINE_HASH=2166136261;
export type SkylineCheckpoint={offset:number;hash:number;floor:Floor;floors:number;perfects:number;streak:number;over:boolean;micros:number;settle:number};
export function skylineHash(history:string,hash=INITIAL_SKYLINE_HASH){for(let i=0;i<history.length;i++)hash=Math.imul(hash^history.charCodeAt(i),16777619)>>>0;return hash;}
export function encodeSkylineDrop(seconds:number){const micros=Math.round(seconds*1e6);if(!Number.isSafeInteger(micros)||micros<0||micros>0xffffffffffff)throw Error('Invalid drop time');return micros.toString(16).padStart(SKYLINE_DROP_CHARS,'0');}
export function initialSkylineCheckpoint():SkylineCheckpoint{return {offset:0,hash:INITIAL_SKYLINE_HASH,floor:createSkyline().floors[0],floors:0,perfects:0,streak:0,over:false,micros:0,settle:0};}
export function verifySkylineBatch(current:SkylineCheckpoint,offset:number,hash:number,history:string,elapsedMs:number):SkylineCheckpoint{
 if(!Number.isSafeInteger(offset)||offset!==current.offset||hash!==current.hash)throw Error('Progress conflict');
 if(typeof history!=='string'||history.length>SKYLINE_BATCH_CHARS||history.length%SKYLINE_DROP_CHARS||!/^[0-9a-f]*$/.test(history))throw Error('Invalid Skyline input');
 let next={...current};
 for(let i=0;i<history.length;i+=SKYLINE_DROP_CHARS){
  if(next.over)throw Error('Drop after game over');
  const micros=parseInt(history.slice(i,i+SKYLINE_DROP_CHARS),16),x=skylinePosition(next.floor.width,next.floors+1,micros/1e6).x;
  const result=landing(next.floor,x,next.streak);
  next.micros+=next.settle+micros+120000;
  if(!result){next.over=true;next.streak=0;next.settle=0;}else{next.floor=result.floor;next.floors++;next.perfects+=Number(result.floor.perfect);next.streak=result.streak;next.settle=result.floor.reinforced?550000:320000;}
 }
 if(next.micros>Math.max(0,elapsedMs)*1000+1000000)throw Error('Run advances too quickly');
 return {...next,offset:offset+history.length,hash:skylineHash(history,hash)};
}
/** Restore only from valid input history, never a saved client-supplied score or board. */
export function replaySkyline(history:string):Skyline{
 if(history.length%SKYLINE_DROP_CHARS||!/^[0-9a-f]*$/.test(history))throw Error('Invalid saved run');
 let game=startSkyline();
 for(let i=0;i<history.length;i+=SKYLINE_DROP_CHARS){
  if(game.phase==='over')throw Error('Input after game over');
  const seconds=parseInt(history.slice(i,i+SKYLINE_DROP_CHARS),16)/1e6;
  game=stepSkyline(game,seconds);game=stepSkyline(dropSkyline(game),.12);
  if(game.phase!=='over')game=stepSkyline(game,.6);
 }
 return game;
}
export const SKYLINE_SAVE='hhh-skyline-run-v1';
export type SkylineSession={id:string|null;history:string;sweep:number;revision:string};
export function decodeSkylineSession(raw:string):{session:SkylineSession;game:Skyline}|null{
 try{const value=JSON.parse(raw);if(value.version!==1||typeof value.revision!=='string'||!(value.id===null||typeof value.id==='string'&&/^[a-f0-9-]{36}$/.test(value.id))||typeof value.history!=='string'||value.history.length>120000||typeof value.sweep!=='number'||!Number.isFinite(value.sweep)||value.sweep<0||value.sweep>30*86400)return null;
 let game=replaySkyline(value.history);if(game.phase!=='over')game=stepSkyline(game,value.sweep);return {session:{id:value.id,history:value.history,sweep:value.sweep,revision:value.revision},game};}catch{return null;}
}
