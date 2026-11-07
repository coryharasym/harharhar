export type Direction = 'L'|'R'|'U'|'D';
export type Game = { board: number[]; score: number; rng: number; moves: string };
export function random(g: Game) { g.rng = (Math.imul(g.rng, 1664525) + 1013904223) >>> 0; return g.rng / 4294967296; }
export function spawn(g: Game) { const empty = g.board.map((n,i)=>n ? -1 : i).filter(i=>i>=0); if(empty.length){ const cell = empty[Math.floor(random(g)*empty.length)]; g.board[cell] = random(g)<.9 ? 2 : 4; } return g; }
export function start(seed: number): Game { return spawn(spawn({board: Array(16).fill(0), score:0, rng:seed>>>0, moves:''})); }
export function slide(board: number[], direction: Direction) {
  const next = [...board]; let gain = 0;
  for(let line=0;line<4;line++) {
    const ids = Array.from({length:4},(_,p)=>direction==='L'?line*4+p:direction==='R'?line*4+3-p:direction==='U'?p*4+line:(3-p)*4+line);
    const values = ids.map(i=>board[i]).filter(Boolean); const merged: number[] = [];
    for(let p=0;p<values.length;p++) { if(values[p]===values[p+1]) { const value=values[p]*2; merged.push(value); gain+=value; p++; } else merged.push(values[p]); }
    ids.forEach((id,p)=>next[id]=merged[p]||0);
  }
  return {board:next,gain,changed:next.some((n,i)=>n!==board[i])};
}
export function move(g:Game,direction:Direction):Game { const result=slide(g.board,direction); if(!result.changed)return g; return spawn({board:result.board,score:g.score+result.gain,rng:g.rng,moves:g.moves+direction}); }
export function ended(g:Game) { return !g.board.some(n=>n===0) && g.board.every((n,i)=>(i%4===3||n!==g.board[i+1])&&(i>=12||n!==g.board[i+4])); }
export function replay(seed:number,moves:string) { if(!/^[LRUD]*$/.test(moves)||moves.length>15000)throw Error('Invalid moves'); let g=start(seed); for(const d of moves){const next=move(g,d as Direction);if(next===g)throw Error('Invalid move');g=next;} return g; }
