import {BOWL,PIECES} from './maple-physics.ts';
import type {MapleGame} from './maple-game.ts';
import {MAPLE_ART,MAPLE_STYLES,type MapleStyle} from './maple-art.ts';
export type MapleAtlas=Record<MapleStyle,{characters:HTMLImageElement[];bin:HTMLImageElement}>;
export function loadMapleAtlas(onLoad:()=>void):{atlas:MapleAtlas;dispose:()=>void}{
 let disposed=false;const image=(src:string)=>{const i=new Image();i.onload=()=>{if(!disposed)onLoad();};i.onerror=()=>{if(!disposed)onLoad();};i.src=src;return i;};
 const atlas=Object.fromEntries(MAPLE_STYLES.map(s=>[s.id,{characters:MAPLE_ART[s.id].characters.map(image),bin:image(MAPLE_ART[s.id].bin)}]))as MapleAtlas;
 return {atlas,dispose:()=>{disposed=true;Object.values(atlas).forEach(a=>[a.bin,...a.characters].forEach(i=>{i.onload=null;i.onerror=null;}));}};
}
export function paintCharacter(ctx:CanvasRenderingContext2D,atlas:MapleAtlas|null,style:MapleStyle,x:number,y:number,tier:number,opacity=1,squash=0){
 const r=PIECES[tier].radius,img=atlas?.[style].characters[tier];ctx.save();ctx.globalAlpha=opacity;ctx.translate(x,y);ctx.scale(1+squash,1-squash);if(img?.complete&&img.naturalWidth){ctx.drawImage(img,-r*1.56,-r*1.7,r*3.12,r*3);}else{ctx.fillStyle=PIECES[tier].color;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();}ctx.restore();
}
// All feedback follows simulation ticks. Pausing freezes it; reduced motion removes it.
export function paintMapleEffects(ctx:CanvasRenderingContext2D,g:MapleGame,reduced:boolean){if(reduced)return;for(const e of g.world.effects){const life=(g.world.tick-e.tick)/65;if(life<0||life>=1)continue;const r=PIECES[e.tier].radius;ctx.save();ctx.globalAlpha=(1-life)*.7;ctx.strokeStyle=PIECES[e.tier].color;ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(e.x,e.y,r*(1+life*.45),0,Math.PI*2);ctx.stroke();for(let i=0;i<7;i++){const angle=i*Math.PI*2/7,d=r+life*25,x=e.x+Math.cos(angle)*d,y=e.y+Math.sin(angle)*d;ctx.fillStyle=i%2?'#eccc8c':'#9cddc5';ctx.save();ctx.translate(x,y);ctx.rotate(angle+life);ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(2,0);ctx.lineTo(0,3);ctx.lineTo(-2,0);ctx.closePath();ctx.fill();ctx.restore();}ctx.restore();}
 for(const a of g.awards){const age=g.world.tick-a.tick;if(age>100)continue;const b=g.world.balls.find(b=>b.id===a.id),e=g.world.effects.find(e=>e.id===a.id);if(!b&&!e)continue;ctx.save();ctx.globalAlpha=1-age/100;ctx.fillStyle=a.multiplier>1?'#f5d39b':'#e7ffef';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.shadowColor='#0c1022';ctx.shadowBlur=5;ctx.fillText(`+${a.points}${a.multiplier>1?' · Chain ×'+a.multiplier:''}`,(e??b)!.x,Math.max(165,(e??b)!.y-PIECES[a.tier].radius-8)-age*.22);ctx.restore();}
}
export function mergeSquash(tick:number,born:number,reduced:boolean){const age=tick-born;return reduced||age<=0||age>=32?0:(1-age/32)*Math.sin(age/32*Math.PI)*.075;}
export function paintMapleBin(ctx:CanvasRenderingContext2D,atlas:MapleAtlas|null,style:MapleStyle){const img=atlas?.[style].bin;if(img?.complete&&img.naturalWidth)ctx.drawImage(img,0,0,BOWL.width,BOWL.height);else{ctx.fillStyle='#142b30';ctx.fillRect(0,0,BOWL.width,BOWL.height);ctx.strokeStyle='#a9d9b7';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(22,109);ctx.lineTo(22,522);ctx.lineTo(338,522);ctx.lineTo(338,109);ctx.stroke();}}
