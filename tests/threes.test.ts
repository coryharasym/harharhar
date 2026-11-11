import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canMerge, draw, ended, move, score, slide, start, tilePoints, type Board, type Game, type Direction} from '../lib/threes.ts';
const board = (values: number[]): Board => [...values,...Array(16-values.length).fill(0)].map((value,id)=>value?{id,value}:null);
const values = (b: Board) => b.map(t=>t?.value||0);
function seeded(seed: number) {return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const game = (b: Board): Game => ({board:b,bag:[2,3,1],next:1,serial:16,moves:0});
test('Threes: complementary low tiles, equal high tiles, and single merges',()=>{
  assert.ok(canMerge(1,2)&&canMerge(2,1)&&canMerge(3,3)&&canMerge(768,768));
  assert.ok(!canMerge(1,1)&&!canMerge(2,2)&&!canMerge(3,6));
  assert.deepEqual(values(slide(board([1,2,3,3]),'L').board).slice(0,4),[3,3,3,0]);
  assert.deepEqual(values(slide(board([3,3,3,3]),'L').board).slice(0,4),[6,3,3,0]);
});
test('Threes: every tile moves exactly one cell, without compressing gaps',()=>{
  assert.deepEqual(values(slide(board([0,0,3,0]),'L').board).slice(0,4),[0,3,0,0]);
  assert.deepEqual(values(slide(board([0,3,3,0]),'L').board).slice(0,4),[3,3,0,0]);
  assert.deepEqual(values(slide(board([3,0,0,0]),'R').board).slice(0,4),[0,3,0,0]);
  const up=board([]);up[12]={id:1,value:3};assert.equal(slide(up,'U').board[8]?.value,3);
  const down=board([3]);assert.equal(slide(down,'D').board[4]?.value,3);
});
test('Threes: invalid moves retain the game and preview without consuming randomness',()=>{
  const g=game(board([1,1,3,6])); const before=structuredClone(g);
  assert.equal(move(g,'L',()=>{throw Error('random consumed');}).game,g);assert.deepEqual(g,before);
});
test('Threes: incoming tile appears only in a changed lane on the opposite edge',()=>{
  for(const direction of ['L','R','U','D'] as Direction[]){
    const g=game(board([3,0,6,0,0,12,0,0,24])); const before=structuredClone(g);
    const next=move(g,direction,()=>0);assert.notEqual(next.game,g);assert.ok(slide(g.board,direction).entries.includes(next.entry));
    assert.equal(next.game.board[next.entry]?.value,1);assert.equal(next.game.next,2);assert.equal(next.game.moves,1);assert.deepEqual(g,before);
    assert.ok(direction==='L'?next.entry%4===3:direction==='R'?next.entry%4===0:direction==='U'?next.entry>=12:next.entry<4);
  }
});
test('Threes: each shuffled bag has four of each value, including across refills',()=>{
  let bag:number[]=[];const rng=seeded(42);
  for(let cycle=0;cycle<10;cycle++){const counts=[0,0,0,0];for(let i=0;i<12;i++){const next=draw(bag,rng);counts[next.value]++;bag=next.bag;}assert.deepEqual(counts,[0,4,4,4]);assert.equal(bag.length,0);}
});
test('Threes: exponential board scoring',()=>{
  assert.deepEqual([1,2,3,6,12,24,48,96].map(tilePoints),[0,0,3,9,27,81,243,729]);
  assert.equal(score(board([1,2,3,6,12])),39);
  assert.equal(score(slide(board([3,3]),'L').board),9);
});
test('Threes: game over permits complementary pairs and empty-space movement',()=>{
  const full=board([1,1,1,1,3,6,12,24,6,12,24,48,12,24,48,96]);assert.ok(ended(full));
  full[1]={id:1,value:2};assert.ok(!ended(full));assert.ok(!ended(board([1])));
});
test('Threes: randomized complete games preserve IDs, legal values, and tile mass',()=>{
  for(let seed=1;seed<=40;seed++){
    const rng=seeded(seed);let g=start(rng);assert.equal(g.board.filter(Boolean).length,9);
    for(let i=0;i<700&&!ended(g.board);i++){
      const d=(['L','R','U','D'] as Direction[])[Math.floor(rng()*4)], mass=g.board.reduce((s,t)=>s+(t?.value||0),0),next=move(g,d,rng).game;
      if(next!==g)assert.equal(next.board.reduce((s,t)=>s+(t?.value||0),0),mass+g.next);
      const ids=next.board.filter(Boolean).map(t=>t!.id);assert.equal(ids.length,new Set(ids).size);
      assert.ok(next.board.every(t=>!t||t.value===1||t.value===2||Number.isInteger(Math.log2(t.value/3))));g=next;
    }
  }
});
