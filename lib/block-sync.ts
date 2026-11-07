import {startBlocks,replayBlockMoves,type BlockGame} from './blocks.ts';
// Bound each verification request, not the lifetime of a game.
export const BLOCK_BATCH_CHARS=16000;
export const INITIAL_BLOCK_HASH=2166136261;
export type BlockCheckpoint={offset:number;hash:number;game:BlockGame};
// A prefix fingerprint detects stale/different tabs; replay, not this hash, verifies scores.
export function blockHistoryHash(moves:string,hash=INITIAL_BLOCK_HASH){for(let i=0;i<moves.length;i++)hash=Math.imul(hash^moves.charCodeAt(i),16777619)>>>0;return hash;}
export function initialBlockCheckpoint(seed:number):BlockCheckpoint{return {offset:0,hash:INITIAL_BLOCK_HASH,game:startBlocks(seed)};}
export function verifyBlockBatch(checkpoint:BlockCheckpoint,offset:number,hash:number,moves:string):BlockCheckpoint{
 if(!Number.isSafeInteger(offset)||offset!==checkpoint.offset||hash!==checkpoint.hash)throw Error('Progress conflict');
 if(moves.length>BLOCK_BATCH_CHARS)throw Error('Batch too large');
 const game=replayBlockMoves(checkpoint.game,moves);
 return {offset:offset+moves.length,hash:blockHistoryHash(moves,hash),game:{...game,moves:''}};
}
