import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as game2048 from '../lib/game.ts';
import * as blocks from '../lib/blocks.ts';
import * as legacyBlocks from '../lib/blocks-legacy.ts';
import * as blockSync from '../lib/block-sync.ts';
import * as flightSync from '../lib/flight-sync.ts';
import * as mapleSync from '../lib/maple-sync.ts';
import {startFlight,stepFlight} from '../lib/tunnel-flight.ts';
import {newMapleGame,gameDrop,stepMapleGame} from '../lib/maple-game.ts';
import {aimX} from '../lib/maple-physics.ts';
import * as leaderboard from '../lib/leaderboard.ts';

type Fixture={game:string;rules:number;seed:number;checkpoint:unknown;active:Record<string,unknown>;final:Record<string,unknown>;history:string};
function puzzleFixture():Fixture{const seed=9;let g=game2048.start(seed);for(let n=0;n<15000&&!game2048.ended(g);n++){let changed=false;for(let i=0;i<4;i++){const next=game2048.move(g,(['L','D','R','U'] as const)[(n+i)%4]);if(next!==g){g=next;changed=true;break;}}if(!changed)break;}assert.ok(game2048.ended(g));assert.ok(g.score>0);return {game:'2048',rules:1,seed,checkpoint:null,active:{moves:g.moves.slice(0,-1)},final:{moves:g.moves},history:g.moves};}
function blockFixture(legacy=false):Fixture{const rules=legacy?legacyBlocks:blocks,seed=7;let g:any=rules.startBlocks(seed),before=g;for(let n=0;n<3000&&rules.hasBlockMoves(g);n++){let next=g;outer:for(let s=0;s<3;s++)if(g.tray[s]!==null)for(let r=0;r<4;r++)for(let row=0;row<8;row++)for(let col=0;col<8;col++){next=rules.placeBlock(g,s,r,row,col);if(next!==g)break outer;}assert.notEqual(next,g);before=g;g=next;}assert.equal(rules.hasBlockMoves(g),false);assert.ok(g.score>0);if(legacy)return {game:'blocks',rules:1,seed,checkpoint:null,active:{moves:before.moves},final:{moves:g.moves},history:g.moves};const offset=before.moves.length,hash=blockSync.blockHistoryHash(before.moves);return {game:'blocks',rules:2,seed,checkpoint:{offset,hash,game:{...before,moves:''}},active:{moves:'',blockOffset:offset,blockHash:hash},final:{moves:g.moves.slice(offset),blockOffset:offset,blockHash:hash},history:g.moves};}
function flightFixture():Fixture{const seed=3;let g=startFlight(seed),before=g,history='';for(let n=0;n<30000&&g.hp>0;n++){before=g;g=stepFlight(g,0);history+='7f';}assert.equal(g.hp,0);const offset=history.length-2,hash=flightSync.flightHistoryHash(history.slice(0,offset));return {game:'tunnel',rules:flightSync.FLIGHT_RULES,seed,checkpoint:{offset,hash,game:{...before,events:[]}},active:{moves:'',flightOffset:offset,flightHash:hash},final:{moves:'7f',flightOffset:offset,flightHash:hash},history};}
function mapleFixture():Fixture{const seed=123,g=newMapleGame(seed);let before=structuredClone(g),history='',beforeMoves='';for(let n=0;n<20000&&!g.over;n++){before=structuredClone(g);beforeMoves=history;if(n%40===0){const x=aimX(180,g.current);if(gameDrop(g,x))history+=mapleSync.encodeMapleDrop(g.world.tick,x);}stepMapleGame(g);}assert.ok(g.over);assert.ok(g.score>0);const offset=before.world.tick,hash=mapleSync.mapleHash(beforeMoves);return {game:'maple',rules:2,seed,checkpoint:{offset,hash,game:before},active:{moves:'',mapleOffset:offset,mapleHash:hash,mapleEnd:offset},final:{moves:history.slice(beforeMoves.length),mapleOffset:offset,mapleHash:hash,mapleEnd:g.world.tick},history};}

const routeCode=ts.transpileModule(readFileSync('app/api/leaderboard/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness(f:Fixture){
 let run:any;const records=new Map<string,any>(),stats={writes:0,rankingReads:0,profileNames:[] as string[]};const runsTable:any={id:'runId',created:'runCreated',blockCheckpoint:'checkpoint'},scoresTable:any={id:'scoreId',score:'score',moves:'moves',playerId:'playerId',name:'name',nameEdited:'nameEdited'};
 const setRun=(id:string)=>{run={id,seed:f.seed,game:f.game,rules:f.rules,created:Date.now()-3600000,blockCheckpoint:f.checkpoint?JSON.stringify(f.checkpoint):null};};setRun('first-run');
 const matches=(row:any,condition:any):boolean=>!condition||condition.every((c:any)=>Array.isArray(c[0])?matches(row,c):c[0]==='runCreated'||row[({runId:'id',scoreId:'id',checkpoint:'blockCheckpoint'} as Record<string,string>)[c[0]]||c[0]]===c[1]);
 const db={select:()=>({from:(table:any)=>({where:async()=>table===runsTable?[run]:records.has(run.id)?[records.get(run.id)]:[]})}),update:(table:any)=>({set:(values:any)=>({where:(condition:any)=>({returning:async()=>{const row=table===runsTable?run:records.get(run.id);if(!row||!matches(row,condition))return [];Object.assign(row,values);return [{id:row.id}];}})})}),insert:()=>({values:(values:any)=>({onConflictDoUpdate:async({set}:any)=>{stats.writes++;const old=records.get(values.id);records.set(values.id,old?{...old,...set,name:old.name}:values);}})})};
 const env={DB:{prepare:()=>({bind:(game:string,cutoff:number)=>({all:async()=>{stats.rankingReads++;return {results:[...records.values()].filter(r=>r.game===game&&r.created>=cutoff).sort(leaderboard.compareScores).slice(0,10)};}})})}};
 class ProfileError extends Error{status=400;}
 const modules:Record<string,unknown>={
  'cloudflare:workers':{env},'../../../db':{getDb:()=>db},'../../../db/schema':{runs:runsTable,scores:scoresTable},'drizzle-orm':{eq:(field:any,value:any)=>[field,value],gte:()=>null,and:(...conditions:any[])=>conditions.filter(Boolean),sql:()=>null,isNull:()=>null},
  '../../../lib/cors':{isAllowedOrigin:()=>true},'../../../lib/player-server':{savePlayer:async(p:any)=>{if(p.key!=='valid-key')throw new ProfileError('Invalid profile');stats.profileNames.push(p.name);return p;},ProfileError},'../../../lib/game':game2048,'../../../lib/blocks':blocks,'../../../lib/blocks-legacy':legacyBlocks,'../../../lib/block-sync':blockSync,'../../../lib/flight-sync':flightSync,'../../../lib/maple-sync':mapleSync,'../../../lib/leaderboard':leaderboard
 };
 const exports:any={};new Function('require','exports',routeCode)((name:string)=>{if(!(name in modules))throw Error('Unexpected dependency '+name);return modules[name];},exports);
 const post=async(payload:Record<string,unknown>,name='Cory',profileName='Cory')=>{const response=await exports.POST(new Request('https://test.invalid/api/leaderboard',{method:'POST',body:JSON.stringify({id:run.id,name,profile:{id:'same-player',key:'valid-key',name:profileName,icon:'orbit'},...payload})}));return {status:response.status,data:await response.json()};};
 const confirmedPayload=()=>{if(!run.blockCheckpoint)return f.final;const cp=JSON.parse(run.blockCheckpoint);return {moves:'',...(f.game==='maple'?{mapleOffset:cp.offset,mapleHash:cp.hash,mapleEnd:cp.offset}:f.game==='tunnel'?{flightOffset:cp.offset,flightHash:cp.hash}:{blockOffset:cp.offset,blockHash:cp.hash})};};
 const edit=async(name:string,profile:Record<string,unknown>={id:'same-player',key:'valid-key',name:'Cory',icon:'orbit'})=>{const response=await exports.PATCH(new Request('https://test.invalid/api/leaderboard',{method:'PATCH',body:JSON.stringify({id:run.id,name,profile})}));return {status:response.status,data:await response.json()};};
 return {post,edit,records,stats,setRun,confirmedPayload,get run(){return run;}};
}

for(const [label,make] of [['2048',puzzleFixture],['Block Flux',()=>blockFixture()],['legacy Block Flux',()=>blockFixture(true)],['Neon Dodger',flightFixture],['Maple Merge',mapleFixture]] as const){test(`${label}: final scores publish automatically and allow one entry-only name edit`,async()=>{const f=make(),h=harness(f);
 const active=await h.post({...f.active,finished:true,gameOver:true});assert.equal(active.status,200,JSON.stringify(active.data));assert.equal(active.data.finished,false);assert.equal(active.data.published,false);assert.equal(h.records.size,0);assert.equal(h.stats.rankingReads,0);
 const posted=await h.post(f.final);assert.equal(posted.status,200,JSON.stringify(posted.data));assert.equal(posted.data.finished,true);assert.equal(posted.data.published,true);assert.equal(posted.data.nameEditable,true);assert.equal(posted.data.rank,1);assert.equal(h.records.size,1);assert.equal(h.records.get('first-run').name,'Cory');
 // Leaving the name alone keeps the existing score, and retries create no duplicates.
 const repeat=await h.post(h.confirmedPayload(),'Different');assert.equal(repeat.data.published,true);assert.equal(h.stats.writes,1);assert.equal(h.records.get('first-run').name,'Cory');
 const unchanged=await h.edit('Cory');assert.equal(unchanged.status,200);assert.equal(unchanged.data.nameEditable,true);
 const invalid=await h.edit(' ');assert.equal(invalid.status,400);assert.equal(h.records.get('first-run').nameEdited,0);
 const stranger=await h.edit('Alex',{id:'other-player',key:'valid-key',name:'Other',icon:'orbit'});assert.equal(stranger.status,403);
 const forged=await h.edit('Alex',{id:'same-player',key:'wrong-key',name:'Cory',icon:'orbit'});assert.equal(forged.status,400);
 const edit=await h.edit('Alex');assert.equal(edit.status,200,JSON.stringify(edit.data));assert.equal(edit.data.nameEditable,false);assert.equal(h.records.get('first-run').name,'Alex');assert.equal(h.stats.profileNames.at(-1),'Cory');
 const retry=await h.edit('Alex');assert.equal(retry.status,200);assert.equal(h.records.size,1);
 const twice=await h.edit('Sam');assert.equal(twice.status,409);assert.equal(h.records.get('first-run').name,'Alex');
 const resync=await h.post(h.confirmedPayload());assert.equal(resync.data.name,'Alex');assert.equal(resync.data.nameEditable,false);assert.equal(h.stats.writes,1);
 h.setRun('second-run');const second=await h.post(f.final);assert.equal(second.status,200,JSON.stringify(second.data));assert.equal(second.data.published,true);assert.equal(second.data.rank,2);assert.equal(h.records.size,2);assert.equal(h.records.get('second-run').name,'Cory');assert.equal(h.records.get('second-run').playerId,h.records.get('first-run').playerId);
 const anotherEdit=await h.edit('Sam');assert.equal(anotherEdit.status,200);assert.equal(h.records.get('second-run').name,'Sam');assert.equal(h.records.get('first-run').name,'Alex');
 });}

test('active Block Flux and flight checkpoints still sync without adding leaderboard rows',async()=>{for(const f of [blockFixture(),flightFixture()]){const h=harness({...f,checkpoint:null});const prefix=f.game==='blocks'?f.history.slice(0,4):f.history.slice(0,120);const payload=f.game==='blocks'?{moves:prefix,blockOffset:0,blockHash:blockSync.INITIAL_BLOCK_HASH}:{moves:prefix,flightOffset:0,flightHash:flightSync.INITIAL_FLIGHT_HASH};const result=await h.post(payload);assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.finished,false);assert.equal(result.data.verifiedOffset,prefix.length);assert.equal(JSON.parse(h.run.blockCheckpoint).offset,prefix.length);assert.equal(h.records.size,0);}});

test('a finished run stays unpublished if it does not qualify',async()=>{const f=puzzleFixture(),h=harness(f);for(let i=0;i<10;i++)h.records.set('higher'+i,{id:'higher'+i,game:'2048',playerId:'other'+i,name:'Other',score:10000000,moves:1,created:1});const result=await h.post({...f.final,confirmPublish:true});assert.equal(result.status,200);assert.equal(result.data.finished,true);assert.equal(result.data.qualified,false);assert.equal(result.data.published,false);assert.equal(h.records.size,10);assert.equal(h.stats.writes,0);});
