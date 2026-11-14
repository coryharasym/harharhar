// Development-only deterministic generator. BFS edges are whole slides, not single squares.
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {occupancy,solved,type Puzzle,type Vehicle} from '../lib/gridlock.ts';
import {prunePuzzle,solve} from './gridlock-pruning.ts';
import {acceptVariety,sequenceTier} from './gridlock-variety.ts';
let seed=62371;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const key=(p:number[])=>p.join('');
function search(vehicles:Vehicle[],start:number[],limit=40000){
 const boards=[start],edges:number[][]=[[]],index=new Map([[key(start),0]]);let head=0;
 while(head<boards.length){const p=boards[head],cells=new Int8Array(36).fill(-1);for(let i=0;i<vehicles.length;i++){const v=vehicles[i];for(let n=0;n<v.length;n++)cells[v.horizontal?v.lane*6+p[i]+n:(p[i]+n)*6+v.lane]=i;}for(let i=0;i<vehicles.length;i++){const v=vehicles[i],cell=(n:number)=>cells[v.horizontal?v.lane*6+n:n*6+v.lane];let min=p[i],max=p[i];while(min>0&&cell(min-1)===-1)min--;while(max+v.length<6&&cell(max+v.length)===-1)max++;for(let to=min;to<=max;to++){if(to===p[i])continue;const q=[...p];q[i]=to;const k=key(q);let id=index.get(k);if(id===undefined){if(boards.length>=limit)return null;id=boards.length;index.set(k,id);boards.push(q);edges.push([]);}edges[head].push(id);}}head++;}
 const distance=Array(boards.length).fill(-1),toward=Array(boards.length).fill(-1),queue:number[]=[];boards.forEach((b,i)=>{if(solved(b)){distance[i]=0;queue.push(i);}});
 for(let h=0;h<queue.length;h++){const id=queue[h];for(const n of edges[id])if(distance[n]===-1){distance[n]=distance[id]+1;toward[n]=id;queue.push(n);}}
 return {boards,distance,toward};
}
const difficulties=['Easy','Intermediate','Advanced','Expert'] as const;
let puzzles:Puzzle[]=[],counts=[0,0,0,0],attempts=0;
const checkpoint=process.argv[process.argv.indexOf('--checkpoint')+1];
const checkpointPath=process.argv.includes('--checkpoint')?checkpoint:undefined;
function saveCheckpoint(){if(checkpointPath)writeFileSync(checkpointPath,JSON.stringify({version:4,seed,puzzles,counts,attempts}));}
function accept(candidate:Puzzle){
 const tier=candidate.minimum<4?-1:candidate.minimum<=7?0:candidate.minimum<=12?1:candidate.minimum<=17?2:3;
 if(tier===-1||counts[tier]>=50)return false;
 candidate={...candidate,difficulty:difficulties[tier]};
 if(!acceptVariety(candidate,puzzles))return false;
 counts[tier]++;puzzles.push(candidate);saveCheckpoint();
 console.log({attempts,counts});return true;
}
if(checkpointPath&&existsSync(checkpointPath)){
 const saved=JSON.parse(readFileSync(checkpointPath,'utf8'));if(saved.version!==4)throw Error('Wrong checkpoint version');
 ({seed,puzzles,counts,attempts}=saved);
}else{
 // Frozen legal starting boards from collection 2 seed the search; every board
 // is solved and screened again. This input stays fixed when output changes.
 const blueprints=JSON.parse(readFileSync(new URL('./data/gridlock-seeds.json',import.meta.url),'utf8')) as [number[][],number[],string][];
 for(const [spec,positions] of blueprints){
  const vehicles=spec.map(([horizontal,length,lane],i)=>({id:i===0?'EXIT':String.fromCharCode(64+i),horizontal:!!horizontal,length:length as 2|3,lane}));
  const solution=solve(vehicles,positions)!;
  accept(prunePuzzle({id:'',difficulty:'Easy',vehicles,positions,solution,minimum:solution.length}));
 }
}

while(counts.some(n=>n<50)){
 if(++attempts>80000)throw Error('Generation exhausted');
 const allShort=attempts%3===0;
 const vehicles:Vehicle[]=[{id:'EXIT',horizontal:true,length:2,lane:2}],positions=[4],cells=new Set([16,17]);
 if(counts[3]===50&&counts[0]<50&&attempts%2===0){
  // Once the hard tiers are full, explore changes to two vehicles in known
  // Easy boards. Single-car tweaks still face the same near-duplicate checks.
  const bases=puzzles.filter(p=>p.difficulty==='Easy'&&p.minimum>=6);
  const base=bases[Math.floor(random()*bases.length)];
  vehicles.splice(0,vehicles.length,...base.vehicles.map(v=>({...v})));positions.splice(0,positions.length,...base.positions);
  const options=vehicles.map((_,i)=>i).slice(1);
  for(let n=0;n<2;n++){
   const i=options.splice(Math.floor(random()*options.length),1)[0],v=vehicles[i];
   if(random()<.3){v.length=v.length===2?3:2;}else v.lane=Math.max(0,Math.min(5,v.lane+(random()<.5?-1:1)));
   if(v.horizontal&&v.lane===2)v.lane=3;
   if(random()<.5)positions[i]=Math.floor(random()*(7-v.length));
  }
  try{occupancy(vehicles,positions);}catch{continue;}
 }else{
 const wanted=counts[3]<50?11+Math.floor(random()*3):8+Math.floor(random()*6);
 for(let trial=0;trial<100&&vehicles.length<wanted;trial++){const horizontal=random()<.5,length=allShort?2:random()<.3?3:2,lane=Math.floor(random()*6),pos=Math.floor(random()*(7-length));if(horizontal&&lane===2)continue;const occupied=Array.from({length},(_,n)=>horizontal?lane*6+pos+n:(pos+n)*6+lane);if(occupied.some(n=>cells.has(n)))continue;occupied.forEach(n=>cells.add(n));vehicles.push({id:String.fromCharCode(64+vehicles.length),horizontal,length: length as 2|3,lane});positions.push(pos);}
 }
 const result=search(vehicles,positions);if(!result)continue;
 const easyTarget=[4,5,6,7].find(n=>puzzles.filter(p=>p.difficulty==='Easy'&&p.minimum===n).length<({4:6,5:14,6:16,7:14} as Record<number,number>)[n])??7;
 const targets=[easyTarget,8+Math.min(4,Math.floor(counts[1]/10)),13+Math.min(4,Math.floor(counts[2]/10)),18+Math.min(3,Math.floor(counts[3]/15))];
 const candidates=[[],[],[],[]] as number[][];result.distance.forEach((d,i)=>{if(d===targets[0])candidates[0].push(i);else if(d===targets[1])candidates[1].push(i);else if(d>=targets[2]&&d<=17)candidates[2].push(i);else if(d>=targets[3])candidates[3].push(i);});
 // Probe several starts, but accept at most one puzzle per underlying layout.
 const category=[3,2,1,0].find(c=>counts[c]<50&&candidates[c].length);if(category===undefined)continue;
 const options=[...candidates[category]];
 if(category===3)options.sort((a,b)=>result.distance[b]-result.distance[a]);
 for(let variant=0;variant<3&&options.length;variant++){
 let at=options.splice(category===3?0:Math.floor(random()*options.length),1)[0];const initial=at,solution:Puzzle['solution']=[];
 while(result.toward[at]>=0){const next=result.toward[at],p=result.boards[at],q=result.boards[next],piece=p.findIndex((v,i)=>v!==q[i]);solution.push({piece,to:q[piece]});at=next;}
 const candidate=prunePuzzle({id:'',difficulty:'Easy',vehicles,positions:result.boards[initial],minimum:solution.length,solution});
 if(accept(candidate))break;
 }
}
puzzles=difficulties.flatMap(difficulty=>sequenceTier(puzzles.filter(p=>p.difficulty===difficulty)));
const originalBoards=JSON.parse(readFileSync(new URL('./data/gridlock-seeds.json',import.meta.url),'utf8')) as [number[][],number[],string][];
const originalIds=new Map(originalBoards.map(([spec,positions,id])=>[JSON.stringify([spec,positions]),id]));
for(const difficulty of difficulties)puzzles.filter(p=>p.difficulty===difficulty).forEach(p=>{
 const key=JSON.stringify([p.vehicles.map(v=>[+v.horizontal,v.length,v.lane]),p.positions]);
 p.id=originalIds.get(key)??`${difficulty.toLowerCase()}-layout-${createHash('sha256').update(key).digest('hex').slice(0,16)}`;
});
writeFileSync('lib/gridlock-levels.ts',`// Generated with scripts/generate-gridlock.ts. Exact whole-slide distances.\nimport type {Puzzle} from './gridlock';\nexport const GRIDLOCK_LEVELS=${JSON.stringify(puzzles)} satisfies Puzzle[];\n`);
console.log('Generated',puzzles.length,'verified levels');
