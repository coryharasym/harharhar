import {LEADERBOARD_SQL,candidateRank,type RankedScore} from '../../../lib/leaderboard';
import {env} from 'cloudflare:workers';
import {isAllowedOrigin} from '../../../lib/cors';
import {getDb} from '../../../db';
import {runs,scores} from '../../../db/schema';
import {eq,gte,and,desc,sql,isNull} from 'drizzle-orm';
import {replay} from '../../../lib/game';
import {replayBlocks as replayLegacyBlocks} from '../../../lib/blocks-legacy';
import {initialBlockCheckpoint,verifyBlockBatch,type BlockCheckpoint} from '../../../lib/block-sync';
import {savePlayer,ProfileError} from '../../../lib/player-server';
export async function GET(request:Request){try{const params=new URL(request.url).searchParams,game=params.get('game')||'2048';if(!['2048','blocks'].includes(game))return Response.json({error:'Unknown game.'},{status:400});const cutoff=params.get('period')==='week'?Date.now()-7*86400000:0;
 const rows=await env.DB!.prepare(LEADERBOARD_SQL).bind(game,cutoff).all();return Response.json({scores:rows.results},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'The leaderboard is temporarily unavailable. Please try again.'},{status:503});}}
export async function POST(request:Request){
 if(!isAllowedOrigin(request))return Response.json({error:'Request origin is invalid.'},{status:403});
 try {const raw=await request.text();if(raw.length>20000)return Response.json({error:'Run is too long to submit.'},{status:400});const payload=JSON.parse(raw),{id,moves}=payload;let name=payload.name;
 if(typeof id!=='string'||id.length>64||typeof name!=='string'||!name.trim()||name.trim().length>18||/[<>\x00-\x1f]/.test(name)||typeof moves!=='string'||moves.length>16000)return Response.json({error:'Enter a player name and play a few moves first.'},{status:400});
 const db=getDb();const [run]=await db.select().from(runs).where(and(eq(runs.id,id),gte(runs.created,Date.now()-30*86400000)));if(!run)return Response.json({error:'This run has expired. Start a new game to submit a score.'},{status:400});
 let score:number,tile=0,lines=0,count:number,checkpoint:BlockCheckpoint|null=null;
 const progressConflict=(value:string|null)=>{const current=value?JSON.parse(value) as BlockCheckpoint:initialBlockCheckpoint(run.seed);return Response.json({error:'Progress changed. Sync again.',verifiedOffset:current.offset,verifiedHash:current.hash},{status:409});};
 try{if(run.game==='blocks'&&run.rules===2){
  const current=run.blockCheckpoint?JSON.parse(run.blockCheckpoint) as BlockCheckpoint:initialBlockCheckpoint(run.seed);
  if(payload.blockOffset!==current.offset||payload.blockHash!==current.hash)return progressConflict(run.blockCheckpoint);
  checkpoint=verifyBlockBatch(current,payload.blockOffset,payload.blockHash,moves);
  score=checkpoint.game.score;lines=checkpoint.game.lines;count=checkpoint.offset/4;
 }else if(run.game==='blocks'){const g=replayLegacyBlocks(run.seed,moves);score=g.score;lines=g.lines;count=moves.length/4;}
 else{const g=replay(run.seed,moves);score=g.score;tile=Math.max(...g.board);count=moves.length;}}
 catch{return Response.json({error:'This run could not be verified.'},{status:400});}if(score<=0)return Response.json({error:'Earn some points before submitting.'},{status:400});

 const profile=payload.profile?await savePlayer({...payload.profile,name},false):null;if(profile)name=profile.name;
 const playerId=profile?.id||null,now=Date.now();
 const [previousRun]=await db.select().from(scores).where(eq(scores.id,id));
 if(previousRun?.playerId&&previousRun.playerId!==playerId)return Response.json({error:'This run belongs to another profile.'},{status:403});
 // Commit verified progress even when this score does not qualify for the top five.
 if(checkpoint&&checkpoint.offset!== (run.blockCheckpoint?JSON.parse(run.blockCheckpoint).offset:0)){
  const updated=await db.update(runs).set({blockCheckpoint:JSON.stringify(checkpoint),created:now}).where(and(eq(runs.id,id),run.blockCheckpoint===null?isNull(runs.blockCheckpoint):eq(runs.blockCheckpoint,run.blockCheckpoint))).returning({id:runs.id});
  if(!updated.length){const [current]=await db.select().from(runs).where(eq(runs.id,id));return progressConflict(current.blockCheckpoint);}
 }
 const verified=checkpoint?{verifiedOffset:checkpoint.offset,verifiedHash:checkpoint.hash}:{};
 const identityFilter=playerId?eq(scores.playerId,playerId):and(sql`${scores.playerId} IS NULL`,sql`lower(${scores.name})=${name.trim().toLowerCase()}`);
 const [best]=await db.select().from(scores).where(and(eq(scores.game,run.game),identityFilter)).orderBy(desc(scores.score),scores.moves,scores.created).limit(1);
 const before=await env.DB!.prepare(LEADERBOARD_SQL).bind(run.game,0).all<RankedScore>();
 const findRank=(rows:RankedScore[])=>{const index=rows.findIndex(r=>playerId?r.playerId===playerId:!r.playerId&&r.name.toLowerCase()===name.trim().toLowerCase());return index<0?null:index+1;};
 if(best&&(best.score>score||(best.score===score&&best.moves<=count)))return Response.json({...verified,ok:true,published:best.id===id,rank:findRank(before.results),score:best.score});
 const candidate:RankedScore={id,playerId,name:name.trim(),score,moves:count,created:now};
 if(candidateRank(before.results,candidate)>5)return Response.json({...verified,ok:true,published:false,rank:null,score});
 await db.insert(scores).values({id,name:name.trim(),score,tile,lines,moves:count,created:now,game:run.game,playerId,icon:profile?.icon||'orbit'}).onConflictDoUpdate({target:scores.id,set:{score,tile,lines,moves:count,created:now,playerId,icon:profile?.icon||'orbit'},setWhere:sql`${scores.score}<${score} OR (${scores.score}=${score} AND ${scores.moves}>${count}) OR (${scores.playerId} IS NULL AND ${playerId} IS NOT NULL)`});
 const after=await env.DB!.prepare(LEADERBOARD_SQL).bind(run.game,0).all<RankedScore>();
 const rank=findRank(after.results);return Response.json({...verified,ok:true,published:rank!==null,rank,score});
 }catch(e){return Response.json({error:e instanceof ProfileError?e.message:'Your score was not submitted. Your game is saved; please try again.'},{status:e instanceof ProfileError?e.status:503});}
}
