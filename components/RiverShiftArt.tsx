'use client';
import {CHANNEL_WIDTH,openings,type Direction} from '../lib/river-shift';
export function channelAngle(mask:number):number{
 if(mask===5||mask===3)return 0;if(mask===10||mask===6)return 90;if(mask===12)return 180;return 270;
}
export function RiverRelief({kind,className=''}:{kind:'mountain'|'forest'|'rocks'|'grass'|'waves';className?:string}){
 return <span aria-hidden="true" className={'rs-relief rs-relief-'+kind+' '+className}/>;
}
export function RiverTileArt({mask,flowing=false,kind,port=1,breakEdge,angle,won=false}:{mask:number;flowing?:boolean;kind?:'mountain'|'ocean'|'forest'|'rocks'|'grass';port?:Direction;breakEdge?:Direction;angle?:number;won?:boolean}){
 const straight=mask===5||mask===10;
 const path=straight?'M50 0 V100':'M50 0 A50 50 0 0 0 100 50';
 const portAngle=(port-1)*90;
 return <><span className="rs-glaze"/>
 {kind==='forest'||kind==='rocks'||kind==='grass'?<RiverRelief kind={kind}/>:kind==='mountain'?<>
  <RiverRelief kind="mountain"/>
  <svg viewBox="0 0 100 100" aria-hidden="true" className="rs-water-art"><g transform={`rotate(${portAngle} 50 50)`}><path d="M43 50 Q47 54 59 50 H100" className="rs-groove-rim" strokeWidth={CHANNEL_WIDTH+3}/><path d="M43 50 Q47 54 59 50 H100" className="rs-water" strokeWidth={CHANNEL_WIDTH}/><path d="M37 47 C21 44 29 66 44 59 C55 54 42 45 36 52" className="rs-spring-swirl"/><path d="M60 47 Q75 54 100 47" className="rs-current"/></g></svg>
 </>:kind==='ocean'?<>
  <svg viewBox="0 0 100 100" aria-hidden="true" className="rs-water-art"><g transform={`rotate(${portAngle} 50 50)`}><path d="M100 38 H79 C62 38 58 16 29 12 H-3 V88 H29 C58 84 62 62 79 62 H100 Z" className={'rs-bay '+(flowing?'rs-bay-fed':'')}/>{won&&<g className="rs-ripples"><circle cx="40" cy="50" r="13"/><circle cx="40" cy="50" r="25"/></g>}</g></svg>
  <RiverRelief kind="waves" className={`rs-waves-${port}`}/>
 </>:<svg viewBox="0 0 100 100" aria-hidden="true" className="rs-water-art"><g className="rs-channel" style={{transform:`rotate(${angle??channelAngle(mask)}deg)`}}><path d={path} className="rs-groove-rim" strokeWidth={CHANNEL_WIDTH+3}/><path d={path} className={flowing?'rs-water':'rs-dry-channel'} strokeWidth={CHANNEL_WIDTH}/>{flowing&&<><path d={path} className="rs-current rs-current-line"/><path d={path} className="rs-current rs-current-spark"/></>}</g></svg>}
 {breakEdge!==undefined&&<svg viewBox="0 0 100 100" aria-hidden="true" className="rs-leading-edge"><g transform={`rotate(${breakEdge*90} 50 50)`}><path d={`M${50-CHANNEL_WIDTH/2} 1 H${50+CHANNEL_WIDTH/2}`} /></g></svg>}
 </>;
}
export function riverTileLabel(mask:number):string{return openings(mask).map(d=>['north','east','south','west'][d]).join(' and ');}
