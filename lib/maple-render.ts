import {BOWL,PIECES} from './maple-physics.ts';
import type {MapleGame} from './maple-game.ts';
import {MAPLE_ART,MAPLE_STYLES,MAPLE_SCENERY_URL,binSvg,svgData,type MapleStyle} from './maple-art.ts';
import {isMapleMaterial,materialUrl,materialSprite} from './maple-materials.ts';
export type MapleAtlas=Record<MapleStyle,{characters:HTMLImageElement[];bin:HTMLImageElement;sheet?:HTMLCanvasElement;scenery?:HTMLImageElement;frame?:HTMLImageElement}>;
export function loadMapleAtlas(onLoad:()=>void):{atlas:MapleAtlas;dispose:()=>void}{
 let disposed=false;const image=(src:string)=>{const i=new Image();i.onload=()=>{if(!disposed)onLoad();};i.onerror=()=>{if(!disposed)onLoad();};i.src=src;return i;};
 const atlas=Object.fromEntries(MAPLE_STYLES.filter(s=>!isMapleMaterial(s.id)).map(s=>[s.id,{characters:MAPLE_ART[s.id].characters.map(image),bin:image(MAPLE_ART[s.id].bin)}]))as MapleAtlas;
 atlas.woodland.scenery=image(MAPLE_SCENERY_URL);atlas.woodland.frame=image(svgData(binSvg('woodland',false)));
 for(const style of MAPLE_STYLES)if(isMapleMaterial(style.id)){
  const entry=atlas[style.id]={...atlas.woodland} as MapleAtlas[MapleStyle];
  if(style.id!=='velvet')continue;
  const source=image(materialUrl(style.id));source.onload=()=>{if(disposed)return;const sheet=document.createElement('canvas');sheet.width=source.naturalWidth;sheet.height=source.naturalHeight;const ctx=sheet.getContext('2d');if(!ctx)return;ctx.drawImage(source,0,0);const pixels=ctx.getImageData(0,0,sheet.width,sheet.height);for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=Math.max(0,Math.min(255,4*pixels.data[i]-510));ctx.putImageData(pixels,0,0);entry.sheet=sheet;onLoad();};
 }
 return {atlas,dispose:()=>{disposed=true;Object.values(atlas).forEach(a=>[a.bin,...a.characters,...(a.scenery?[a.scenery]:[]),...(a.frame?[a.frame]:[])].forEach(i=>{i.onload=null;i.onerror=null;}));}};
}
export function paintCharacter(ctx:CanvasRenderingContext2D,atlas:MapleAtlas|null,style:MapleStyle,x:number,y:number,tier:number,opacity=1,squash=0){
 const r=PIECES[tier].radius,img=atlas?.[style].characters[tier],sheet=atlas?.[style].sheet;ctx.save();ctx.globalAlpha=opacity;ctx.translate(x,y);ctx.scale(1+squash,1-squash);if(sheet&&sheet.width>0){const frame=materialSprite(style as 'marshmallow'|'velvet'|'glazed',tier,sheet.width,sheet.height,r);ctx.drawImage(sheet,frame.sx,frame.sy,frame.sw,frame.sh,frame.dx,frame.dy,frame.dw,frame.dh);}else if(img?.complete&&img.naturalWidth){ctx.drawImage(img,-r*1.56,-r*1.7,r*3.12,r*3);}else{ctx.fillStyle=PIECES[tier].color;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();}ctx.restore();
}
// All feedback follows simulation ticks. Pausing freezes it; reduced motion removes it.
export function paintMapleEffects(ctx:CanvasRenderingContext2D,g:MapleGame,reduced:boolean){if(reduced)return;for(const e of g.world.effects){const life=(g.world.tick-e.tick)/65;if(life<0||life>=1)continue;const r=PIECES[e.tier].radius;ctx.save();ctx.globalAlpha=(1-life)*.7;ctx.strokeStyle=PIECES[e.tier].color;ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(e.x,e.y,r*(1+life*.45),0,Math.PI*2);ctx.stroke();for(let i=0;i<7;i++){const angle=i*Math.PI*2/7,d=r+life*25,x=e.x+Math.cos(angle)*d,y=e.y+Math.sin(angle)*d;ctx.fillStyle=i%2?'#eccc8c':'#9cddc5';ctx.save();ctx.translate(x,y);ctx.rotate(angle+life);ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(2,0);ctx.lineTo(0,3);ctx.lineTo(-2,0);ctx.closePath();ctx.fill();ctx.restore();}ctx.restore();}
 for(const a of g.awards){const age=g.world.tick-a.tick;if(age>100)continue;const b=g.world.balls.find(b=>b.id===a.id),e=g.world.effects.find(e=>e.id===a.id);if(!b&&!e)continue;ctx.save();ctx.globalAlpha=1-age/100;ctx.fillStyle=a.multiplier>1?'#f5d39b':'#e7ffef';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.shadowColor='#0c1022';ctx.shadowBlur=5;ctx.fillText(`+${a.points}${a.multiplier>1?' · Chain ×'+a.multiplier:''}`,(e??b)!.x,Math.max(165,(e??b)!.y-PIECES[a.tier].radius-8)-age*.22);ctx.restore();}
}
export function mergeSquash(tick:number,born:number,reduced:boolean){const age=tick-born;return reduced||age<=0||age>=32?0:(1-age/32)*Math.sin(age/32*Math.PI)*.075;}
export function paintMapleBin(ctx:CanvasRenderingContext2D,atlas:MapleAtlas|null,style:MapleStyle){
 const images=atlas?.[style],img=images?.bin,scene=images?.scenery,frame=images?.frame;
 if(img?.complete&&img.naturalWidth)ctx.drawImage(img,0,0,BOWL.width,BOWL.height);else{ctx.fillStyle='#142b30';ctx.fillRect(0,0,BOWL.width,BOWL.height);ctx.strokeStyle='#a9d9b7';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(22,109);ctx.lineTo(22,522);ctx.lineTo(338,522);ctx.lineTo(338,109);ctx.stroke();}
 if(scene?.complete&&scene.naturalWidth&&frame?.complete&&frame.naturalWidth){const scale=Math.max(BOWL.width/scene.naturalWidth,BOWL.height/scene.naturalHeight),sw=BOWL.width/scale,sh=BOWL.height/scale;ctx.drawImage(scene,(scene.naturalWidth-sw)/2,(scene.naturalHeight-sh)/2,sw,sh,0,0,BOWL.width,BOWL.height);ctx.fillStyle='#19392e0a';ctx.fillRect(0,0,BOWL.width,BOWL.height);ctx.drawImage(frame,0,0,BOWL.width,BOWL.height);ctx.fillStyle='#142b30df';ctx.fillRect(0,538,BOWL.width,12);}
}
