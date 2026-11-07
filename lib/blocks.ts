// Endless rules v2. Client and server share the same deterministic placements.
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
export type BlockGame={board:number[];tray:(number|null)[];score:number;lines:number;combo:number;rng:number;moves:string;last:{cleared:number[];gain:number;lines:number}};
const EMPTY_LAST={cleared:[] as number[],gain:0,lines:0};
export function shapeCells(id:number,rotation=0):Cell[]{if(!SHAPES[id]||!Number.isInteger(rotation)||rotation<0||rotation>3)throw Error('Invalid shape');let cells:Cell[]=SHAPES[id].cells.map(c=>[...c] as Cell);for(let n=0;n<rotation;n++){cells=cells.map(([r,c])=>[c,-r] as Cell);const minR=Math.min(...cells.map(c=>c[0])),minC=Math.min(...cells.map(c=>c[1]));cells=cells.map(([r,c])=>[r-minR,c-minC]);}return cells;}
function random(g:BlockGame){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296;}
function draw(g:BlockGame){g.tray=Array.from({length:3},()=>Math.floor(random(g)*SHAPES.length));}
export function openingSolution(board:number[],tray:(number|null)[]):number[][]|null {
 let budget=4000;
 function find(b:number[],pieces:(number|null)[]):number[][]|null {if(pieces.every(p=>p===null))return [];if(--budget<0)return null;for(let slot=0;slot<3;slot++){const id=pieces[slot];if(id===null)continue;for(let rotation=0;rotation<4;rotation++){const cells=shapeCells(id,rotation);for(let row=0;row<8;row++)for(let col=0;col<8;col++){if(!fits(b,cells,row,col))continue;const next=[...b];for(const [r,c]of cells)next[(r+row)*8+c+col]=SHAPES[id].color;for(const i of completedLines(next).cells)next[i]=0;const rest=[...pieces];rest[slot]=null;const tail=find(next,rest);if(tail)return [[slot,rotation,row,col],...tail];}}}return null;}
 return find(board,tray);
}
function createOpening(g:BlockGame){
 const clusters=[1,2,4,5,6,7,9,10,11];
 for(let attempt=0;attempt<12;attempt++){
  g.board=Array(64).fill(0);const target=18+Math.floor(random(g)*5);
  for(let n=0;n<90&&g.board.filter(Boolean).length<target;n++){const id=clusters[Math.floor(random(g)*clusters.length)],rotation=Math.floor(random(g)*4),row=Math.floor(random(g)*8),col=Math.floor(random(g)*8),cells=shapeCells(id,rotation);if(!fits(g.board,cells,row,col))continue;const next=[...g.board];for(const [r,c]of cells)next[(r+row)*8+c+col]=SHAPES[id].color;if(!completedLines(next).count)g.board=next;}
  draw(g);if(openingSolution(g.board,g.tray))return;
 }
 // A sparse fallback always offers room; never start a run with an impossible rack.
 g.board=Array(64).fill(0);draw(g);
}
export function startBlocks(seed:number):BlockGame{const g:BlockGame={board:[],tray:[],score:0,lines:0,combo:0,rng:seed>>>0,moves:'',last:{...EMPTY_LAST}};createOpening(g);return g;}
export function fits(board:readonly number[],cells:readonly Cell[],row:number,col:number){return Number.isInteger(row)&&Number.isInteger(col)&&cells.every(([r,c])=>r+row>=0&&r+row<8&&c+col>=0&&c+col<8&&!board[(r+row)*8+c+col]);}
export function completedLines(board:readonly number[]){const rows:number[]=[],cols:number[]=[];for(let n=0;n<8;n++){if(Array.from({length:8},(_,i)=>board[n*8+i]).every(Boolean))rows.push(n);if(Array.from({length:8},(_,i)=>board[i*8+n]).every(Boolean))cols.push(n);}const cells=[...new Set([...rows.flatMap(r=>Array.from({length:8},(_,c)=>r*8+c)),...cols.flatMap(c=>Array.from({length:8},(_,r)=>r*8+c))])];return {count:rows.length+cols.length,cells};}
export function placeBlock(g:BlockGame,slot:number,rotation:number,row:number,col:number):BlockGame{
 if(!Number.isInteger(slot)||slot<0||slot>2||g.tray[slot]==null||!Number.isInteger(rotation)||rotation<0||rotation>3)return g;
 const id=g.tray[slot]!,cells=shapeCells(id,rotation);if(!fits(g.board,cells,row,col))return g;
 const board=[...g.board];for(const [r,c] of cells)board[(r+row)*8+c+col]=SHAPES[id].color;
 const clear=completedLines(board),combo=clear.count?g.combo+1:0;
 const gain=cells.length*5+100*clear.count*(clear.count+1)/2+Math.max(0,combo-1)*25*clear.count;
 for(const i of clear.cells)board[i]=0;
 const next:BlockGame={...g,board,tray:[...g.tray],score:g.score+gain,combo,lines:g.lines+clear.count,moves:g.moves+`${slot}${rotation}${row}${col}`,last:{cleared:clear.cells,gain,lines:clear.count}};
 next.tray[slot]=null;
 if(next.tray.every(v=>v===null))draw(next);
 return next;
}
export function hasBlockMoves(g:BlockGame){return g.tray.some(id=>id!==null&&[0,1,2,3].some(rot=>{const cells=shapeCells(id,rot);for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(fits(g.board,cells,r,c))return true;return false;}));}
export function replayBlockMoves(initial:BlockGame,moves:string){if(moves.length%4)throw Error('Invalid moves');let g=initial;for(let i=0;i<moves.length;i+=4){const step=moves.slice(i,i+4);if(!/^[0-2][0-3][0-7][0-7]$/.test(step))throw Error('Invalid moves');const [s,o,r,c]=step.split('').map(Number);const next=placeBlock(g,s,o,r,c);if(next===g)throw Error('Invalid placement');g=next;}return g;}

export function replayBlocks(seed:number,moves:string){return replayBlockMoves(startBlocks(seed),moves);}
