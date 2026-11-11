/** Threes preview rules: one cell per swipe, balanced 1/2/3 bag, no bonus tiles. */
export type Direction = 'L' | 'R' | 'U' | 'D';
export type Tile = {id: number; value: number};
export type Board = (Tile | null)[];
export type Game = {board: Board; bag: number[]; next: number; serial: number; moves: number};
export type Motion = {tile: Tile; from: number; to: number; consumed: boolean};
const directions: Direction[] = ['L', 'R', 'U', 'D'];
export function canMerge(a: number, b: number) {
  return (a === 1 && b === 2) || (a === 2 && b === 1) || (a >= 3 && a === b);
}
export function tilePoints(value: number): number {
  return value < 3 ? 0 : 3 ** (Math.log2(value / 3) + 1);
}
export const score = (board: Board) => board.reduce((sum, tile) => sum + (tile ? tilePoints(tile.value) : 0), 0);
function shuffled<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function draw(bag: number[], rng = Math.random): {value: number; bag: number[]} {
  const available = bag.length ? [...bag] : shuffled([1,1,1,1,2,2,2,2,3,3,3,3], rng);
  return {value: available[0], bag: available.slice(1)};
}
export function start(rng = Math.random): Game {
  const board: Board = Array(16).fill(null);
  const positions = shuffled(Array.from({length: 16}, (_, i) => i), rng);
  let bag: number[] = [];
  for (let i = 0; i < 9; i++) {
    const next = draw(bag, rng); bag = next.bag;
    board[positions[i]] = {id: i, value: next.value};
  }
  const next = draw(bag, rng);
  return {board, bag: next.bag, next: next.value, serial: 9, moves: 0};
}
function line(direction: Direction, lane: number): number[] {
  return Array.from({length: 4}, (_, i) => direction === 'L' ? lane * 4 + i : direction === 'R' ? lane * 4 + 3 - i : direction === 'U' ? i * 4 + lane : (3 - i) * 4 + lane);
}
export function slide(board: Board, direction: Direction) {
  const result = board.map(tile => tile && {...tile});
  const motions: Motion[] = [], merged: number[] = [], entries: number[] = [];
  for (let lane = 0; lane < 4; lane++) {
    const cells = line(direction, lane);
    let changed = false;
    const mergedCells = new Set<number>();
    for (let i = 1; i < 4; i++) {
      const from = cells[i], to = cells[i - 1], tile = result[from], target = result[to];
      if (!tile) continue;
      if (!target) {
        result[to] = tile; result[from] = null; changed = true;
        motions.push({tile, from, to, consumed: false});
      } else if (!mergedCells.has(to) && canMerge(tile.value, target.value)) {
        result[to] = {id: target.id, value: tile.value + target.value}; result[from] = null;
        mergedCells.add(to); merged.push(target.id); changed = true;
        motions.push({tile, from, to, consumed: true});
      }
    }
    if (changed && !result[cells[3]]) entries.push(cells[3]);
  }
  return {board: result, motions, merged, entries, changed: motions.length > 0};
}
export function move(game: Game, direction: Direction, rng = Math.random) {
  const shift = slide(game.board, direction);
  if (!shift.changed) return {game, ...shift, entry: -1};
  const entry = shift.entries[Math.floor(rng() * shift.entries.length)];
  shift.board[entry] = {id: game.serial, value: game.next};
  const next = draw(game.bag, rng);
  return {...shift, entry, game: {...game, board: shift.board, next: next.value, bag: next.bag, serial: game.serial + 1, moves: game.moves + 1}};
}
export const ended = (board: Board) => directions.every(direction => !slide(board, direction).changed);
