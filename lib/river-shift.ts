import {RIVER_LEVELS} from './river-shift-levels.ts';
/** Rotation-only River Shift. NESW are bits 0–3; endpoint directions never rotate. */
export type Direction=0|1|2|3;
export type RiverDifficulty='Easy'|'Medium'|'Hard'|'Expert';
export type RiverPuzzle={difficulty:RiverDifficulty;id:string;title:string;hint:string;size:number;source:number;outlet:Direction;ocean:number;inlet:Direction;initial:number[];solution:number[];route:number[];minimum:number};
export type RiverFlow={cells:number[];reachedOcean:boolean;solved:boolean;breakCell:number;breakEdge:Direction};
export type RiverSave={version:1;selected:string;records:Record<string,number>;sessions:Record<string,number[][]>};
export const RIVER_SAVE_KEY='harharhar.river-shift.v1';
export const CHANNEL_WIDTH=24;
export function rotateChannel(mask:number):number{return ((mask<<1)&15)|(mask>>3);}
export function openings(mask:number):Direction[]{return ([0,1,2,3] as Direction[]).filter(d=>!!(mask&(1<<d)));}
export function neighbour(cell:number,edge:Direction,size:number):number{
 const r=Math.floor(cell/size),c=cell%size;
 return edge===0?(r?cell-size:-1):edge===1?(c<size-1?cell+1:-1):edge===2?(r<size-1?cell+size:-1):(c?cell-1:-1);
}
function direction(a:number,b:number,size:number):Direction{
 if(b===a-size)return 0;if(b===a+1)return 1;if(b===a+size)return 2;if(b===a-1)return 3;throw Error('Non-adjacent route');
}
function routeBoard(route:number[],size:number):number[]{
 const board=Array(size*size).fill(0);
 for(let i=1;i<route.length-1;i++)board[route[i]]=(1<<direction(route[i],route[i-1],size))|(1<<direction(route[i],route[i+1],size));
 return board;
}
export const RIVER_PUZZLES:RiverPuzzle[]=RIVER_LEVELS.map(raw=>{
 const route:number[]=[...raw.route],size=raw.size;
 return {...raw,route,initial:[...raw.initial],source:route[0],outlet:direction(route[0],route[1],size),ocean:route.at(-1)!,inlet:direction(route.at(-1)!,route.at(-2)!,size),solution:routeBoard(route,size)};
});

export function riverFlow(p:RiverPuzzle,board:number[]):RiverFlow{
 const cells:number[]=[];let cell=p.source,edge=p.outlet;
 const stop=(reachedOcean=false):RiverFlow=>({cells,reachedOcean,solved:reachedOcean&&cells.length===p.route.length-2,breakCell:cell,breakEdge:edge});
 for(let step=0;step<=board.length;step++){
  const next=neighbour(cell,edge,p.size),entry=((edge+2)%4) as Direction;
  if(next===p.ocean)return stop(entry===p.inlet);
  if(next<0||next===p.source||!p.initial[next]||cells.includes(next)||!(board[next]&(1<<entry)))return stop();
  cells.push(next);const exits=openings(board[next]).filter(d=>d!==entry);if(exits.length!==1)return stop();cell=next;edge=exits[0];
 }
 return stop();
}
export function turnRiver(p:RiverPuzzle,board:number[],cell:number):number[]{
 if(!Number.isInteger(cell)||!p.initial[cell]||cell===p.source||cell===p.ocean)return board;
 const next=[...board];next[cell]=rotateChannel(next[cell]);return next;
}
export function freshRiverSave():RiverSave{return {version:1,selected:RIVER_PUZZLES[0].id,records:{},sessions:{}};}
export function decodeRiverSave(raw:string):RiverSave|null{
 try{
  if(raw.length>3000000)return null;
  const value=JSON.parse(raw);if(!value||value.version!==1||typeof value.records!=='object'||!value.records||typeof value.sessions!=='object'||!value.sessions)return null;
  const clean=freshRiverSave();if(RIVER_PUZZLES.some(p=>p.id===value.selected))clean.selected=value.selected;
  for(const p of RIVER_PUZZLES){
   const best=value.records[p.id];if(Number.isInteger(best)&&best>=p.minimum&&best<=10000)clean.records[p.id]=best;
   const history=value.sessions[p.id];if(!Array.isArray(history)||history.length<1||history.length>10001)continue;
   const valid=history.every((b:unknown,i:number)=>{
    if(!Array.isArray(b)||b.length!==p.size*p.size||b.some(m=>!Number.isInteger(m)||m<0||m>15))return false;
    if(i===0)return b.every((m,j)=>m===p.initial[j]);
    const prev=history[i-1];const changed=b.map((m,j)=>m!==prev[j]?j:-1).filter(j=>j>=0);
    return changed.length===1&&!!p.initial[changed[0]]&&b[changed[0]]===rotateChannel(prev[changed[0]])&&!riverFlow(p,prev).solved;
   });
   if(valid)clean.sessions[p.id]=history;
  }
  return clean;
 }catch{return null;}
}
export function clockwiseCost(from:number,to:number):number{
 for(let k=0;k<4;k++){if(from===to)return k;from=rotateChannel(from);}return Infinity;
}
