import {start,move,ended,score,type Game,type Direction} from './threes.ts';
export const THREES_RULES=1;
export const THREES_BATCH_CHARS=4000;
export const INITIAL_THREES_HASH=2166136261;
export type ThreesState={game:Game;rng:number};
export type ThreesRun=ThreesState&{id:string|null;seed:number;history:string;rules:1};
function random(state:{rng:number}){return ()=>{state.rng=(Math.imul(state.rng,1664525)+1013904223)>>>0;return state.rng/4294967296;};}
export function initialThrees(seed:number):ThreesState {const state={rng:seed>>>0};const game=start(random(state));return {game,rng:state.rng};}
export function newThreesRun(seed:number,id:string|null=null):ThreesRun{return {...initialThrees(seed),seed,id,history:'',rules:1};}
export function advanceThrees(state:ThreesState,direction:Direction){const next={rng:state.rng},result=move(state.game,direction,random(next));return {...result,state:result.game===state.game?state:{game:result.game,rng:next.rng}};}
export function playThrees(run:ThreesRun,direction:Direction){const result=advanceThrees(run,direction);return {...result,run:result.state===run?run:{...run,...result.state,history:run.history+direction}};}
export function threesHash(moves:string,hash=INITIAL_THREES_HASH){for(let i=0;i<moves.length;i++)hash=Math.imul(hash^moves.charCodeAt(i),16777619)>>>0;return hash;}
export type ThreesCheckpoint={offset:number;hash:number;state:ThreesState};
export function initialThreesCheckpoint(seed:number):ThreesCheckpoint{return {offset:0,hash:INITIAL_THREES_HASH,state:initialThrees(seed)};}
export function verifyThreesBatch(checkpoint:ThreesCheckpoint,offset:number,hash:number,moves:string):ThreesCheckpoint{
 if(!Number.isSafeInteger(offset)||offset!==checkpoint.offset||hash!==checkpoint.hash)throw Error('Progress conflict');
 if(moves.length>THREES_BATCH_CHARS||!/^[LRUD]*$/.test(moves))throw Error('Invalid move history');
 let state=checkpoint.state;
 for(const direction of moves){if(ended(state.game.board))throw Error('Run is already finished');const next=advanceThrees(state,direction as Direction).state;if(next===state)throw Error('Invalid move');state=next;}
 if(!Number.isSafeInteger(score(state.game.board)))throw Error('Score out of range');
 return {offset:offset+moves.length,hash:threesHash(moves,hash),state};
}
