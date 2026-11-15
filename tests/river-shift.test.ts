import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHANNEL_WIDTH,RIVER_PUZZLES,clockwiseCost,decodeRiverSave,freshRiverSave,neighbour,openings,riverFlow,rotateChannel,turnRiver,type RiverPuzzle,type Direction} from '../lib/river-shift.ts';
// Independently enumerate geometric paths, then require straight/bend compatibility.
function solutions(p:RiverPuzzle){
 const results:number[][]=[];
 function walk(route:number[]){
  const cell=route.at(-1)!;
  if(cell===p.ocean){if(route.length===p.route.length)results.push(route);return;}
  for(const edge of [0,1,2,3] as Direction[]){
   if(route.length===1&&edge!==p.outlet)continue;
   const next=neighbour(cell,edge,p.size);if(next<0||route.includes(next))continue;
   if(next!==p.ocean&&!p.initial[next])continue;
   if(next===p.ocean&&((edge+2)%4)!==p.inlet)continue;
   if(route.length>1){const incoming=([0,1,2,3] as Direction[]).find(d=>neighbour(cell,d,p.size)===route.at(-2))!;
    const isStraight=(incoming+2)%4===edge,mask=p.initial[cell];if(isStraight!==(mask===5||mask===10))continue;
   }
   walk([...route,next]);
  }
 }
 walk([p.source]);return results;
}
function routeMasks(p:RiverPuzzle,route:number[]){const board=[...p.initial];for(let i=1;i<route.length-1;i++){const cell=route[i];board[cell]=([0,1,2,3] as Direction[]).filter(d=>[route[i-1],route[i+1]].includes(neighbour(cell,d,p.size))).reduce<number>((m,d)=>m|(1<<d),0);}return board;}
for(const p of RIVER_PUZZLES){
 test(`${p.id}: independently verified full routes and minimum`,()=>{
  const routes=solutions(p);assert.ok(routes.length>0);
  const costs=routes.map(route=>{const b=routeMasks(p,route);assert.equal(riverFlow(p,b).solved,true);return b.reduce((total,to,i)=>total+clockwiseCost(p.initial[i],to),0);});
  assert.equal(Math.min(...costs),p.minimum);assert.equal(riverFlow(p,p.initial).solved,false);
 });
 test(`${p.id}: rotating a solution back into place gives exactly the minimum and restores via undo`,()=>{
  let board=p.initial;const history=[board];for(let cell=0;cell<p.size*p.size;cell++){const count=clockwiseCost(board[cell],p.solution[cell]);for(let k=0;k<count;k++){board=turnRiver(p,board,cell);history.push(board);}}
  assert.equal(history.length-1,p.minimum);assert.equal(riverFlow(p,board).solved,true);
  while(history.length>1)history.pop();assert.deepEqual(history[0],p.initial);
  assert.equal(turnRiver(p,board,p.source),board);assert.equal(turnRiver(p,board,p.ocean),board);
  for(let i=0;i<p.size*p.size;i++)if(!p.initial[i])assert.equal(turnRiver(p,board,i),board);
 });
}
test('early ocean arrival stays active until all 12 river tiles are used',()=>{const p=RIVER_PUZZLES[3],f=riverFlow(p,p.initial);assert.equal(f.reachedOcean,true);assert.equal(f.cells.length,6);assert.equal(f.solved,false);assert.equal(riverFlow(p,p.solution).cells.length,12);});
test('the source stops immediately at a mismatched first tile',()=>{const f=riverFlow(RIVER_PUZZLES[0],RIVER_PUZZLES[0].initial);assert.deepEqual(f.cells,[]);assert.equal(f.breakCell,0);assert.equal(f.breakEdge,1);});
test('four quarter turns restore every channel and never mutate originals',()=>{for(const mask of [3,5,6,9,10,12]){let result=mask;for(let i=0;i<4;i++)result=rotateChannel(result);assert.equal(result,mask);assert.equal(openings(mask).length,2);}assert.equal(CHANNEL_WIDTH,24);});
test('save round-trip preserves history, selected puzzle and personal best',()=>{const p=RIVER_PUZZLES[0],s=freshRiverSave();s.records[p.id]=1;s.sessions[p.id]=[p.initial,turnRiver(p,p.initial,1)];s.selected=p.id;assert.deepEqual(decodeRiverSave(JSON.stringify(s)),s);});
test('corrupt, oversized, impossible and post-completion saves are rejected safely',()=>{
 assert.equal(decodeRiverSave('bad json'),null);assert.equal(decodeRiverSave('x'.repeat(3000001)),null);
 const p=RIVER_PUZZLES[0],s=freshRiverSave();s.sessions[p.id]=[p.initial,[...p.initial].fill(15)];assert.equal(decodeRiverSave(JSON.stringify(s))?.sessions[p.id],undefined);
 s.sessions[p.id]=[p.initial,turnRiver(p,p.initial,1),p.initial];assert.equal(decodeRiverSave(JSON.stringify(s))?.sessions[p.id],undefined);
 s.records[p.id]=-1;assert.deepEqual(decodeRiverSave(JSON.stringify(s))?.records,{});
});
test('grid neighbours cannot wrap across rows or leave the board',()=>{assert.equal(neighbour(3,1,4),-1);assert.equal(neighbour(4,3,4),-1);assert.equal(neighbour(0,0,4),-1);assert.equal(neighbour(15,2,4),-1);});

test('the 36-puzzle collection has four groups of nine and unique ids',()=>{
 assert.equal(RIVER_PUZZLES.length,36);assert.equal(new Set(RIVER_PUZZLES.map(p=>p.id)).size,36);
 for(const difficulty of ['Easy','Medium','Hard','Expert'])assert.equal(RIVER_PUZZLES.filter(p=>p.difficulty===difficulty).length,9);
 assert.ok(RIVER_PUZZLES.filter(p=>p.difficulty==='Hard'||p.difficulty==='Expert').every(p=>p.size===5));
});
test('the original four puzzle layouts stay compatible with existing saves',()=>{
 const legacy=JSON.parse(readFileSync(new URL('./fixtures/river-shift-intro-v1.json',import.meta.url),'utf8'));
 for(const old of legacy){const p=RIVER_PUZZLES.find(p=>p.id===old.id)!;for(const key of ['size','route','initial','minimum'] as const)assert.deepEqual(p[key],old[key]);}
});
test('5 by 5 sessions resume with valid history and reject a turn of scenery',()=>{
 const p=RIVER_PUZZLES.find(p=>p.size===5)!,cell=p.initial.findIndex(m=>!!m),state=freshRiverSave();
 state.selected=p.id;state.sessions[p.id]=[p.initial,turnRiver(p,p.initial,cell)];assert.deepEqual(decodeRiverSave(JSON.stringify(state)),state);
 const scene=p.initial.findIndex((m,i)=>!m&&i!==p.source&&i!==p.ocean);assert.equal(turnRiver(p,p.initial,scene),p.initial);
});
