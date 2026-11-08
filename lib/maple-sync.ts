import {newMapleGame,gameDrop,stepMapleGame,type MapleGame} from './maple-game.ts';
import {aimX} from './maple-physics.ts';
export const MAPLE_BATCH_TICKS=1200,MAPLE_INITIAL_HASH=2166136261;
export type MapleRun={id:string;seed:number;moves:string};
export type MapleCheckpoint={offset:number;hash:number;game:MapleGame};
export function mapleHash(text:string,hash=MAPLE_INITIAL_HASH){for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;return hash;}
export function encodeMapleDrop(tick:number,x:number){return tick.toString(36).padStart(7,'0')+Math.round(x*1000).toString(36).padStart(4,'0');}
export function mapleActions(moves:string){if(typeof moves!=='string'||moves.length%11||!/^[0-9a-z]*$/.test(moves))throw Error('Invalid history');const actions=[];let last=-1;for(let i=0;i<moves.length;i+=11){const tick=parseInt(moves.slice(i,i+7),36),x=parseInt(moves.slice(i+7,i+11),36)/1000;if(tick<=last||x<35||x>325)throw Error('Invalid drop');last=tick;actions.push({tick,x,encoded:moves.slice(i,i+11)});}return actions;}
export function maplePrefix(moves:string,end:number){let i=0;while(i<moves.length&&parseInt(moves.slice(i,i+7),36)<end)i+=11;return moves.slice(0,i);}
export function initialMapleCheckpoint(seed:number):MapleCheckpoint{return {offset:0,hash:MAPLE_INITIAL_HASH,game:newMapleGame(seed)};}
export function verifyMapleBatch(checkpoint:MapleCheckpoint,offset:number,hash:number,moves:string,end:number,elapsedMs:number):MapleCheckpoint{
 if(offset!==checkpoint.offset||hash!==checkpoint.hash)throw Error('Progress conflict');
 if(!Number.isSafeInteger(end)||end<offset||end-offset>MAPLE_BATCH_TICKS||moves.length>16000||end>Math.max(0,elapsedMs)*.12+240)throw Error('Invalid time');
 const actions=mapleActions(moves);if(actions.some(a=>a.tick<offset||a.tick>=end))throw Error('Invalid range');
 const game=structuredClone(checkpoint.game);game.paused=false;let i=0;
 while(game.world.tick<end){if(game.over)throw Error('History follows game over');if(actions[i]?.tick===game.world.tick){const a=actions[i++];if(a.x!==aimX(a.x,game.current)||!gameDrop(game,a.x))throw Error('Invalid drop');}stepMapleGame(game);}
 return {offset:end,hash:mapleHash(moves,hash),game};
}
