import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startBlocks,placeBlock,openingSolution,shapeCells,fits,hasBlockMoves,replayBlocks,blockProgress,SHAPES,type BlockGame} from '../lib/blocks.ts';
import * as v2 from '../lib/blocks-v2.ts';
import {initialBlockCheckpoint,verifyBlockBatch,blockHistoryHash} from '../lib/block-sync.ts';

function completeRack(g:BlockGame){
 const solution=openingSolution(g.board,g.tray);assert.ok(solution,`Rack ${g.racksCompleted} must be solvable`);
 for(const [slot,rot,row,col] of solution){const next=placeBlock(g,slot,rot,row,col);assert.notEqual(next,g);g=next;}
 return g;
}
test('every dealt rack remains solvable through all progression stages',()=>{
 // Follow the proofs through 1,200 real refills; checks clears, order, rotations and fallback.
 for(let seed=0;seed<40;seed++){
  let g=startBlocks(seed);
  for(let rack=0;rack<30;rack++){
   assert.equal(g.racksCompleted,rack);assert.ok(hasBlockMoves(g));
   const before=structuredClone(g);g=completeRack(g);assert.deepEqual(before,replayBlocks(seed,before.moves));
  }
 }
});
test('progress depends on completed racks, reaches a ceiling and gives regular breathers',()=>{
 assert.equal(blockProgress(0).tier,0);assert.equal(blockProgress(4).tier,1);
 assert.equal(blockProgress(10).tier,2);assert.equal(blockProgress(18).tier,3);
 assert.equal(blockProgress(1000).tier,3);
 for(const rack of [6,12,18,24,30])assert.equal(blockProgress(rack).breather,true);
 const g=startBlocks(33),rich={...g,score:1000000,lines:900,combo:100};
 assert.deepEqual(completeRack(g).tray,completeRack(rich).tray);
});
test('later racks favor larger shapes and breathers return to a gentler mix',()=>{
 function sample(racksCompleted:number){let size=0,large=0;for(let seed=0;seed<200;seed++){
  // Identical open board/RNG; only progression differs at the refill.
  const g:BlockGame={board:Array(64).fill(0),tray:[0,null,null],score:0,lines:0,combo:0,rng:seed,rules:3,racksCompleted:racksCompleted-1,moves:'',last:{cleared:[],gain:0,lines:0}};
  const next=placeBlock(g,0,0,7,7);
  for(const id of next.tray){assert.notEqual(id,null);const n=SHAPES[id!].cells.length;size+=n;if(n>=5)large++;}
 }return {size,large};}
 const early=sample(1),late=sample(23),breather=sample(24);
 assert.ok(late.size>early.size*1.25);assert.ok(late.large>early.large*2);
 assert.ok(breather.size<late.size*.85);
});
test('rack solutions can require clearing a line before a larger piece fits',()=>{
 const board=Array.from({length:64},(_,i)=>((Math.floor(i/8)+i%8)%2===0?1:0));
 for(let c=1;c<8;c++)board[c]=1;board[0]=0;
 for(let r=1;r<=2;r++)for(let c=0;c<3;c++)board[r*8+c]=0;
 const tray=[13,0,1];
 assert.equal([0,1,2,3].some(rot=>{for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(fits(board,shapeCells(13,rot),r,c))return true;return false;}),false);
 const solution=openingSolution(board,tray);assert.ok(solution);assert.notEqual(solution[0][0],0);
 let g:BlockGame={...startBlocks(0),board,tray};for(const [s,o,r,c]of solution){const next=placeBlock(g,s,o,r,c);assert.notEqual(next,g);g=next;}
});
test('a poor placement can still lose a rack that had a solution',()=>{
 // Find an actually losing choice on generated racks, avoiding dependence on a particular seed.
 let found=false;
 for(let seed=0;seed<50&&!found;seed++){
  let run=startBlocks(seed);
  for(let rack=0;rack<15&&!found;rack++){
   for(let s=0;s<3&&!found;s++)for(let o=0;o<4&&!found;o++)for(let r=0;r<8&&!found;r++)for(let c=0;c<8&&!found;c++){
    const next=placeBlock(run,s,o,r,c);if(next!==run&&!hasBlockMoves(next))found=true;
   }
   run=completeRack(run);
  }
 }
 assert.ok(found);
});
test('old v2 histories and checkpoints retain their original deterministic rules',()=>{
 let old=v2.startBlocks(989);for(let rack=0;rack<3;rack++){
  const proof=v2.openingSolution(old.board,old.tray);if(!proof)break;
  for(const [s,o,r,c] of proof)old=v2.placeBlock(old,s,o,r,c);
 }
 assert.deepEqual(replayBlocks(989,old.moves,2),old);
 const cp=verifyBlockBatch(initialBlockCheckpoint(989,2),0,blockHistoryHash(''),old.moves);
 assert.deepEqual(cp.game,{...old,moves:''});assert.equal(cp.game.rules,undefined);
});
test('new batched checkpoints retain progression even when history is stripped',()=>{
 let g=startBlocks(99);for(let i=0;i<25;i++)g=completeRack(g);
 let cp=initialBlockCheckpoint(99);
 for(let offset=0;offset<g.moves.length;offset+=20)cp=verifyBlockBatch(cp,offset,blockHistoryHash(g.moves.slice(0,offset)),g.moves.slice(offset,offset+20));
 assert.deepEqual(cp.game,{...g,moves:''});assert.equal(cp.game.racksCompleted,25);
});
