import test from 'node:test';
import assert from 'node:assert/strict';
import {newMapleGame,gameDrop,stepMapleGame} from '../lib/maple-game.ts';
import {initialMapleCheckpoint,verifyMapleBatch,encodeMapleDrop,mapleHash,maplePrefix,mapleActions} from '../lib/maple-sync.ts';
import {encodeMapleSave,decodeMapleSave,restoreMapleSave} from '../lib/maple-save.ts';
import {aimX} from '../lib/maple-physics.ts';
test('incremental verification reproduces positions, chain points and danger through save/resume',()=>{
 const g=newMapleGame(123);let moves='';for(let t=0;t<2400;t++){if(t%90===0){const x=aimX(Math.round((120+(t%3)*55)*1000)/1000,g.current);if(gameDrop(g,x))moves+=encodeMapleDrop(t,x);}stepMapleGame(g);}
 assert.ok(g.score>0);let c=initialMapleCheckpoint(123);for(const end of [...[600,1200,1800,2400].filter(t=>t<g.world.tick),g.world.tick]){const prefix=maplePrefix(moves,c.offset),batch=maplePrefix(moves,end).slice(prefix.length);c=verifyMapleBatch(c,c.offset,mapleHash(prefix),batch,end,20000);}
 assert.deepEqual(c.game,g);assert.equal(c.hash,mapleHash(moves));
 g.competitive={id:'11111111-1111-4111-8111-111111111111',seed:123,moves};const save=decodeMapleSave(encodeMapleSave(g,180,g.score)!);assert.ok(save);assert.deepEqual(restoreMapleSave(save).game.competitive,g.competitive);
});
test('verification rejects forged coordinates, duplicated drops, stale progress, excessive time and batches',()=>{
 const c=initialMapleCheckpoint(5);for(const work of [()=>verifyMapleBatch(c,1,c.hash,'',2,1000),()=>verifyMapleBatch(c,0,1,'',2,1000),()=>verifyMapleBatch(c,0,c.hash,'',1201,20000),()=>verifyMapleBatch(c,0,c.hash,'',1000,0),()=>verifyMapleBatch(c,0,c.hash,encodeMapleDrop(0,0),100,1000),()=>verifyMapleBatch(c,0,c.hash,encodeMapleDrop(0,180)+encodeMapleDrop(0,180),100,1000),()=>mapleActions('invalid')])assert.throws(work);
 assert.equal(c.offset,0);assert.equal(c.game.world.tick,0);assert.equal(c.game.world.drops,0);
});
test('a rejected batch leaves the verified checkpoint intact and a retry is identical',()=>{const c=initialMapleCheckpoint(44),moves=encodeMapleDrop(0,180);const first=verifyMapleBatch(c,0,c.hash,moves,1200,10000);assert.deepEqual(first,verifyMapleBatch(c,0,c.hash,moves,1200,10000));assert.equal(c.game.world.tick,0);assert.throws(()=>verifyMapleBatch(first,1200,first.hash,encodeMapleDrop(1200,180)+encodeMapleDrop(1201,180),1300,20000));assert.equal(first.game.world.tick,1200);});
test('old local bowls remain compatible without acquiring competitive credentials',()=>{const g=newMapleGame(77);assert.equal(decodeMapleSave(encodeMapleSave(g,180,0)!)?.game.competitive,undefined);});
