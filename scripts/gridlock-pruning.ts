// Development-only solver and filler removal; never run on a player's device.
import {solved,type Puzzle,type Vehicle} from '../lib/gridlock.ts';

export function solve(vehicles:Vehicle[],start:number[],frozen=-1):Puzzle['solution']|null {
 const boards=[start],parents=[-1],moves:Puzzle['solution']=[{piece:0,to:0}],seen=new Set([start.join('')]);
 for(let h=0;h<boards.length;h++){
  const p=boards[h];
  if(solved(p)){const path:Puzzle['solution']=[];for(let at=h;parents[at]>=0;at=parents[at])path.push(moves[at]);return path.reverse();}
  const cells=new Int8Array(36).fill(-1);
  vehicles.forEach((v,i)=>{for(let n=0;n<v.length;n++)cells[v.horizontal?v.lane*6+p[i]+n:(p[i]+n)*6+v.lane]=i;});
  for(let i=0;i<vehicles.length;i++){
   if(i===frozen)continue;
   const v=vehicles[i],empty=(n:number)=>cells[v.horizontal?v.lane*6+n:n*6+v.lane]===-1;
   let lo=p[i],hi=p[i];while(lo>0&&empty(lo-1))lo--;while(hi+v.length<6&&empty(hi+v.length))hi++;
   for(let to=lo;to<=hi;to++){if(to===p[i])continue;const next=[...p];next[i]=to;const key=next.join('');if(seen.has(key))continue;seen.add(key);boards.push(next);parents.push(h);moves.push({piece:i,to});}
  }
 }
 return null;
}

export function prunePuzzle(puzzle:Puzzle):Puzzle {
 let p=puzzle;
 function retainMoved(path:Puzzle['solution']){
  const used=new Set(path.map(m=>m.piece));used.add(0);
  const indices=p.vehicles.map((_,i)=>i).filter(i=>used.has(i));
  p={...p,vehicles:indices.map(i=>p.vehicles[i]),positions:indices.map(i=>p.positions[i]),solution:[],minimum:0};
  // Removing obstacles can open shorter routes, so recompute the exact minimum.
  p.solution=solve(p.vehicles,p.positions)!;p.minimum=p.solution.length;
 }
 retainMoved(p.solution);
 // A car moved by one solution may still be avoidable in another. Freeze each
 // remaining car and remove those that can stay parked throughout a solution.
 for(let i=1;i<p.vehicles.length;){
  const alternative=solve(p.vehicles,p.positions,i);
  if(alternative){retainMoved(alternative);i=1;}else i++;
 }
 return p;
}
