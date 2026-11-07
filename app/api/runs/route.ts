import {getDb} from '../../../db';
import {runs} from '../../../db/schema';
export async function POST(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Request origin is invalid.'},{status:403});
  try { const id=crypto.randomUUID(); const seed=crypto.getRandomValues(new Uint32Array(1))[0]; await getDb().insert(runs).values({id,seed,created:Date.now()}); return Response.json({id,seed},{headers:{'Cache-Control':'no-store'}}); }
  catch { return Response.json({error:'Online scores are unavailable. Practice is still available.'},{status:503}); }
}
