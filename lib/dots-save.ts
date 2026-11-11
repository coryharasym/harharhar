import {startDots,replayDots,type DotsGame} from './dots.ts';
export type DotsMode='timed'|'endless';
export type DotsRun={version:1;id:string|null;seed:number;startAt:number;history:string;game:DotsGame;mode:DotsMode;revision:string};
export const dotsSaveKey=(mode:DotsMode)=>'harharhar.dots.'+mode+'.v1';
export function newDotsRun(mode:DotsMode,seed:number,id:string|null=null,startAt=0):DotsRun{return {version:1,id,seed,startAt,history:'',game:startDots(seed),mode,revision:crypto.randomUUID()};}
export function decodeDotsRun(raw:string,mode:DotsMode):DotsRun|null{try{const r=JSON.parse(raw) as DotsRun;if(r.version!==1||r.mode!==mode||!Number.isInteger(r.seed)||r.seed<0||r.seed>0xffffffff||!(r.id===null||typeof r.id==='string')||typeof r.revision!=='string'||!Number.isSafeInteger(r.startAt)||r.startAt<0||typeof r.history!=='string')return null;
 if(mode==='timed'){r.game=replayDots(r.seed,r.history);}else{const g=r.game;if(!g||!Array.isArray(g.board)||g.board.length!==36||!g.board.every(c=>Number.isInteger(c)&&c>=0&&c<5)||![g.rng,g.score,g.moves,g.loops,g.biggest].every(n=>Number.isSafeInteger(n)&&n>=0)||g.rng>0xffffffff||g.biggest>36||g.loops>g.moves||g.score<g.moves*2)return null;r.history='';}return r;
 }catch{return null;}}
