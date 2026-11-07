// A finger may start on a HUD button while the player is steering.
// Crossing the slop once invalidates the whole tap, even if it comes back.
export class ControlTap {
 private pointer:number|null=null;
 private x=0;private y=0;private moved=false;
 begin(pointer:number,x:number,y:number){this.pointer=pointer;this.x=x;this.y=y;this.moved=false;}
 move(pointer:number,x:number,y:number){if(pointer===this.pointer&&Math.hypot(x-this.x,y-this.y)>10)this.moved=true;}
 cancel(){this.pointer=null;this.moved=true;}
 accept(clickDetail:number){if(this.pointer===null)return clickDetail===0;const valid=!this.moved;this.pointer=null;return valid;}
}

// One finger owns steering until that same contact ends; there is no angle/time cap.
export class HeldTurn {
 private owner:string|null=null;
 direction: -1|0|1=0;
 press(owner:string,direction:-1|1){if(this.owner!==null)return false;this.owner=owner;this.direction=direction;return true;}
 release(owner:string){if(owner!==this.owner)return false;this.clear();return true;}
 clear(){this.owner=null;this.direction=0;}
}

// Native non-passive touch listeners prevent Safari's long-press defaults.
// Touch-end stays targeted at the original button even after a finger slides off it.
export function bindTouchTurn(button:HTMLElement,direction:-1|1,held:HeldTurn,isPlaying:()=>boolean,onRelease:()=>void){
 const start=(event:TouchEvent)=>{event.preventDefault();if(!isPlaying())return;const touch=event.changedTouches[0];if(touch)held.press(`touch:${touch.identifier}`,direction);};
 const move=(event:TouchEvent)=>event.preventDefault();
 const end=(event:TouchEvent)=>{event.preventDefault();for(let i=0;i<event.changedTouches.length;i++)if(held.release(`touch:${event.changedTouches[i].identifier}`))onRelease();};
 const menu=(event:Event)=>event.preventDefault();
 button.addEventListener('touchstart',start,{passive:false});button.addEventListener('touchmove',move,{passive:false});button.addEventListener('touchend',end,{passive:false});button.addEventListener('touchcancel',end,{passive:false});button.addEventListener('contextmenu',menu);
 return()=>{button.removeEventListener('touchstart',start);button.removeEventListener('touchmove',move);button.removeEventListener('touchend',end);button.removeEventListener('touchcancel',end);button.removeEventListener('contextmenu',menu);};
}

// Displacement controls turn speed, not a destination angle. A stationary finger
// off-centre therefore keeps steering on every simulation tick.
export function swipeSteering(displacement:number,width:number,sensitivity=1){
 const deadZone=8,travel=Math.max(48,Math.min(96,width*.22));
 if(Math.abs(displacement)<=deadZone)return 0;
 return Math.sign(displacement)*Math.min(127,Math.round((Math.abs(displacement)-deadZone)/(travel-deadZone)*127*sensitivity));
}
export class SwipeTurn {
 private owner:number|null=null;private origin=0;
 input=0;
 get active(){return this.owner!==null;}
 begin(id:number,x:number){if(this.active)return false;this.owner=id;this.origin=x;this.input=0;return true;}
 move(id:number,x:number,width:number,sensitivity=1){if(id===this.owner)this.input=swipeSteering(x-this.origin,width,sensitivity);}
 release(id:number){if(id!==this.owner)return false;this.clear();return true;}
 clear(){this.owner=null;this.input=0;}
}
