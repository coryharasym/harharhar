import {replayTimber,type TimberGame} from './timber.ts';
export const TIMBER_SAVE='harharhar.timber.v1';
export type TimberRun={version:1;id:string|null;seed:number;history:string;game:TimberGame;revision:string};
export function decodeTimberRun(raw:string):TimberRun|null{try{const r=JSON.parse(raw) as TimberRun;if(r.version!==1||!Number.isInteger(r.seed)||r.seed<0||r.seed>0xffffffff||!(r.id===null||typeof r.id==='string')||typeof r.revision!=='string'||typeof r.history!=='string'||r.history.length>1000000)return null;return {...r,game:replayTimber(r.seed,r.history)};}catch{return null;}}
