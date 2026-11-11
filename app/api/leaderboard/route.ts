import {replayDots,DOTS_COUNTDOWN,DOTS_DURATION} from '../../../lib/dots';
import {initialThreesCheckpoint,verifyThreesBatch,type ThreesCheckpoint} from '../../../lib/threes-session';
import {ended as threesEnded,score as threesScore} from '../../../lib/threes';
import {initialMapleCheckpoint,verifyMapleBatch,type MapleCheckpoint} from '../../../lib/maple-sync';
import {initialFlightCheckpoint,verifyFlightBatch,type FlightCheckpoint,FLIGHT_RULES} from '../../../lib/flight-sync';
import {LEADERBOARD_SQL,LEADERBOARD_LIMIT,candidateRank,type RankedScore} from '../../../lib/leaderboard';
import {env} from 'cloudflare:workers';
import {isAllowedOrigin} from '../../../lib/cors';
import {getDb} from '../../../db';
import {runs,scores} from '../../../db/schema';
import {eq,gte,and,sql,isNull} from 'drizzle-orm';
import {replay,ended} from '../../../lib/game';
import {replayBlocks as replayLegacyBlocks,hasBlockMoves as hasLegacyBlockMoves} from '../../../lib/blocks-legacy';
import {hasBlockMoves} from '../../../lib/blocks';
import {initialBlockCheckpoint,verifyBlockBatch,type BlockCheckpoint} from '../../../lib/block-sync';
import {savePlayer,ProfileError} from '../../../lib/player-server';
export async function GET(request:Request){try{const params=new URL(request.url).searchParams,game=params.get('game')||'2048';if(!['2048','blocks','tunnel','maple','threes','dots'].includes(game))return Response.json({error:'Unknown game.'},{status:400});const cutoff=params.get('period')==='week'?Date.now()-7*86400000:0;
 const rows=await env.DB!.prepare(LEADERBOARD_SQL).bind(game,cutoff).all();return Response.json({scores:rows.results},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'The leaderboard is temporarily unavailable. Please try again.'},{status:503});}}
export async function POST(request:Request){
 if(!isAllowedOrigin(request))return Response.json({error:'Request origin is invalid.'},{status:403});
 try {const raw=await request.text();if(raw.length>20000)return Response.json({error:'Run is too long to submit.'},{status:400});const payload=JSON.parse(raw),{id,moves}=payload;let name=payload.name;
 if(typeof id!=='string'||id.length>64||typeof name!=='string'||!name.trim()||name.trim().length>18||/[<>\x00-\x1f]/.test(name)||typeof moves!=='string'||moves.length>16000)return Response.json({error:'Enter a player name and play a few moves first.'},{status:400});
 const db=getDb();const [run]=await db.select().from(runs).where(and(eq(runs.id,id),gte(runs.created,Date.now()-30*86400000)));if(!run)return Response.json({error:'This run has expired. Start a new game to submit a score.'},{status:400});
 let finished=false;let score:number,tile=0,lines=0,count:number,checkpoint:BlockCheckpoint|null=null,flightCheckpoint:FlightCheckpoint|null=null,mapleCheckpoint:MapleCheckpoint|null=null,threesCheckpoint:ThreesCheckpoint|null=null;
 const progressConflict=(value:string|null)=>{const current=value?JSON.parse(value) as BlockCheckpoint:initialBlockCheckpoint(run.seed,run.rules);return Response.json({error:'Progress changed. Sync again.',verifiedOffset:current.offset,verifiedHash:current.hash},{status:409});};
 try{if(run.game==='dots'){
  if(run.rules!==1)throw Error('Unsupported Dots rules');
  const g=replayDots(run.seed,moves);
  const elapsed=Date.now()-run.created-DOTS_COUNTDOWN;
  const last=moves.split(';').filter(Boolean).at(-1)?.split(':')[0];
  if(last&&parseInt(last,36)>elapsed)throw Error('Move is in the future');
  finished=elapsed>=DOTS_DURATION;score=g.score;lines=g.loops;tile=g.biggest;count=g.moves;
 }else if(run.game==='threes'){
  if(run.rules!==1)throw Error('Unsupported Threes rules');
  const current=run.blockCheckpoint?JSON.parse(run.blockCheckpoint) as ThreesCheckpoint:initialThreesCheckpoint(run.seed);
  if(payload.threesOffset!==current.offset||payload.threesHash!==current.hash)return Response.json({error:'Progress changed. Sync again.',verifiedOffset:current.offset,verifiedHash:current.hash},{status:409});
  threesCheckpoint=verifyThreesBatch(current,payload.threesOffset,payload.threesHash,moves);
  const g=threesCheckpoint.state.game;finished=threesEnded(g.board);score=threesScore(g.board);tile=Math.max(...g.board.map(t=>t?.value||0));count=g.moves;
 }else if(run.game==='maple'){
  if(run.rules!==2)throw Error('Unsupported Maple rules');
  const current=run.blockCheckpoint?JSON.parse(run.blockCheckpoint) as MapleCheckpoint:initialMapleCheckpoint(run.seed);
  if(payload.mapleOffset!==current.offset||payload.mapleHash!==current.hash)return Response.json({error:'Progress changed. Sync again.',verifiedOffset:current.offset,verifiedHash:current.hash},{status:409});
  mapleCheckpoint=verifyMapleBatch(current,payload.mapleOffset,payload.mapleHash,moves,payload.mapleEnd,Date.now()-run.created);
  finished=mapleCheckpoint.game.over;score=mapleCheckpoint.game.score;tile=mapleCheckpoint.game.highest;lines=mapleCheckpoint.game.world.merges;count=mapleCheckpoint.game.world.drops;
 }else if(run.game==='tunnel'){
  if(run.rules!==FLIGHT_RULES)throw Error('Unsupported flight');
  const current=run.blockCheckpoint?JSON.parse(run.blockCheckpoint) as FlightCheckpoint:initialFlightCheckpoint(run.seed);
  if(payload.flightOffset!==current.offset||payload.flightHash!==current.hash)return Response.json({error:'Progress changed. Sync again.',verifiedOffset:current.offset,verifiedHash:current.hash},{status:409});
  flightCheckpoint=verifyFlightBatch(current,payload.flightOffset,payload.flightHash,moves,Date.now()-run.created);
  finished=flightCheckpoint.game.hp<=0;score=flightCheckpoint.game.score;lines=flightCheckpoint.game.crystals;count=flightCheckpoint.game.ticks;
 }else if(run.game==='blocks'&&(run.rules===2||run.rules===3)){
  const current=run.blockCheckpoint?JSON.parse(run.blockCheckpoint) as BlockCheckpoint:initialBlockCheckpoint(run.seed,run.rules);
  if(payload.blockOffset!==current.offset||payload.blockHash!==current.hash)return progressConflict(run.blockCheckpoint);
  checkpoint=verifyBlockBatch(current,payload.blockOffset,payload.blockHash,moves);
  finished=!hasBlockMoves(checkpoint.game);score=checkpoint.game.score;lines=checkpoint.game.lines;count=checkpoint.offset/4;
 }else if(run.game==='blocks'){const g=replayLegacyBlocks(run.seed,moves);finished=!hasLegacyBlockMoves(g);score=g.score;lines=g.lines;count=moves.length/4;}
 else{const g=replay(run.seed,moves);finished=ended(g);score=g.score;tile=Math.max(...g.board);count=moves.length;}}
 catch{return Response.json({error:'This run could not be verified.'},{status:400});}if(score<=0&&!mapleCheckpoint)return Response.json({error:'Earn some points before submitting.'},{status:400});

 const profile=payload.profile?await savePlayer({...payload.profile,name:typeof payload.profile.name==='string'&&payload.profile.name.trim()?payload.profile.name:name},false):null;
 const playerId=profile?.id||null,now=Date.now();
 const [previousRun]=await db.select().from(scores).where(eq(scores.id,id));
 if(previousRun?.playerId&&previousRun.playerId!==playerId)return Response.json({error:'This run belongs to another profile.'},{status:403});
 // Commit verified progress even when this score does not qualify for the top ten.
 const progress=threesCheckpoint||mapleCheckpoint||flightCheckpoint||checkpoint;
 if(progress&&progress.offset!== (run.blockCheckpoint?JSON.parse(run.blockCheckpoint).offset:0)){
  const updated=await db.update(runs).set({blockCheckpoint:JSON.stringify(progress),...((flightCheckpoint||mapleCheckpoint||threesCheckpoint)?{}:{created:now})}).where(and(eq(runs.id,id),run.blockCheckpoint===null?isNull(runs.blockCheckpoint):eq(runs.blockCheckpoint,run.blockCheckpoint))).returning({id:runs.id});
  if(!updated.length){const [current]=await db.select().from(runs).where(eq(runs.id,id));return (flightCheckpoint||mapleCheckpoint||threesCheckpoint)?Response.json({error:'Progress changed. Sync again.',verifiedOffset:current.blockCheckpoint?JSON.parse(current.blockCheckpoint).offset:0,verifiedHash:current.blockCheckpoint?JSON.parse(current.blockCheckpoint).hash:2166136261},{status:409}):progressConflict(current.blockCheckpoint);}
 }
 const verified={...(progress?{verifiedOffset:progress.offset,verifiedHash:progress.hash}:{}),finished};
 // Only replay-verified game over can publish. A client final flag is never trusted.
 if(!finished||score<=0)return Response.json({...verified,ok:true,published:false,rank:null,score});
 const before=await env.DB!.prepare(LEADERBOARD_SQL).bind(run.game,0).all<RankedScore>();
 const findRank=(rows:RankedScore[])=>{const index=rows.findIndex(r=>r.id===id);return index<0?null:index+1;};
 if(previousRun){const rank=findRank(before.results);return Response.json({...verified,ok:true,published:true,rank,score:previousRun.score,name:previousRun.name,nameEditable:!!playerId&&previousRun.nameEdited===0});}
 const candidate:RankedScore={id,playerId,name:name.trim(),score,moves:count,created:now};
 const proposedRank=candidateRank(before.results,candidate);
 if(proposedRank>LEADERBOARD_LIMIT)return Response.json({...verified,ok:true,qualified:false,published:false,rank:null,score});
 await db.insert(scores).values({id,name:name.trim(),nameEdited:0,score,tile,lines,moves:count,created:now,game:run.game,playerId,icon:profile?.icon||'orbit'}).onConflictDoUpdate({target:scores.id,set:{score,tile,lines,moves:count,created:now,playerId,icon:profile?.icon||'orbit'},setWhere:sql`${scores.score}<${score} OR (${scores.score}=${score} AND ${scores.moves}>${count}) OR (${scores.playerId} IS NULL AND ${playerId} IS NOT NULL)`});
 const after=await env.DB!.prepare(LEADERBOARD_SQL).bind(run.game,0).all<RankedScore>();
 const rank=findRank(after.results);const [saved]=await db.select().from(scores).where(eq(scores.id,id));return Response.json({...verified,ok:true,published:true,rank,score,name:saved.name,nameEditable:!!playerId&&saved.nameEdited===0});
 }catch(e){return Response.json({error:e instanceof ProfileError?e.message:'Your score was not submitted. Your game is saved; please try again.'},{status:e instanceof ProfileError?e.status:503});}
}

// A finished score stands immediately. Its authenticated owner may correct its name once.
export async function PATCH(request:Request){
 if(!isAllowedOrigin(request))return Response.json({error:'Request origin is invalid.'},{status:403});
 try{const raw=await request.text();if(raw.length>2000)return Response.json({error:'Invalid name edit.'},{status:400});const payload=JSON.parse(raw),{id,name}=payload;
  if(typeof id!=='string'||id.length>64||typeof name!=='string'||!name.trim()||name.trim().length>18||/[<>\x00-\x1f]/.test(name))return Response.json({error:'Enter a player name with 1–18 characters.'},{status:400});
  const profile=await savePlayer(payload.profile,false),db=getDb();const [entry]=await db.select().from(scores).where(eq(scores.id,id));
  if(!entry||entry.playerId!==profile.id)return Response.json({error:'This score belongs to another profile.'},{status:403});
  if(entry.name===name.trim())return Response.json({ok:true,name:entry.name,nameEditable:entry.nameEdited===0});
  const changed=await db.update(scores).set({name:name.trim(),nameEdited:1}).where(and(eq(scores.id,id),eq(scores.playerId,profile.id),eq(scores.nameEdited,0))).returning({id:scores.id});
  if(!changed.length)return Response.json({error:'The name for this score has already been changed.'},{status:409});
  return Response.json({ok:true,name:name.trim(),nameEditable:false});
 }catch(e){return Response.json({error:e instanceof ProfileError?e.message:'Your published score is unchanged. Please try the name edit again.'},{status:e instanceof ProfileError?e.status:503});}
}
