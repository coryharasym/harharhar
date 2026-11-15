/** Skyline's fixed logical arena. All widths and timings are screen-independent. */
export const FOUNDATION = 200;
export const MIN_WIDTH = FOUNDATION * .08;
export const RESTORE = FOUNDATION * .12;
export type Floor = {x:number;width:number;perfect:boolean;reinforced:boolean};
export type Cut = {x:number;width:number;level:number;age:number;direction:number};
export type Skyline = {
 phase:'ready'|'moving'|'dropping'|'settling'|'over'; floors:Floor[]; x:number;
 direction:number; elapsed:number; sweepElapsed:number; perfects:number; streak:number; camera:number;
 cuts:Cut[]; message:string;
};
export function sweepSeconds(floor:number){
 if(floor<=8)return 1.8;
 if(floor<=20)return 1.8-(floor-8)/12*.4;
 return 1.4-Math.min(20,floor-20)/20*.3;
}
export function tolerance(width:number){return Math.max(FOUNDATION*.01,width*.04);}
export function landing(base:Floor,x:number,streak:number){
 const perfect=Math.abs(x-base.x)<=tolerance(base.width);
 const left=Math.max(x,base.x),right=Math.min(x+base.width,base.x+base.width);
 if(!perfect&&right-left<MIN_WIDTH)return null;
 const nextStreak=perfect?streak+1:0,reinforced=nextStreak===3;
 const kept=perfect?base.width:right-left;
 const width=Math.min(FOUNDATION,kept+(reinforced?RESTORE:0));
 return {floor:{x:(perfect?base.x:left)-(width-kept)/2,width,perfect,reinforced},streak:reinforced?0:nextStreak};
}
export function createSkyline():Skyline{return {phase:'ready',floors:[{x:80,width:FOUNDATION,perfect:false,reinforced:false}],x:-100,direction:1,elapsed:0,sweepElapsed:0,perfects:0,streak:0,camera:0,cuts:[],message:'Three perfects. A second chance.'};}
export function startSkyline():Skyline{return {...createSkyline(),phase:'moving',message:'Tap to drop'};}
export function dropSkyline(s:Skyline):Skyline{return s.phase==='moving'?{...s,phase:'dropping',elapsed:0}:s;}
export function stepSkyline(s:Skyline,dt:number):Skyline{
 if(s.phase==='ready')return s;
 let next={...s,cuts:s.cuts.map(c=>({...c,age:c.age+dt})).filter(c=>c.age<1.4)};
 const base=s.floors[s.floors.length-1];
 if(s.phase==='moving'){
  next.sweepElapsed=s.sweepElapsed+dt;
  const position=skylinePosition(base.width,s.floors.length,next.sweepElapsed);
  next.x=position.x;next.direction=position.direction;
 }else if(s.phase==='dropping'){
  next.elapsed=s.elapsed+dt;
  if(next.elapsed>=.12){
   const result=landing(base,s.x,s.streak),level=s.floors.length;
   if(!result){next.phase='over';next.streak=0;next.message='No room to land';next.cuts.push({x:s.x,width:base.width,level,age:0,direction:s.direction});return next;}
   const f=result.floor;
   if(!f.perfect){const left=Math.min(s.x,base.x);next.cuts.push({x:left===s.x?s.x:f.x+f.width,width:base.width-f.width,level,age:0,direction:s.x<base.x?-1:1});}
   next.floors=[...s.floors,f];next.streak=result.streak;next.perfects=s.perfects+Number(f.perfect);next.phase='settling';next.elapsed=0;
   next.message=f.reinforced?'Reinforced!':f.perfect?'Perfect!':`${Math.round(f.width/FOUNDATION*100)}% width left`;
  }
 }else if(s.phase==='settling'){
  next.elapsed=s.elapsed+dt;const duration=base.reinforced?.55:.32;
  const target=Math.max(0,(s.floors.length-1)*22-176);
  next.camera=s.camera+(target-s.camera)*Math.min(1,dt*18);
  if(next.elapsed>=duration){next.camera=target;next.phase='moving';next.elapsed=0;next.sweepElapsed=0;next.direction=s.floors.length%2===1?1:-1;next.x=next.direction===1?-base.width/2:360-base.width/2;}
 }
 return next;
}
export type SkylineBest={floors:number;perfects:number};
export function beats(a:SkylineBest,b:SkylineBest){return a.floors>b.floors||(a.floors===b.floors&&a.perfects>b.perfects);}

/** Exact sweep position is shared with ranked replay, independent of frame rate. */
export function skylinePosition(width:number,floor:number,seconds:number){
 const travel=seconds*360/sweepSeconds(floor),p=((travel%720)+720)%720;
 const forward=p<=360?p:720-p,odd=floor%2===1;
 return {x:(odd?forward:360-forward)-width/2,direction:(p<360?1:-1)*(odd?1:-1)};
}
