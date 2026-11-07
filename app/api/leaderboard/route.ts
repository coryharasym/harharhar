import {getDb} from '../../../db';
import {runs,scores} from '../../../db/schema';
import {desc,eq,gte,and} from 'drizzle-orm';
import {replay} from '../../../lib/game';
export async function GET(request:Request) {
  try { const weekly=new URL(request.url).searchParams.get('period')==='week'; const rows=await getDb().select().from(scores).where(weekly?gte(scores.created,Date.now()-7*86400000):undefined).orderBy(desc(scores.score),scores.moves,scores.created).limit(30); return Response.json({scores:rows},{headers:{'Cache-Control':'no-store'}}); }
  catch { return Response.json({error:'The leaderboard is temporarily unavailable. Please try again.'},{status:503}); }
}
export async function POST(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Request origin is invalid.'},{status:403});
  try {
    const raw=await request.text();if(raw.length>20000)return Response.json({error:'Run is too long to submit.'},{status:400});
    const {id,name,moves}=JSON.parse(raw);
    if(typeof id!=='string'||id.length>64||typeof name!=='string'||!name.trim()||name.trim().length>18||/[\x00-\x1f<>]/.test(name)||typeof moves!=='string'||!moves.length||moves.length>15000)return Response.json({error:'Enter a player name (1–18 characters) and merge some tiles first.'},{status:400});
    const db=getDb();const [run]=await db.select().from(runs).where(and(eq(runs.id,id),gte(runs.created,Date.now()-30*86400000)));
    if(!run)return Response.json({error:'This run has expired. Start a new game to submit a score.'},{status:400});
    let g;try{g=replay(run.seed,moves);}catch{return Response.json({error:'This run could not be verified.'},{status:400});}
    if(!g.score)return Response.json({error:'Merge some tiles before submitting.'},{status:400});
    await db.insert(scores).values({id,name:name.trim(),score:g.score,tile:Math.max(...g.board),moves:moves.length,created:Date.now()}).onConflictDoNothing();
    return Response.json({ok:true});
  }catch{return Response.json({error:'Your score was not submitted. Your game is saved; please try again.'},{status:503});}
}
