import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GRIDLOCK_LEVELS} from '../lib/gridlock-levels.ts';
import {acceptVariety,layoutFamily,nearDuplicate,solutionPattern,theme} from '../scripts/gridlock-variety.ts';
import {decodeProgress,type Puzzle} from '../lib/gridlock.ts';
const levels:Puzzle[]=GRIDLOCK_LEVELS;

test('every published puzzle has a different vehicle layout regardless of starting positions or colours',()=>{
 const signatures=levels.map(p=>p.vehicles.map(v=>`${+v.horizontal}:${v.length}:${v.lane}`).sort().join('|'));
 assert.equal(new Set(signatures).size,200);
 for(let i=0;i<levels.length;i++)for(let j=i+1;j<levels.length;j++)assert(!nearDuplicate(levels[i],levels[j]),`${levels[i].id} resembles ${levels[j].id}`);
});
test('Easy mixes solutions, vehicle sizes and pars rather than repeating simple clear-the-columns boards',()=>{
 const easy=levels.filter(p=>p.difficulty==='Easy'),patterns=new Map<string,number>();
 for(const p of easy){const key=solutionPattern(p);patterns.set(key,(patterns.get(key)??0)+1);}
 assert(Math.max(...patterns.values())<=2);
 assert(easy.filter(p=>theme(p)==='direct-blockers').length<=3);
 assert(easy.filter(p=>theme(p)==='red-car-reposition').length>=5);
 assert(new Set(easy.map(theme)).size>=3);
 assert(easy.every(p=>p.vehicles.filter(v=>v.length===3).length<=2));
 assert(easy.filter(p=>p.vehicles.filter(v=>v.length===3).length<=1).length>=30);
 for(const [moves,count] of [[4,6],[5,14],[6,16],[7,14]])assert.equal(easy.filter(p=>p.minimum===moves).length,count);
 assert(new Set(easy.slice(0,10).map(theme)).size>=3);
 assert(new Set(easy.slice(0,10).map(p=>p.minimum)).size>=2);
});
test('filler removal cannot create accepted near-duplicates by shifting starts or changing one truck length',()=>{
 const p=levels[0],shifted={...p,positions:p.positions.map((n,i)=>i===0?(n===0?1:0):n)};
 assert.equal(layoutFamily(shifted),layoutFamily(p));assert(!acceptVariety(shifted,[p]));
 const recoloured={...p,vehicles:p.vehicles.map((v,i)=>({...v,id:`other-${i}`}))};
 assert.equal(solutionPattern(recoloured),solutionPattern(p));assert(nearDuplicate(recoloured,p));
 const truck=levels.find(q=>q.vehicles.slice(1).some(v=>v.length===3))!,index=truck.vehicles.findIndex(v=>v.length===3);
 const shorter={...truck,vehicles:truck.vehicles.map((v,i)=>i===index?{...v,length:2 as const}:v)};
 assert.notEqual(layoutFamily(shorter),layoutFamily(truck));assert(nearDuplicate(shorter,truck));assert(!acceptVariety(shorter,[truck]));
});
test('unchanged boards keep their original record identities after resequencing',()=>{
 const seeds=JSON.parse(readFileSync(new URL('../scripts/data/gridlock-seeds.json',import.meta.url),'utf8')) as [number[][],number[],string][];
 const originals=new Map(seeds.map(([spec,positions,id])=>[id,{spec,positions}]));
 let retained=0;
 for(const p of levels){const old=originals.get(p.id);if(!old)continue;retained++;
  assert.deepEqual(p.vehicles.map(v=>[+v.horizontal,v.length,v.lane]),old.spec);assert.deepEqual(p.positions,old.positions);
 }
 assert(retained>50);
 const p=levels.find(p=>originals.has(p.id))!;
 assert.deepEqual(decodeProgress(JSON.stringify({version:1,records:{[p.id]:p.minimum},session:{level:'retired-layout',history:[]}}),levels),{version:1,records:{[p.id]:p.minimum},session:null});
});
