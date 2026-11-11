import {z} from 'zod';
import {score} from './threes.ts';
import type {ThreesRun} from './threes-session.ts';
export const THREES_SAVE_KEY='harharhar.threes.save.v1';
export const THREES_BEST_KEY='harharhar.threes.best.v1';
const uint=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),u32=uint.max(0xffffffff);
const value=uint.min(1).refine(n=>n===1||n===2||(n>=3&&Number.isInteger(Math.log2(n/3))));
const runSchema=z.object({id:z.string().uuid().nullable(),seed:u32,rng:u32,rules:z.literal(1),history:z.string().max(500000).regex(/^[LRUD]*$/),game:z.object({board:z.array(z.object({id:uint,value}).nullable()).length(16),bag:z.array(z.union([z.literal(1),z.literal(2),z.literal(3)])).max(11),next:z.union([z.literal(1),z.literal(2),z.literal(3)]),serial:uint.min(9),moves:uint})});
const schema=z.object({version:z.literal(1),revision:z.string().uuid(),run:runSchema});
export type ThreesSave=z.infer<typeof schema>;
export function decodeThreesSave(raw:string):ThreesSave|null{
 if(raw.length>600000)return null;
 try{const result=schema.safeParse(JSON.parse(raw));if(!result.success)return null;
  const save=result.data,g=save.run.game,tiles=g.board.filter(t=>t!==null),ids=tiles.map(t=>t.id);
  if(g.moves!==save.run.history.length||g.serial!==9+g.moves||new Set(ids).size!==ids.length||ids.some(id=>id>=g.serial)||!tiles.length||!Number.isSafeInteger(score(g.board)))return null;
  if([1,2,3].some(n=>g.bag.filter(v=>v===n).length>4))return null;
  return save;
 }catch{return null;}
}
export function encodeThreesSave(run:ThreesRun,revision=crypto.randomUUID()):string|null{const raw=JSON.stringify({version:1,revision,run});return decodeThreesSave(raw)?raw:null;}
export function readThreesBest(storage:Pick<Storage,'getItem'>):number{try{const value=Number(storage.getItem(THREES_BEST_KEY));return Number.isSafeInteger(value)&&value>=0?value:0;}catch{return 0;}}
