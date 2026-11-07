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
