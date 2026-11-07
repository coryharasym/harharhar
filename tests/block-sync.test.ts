import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialBlockCheckpoint,verifyBlockBatch,blockHistoryHash,BLOCK_BATCH_CHARS} from '../lib/block-sync.ts';
import {openingSolution,replayBlocks} from '../lib/blocks.ts';
const seed=989;
function opening(){const cp=initialBlockCheckpoint(seed);return openingSolution(cp.game.board,cp.game.tray)!.map(step=>step.join('')).join('');}
test('batched server checkpoints equal a full replay, including rack refill and random state',()=>{const moves=opening();let cp=initialBlockCheckpoint(seed);for(let i=0;i<moves.length;i+=4)cp=verifyBlockBatch(cp,i,blockHistoryHash(moves.slice(0,i)),moves.slice(i,i+4));const full=replayBlocks(seed,moves);assert.deepEqual(cp.game,{...full,moves:''});assert.equal(cp.offset,moves.length);assert.equal(cp.hash,blockHistoryHash(moves));assert.equal(cp.game.moves,'');});
test('a retry or reload can confirm an existing checkpoint without double scoring',()=>{const moves=opening();const cp=verifyBlockBatch(initialBlockCheckpoint(seed),0,blockHistoryHash(''),moves);assert.deepEqual(verifyBlockBatch(cp,cp.offset,cp.hash,''),cp);assert.throws(()=>verifyBlockBatch(cp,0,blockHistoryHash(''),moves),/conflict/);assert.throws(()=>verifyBlockBatch(cp,cp.offset,cp.hash^1,''),/conflict/);});
test('invalid batches cannot mutate the last verified checkpoint',()=>{const cp=initialBlockCheckpoint(seed),before=structuredClone(cp);for(const moves of ['9999','000','0000'.repeat(4001)])assert.throws(()=>verifyBlockBatch(cp,0,cp.hash,moves));assert.deepEqual(cp,before);});
test('bounded batches do not impose a lifetime placement cap',()=>{const cp=initialBlockCheckpoint(seed),move=opening().slice(0,4);cp.offset=BLOCK_BATCH_CHARS*100;const next=verifyBlockBatch(cp,cp.offset,cp.hash,move);assert.equal(next.offset,cp.offset+4);assert.equal(next.game.moves,'');assert.ok(next.game.score>0);});
