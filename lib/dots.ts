export const DOTS_SIZE=6;
export const DOTS_DURATION=60000;
export const DOTS_COUNTDOWN=3000;
export const DOTS_SYMBOLS=['●','◆','▲','✚','★'];
export const DOTS_COLOURS=['#59e4d5','#b582f4','#ff819c','#ffc96b','#4bbcff'];
export const DOTS_NAMES=['Mint','Purple','Pink','Gold','Blue'];
export type DotsGame={board:number[];rng:number;score:number;moves:number;loops:number;biggest:number};
const alphabet='0123456789abcdefghijklmnopqrstuvwxyz';
function random(g:DotsGame){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296;}
export function adjacent(a:number,b:number){return Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&a<36&&b>=0&&b<36&&Math.abs(a%6-b%6)+Math.abs(Math.floor(a/6)-Math.floor(b/6))===1;}
export function hasDotsMoves(board:number[]){return board.some((c,i)=>(i%6<5&&board[i+1]===c)||(i<30&&board[i+6]===c));}
function ensureMoves(g:DotsGame){if(hasDotsMoves(g.board))return false;for(let i=35;i>0;i--){const j=Math.floor(random(g)*(i+1));[g.board[i],g.board[j]]=[g.board[j],g.board[i]];}if(!hasDotsMoves(g.board)){let a=0,b=g.board.findIndex((c,i)=>i>0&&c===g.board[0]);if(b<0){a=g.board.findIndex((c,i)=>g.board.indexOf(c)!==i);b=g.board.indexOf(g.board[a]);}[g.board[0],g.board[a]]=[g.board[a],g.board[0]];if(b===0)b=a;[g.board[1],g.board[b]]=[g.board[b],g.board[1]];}return true;}
export function startDots(seed:number):DotsGame{const g:DotsGame={board:[],rng:seed>>>0,score:0,moves:0,loops:0,biggest:0};g.board=Array.from({length:36},()=>Math.floor(random(g)*5));ensureMoves(g);return g;}
/** Revisiting an earlier vertex closes a loop; the preceding vertex backtracks. */
export function extendDotsPath(path:number[],index:number,board:number[]){if(!Number.isInteger(index)||index<0||index>=36)return path;if(!path.length)return [index];const last=path[path.length-1];if(last===index||!adjacent(last,index)||board[last]!==board[index])return path;if(path.length>1&&path[path.length-2]===index)return path.slice(0,-1);if(new Set(path).size!==path.length)return path;const at=path.indexOf(index);if(at>=0)return path.length-at>=4?[...path,index]:path;if(new Set(path).size!==path.length)return path;return [...path,index];}
export function clearDots(game:DotsGame,path:number[]){
 if(path.length<2||path.length>37)throw Error('Connect two or more dots');
 const seen=new Set<number>();let loop=false;
 for(let i=0;i<path.length;i++){const v=path[i];if(!Number.isInteger(v)||v<0||v>=36||game.board[v]!==game.board[path[0]]||(i>0&&!adjacent(path[i-1],v)))throw Error('Invalid connection');if(seen.has(v)){const first=path.indexOf(v);if(i!==path.length-1||i-first<4)throw Error('Invalid loop');loop=true;}seen.add(v);}
 const removed=loop?game.board.flatMap((c,i)=>c===game.board[path[0]]?[i]:[]):[...seen],remove=new Set(removed);
 const next={...game,board:[...game.board],score:game.score+removed.length,moves:game.moves+1,loops:game.loops+(loop?1:0),biggest:Math.max(game.biggest,removed.length)};
 // Keep stable survivors and generate only new dots, column by column.
 const drops:number[]=Array(36).fill(0);
 for(let col=0;col<6;col++){const survivors=[];for(let row=5;row>=0;row--){const i=row*6+col;if(!remove.has(i))survivors.push({colour:game.board[i],row});}for(let row=5;row>=0;row--){const old=survivors[5-row];next.board[row*6+col]=old?old.colour:Math.floor(random(next)*5);drops[row*6+col]=old?row-old.row:6-survivors.length;}}
 const shuffled=ensureMoves(next);return {game:next,removed,loop,shuffled,drops};
}
export function encodeDotsMove(path:number[],elapsed:number){if(!Number.isInteger(elapsed)||elapsed<0||elapsed>=DOTS_DURATION)throw Error('Time expired');return elapsed.toString(36)+':'+path.map(i=>alphabet[i]).join('')+';';}
export function replayDots(seed:number,history:string){
 if(typeof history!=='string'||history.length>16000||!/^([0-9a-z]{1,4}:[0-9a-z]{2,37};)*$/.test(history))throw Error('Invalid Dots history');
 let game=startDots(seed),last=-250;const chunks=history.split(';').filter(Boolean);if(chunks.length>240)throw Error('Too many moves');
 for(const chunk of chunks){const [time,route]=chunk.split(':'),elapsed=parseInt(time,36);if(elapsed<0||elapsed>=DOTS_DURATION||elapsed-last<200)throw Error('Invalid move time');game=clearDots(game,[...route].map(c=>alphabet.indexOf(c))).game;last=elapsed;}
 return game;
}
