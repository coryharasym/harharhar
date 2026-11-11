/** Little Timber rules v1. All randomness and actions replay identically on the server. */
export const BEAR=20, WILD=21, PAW=22;
export const TIMBER_NAMES:Record<number,string>={0:'Empty',1:'Sprout',2:'Shrub',3:'Pine',4:'Cabin',5:'Cottage',6:'Lodge',7:'Manor',8:'Treetop Palace',9:'Cloud Village',11:'Berry Patch',12:'Picnic Spot',13:'Woodland Park',20:'Wandering Bear',21:'Magic Button',22:'Helping Paw'};
export type TimberGame={board:number[];queue:number[];reserve:number;stored:boolean;rng:number;turns:number;score:number;merges:number;highest:number;last:{cells:number[];chains:number;trapped:number;gain:number}};
export const neighbours=(i:number)=>[i>=6?i-6:-1,i<30?i+6:-1,i%6?i-1:-1,i%6<5?i+1:-1].filter(n=>n>=0);
export function connected(board:number[],i:number,type=board[i]):number[]{const found=new Set<number>(),todo=[i];while(todo.length){const n=todo.pop()!;if(found.has(n)||board[n]!==type)continue;found.add(n);todo.push(...neighbours(n));}return [...found];}
function random(g:TimberGame){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296;}
function draw(g:TimberGame){const n=random(g),bears=g.board.filter(t=>t===BEAR).length,rate=g.turns<12?0:g.turns<40?.045:.075;if(n<.02)return PAW;if(n<.06)return WILD;if(n<.06+rate&&bears<4)return BEAR;if(n<.14)return 3;if(n<.34)return 2;return 1;}
export function startTimber(seed:number):TimberGame{const g:TimberGame={board:Array(36).fill(0),queue:[],reserve:0,stored:false,rng:seed>>>0,turns:0,score:0,merges:0,highest:1,last:{cells:[],chains:0,trapped:0,gain:0}};for(let n=0;n<7;n++){let i=Math.floor(random(g)*36);while(g.board[i])i=(i+1)%36;g.board[i]=n===0?3:n<3?2:1;}g.queue=[draw(g),draw(g),draw(g)];return g;}
const mergeable=(t:number)=>(t>=1&&t<=9)||(t>=11&&t<=13);
export const nextTier=(t:number)=>t===9||t===13?t:t+1;
export const tierPoints=(t:number)=>t>=11?60*4**(t-11):10*4**(t-1);
/** Choose the highest-scoring eligible type; stable tier ordering breaks ties. */
export function wildcardType(board:number[],i:number){if(board[i])return 0;const choices=[...new Set(neighbours(i).map(n=>board[n]).filter(mergeable))].filter(t=>{const b=[...board];b[i]=t;return connected(b,i).length>=3;});return choices.sort((a,b)=>tierPoints(nextTier(b))-tierPoints(nextTier(a))||b-a)[0]||0;}
export function canPlaceTimber(g:TimberGame,i:number,piece=g.queue[0]){return Number.isInteger(i)&&i>=0&&i<36&&(piece===PAW?g.board[i]!==0:g.board[i]===0&&(piece!==WILD||wildcardType(g.board,i)!==0));}
export function hasTimberMoves(g:TimberGame){if(g.board.some((_,i)=>canPlaceTimber(g,i)))return true;if(g.stored)return false;const other=g.reserve||g.queue[1];return g.board.some((_,i)=>canPlaceTimber(g,i,other));}
function resolve(g:TimberGame,i:number){while(mergeable(g.board[i])){const type=g.board[i],group=connected(g.board,i);if(group.length<3)break;for(const n of group)g.board[n]=0;const tier=nextTier(type);g.board[i]=tier;g.last.chains++;g.merges++;g.score+=Math.floor(tierPoints(tier)*(1+.25*(group.length-3))*(1+.5*(g.last.chains-1)));if(tier<10)g.highest=Math.max(g.highest,tier);g.last.cells.push(...group);}}
function trap(g:TimberGame){const seen=new Set<number>(),trapped:number[]=[];for(let i=0;i<36;i++)if(g.board[i]===BEAR&&!seen.has(i)){const bears=connected(g.board,i);bears.forEach(n=>seen.add(n));if(!bears.some(n=>neighbours(n).some(j=>g.board[j]===0)))trapped.push(...bears);}for(const i of trapped)g.board[i]=11;g.last.trapped+=trapped.length;g.last.cells.push(...trapped);for(const i of trapped.sort((a,b)=>a-b))if(g.board[i]===11)resolve(g,i);}
export function actTimber(before:TimberGame,action:number|'reserve'):TimberGame{if(!hasTimberMoves(before))return before;if(action==='reserve'){if(before.stored)return before;const g=structuredClone(before),piece=g.queue[0];if(g.reserve)g.queue[0]=g.reserve;else{g.queue.shift();g.queue.push(draw(g));}g.reserve=piece;g.stored=true;g.last={cells:[],chains:0,trapped:0,gain:0};return g;}if(!canPlaceTimber(before,action))return before;const g=structuredClone(before),piece=g.queue[0],existing=g.board.map((t,i)=>t===BEAR?i:-1).filter(i=>i>=0);g.last={cells:[action],chains:0,trapped:0,gain:0};g.board[action]=piece===PAW?0:piece===WILD?wildcardType(g.board,action):piece;resolve(g,action);trap(g);
 // Snapshot indices mean each old bear moves once; a new bear never moves on its placement turn.
 for(const i of existing){if(g.board[i]!==BEAR)continue;const empty=neighbours(i).filter(n=>g.board[n]===0);if(empty.length){const j=empty[Math.floor(random(g)*empty.length)];g.board[i]=0;g.board[j]=BEAR;}}
 trap(g);g.turns++;g.stored=false;g.queue.shift();g.queue.push(draw(g));g.last.gain=g.score-before.score;g.last.cells=[...new Set(g.last.cells)];return g;}
export function encodeTimber(action:number|'reserve'){return action==='reserve'?'~':action.toString(36);}
export function replayTimber(seed:number,history:string){return replayTimberFrom(startTimber(seed),history);}
export function replayTimberFrom(game:TimberGame,history:string){let g=game;for(const char of history){if(!/^[0-9a-z~]$/.test(char))throw Error('Invalid action');const next=actTimber(g,char==='~'?'reserve':parseInt(char,36));if(next===g)throw Error('Illegal action');g=next;}return g;}
export function timberHash(history:string,hash=2166136261){for(let i=0;i<history.length;i++){hash^=history.charCodeAt(i);hash=Math.imul(hash,16777619)>>>0;}return hash;}
export const TIMBER_BATCH_CHARS=1000;
export type TimberCheckpoint={offset:number;hash:number;game:TimberGame};
export function initialTimberCheckpoint(seed:number):TimberCheckpoint{return {offset:0,hash:timberHash(''),game:startTimber(seed)};}
export function verifyTimberBatch(cp:TimberCheckpoint,offset:number,hash:number,moves:string):TimberCheckpoint{if(offset!==cp.offset||hash!==cp.hash||moves.length>TIMBER_BATCH_CHARS)throw Error('Invalid batch');return {offset:offset+moves.length,hash:timberHash(moves,hash),game:replayTimberFrom(cp.game,moves)};}
