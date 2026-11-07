import type {FlightState} from './tunnel-flight.ts';
// Presentation runs at the display rate. Authoritative scoring stays at 60 Hz.
export function interpolateFlight(previous:FlightState,current:FlightState,alpha:number):FlightState{
 if(previous.seed!==current.seed||current.ticks-previous.ticks!==1||current.impactSerial!==previous.impactSerial)return current;
 const t=Math.max(0,Math.min(1,alpha)),mix=(a:number,b:number)=>a+(b-a)*t;
 return {...current,angle:mix(previous.angle,current.angle),distance:mix(previous.distance,current.distance),time:mix(previous.time,current.time)};
}
export const damp=(value:number,target:number,rate:number,seconds:number)=>value+(target-value)*(1-Math.exp(-rate*Math.max(0,seconds)));
export function tunnelSection(row:number,distance:number){const worldIndex=row+Math.floor(distance/6);return {worldIndex,z:12-row*6+distance%6,lightPhase:(worldIndex%2)*.13};}
export const panelShade=(worldIndex:number,sector:number)=>((worldIndex+sector*7)%4+4)%4;
