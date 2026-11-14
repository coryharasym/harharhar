// Development-only deterministic generator. BFS edges are whole slides, not single squares.
import {writeFileSync} from 'node:fs';
import {solved,type Puzzle,type Vehicle} from '../lib/gridlock.ts';
import {prunePuzzle} from './gridlock-pruning.ts';
let seed=62371;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const key=(p:number[])=>p.join('');
function search(vehicles:Vehicle[],start:number[],limit=40000){
 const boards=[start],edges:number[][]=[[]],index=new Map([[key(start),0]]);let head=0;
 while(head<boards.length){const p=boards[head],cells=new Int8Array(36).fill(-1);for(let i=0;i<vehicles.length;i++){const v=vehicles[i];for(let n=0;n<v.length;n++)cells[v.horizontal?v.lane*6+p[i]+n:(p[i]+n)*6+v.lane]=i;}for(let i=0;i<vehicles.length;i++){const v=vehicles[i],cell=(n:number)=>cells[v.horizontal?v.lane*6+n:n*6+v.lane];let min=p[i],max=p[i];while(min>0&&cell(min-1)===-1)min--;while(max+v.length<6&&cell(max+v.length)===-1)max++;for(let to=min;to<=max;to++){if(to===p[i])continue;const q=[...p];q[i]=to;const k=key(q);let id=index.get(k);if(id===undefined){if(boards.length>=limit)return null;id=boards.length;index.set(k,id);boards.push(q);edges.push([]);}edges[head].push(id);}}head++;}
 const distance=Array(boards.length).fill(-1),toward=Array(boards.length).fill(-1),queue:number[]=[];boards.forEach((b,i)=>{if(solved(b)){distance[i]=0;queue.push(i);}});
 for(let h=0;h<queue.length;h++){const id=queue[h];for(const n of edges[id])if(distance[n]===-1){distance[n]=distance[id]+1;toward[n]=id;queue.push(n);}}
 return {boards,distance,toward};
}
const puzzles:Puzzle[]=[],counts=[0,0,0,0],seen=new Set<string>();let attempts=0;
while(counts.some(n=>n<50)){
 if(++attempts>20000)throw Error('Generation exhausted');
 const vehicles:Vehicle[]=[{id:'EXIT',horizontal:true,length:2,lane:2}],positions=[4],cells=new Set([16,17]);
 const wanted=8+Math.floor(random()*6);
 for(let trial=0;trial<100&&vehicles.length<wanted;trial++){const horizontal=random()<.5,length=random()<.3?3:2,lane=Math.floor(random()*6),pos=Math.floor(random()*(7-length));if(horizontal&&lane===2)continue;const occupied=Array.from({length},(_,n)=>horizontal?lane*6+pos+n:(pos+n)*6+lane);if(occupied.some(n=>cells.has(n)))continue;occupied.forEach(n=>cells.add(n));vehicles.push({id:String.fromCharCode(64+vehicles.length),horizontal,length: length as 2|3,lane});positions.push(pos);}
 const result=search(vehicles,positions);if(!result)continue;
 const targets=[4+Math.min(3,Math.floor(counts[0]/12)),8+Math.min(4,Math.floor(counts[1]/10)),13+Math.min(4,Math.floor(counts[2]/10)),18+Math.min(3,Math.floor(counts[3]/15))];
 const candidates=[[],[],[],[]] as number[][];result.distance.forEach((d,i)=>{if(d===targets[0])candidates[0].push(i);else if(d===targets[1])candidates[1].push(i);else if(d>=targets[2]&&d<=17)candidates[2].push(i);else if(d>=targets[3])candidates[3].push(i);});
 // Up to three distinct starts per vehicle layout, prioritizing harder tiers.
 const category=[3,2,1,0].find(c=>counts[c]<50&&candidates[c].length);if(category===undefined)continue;
 const options=[...candidates[category]];
 if(category===3)options.sort((a,b)=>result.distance[b]-result.distance[a]);
 for(let variant=0;variant<3&&options.length;variant++){
 let at=options.splice(category===3?0:Math.floor(random()*options.length),1)[0];const initial=at,solution:Puzzle['solution']=[];
 while(result.toward[at]>=0){const next=result.toward[at],p=result.boards[at],q=result.boards[next],piece=p.findIndex((v,i)=>v!==q[i]);solution.push({piece,to:q[piece]});at=next;}
 const candidate=prunePuzzle({id:'',difficulty:'Easy',vehicles,positions:result.boards[initial],minimum:solution.length,solution});
 const tier=candidate.minimum<4?-1:candidate.minimum<=7?0:candidate.minimum<=12?1:candidate.minimum<=17?2:3;
 if(tier===-1||counts[tier]>=50)continue;
 // Ignore vehicle identifiers and colours when detecting duplicate puzzles.
 const signature=candidate.vehicles.map((v,i)=>`${v.horizontal?'H':'V'}${v.length}${v.lane}${candidate.positions[i]}`).sort().join('|');if(seen.has(signature))continue;seen.add(signature);
 const difficulty=(['Easy','Intermediate','Advanced','Expert'] as const)[tier];counts[tier]++;puzzles.push({...candidate,id:`${difficulty.toLowerCase()}-${counts[tier]}`,difficulty});
 if(counts[tier]%10===0)console.log({attempts,counts});
 }
}
puzzles.sort((a,b)=>['Easy','Intermediate','Advanced','Expert'].indexOf(a.difficulty)-['Easy','Intermediate','Advanced','Expert'].indexOf(b.difficulty)||a.minimum-b.minimum);
for(const difficulty of ['Easy','Intermediate','Advanced','Expert'])puzzles.filter(p=>p.difficulty===difficulty).forEach((p,i)=>p.id=`${difficulty.toLowerCase()}-${i+1}`);
writeFileSync('lib/gridlock-levels.ts',`// Generated with scripts/generate-gridlock.ts. Exact whole-slide distances.\nimport type {Puzzle} from './gridlock';\nexport const GRIDLOCK_LEVELS=${JSON.stringify(puzzles)} satisfies Puzzle[];\n`);
console.log('Generated',puzzles.length,'verified levels');
