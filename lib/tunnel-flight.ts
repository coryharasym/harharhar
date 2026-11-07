// Midnight Circuit rules v2. Fixed ticks and recorded steering keep phone restoration deterministic.
export const TAU=Math.PI*2;
export const FLIGHT={hz:60,speed:17,maxSpeed:29,rampSeconds:75,maxTurn:Math.PI,shipRadius:6.9,wallRadius:8.65,shipZ:3.5,shipAngularRadius:.09,barrierSpacing:38,firstBarrier:52};
export type BarrierKind='block'|'gate'|'rotor'|'pulse'|'stagger'|'double';
export type FlightBarrier={index:number;at:number;kind:BarrierKind;angle:number;halfWidth:number;pattern?:'alternating'|'double'|'spiral'|'rotating'};
export type FlightItem={index:number;at:number;kind:'crystal'|'shield'|'magnet';angle:number};
export type FlightEvent='crystal'|'near'|'damage'|'shield-hit'|'shield'|'magnet'|'over';
export type FlightState={seed:number;ticks:number;angle:number;distance:number;time:number;passed:number;clips:number;lastCrossed:number;lastItem:number;hp:number;score:number;crystals:number;nearMisses:number;combo:number;comboUntil:number;shieldUntil:number;magnetUntil:number;invulnerableUntil:number;impactSerial:number;impactTick:number;impactKind:'hull'|'shield'|'fatal'|null;feedback:'clear'|'clip'|null;feedbackUntil:number;events:FlightEvent[]};
export const wrapAngle=(angle:number)=>((angle+Math.PI)%TAU+TAU)%TAU-Math.PI;
export const degrees=(angle:number)=>((Math.round(angle*180/Math.PI)%360)+360)%360;
function hash(seed:number,index:number){let x=(seed^Math.imul(index+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return ((x^(x>>>15))>>>0)/4294967296;}
export function obstaclePattern(index:number):{kind:'alternating'|'double'|'spiral'|'rotating';start:number}|null{
 const introductions=[{start:24,count:4,kind:'alternating'},{start:36,count:4,kind:'double'},{start:48,count:6,kind:'spiral'},{start:60,count:4,kind:'rotating'}] as const;
 for(const p of introductions)if(index>=p.start&&index<p.start+p.count)return {kind:p.kind,start:p.start};
 if(index>=72){const start=72+Math.floor((index-72)/8)*8;if(index-start<4)return {kind:(['alternating','double','spiral','rotating'] as const)[Math.floor((index-72)/8)%4],start};}
 return null;
}
const baseRoute=(index:number,seed:number)=>hash(seed,0)*TAU+index*.72+Math.sin(index*.9+hash(seed,1)*TAU)*.4;
export function routeAngle(index:number,seed=42){const pattern=obstaclePattern(index);if(pattern?.kind==='alternating')return baseRoute(pattern.start,seed)+(index-pattern.start)%2*Math.PI;if(pattern?.kind==='spiral')return baseRoute(pattern.start,seed)+(index-pattern.start)*.62;return baseRoute(index,seed);}
export const isGate=(barrier:FlightBarrier)=>barrier.kind==='gate'||barrier.kind==='rotor';
export function flightSpeed(time:number){return FLIGHT.speed+(FLIGHT.maxSpeed-FLIGHT.speed)*Math.min(1,Math.max(0,time)/FLIGHT.rampSeconds);}
export function barrierAt(index:number,seed=42,time=0):FlightBarrier{
 const at=FLIGHT.firstBarrier+index*FLIGHT.barrierSpacing,progress=Math.min(1,index/48);
 let kind:BarrierKind=index%2?'block':'gate';
 if(index>=22&&index%7===4)kind='pulse';else if(index>=8&&index%9>=6)kind='stagger';else if(index>=6&&index%5===3)kind='rotor';
 const pattern=obstaclePattern(index);if(pattern)kind=pattern.kind==='double'?'double':pattern.kind==='rotating'?'rotor':'gate';
 const opening=kind==='gate'||kind==='rotor';let angle=routeAngle(index,seed)+(opening?0:kind==='double'?Math.PI/2:Math.PI);
 if(kind==='rotor')angle+=Math.sin(time*.6+hash(seed,index+70)*TAU)*.42;
 return {index,at,kind,angle,halfWidth:opening?1.02-.32*progress:kind==='double'?.42+.12*progress:.32+.08*progress,pattern:pattern?.kind};
}
export function barrierMargin(barrier:FlightBarrier,angle:number){const offset=wrapAngle(angle-barrier.angle),separation=barrier.kind==='double'?Math.min(Math.abs(offset),Math.abs(wrapAngle(offset-Math.PI))):Math.abs(offset);return barrier.kind==='gate'||barrier.kind==='rotor'?barrier.halfWidth-separation-FLIGHT.shipAngularRadius:separation-barrier.halfWidth-FLIGHT.shipAngularRadius;}
export function barrierHits(barrier:FlightBarrier,angle:number){return barrierMargin(barrier,angle)<=0;}
export function itemAt(index:number,seed=42):FlightItem{
 const at=16+index*12,position=Math.max(0,(at-FLIGHT.firstBarrier)/FLIGHT.barrierSpacing),left=Math.floor(position),fraction=position-left;
 const angle=routeAngle(left,seed)+wrapAngle(routeAngle(left+1,seed)-routeAngle(left,seed))*fraction+Math.sin(index*.71)*.2;
 const kind=index%22===15?'shield':index>=26&&index%22===4?'magnet':'crystal';return {index,at,kind,angle};
}
export function startFlight(seed=42):FlightState{return {seed:seed>>>0,ticks:0,angle:routeAngle(0,seed>>>0),distance:0,time:0,passed:0,clips:0,lastCrossed:-1,lastItem:-1,hp:3,score:0,crystals:0,nearMisses:0,combo:0,comboUntil:0,shieldUntil:0,magnetUntil:0,invulnerableUntil:0,impactSerial:0,impactTick:-10000,impactKind:null,feedback:null,feedbackUntil:0,events:[]};}
export function flightMultiplier(g:FlightState){return g.ticks>g.comboUntil?1:Math.min(3,1+Math.floor(g.combo/5));}
function reward(g:FlightState,base:number,event:FlightEvent){g.combo++;g.comboUntil=g.ticks+240;g.score+=base*flightMultiplier(g);g.events.push(event);}
export function steeringInput(angle:number,target:number){return Math.max(-127,Math.min(127,Math.round((target-angle)/(FLIGHT.maxTurn/FLIGHT.hz)*127)));}
export function encodeSteering(input:number){if(!Number.isInteger(input)||input< -127||input>127)throw Error('Invalid steering');return (input+127).toString(16).padStart(2,'0');}
export function stepFlight(previous:FlightState,input:number):FlightState{
 if(previous.hp<=0)return previous;
 if(!Number.isInteger(input)||input< -127||input>127)throw Error('Invalid steering');
 const turn=FLIGHT.maxTurn/FLIGHT.hz*input/127;
 const next:FlightState={...previous,ticks:previous.ticks+1,time:(previous.ticks+1)/FLIGHT.hz,angle:previous.angle+turn,distance:previous.distance+flightSpeed(previous.time)/FLIGHT.hz,events:[]};
 if(next.ticks%6===0)next.score++;
 if(next.ticks>next.comboUntil)next.combo=0;
 const crossing=Math.floor((next.distance-FLIGHT.firstBarrier)/FLIGHT.barrierSpacing);
 for(let index=previous.lastCrossed+1;index<=crossing;index++){
  const at=FLIGHT.firstBarrier+index*FLIGHT.barrierSpacing,fraction=Math.max(0,Math.min(1,(at-previous.distance)/(next.distance-previous.distance||1))),angle=previous.angle+turn*fraction;
  const barrier=barrierAt(index,next.seed,previous.time+fraction/60),margin=barrierMargin(barrier,angle);
  if(margin<=0){next.clips++;next.feedback='clip';if(next.ticks>=next.invulnerableUntil){next.impactSerial++;next.impactTick=next.ticks;next.invulnerableUntil=next.ticks+75;if(next.shieldUntil>next.ticks){next.shieldUntil=0;next.impactKind='shield';next.events.push('shield-hit');}else{next.hp--;next.combo=0;next.comboUntil=0;next.impactKind=next.hp?'hull':'fatal';next.events.push(next.hp?'damage':'over');}}}
  else{next.passed++;next.feedback='clear';if(margin<=.075&&next.ticks>=next.invulnerableUntil){next.nearMisses++;reward(next,10,'near');}}
  next.feedbackUntil=next.time+1.1;next.lastCrossed=index;
 }
 if(next.hp>0){const itemCrossing=Math.floor((next.distance-16)/12);for(let index=previous.lastItem+1;index<=itemCrossing;index++){
  const item=itemAt(index,next.seed),fraction=Math.max(0,Math.min(1,(item.at-previous.distance)/(next.distance-previous.distance||1))),angle=previous.angle+turn*fraction,reach=item.kind==='crystal'&&next.magnetUntil>next.ticks?.48:.16;
  if(Math.abs(wrapAngle(item.angle-angle))<=reach){if(item.kind==='crystal'){next.crystals++;reward(next,25,'crystal');}else if(item.kind==='shield'){next.shieldUntil=next.ticks+720;next.events.push('shield');}else{next.magnetUntil=next.ticks+360;next.events.push('magnet');}}next.lastItem=index;
 }}
 if(next.time>next.feedbackUntil)next.feedback=null;
 return next;
}
export function replayFlight(seed:number,history:string){if(!Number.isInteger(seed)||typeof history!=='string'||history.length%2)throw Error('Invalid saved flight');let state=startFlight(seed);for(let i=0;i<history.length;i+=2){const command=history.slice(i,i+2);if(!/^[0-9a-f]{2}$/.test(command)||parseInt(command,16)>254)throw Error('Invalid steering history');const next=stepFlight(state,parseInt(command,16)-127);if(next===state)throw Error('Input follows game over');state=next;}return state;}
