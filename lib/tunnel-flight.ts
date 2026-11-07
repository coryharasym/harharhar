// Stage-one practice course: angular steering and collision geometry, independent of rendering.
export const TAU=Math.PI*2;
export const FLIGHT={speed:17,maxTurn:Math.PI,shipRadius:6.9,wallRadius:8.65,shipZ:3.5,shipAngularRadius:.09,barrierSpacing:40};
export type FlightState={angle:number;distance:number;time:number;passed:number;clips:number;lastCrossed:number;feedback:'clear'|'clip'|null;feedbackUntil:number};
export type FlightBarrier={index:number;at:number;kind:'block'|'gate';angle:number;halfWidth:number};
export const wrapAngle=(angle:number)=>((angle+Math.PI)%TAU+TAU)%TAU-Math.PI;
export const degrees=(angle:number)=>((Math.round(angle*180/Math.PI)%360)+360)%360;
export function startFlight():FlightState{return {angle:0,distance:0,time:0,passed:0,clips:0,lastCrossed:-1,feedback:null,feedbackUntil:0};}
export function barrierAt(index:number):FlightBarrier{const n=index%8;const angles=[0,0,Math.PI/2,Math.PI/2,Math.PI,Math.PI,Math.PI*1.5,Math.PI*1.5];return {index,at:40+index*40,kind:index%2?'block':'gate',angle:angles[n],halfWidth:index%2?.34:.86};}
export function barrierHits(barrier:FlightBarrier,angle:number){const separation=Math.abs(wrapAngle(angle-barrier.angle));return barrier.kind==='gate'?separation+FLIGHT.shipAngularRadius>=barrier.halfWidth:separation<=barrier.halfWidth+FLIGHT.shipAngularRadius;}
export function stepFlight(previous:FlightState,targetAngle:number,dt:number):FlightState{
 if(!Number.isFinite(targetAngle)||!Number.isFinite(dt)||dt<0||dt>.1)throw Error('Invalid flight input');
 const turn=Math.max(-FLIGHT.maxTurn*dt,Math.min(FLIGHT.maxTurn*dt,targetAngle-previous.angle));
 const next={...previous,angle:previous.angle+turn,time:previous.time+dt,distance:previous.distance+FLIGHT.speed*dt};
 const crossing=Math.floor((next.distance-40)/40);
 for(let index=previous.lastCrossed+1;index<=crossing;index++){
  const barrier=barrierAt(index),fraction=(barrier.at-previous.distance)/(next.distance-previous.distance||1),angle=previous.angle+turn*Math.max(0,Math.min(1,fraction));
  if(barrierHits(barrier,angle)){next.clips++;next.feedback='clip';}else{next.passed++;next.feedback='clear';}next.feedbackUntil=next.time+1.1;next.lastCrossed=index;
 }
 if(next.time>next.feedbackUntil)next.feedback=null;
 return next;
}
