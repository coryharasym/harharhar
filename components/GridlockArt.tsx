import {memo} from 'react';
import {TOYBOX_CARS,TOYBOX_TRUCKS} from '../lib/gridlock-art';

export const CAR_COLOURS=['#f07986','#73d8d0','#a68aee','#e9bc75','#819fe8','#b4ce8b','#df97d1','#eaa17d','#7dc6df','#b4a5ec','#94bba7','#c2b098','#9eafc4'];

// Both atlases face right. Rotate the art within the existing button, keeping
// the original two/three-cell hit area, drag axis and keyboard behaviour.
export const VehicleFace=memo(function VehicleFace({index=0,truck=false,horizontal=true}:{index?:number;truck?:boolean;horizontal?:boolean}){
 const atlas=truck?TOYBOX_TRUCKS:TOYBOX_CARS;
 const frame=atlas.frames[index%CAR_COLOURS.length];
 const source=`./card-art/gridlock-toybox-${truck?'trucks':'cars'}-v1.webp`;
 return <svg className="gl-vehicle-art" aria-hidden="true" focusable="false" viewBox={`0 0 ${horizontal?frame.width:frame.height} ${horizontal?frame.height:frame.width}`} preserveAspectRatio="none">
  <g transform={horizontal?undefined:`translate(${frame.height} 0) rotate(90)`}>
   <image href={source} x={-frame.x} y={-frame.y} width={atlas.width} height={atlas.height}/>
  </g>
 </svg>;
});

export function GridlockArt(){return <div className="gl-card-art" aria-hidden="true"><img src="./card-art/gridlock-puzzle-pop.webp" alt="" width="800" height="800" decoding="async" draggable={false}/></div>;}
