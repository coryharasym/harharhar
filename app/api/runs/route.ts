import {isAllowedOrigin} from '../../../lib/cors';
import {getDb} from '../../../db';
import {runs} from '../../../db/schema';
export async function POST(request:Request) {
 if(!isAllowedOrigin(request))return Response.json({error:'Request origin is invalid.'},{status:403});
 try {const raw=await request.text();if(raw.length>128)return Response.json({error:'Invalid game.'},{status:400});const payload=raw?JSON.parse(raw):{},game=payload.game||'2048',rules=game==='maple'?2:game==='tunnel'?3:game==='blocks'&&payload.rules===2?2:1;if(!['2048','blocks','tunnel','maple'].includes(game))return Response.json({error:'Invalid game.'},{status:400});const id=crypto.randomUUID(),seed=crypto.getRandomValues(new Uint32Array(1))[0];await getDb().insert(runs).values({id,seed,game,rules,created:Date.now()});return Response.json({id,seed,game},{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Online scores are unavailable. Practice is still available.'},{status:503});}
}
