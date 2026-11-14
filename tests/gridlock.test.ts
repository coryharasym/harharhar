import test from 'node:test';
import assert from 'node:assert/strict';
import {GRIDLOCK_LEVELS} from '../lib/gridlock-levels.ts';
import {bounds,slide,solved,occupancy,decodeProgress,SAVE_KEY,type Puzzle} from '../lib/gridlock.ts';
const levels:Puzzle[]=GRIDLOCK_LEVELS;
test('200 distinct valid puzzles, exactly 50 per difficulty, with legal complete solution paths',()=>{
 assert.equal(levels.length,200);const ids=new Set(),layouts=new Set();
 for(const p of levels){assert(!ids.has(p.id));ids.add(p.id);const sig=p.vehicles.map((v,i)=>[v.horizontal,v.length,v.lane,p.positions[i]].join(':')).sort().join('|');assert(!layouts.has(sig));layouts.add(sig);assert.deepEqual(p.vehicles[0],{id:'EXIT',horizontal:true,length:2,lane:2});occupancy(p.vehicles,p.positions);assert(!solved(p.positions));assert.equal(p.minimum,p.solution.length);let at=p.positions;for(const m of p.solution){assert(!solved(at));const next=slide(p.vehicles,at,m.piece,m.to);assert.notEqual(next,at);at=next;}assert(solved(at));}
 for(const d of ['Easy','Intermediate','Advanced','Expert'])assert.equal(levels.filter(l=>l.difficulty===d).length,50);
});
test('independent BFS confirms every published minimum in whole slides',()=>{
 for(const p of levels){const queue=[p.positions],depth=[0],seen=new Set([p.positions.join('')]);let found=-1;
 for(let h=0;h<queue.length;h++){const at=queue[h];if(solved(at)){found=depth[h];break;}for(let i=0;i<p.vehicles.length;i++){const [lo,hi]=bounds(p.vehicles,at,i);for(let to=lo;to<=hi;to++){if(to===at[i])continue;const next=[...at];next[i]=to;const key=next.join('');if(seen.has(key))continue;seen.add(key);queue.push(next);depth.push(depth[h]+1);}}}assert.equal(found,p.minimum,p.id);assert(p.difficulty==='Easy'?found>=4&&found<=7:p.difficulty==='Intermediate'?found>=8&&found<=12:p.difficulty==='Advanced'?found>=13&&found<=17:found>=18);}
});
test('collision checks reject jumping, out of bounds and diagonal data',()=>{const v=[{id:'EXIT',horizontal:true,length:2 as const,lane:2},{id:'A',horizontal:false,length:3 as const,lane:3}],p=[0,1];assert.deepEqual(bounds(v,p,0),[0,1]);assert.throws(()=>slide(v,p,0,4));assert.throws(()=>slide(v,p,0,-1));assert.throws(()=>slide(v,p,0,.5));assert.throws(()=>occupancy(v,[2,1]));assert.throws(()=>occupancy(v,[0,4]));assert.equal(slide(v,p,0,0),p);assert.deepEqual(slide(v,p,0,1),[1,1]);});
test('saves replay history and reject invalid positions, jumps and moves after winning',()=>{const p=levels[0];let at=p.positions;const history=[at];for(const m of p.solution){at=slide(p.vehicles,at,m.piece,m.to);history.push(at);}const save={version:1,records:{[p.id]:p.minimum},session:{level:p.id,history}};assert.deepEqual(decodeProgress(JSON.stringify(save),levels),save);assert.equal(decodeProgress('{',levels),null);assert.equal(decodeProgress(JSON.stringify({...save,session:{level:p.id,history:[p.positions,Array(p.vehicles.length).fill(0)]}}),levels),null);assert.equal(decodeProgress(JSON.stringify({...save,session:{level:p.id,history:[...history,p.positions]}}),levels),null);assert.equal(decodeProgress(JSON.stringify({...save,session:{level:'missing',history}}),levels),null);const clean=decodeProgress(JSON.stringify({...save,records:{[p.id]:1}}),levels);assert.deepEqual(clean?.records,{});});

// Independent reachability check: a vehicle is essential only if leaving it
// parked makes the puzzle impossible, even when extra moves are allowed.
function canSolveWithParkedVehicle(p:Puzzle,parked:number){
 const queue=[p.positions],seen=new Set([p.positions.join('')]);
 for(let h=0;h<queue.length;h++){
  const at=queue[h];if(solved(at))return true;
  for(let i=0;i<p.vehicles.length;i++){
   if(i===parked)continue;
   const [lo,hi]=bounds(p.vehicles,at,i);
   for(let to=lo;to<=hi;to++){if(to===at[i])continue;const next=slide(p.vehicles,at,i,to),key=next.join('');if(seen.has(key))continue;seen.add(key);queue.push(next);}
  }
 }
 return false;
}
test('every vehicle must move to solve every puzzle, including alternative routes',()=>{
 for(const p of levels)for(let i=1;i<p.vehicles.length;i++)assert.equal(canSolveWithParkedVehicle(p,i),false,`${p.id}: ${p.vehicles[i].id} is filler`);
});
test('new collection uses separate progress so old records and histories cannot apply',()=>{assert.equal(SAVE_KEY,'harharhar.gridlock.v2');});
