import test from 'node:test';
import assert from 'node:assert/strict';
import {BOWL,aimX} from '../lib/maple-physics.ts';
import {newMapleGame,gameDrop,stepMapleGame,practicePair,practiceDanger,MAPLE_RULES} from '../lib/maple-game.ts';
import {MAPLE_SAVE_KEY,encodeMapleSave,decodeMapleSave,readMapleSave,writeMapleSave,restoreMapleSave} from '../lib/maple-save.ts';
const memory=()=>{const values=new Map<string,string>();return {values,getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};};
function played(){const g=newMapleGame(9876);for(let t=0;t<1000;t++){if(t%90===0)gameDrop(g,aimX(50+t%250,g.current));stepMapleGame(g);}return g;}
test('snapshot preserves all solver state, queue, scoring and timers with an independent paused restoration',()=>{
 const g=played(),raw=encodeMapleSave(g,72,10000,123)!;assert.ok(raw);const saved=decodeMapleSave(raw)!;assert.deepEqual(saved.game,g);assert.equal(saved.aim,72);assert.equal(saved.best,10000);
 const restored=restoreMapleSave(saved);assert.equal(restored.game.paused,true);const tick=restored.game.world.tick;for(let t=0;t<500;t++)stepMapleGame(restored.game);assert.equal(restored.game.world.tick,tick);restored.game.paused=false;
 for(let t=0;t<500;t++){if(t%90===0){gameDrop(g,aimX(180,g.current));gameDrop(restored.game,aimX(180,restored.game.current));}stepMapleGame(g);stepMapleGame(restored.game);}assert.deepEqual(restored.game,g);assert.notEqual(saved.game.world.tick,g.world.tick);
});
test('chain ancestry and danger eligibility survive a save, with no renewed grace or countdown',()=>{
 const g=practiceDanger();g.practice=false;for(let t=0;t<210;t++)stepMapleGame(g);assert.ok(g.dangerTicks>0);const saved=decodeMapleSave(encodeMapleSave(g,180,0)!)!;const restored=restoreMapleSave(saved).game;assert.equal(restored.dangerTicks,g.dangerTicks);assert.deepEqual(restored.entry,g.entry);restored.paused=false;const left=MAPLE_RULES.dangerTicks-g.dangerTicks;for(let i=0;i<left-1;i++)stepMapleGame(restored);assert.equal(restored.over,false);stepMapleGame(restored);assert.equal(restored.over,true);
 const pair=practicePair(0);pair.practice=false;for(let t=0;t<10;t++)stepMapleGame(pair);assert.ok(Object.keys(pair.lineage).length);assert.deepEqual(decodeMapleSave(encodeMapleSave(pair,180,0)!)!.game.lineage,pair.lineage);
});
test('finished games restore frozen results rather than opening a fresh playable bowl',()=>{
 const g=practiceDanger();g.practice=false;while(!g.over)stepMapleGame(g);const restored=restoreMapleSave(decodeMapleSave(encodeMapleSave(g,180,100)!)!).game;assert.ok(restored.over);assert.equal(gameDrop(restored,180),false);const before=JSON.stringify(restored);stepMapleGame(restored);assert.equal(JSON.stringify(restored),before);
});
test('normal autosave updates best, fresh runs retain it, and practice cannot overwrite the normal bowl',()=>{
 const storage=memory(),g=played();assert.equal(readMapleSave(storage).kind,'empty');assert.equal(writeMapleSave(storage,g,180,0,123),true);const old=storage.getItem(MAPLE_SAVE_KEY);assert.equal(writeMapleSave(storage,practicePair(9),180,9999),false);assert.equal(storage.getItem(MAPLE_SAVE_KEY),old);const first=readMapleSave(storage);assert.equal(first.kind,'saved');if(first.kind!=='saved')return;assert.equal(first.save.best,g.score);assert.ok(writeMapleSave(storage,newMapleGame(5),180,first.save.best));const fresh=readMapleSave(storage);if(fresh.kind!=='saved')throw Error('Save missing');assert.equal(fresh.save.best,g.score);assert.equal(fresh.save.game.score,0);assert.equal(fresh.save.game.world.balls.length,0);
});
test('unavailable or quota-limited storage is reported without changing the running game',()=>{
 const blocked={getItem:()=>{throw Error('Blocked');},setItem:()=>{throw Error('Quota');}};assert.equal(readMapleSave(blocked).kind,'unavailable');const g=played(),before=JSON.stringify(g);assert.equal(writeMapleSave(blocked,g,180,0),false);assert.equal(JSON.stringify(g),before);assert.equal(encodeMapleSave(practicePair(1),180,0),null);
});
test('corrupt, incompatible and unbounded snapshots never reach the solver',()=>{
 const source=JSON.parse(encodeMapleSave(played(),180,99999)!);const bad=[null,{},'bad', {...source,version:2},{...source,rules:999},{...source,physics:2},{...source,best:-1},{...source,aim:null}];
 const mutate=(fn:(s:typeof source)=>void)=>{const s=structuredClone(source);fn(s);bad.push(s);};
 mutate(s=>s.game.world.balls[0].tier=11);mutate(s=>s.game.world.balls[0].x=-100);mutate(s=>s.game.world.balls[0].vx=null);mutate(s=>s.game.world.balls.push(s.game.world.balls[0]));mutate(s=>s.game.world.balls[0].born=s.game.world.tick+1);mutate(s=>s.game.entry['99999']={entered:true,birth:0});mutate(s=>s.game.lineage['constructor']=3);mutate(s=>s.game.practice=true);mutate(s=>s.game.world.lastDrop=s.game.world.tick+1);mutate(s=>s.game.over=true);mutate(s=>s.game.score=Number.MAX_SAFE_INTEGER+1);
 for(const value of bad)assert.equal(decodeMapleSave(JSON.stringify(value)),null);assert.equal(decodeMapleSave('{unfinished'),null);assert.equal(decodeMapleSave(' '.repeat(500001)),null);
 const storage=memory();storage.setItem(MAPLE_SAVE_KEY,'{bad');assert.equal(readMapleSave(storage).kind,'invalid');assert.equal(storage.getItem(MAPLE_SAVE_KEY),'{bad');
});
test('aim is clamped, writes are synchronous and pausing does not mutate stored state',()=>{
 const g=newMapleGame(42),raw=encodeMapleSave(g,-200,0,456)!;const saved=decodeMapleSave(raw)!;assert.equal(saved.aim,aimX(-200,g.current));assert.equal(saved.savedAt,456);const restored=restoreMapleSave(saved);assert.equal(saved.game.paused,false);assert.equal(restored.game.paused,true);assert.equal(decodeMapleSave(raw)!.game.paused,false);
});
