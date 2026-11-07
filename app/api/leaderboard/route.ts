import {LEADERBOARD_SQL,candidateRank,type RankedScore} from '../../../lib/leaderboard';
import {env} from 'cloudflare:workers';
import {isAllowedOrigin} from '../../../lib/cors';
import {getDb} from '../../../db';
import {runs,scores} from '../../../db/schema';
import {eq,gte,and,desc,sql} from 'drizzle-orm';
import {replay} from '../../../lib/game';
import {replayBlocks} from '../../../lib/blocks';
import {savePlayer,ProfileError} from '../../../lib/player-server';
export async function GET(request:Request){try{const params=new URL(request.url).searchParams,game=params.get('game')||'2048';if(!['2048','blocks'].includes(game))return Response.json({error:'Unknown game.'},{status:400});const cutoff=params.get('period')==='week'?Date.now()-7*86400000:0;
 const rows=await env.DB!.prepare(LEADERBOARD_SQL).bind(game,cutoff).all();return Response.json({scores:rows.results},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'The leaderboard is temporarily unavailable. Please try again.'},{status:503});}}
export async function POST(request:Request){
 if(!isAllowedOrigin(request))return Response.json({error:'Request origin is invalid.'},{status:403});
 try {const raw=await request.text();if(raw.length>20000)return Response.json({error:'Run is too long to submit.'},{status:400});const payload=JSON.parse(raw),{id,moves}=payload;let name=payload.name;
 if(typeof id!=='string'||id.length>64||typeof name!=='string'||!name.trim()||name.trim().length>18||/[<>\x00-\x1f]/.test(name)||typeof moves!=='string'||!moves.length||moves.length>16000)return Response.json({error:'Enter a player name and play a few moves first.'},{status:400});
 const db=getDb();const [run]=await db.select().from(runs).where(and(eq(runs.id,id),gte(runs.created,Date.now()-30*86400000)));if(!run)return Response.json({error:'This run has expired. Start a new game to submit a score.'},{status:400});
 let score:number,tile=0,lines=0,count:number;try{if(run.game==='blocks'){const g=replayBlocks(run.seed,moves);score=g.score;lines=g.lines;count=moves.length/4;}else{const g=replay(run.seed,moves);score=g.score;tile=Math.max(...g.board);count=moves.length;}}catch{return Response.json({error:'This run could not be verified.'},{status:400});}if(score<=0)return Response.json({error:'Earn some points before submitting.'},{status:400});
 const profile=payload.profile?await savePlayer({...payload.profile,name},false):null;if(profile)name=profile.name;
 const playerId=profile?.id||null,now=Date.now();
 const [previousRun]=await db.select().from(scores).where(eq(scores.id,id));
 if(previousRun?.playerId&&previousRun.playerId!==playerId)return Response.json({error:'This run belongs to another profile.'},{status:403});
 const identityFilter=playerId?eq(scores.playerId,playerId):and(sql`${scores.playerId} IS NULL`,sql`lower(${scores.name})=${name.trim().toLowerCase()}`);
 const [best]=await db.select().from(scores).where(and(eq(scores.game,run.game),identityFilter)).orderBy(desc(scores.score),scores.moves,scores.created).limit(1);
 const before=await env.DB!.prepare(LEADERBOARD_SQL).bind(run.game,0).all<RankedScore>();
 const findRank=(rows:RankedScore[])=>{const index=rows.findIndex(r=>playerId?r.playerId===playerId:!r.playerId&&r.name.toLowerCase()===name.trim().toLowerCase());return index<0?null:index+1;};
 if(best&&(best.score>score||(best.score===score&&best.moves<=count)))return Response.json({ok:true,published:best.id===id,rank:findRank(before.results),score:best.score});
 const candidate:RankedScore={id,playerId,name:name.trim(),score,moves:count,created:now};
 if(candidateRank(before.results,candidate)>5)return Response.json({ok:true,published:false,rank:null,score});
 await db.insert(scores).values({id,name:name.trim(),score,tile,lines,moves:count,created:now,game:run.game,playerId,icon:profile?.icon||'orbit'}).onConflictDoUpdate({target:scores.id,set:{score,tile,lines,moves:count,created:now,playerId,name:name.trim(),icon:profile?.icon||'orbit'},setWhere:sql`${scores.score}<${score} OR (${scores.score}=${score} AND ${scores.moves}>${count}) OR (${scores.playerId} IS NULL AND ${playerId} IS NOT NULL)`});
 const after=await env.DB!.prepare(LEADERBOARD_SQL).bind(run.game,0).all<RankedScore>();
 const rank=findRank(after.results);return Response.json({ok:true,published:rank!==null,rank,score});
 }catch(e){return Response.json({error:e instanceof ProfileError?e.message:'Your score was not submitted. Your game is saved; please try again.'},{status:e instanceof ProfileError?e.status:503});}
}
