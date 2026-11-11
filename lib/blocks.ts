// Progressive endless rules v3. Keep v2 replay frozen for saved/online runs.
import * as v2 from './blocks-v2.ts';
export const BLOCK_RULES=3;
export type Cell = readonly [number,number];
export type Shape={name:string;cells:readonly Cell[];color:number};
export const SHAPES:readonly Shape[]=[
 {name:'Dot',cells:[[0,0]],color:1},{name:'Domino',cells:[[0,0],[0,1]],color:2},
 {name:'Three bar',cells:[[0,0],[0,1],[0,2]],color:3},{name:'Four bar',cells:[[0,0],[0,1],[0,2],[0,3]],color:1},
 {name:'Square',cells:[[0,0],[0,1],[1,0],[1,1]],color:2},{name:'Small corner',cells:[[0,0],[1,0],[1,1]],color:3},
 {name:'L block',cells:[[0,0],[1,0],[2,0],[2,1]],color:4},
 {name:'Long corner',cells:[[0,0],[1,0],[2,0],[2,1],[2,2]],color:2},
 {name:'Reverse corner',cells:[[0,2],[1,2],[2,0],[2,1],[2,2]],color:1},
 {name:'T block',cells:[[0,0],[0,1],[0,2],[1,1]],color:4},
 {name:'Zigzag',cells:[[0,0],[0,1],[1,1],[1,2]],color:3},
 {name:'Bent bar',cells:[[0,0],[0,1],[1,0],[2,0]],color:1},
 {name:'Rectangle',cells:[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]],color:3},
 {name:'Big square',cells:[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]],color:4},
 {name:'Five bar',cells:[[0,0],[0,1],[0,2],[0,3],[0,4]],color:2},
];
export type BlockGame={board:number[];tray:(number|null)[];score:number;lines:number;combo:number;rng:number;moves:string;rules?:number;racksCompleted?:number;last:{cleared:number[];gain:number;lines:number}};
const EMPTY_LAST={cleared:[] as number[],gain:0,lines:0};
export function shapeCells(id:number,rotation=0):Cell[]{if(!SHAPES[id]||!Number.isInteger(rotation)||rotation<0||rotation>3)throw Error('Invalid shape');let cells:Cell[]=SHAPES[id].cells.map(c=>[...c] as Cell);for(let n=0;n<rotation;n++){cells=cells.map(([r,c])=>[c,-r] as Cell);const minR=Math.min(...cells.map(c=>c[0])),minC=Math.min(...cells.map(c=>c[1]));cells=cells.map(([r,c])=>[r-minR,c-minC]);}return cells;}
function random(g:BlockGame){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296;}
// Weights gradually shift from flexible pieces toward larger/awkward shapes.
const WEIGHTS=[
 [5,14,14,8,12,14,7,3,3,7,4,7,1,0,1],
 [3,9,11,10,10,10,10,6,6,10,7,9,4,1,4],
 [2,6,8,11,8,8,11,9,9,11,10,10,7,4,7],
 [1,4,6,11,7,6,12,12,12,12,12,11,10,7,10],
];
export function blockProgress(racksCompleted=0){
 const tier=racksCompleted<4?0:racksCompleted<10?1:racksCompleted<18?2:3;
 const breather=racksCompleted>0&&racksCompleted%6===0;
 return {tier,breather,label:breather?'Breather':(['Finding flow','Building','Planning','Expert'][tier])};
}
type Placement={rotation:number;row:number;col:number;lo:number;hi:number};
function mask(indices:number[]){let lo=0,hi=0;for(const i of indices){if(i<32)lo|=1<<i;else hi|=1<<(i-32);}return {lo,hi};}
const PLACEMENTS=SHAPES.map((_,id)=>{
 const seen=new Set<string>(),result:Placement[]=[];
 for(let rotation=0;rotation<4;rotation++){
  const cells=shapeCells(id,rotation),key=cells.map(([r,c])=>r*8+c).sort((a,b)=>a-b).join(',');
  if(seen.has(key))continue;seen.add(key);
  const h=Math.max(...cells.map(c=>c[0]))+1,w=Math.max(...cells.map(c=>c[1]))+1;
  for(let row=0;row<=8-h;row++)for(let col=0;col<=8-w;col++)result.push({rotation,row,col,...mask(cells.map(([r,c])=>(r+row)*8+c+col))});
 }
 return result;
});
const LINE_MASKS=Array.from({length:16},(_,n)=>mask(Array.from({length:8},(_,i)=>n<8?n*8+i:i*8+n-8)));
function occupied(board:number[]){return mask(board.flatMap((v,i)=>v?[i]:[]));}
function canFit(b:{lo:number;hi:number},p:Placement){return !(b.lo&p.lo)&&!(b.hi&p.hi);}
function afterPlacement(b:{lo:number;hi:number},p:Placement){
 const lo=b.lo|p.lo,hi=b.hi|p.hi;let clearLo=0,clearHi=0;
 for(const line of LINE_MASKS)if((lo&line.lo)===line.lo&&(hi&line.hi)===line.hi){clearLo|=line.lo;clearHi|=line.hi;}
 return {lo:lo&~clearLo,hi:hi&~clearHi};
}
// A bounded search can reject a valid candidate; it never accepts an unproven rack.
// Each step clears lines before checking the next piece, and all orders/rotations count.
export function openingSolution(board:number[],tray:(number|null)[]):number[][]|null {
 let budget=1600;const failed=new Set<string>();
 function find(b:{lo:number;hi:number},remaining:number):number[][]|null {
  if(!remaining)return [];
  if(--budget<0)return null;
  const key=`${b.lo}:${b.hi}:${remaining}`;if(failed.has(key))return null;
  const tried=new Set<number>();
  for(let slot=0;slot<3;slot++){
   if(!(remaining&(1<<slot)))continue;const id=tray[slot]!;
   if(tried.has(id))continue;tried.add(id);
   for(const p of PLACEMENTS[id]){
    if(!canFit(b,p))continue;
    const tail=find(afterPlacement(b,p),remaining&~(1<<slot));
    if(tail)return [[slot,p.rotation,p.row,p.col],...tail];
    if(budget<0)return null;
   }
  }
  failed.add(key);return null;
 }
 return find(occupied(board),tray.reduce<number>((n,id,i)=>id===null?n:n|(1<<i),0));
}
function weighted(g:BlockGame,weights:readonly number[]){
 let roll=random(g)*weights.reduce((a,b)=>a+b,0);
 for(let id=0;id<weights.length;id++){roll-=weights[id];if(roll<0)return id;}
 return 0;
}
function draw(g:BlockGame){
 const progress=blockProgress(g.racksCompleted),weights=WEIGHTS[progress.breather?0:progress.tier];
 const board=occupied(g.board);let chosen:number[]|null=null,best=-Infinity;
 // Compare several proven candidates: early/breather racks offer more freedom;
 // later racks favor shapes with fewer available placements, within the tier's mix.
 for(let attempt=0;attempt<12;attempt++){
  const tray=Array.from({length:3},()=>weighted(g,weights));
  if(!openingSolution(g.board,tray))continue;
  const flexibility=tray.reduce((n,id)=>n+PLACEMENTS[id].filter(p=>canFit(board,p)).length,0);
  const quality=(progress.breather||progress.tier===0)?flexibility:-flexibility;
  if(quality>best){chosen=tray;best=quality;}
  if(chosen&&attempt>=2)break;
 }
 if(chosen){g.tray=chosen;return;}
 // Construct a witness on a private board when random candidates are unsuitable.
 // Select only pieces that fit at each step; dots provide a small-piece fallback.
 let b=board;const tray:number[]=[];
 for(let slot=0;slot<3;slot++){
  const options=PLACEMENTS.map(ps=>ps.filter(p=>canFit(b,p)));
  const possible=weights.map((w,id)=>options[id].length?w:0);
  if(!possible.some(Boolean)&&options[0].length)possible[0]=1;
  if(!possible.some(Boolean)){g.tray=[null,null,null];return;}
  const id=weighted(g,possible),places=options[id],p=places[Math.floor(random(g)*places.length)];
  tray.push(id);b=afterPlacement(b,p);
 }
 // Hide the witness order, so the player decides which piece to place first.
 for(let i=2;i>0;i--){const j=Math.floor(random(g)*(i+1));[tray[i],tray[j]]=[tray[j],tray[i]];}
 g.tray=tray;
}
export function startBlocks(seed:number,rules=BLOCK_RULES):BlockGame{
 const g:BlockGame=v2.startBlocks(seed);
 if(rules===2)return g;
 if(rules!==BLOCK_RULES)throw Error('Unsupported Block Flux rules');
 g.rules=BLOCK_RULES;g.racksCompleted=0;draw(g);return g;
}
export function fits(board:readonly number[],cells:readonly Cell[],row:number,col:number){return Number.isInteger(row)&&Number.isInteger(col)&&cells.every(([r,c])=>r+row>=0&&r+row<8&&c+col>=0&&c+col<8&&!board[(r+row)*8+c+col]);}
export function completedLines(board:readonly number[]){const rows:number[]=[],cols:number[]=[];for(let n=0;n<8;n++){if(Array.from({length:8},(_,i)=>board[n*8+i]).every(Boolean))rows.push(n);if(Array.from({length:8},(_,i)=>board[i*8+n]).every(Boolean))cols.push(n);}const cells=[...new Set([...rows.flatMap(r=>Array.from({length:8},(_,c)=>r*8+c)),...cols.flatMap(c=>Array.from({length:8},(_,r)=>r*8+c))])];return {count:rows.length+cols.length,cells};}
export function placeBlock(g:BlockGame,slot:number,rotation:number,row:number,col:number):BlockGame{
 if(g.rules!==BLOCK_RULES)return v2.placeBlock(g,slot,rotation,row,col);
 if(!Number.isInteger(slot)||slot<0||slot>2||g.tray[slot]==null||!Number.isInteger(rotation)||rotation<0||rotation>3)return g;
 const id=g.tray[slot]!,cells=shapeCells(id,rotation);if(!fits(g.board,cells,row,col))return g;
 const board=[...g.board];for(const [r,c] of cells)board[(r+row)*8+c+col]=SHAPES[id].color;
 const clear=completedLines(board),combo=clear.count?g.combo+1:0;
 const gain=cells.length*5+100*clear.count*(clear.count+1)/2+Math.max(0,combo-1)*25*clear.count;
 for(const i of clear.cells)board[i]=0;
 const next:BlockGame={...g,board,tray:[...g.tray],score:g.score+gain,combo,lines:g.lines+clear.count,moves:g.moves+`${slot}${rotation}${row}${col}`,last:{cleared:clear.cells,gain,lines:clear.count}};
 next.tray[slot]=null;
 if(next.tray.every(v=>v===null)){next.racksCompleted=(g.racksCompleted||0)+1;draw(next);}
 return next;
}
export function hasBlockMoves(g:BlockGame){return g.tray.some(id=>id!==null&&[0,1,2,3].some(rot=>{const cells=shapeCells(id,rot);for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(fits(g.board,cells,r,c))return true;return false;}));}
export function replayBlockMoves(initial:BlockGame,moves:string){if(moves.length%4)throw Error('Invalid moves');let g=initial;for(let i=0;i<moves.length;i+=4){const step=moves.slice(i,i+4);if(!/^[0-2][0-3][0-7][0-7]$/.test(step))throw Error('Invalid moves');const [s,o,r,c]=step.split('').map(Number);const next=placeBlock(g,s,o,r,c);if(next===g)throw Error('Invalid placement');g=next;}return g;}

export function replayBlocks(seed:number,moves:string,rules=BLOCK_RULES){return replayBlockMoves(startBlocks(seed,rules),moves);}
