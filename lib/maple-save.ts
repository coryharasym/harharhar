import {z} from 'zod';
import {BOWL,PIECES,aimX} from './maple-physics.ts';
import {MAPLE_RULES,type MapleGame} from './maple-game.ts';

export const MAPLE_SAVE_KEY='harharhar.maple.save.v1';
const MAX_BYTES=500_000;
const uint=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const id=uint.min(1);
const coordinate=z.number().finite().min(-100_000).max(100_000);
const tier=uint.max(PIECES.length-1);
const ball=z.object({id,tier,x:coordinate,y:coordinate,vx:coordinate,vy:coordinate,born:uint,px:coordinate,py:coordinate});
const merge=z.object({parents:z.tuple([id,id]),id,tier,x:coordinate,y:coordinate,tick:uint});
const gameSchema=z.object({
 competitive:z.object({id:z.string().uuid(),seed:uint.max(0xffffffff),moves:z.string().max(350000).regex(/^[0-9a-z]*$/).refine(s=>s.length%11===0)}).optional(),
 world:z.object({tick:uint,nextId:id,rng:uint.max(0xffffffff),balls:z.array(ball).max(512),merges:uint,drops:uint,lastDrop:z.number().int().min(-BOWL.dropTicks).max(Number.MAX_SAFE_INTEGER),effects:z.array(merge).max(512)}),
 current:uint.max(4),next:uint.max(4),score:uint,highest:uint.max(11),bestChain:uint.min(1).max(MAPLE_RULES.chainCap),mooseCount:uint,dangerTicks:uint.max(MAPLE_RULES.dangerTicks),over:z.boolean(),paused:z.boolean(),practice:z.literal(false),
 lineage:z.record(z.string(),uint.min(1)),entry:z.record(z.string(),z.object({entered:z.boolean(),birth:uint})),
 awards:z.array(z.object({id,tier,points:uint,multiplier:uint.min(1).max(MAPLE_RULES.chainCap),tick:uint})).max(512),
});
const saveSchema=z.object({version:z.literal(1),rules:z.literal(MAPLE_RULES.version),physics:z.literal(1),savedAt:uint,aim:coordinate,best:uint,game:gameSchema});
export type MapleSave=z.infer<typeof saveSchema>;
export type ReadSave={kind:'empty'}|{kind:'unavailable'}|{kind:'invalid'}|{kind:'saved';save:MapleSave};
export type SaveStorage=Pick<Storage,'getItem'|'setItem'>;
// Parse bounded, versioned state before it reaches the solver. This is local progress, not score validation.
export function decodeMapleSave(raw:string):MapleSave|null{
 if(raw.length>MAX_BYTES)return null;
 try{
  const result=saveSchema.safeParse(JSON.parse(raw));if(!result.success)return null;
  const save=result.data,g=save.game,w=g.world,ids=new Set(w.balls.map(b=>b.id));
  if(ids.size!==w.balls.length||w.lastDrop>w.tick||save.best<g.score||g.over!==(g.dangerTicks===MAPLE_RULES.dangerTicks))return null;
  if(w.balls.some(b=>b.id>=w.nextId||b.born>w.tick||b.x<BOWL.left+PIECES[b.tier].radius-.1||b.x>BOWL.right-PIECES[b.tier].radius+.1))return null;
  if(g.competitive){const m=g.competitive.moves;if(m.length/11!==w.drops)return null;let previous=-1;for(let i=0;i<m.length;i+=11){const t=parseInt(m.slice(i,i+7),36),x=parseInt(m.slice(i+7,i+11),36);if(t<=previous||t>w.tick||x<35000||x>325000)return null;previous=t;}}
  if(Object.keys(g.entry).length>512||Object.keys(g.lineage).length>512)return null;
  if(Object.entries(g.entry).some(([key,v])=>!ids.has(Number(key))||String(Number(key))!==key||v.birth>w.tick))return null;
  if(Object.entries(g.lineage).some(([key])=>!ids.has(Number(key))||String(Number(key))!==key))return null;
  if(w.effects.some(e=>e.id>=w.nextId||e.tick>w.tick||e.parents.some(p=>p>=e.id))||g.awards.some(a=>a.id>=w.nextId||a.tick>w.tick))return null;
  save.aim=aimX(save.aim,g.current);return save;
 }catch{return null;}
}
export function encodeMapleSave(game:MapleGame,aim:number,best:number,now=Date.now()):string|null{
 if(game.practice)return null;
 const raw=JSON.stringify({version:1,rules:MAPLE_RULES.version,physics:1,savedAt:now,aim:aimX(aim,game.current),best:Math.max(best,game.score),game});
 return decodeMapleSave(raw)?raw:null;
}
export function readMapleSave(storage:SaveStorage):ReadSave{
 try{const raw=storage.getItem(MAPLE_SAVE_KEY);if(raw===null)return {kind:'empty'};const save=decodeMapleSave(raw);return save?{kind:'saved',save}:{kind:'invalid'};}catch{return {kind:'unavailable'};}
}
export function writeMapleSave(storage:SaveStorage,game:MapleGame,aim:number,best:number,now=Date.now()){
 try{const raw=encodeMapleSave(game,aim,best,now);if(!raw)return false;storage.setItem(MAPLE_SAVE_KEY,raw);return true;}catch{return false;}
}
// Always return an independent, paused copy. Time away never advances the bowl or warning.
export function restoreMapleSave(save:MapleSave){const copy=decodeMapleSave(JSON.stringify(save));if(!copy)throw Error('Invalid Maple Merge save');copy.game.paused=true;return copy;}
