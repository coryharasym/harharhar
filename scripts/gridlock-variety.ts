import {type Puzzle} from '../lib/gridlock.ts';

// Positions, identifiers and paint do not make a new underlying vehicle layout.
export function layoutFamily(p:Puzzle):string {
 return p.vehicles.map(v=>`${+v.horizontal}${v.length}${v.lane}`).sort().join('|');
}
export function solutionPattern(p:Puzzle):string {
 const names=new Map<number,number>([[0,0]]),at=[...p.positions];
 return p.solution.map(m=>{
  if(!names.has(m.piece))names.set(m.piece,names.size);
  const direction=m.to>at[m.piece]?'+':'-';at[m.piece]=m.to;
  return `${m.piece===0?'T':p.vehicles[m.piece].horizontal?'H':'V'}${names.get(m.piece)}${direction}`;
 }).join('/');
}
export function theme(p:Puzzle):string {
 if(p.solution.filter(m=>m.piece===0).length>1)return 'red-car-reposition';
 if(p.minimum>p.vehicles.length)return 'move-and-return';
 return p.vehicles.slice(1).some(v=>v.horizontal)?'linked-blockers':'direct-blockers';
}
export function nearDuplicate(a:Puzzle,b:Puzzle):boolean {
 if(a.vehicles.length!==b.vehicles.length)return false;
 // A changed truck length or one shifted lane is still too similar if nearly
 // all vehicles start in exactly the same place and use the same move pattern.
 const tokens=(p:Puzzle)=>p.vehicles.map((v,i)=>`${+v.horizontal}:${v.lane}:${p.positions[i]}`).sort();
 const left=tokens(a),right=tokens(b);let shared=0;
 for(const token of left){const at=right.indexOf(token);if(at>=0){shared++;right.splice(at,1);}}
 return shared>=a.vehicles.length-1&&solutionPattern(a)===solutionPattern(b);
}
export function acceptVariety(p:Puzzle,accepted:Puzzle[]):boolean {
 if(accepted.some(q=>layoutFamily(q)===layoutFamily(p)||nearDuplicate(q,p)))return false;
 const tier=accepted.filter(q=>q.difficulty===p.difficulty);
 if(p.difficulty==='Easy'){
  if(tier.filter(q=>solutionPattern(q)===solutionPattern(p)).length>=2)return false;
  const themeCaps:Record<string,number>={'direct-blockers':3,'linked-blockers':34,'red-car-reposition':13,'move-and-return':8};
  if(tier.filter(q=>theme(q)===theme(p)).length>=themeCaps[theme(p)])return false;
  const trucks=p.vehicles.filter(v=>v.length===3).length;
  if(trucks>2||trucks===2&&tier.filter(q=>q.vehicles.filter(v=>v.length===3).length===2).length>=20)return false;
  const cap=p.minimum===4?6:p.minimum===5?14:p.minimum===6?16:14;
  if(tier.filter(q=>q.minimum===p.minimum).length>=cap)return false;
 }
 return true;
}

// Gradual progression in small bands, alternating the kind of reasoning and
// spreading move counts rather than showing a long run of identical pars.
export function sequenceTier(input:Puzzle[]):Puzzle[] {
 const remaining=[...input],ordered:Puzzle[]=[];
 while(remaining.length){
  const min=Math.min(...remaining.map(p=>p.minimum));
  const options=remaining.map((p,i)=>({p,i})).filter(({p})=>p.minimum<=min+2);
  const recent=ordered.slice(-3);
  const score=(p:Puzzle)=>recent.filter(q=>theme(q)===theme(p)).length*20+
   (ordered.at(-1)?.minimum===p.minimum?5:0)+p.minimum-min+
   recent.filter(q=>q.vehicles.filter(v=>v.length===3).length===p.vehicles.filter(v=>v.length===3).length).length;
  options.sort((a,b)=>score(a.p)-score(b.p)||a.i-b.i);
  ordered.push(remaining.splice(options[0].i,1)[0]);
 }
 return ordered;
}
