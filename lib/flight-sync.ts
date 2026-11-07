import {startFlight,stepFlight,type FlightState} from './tunnel-flight.ts';
export const FLIGHT_RULES=3,FLIGHT_BATCH_CHARS=3600,INITIAL_FLIGHT_HASH=2166136261;
export type FlightCheckpoint={offset:number;hash:number;game:FlightState};
export function flightHistoryHash(moves:string,hash=INITIAL_FLIGHT_HASH){for(let i=0;i<moves.length;i++)hash=Math.imul(hash^moves.charCodeAt(i),16777619)>>>0;return hash;}
export function initialFlightCheckpoint(seed:number):FlightCheckpoint{return {offset:0,hash:INITIAL_FLIGHT_HASH,game:startFlight(seed)};}
export function verifyFlightBatch(checkpoint:FlightCheckpoint,offset:number,hash:number,moves:string,elapsedMs:number):FlightCheckpoint{
 if(!Number.isSafeInteger(offset)||offset!==checkpoint.offset||hash!==checkpoint.hash)throw Error('Progress conflict');
 if(typeof moves!=='string'||moves.length>FLIGHT_BATCH_CHARS||moves.length%2)throw Error('Invalid flight batch');
 // A replay cannot advance faster than real time; pauses only increase this allowance.
 if((offset+moves.length)/2>Math.max(0,elapsedMs)*.06+180)throw Error('Flight advances too quickly');
 let game=checkpoint.game;
 for(let i=0;i<moves.length;i+=2){const command=moves.slice(i,i+2);if(!/^[0-9a-f]{2}$/.test(command)||parseInt(command,16)>254||game.hp<=0)throw Error('Invalid flight input');game=stepFlight(game,parseInt(command,16)-127);}
 return {offset:offset+moves.length,hash:flightHistoryHash(moves,hash),game:{...game,events:[]}};
}
