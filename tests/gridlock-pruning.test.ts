import test from 'node:test';
import assert from 'node:assert/strict';
import {prunePuzzle,solve} from '../scripts/gridlock-pruning.ts';
import {slide,solved,type Puzzle} from '../lib/gridlock.ts';

test('pruning removes unused cars and cars moved unnecessarily by a supplied route',()=>{
 const puzzle:Puzzle={id:'fixture',difficulty:'Easy',vehicles:[
  {id:'EXIT',horizontal:true,length:2,lane:2},
  {id:'blocker',horizontal:false,length:2,lane:2},
  {id:'filler',horizontal:true,length:2,lane:5},
  {id:'parked',horizontal:true,length:2,lane:0},
 ],positions:[0,1,0,0],minimum:3,solution:[{piece:2,to:3},{piece:1,to:3},{piece:0,to:4}]};
 const p=prunePuzzle(puzzle);
 assert.deepEqual(p.vehicles.map(v=>v.id),['EXIT','blocker']);
 assert.equal(p.minimum,2);assert.equal(solve(p.vehicles,p.positions,1),null);
 let at=p.positions;for(const m of p.solution)at=slide(p.vehicles,at,m.piece,m.to);assert(solved(at));
 assert.equal(puzzle.vehicles.length,4);
});
