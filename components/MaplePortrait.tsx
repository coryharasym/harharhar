import {useId} from 'react';
import {MAPLE_ART,type MapleStyle} from '../lib/maple-art';
import {isMapleMaterial,materialSprite,materialUrl,MATERIAL_SHEETS} from '../lib/maple-materials';
export default function MaplePortrait({style,tier,className='',size=36}:{style:MapleStyle;tier:number;className?:string;size?:number}){
 const filterId='maple-alpha-'+useId().replaceAll(':','');
 if(!isMapleMaterial(style))return <img className={className} src={MAPLE_ART[style].characters[tier]} alt="" width={size} height={size}/>;
 const sheet=MATERIAL_SHEETS[style],f=materialSprite(style,tier,sheet.width,sheet.height,50);
 return <svg aria-hidden="true" className={'maple-material-portrait '+className} width={size} height={size} viewBox="-78 -85 156 150"><defs><filter id={filterId} colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncA type="linear" slope="4" intercept="-2"/></feComponentTransfer></filter></defs><g filter={`url(#${filterId})`}><svg x={f.dx} y={f.dy} width={f.dw} height={f.dh} viewBox={`${f.sx} ${f.sy} ${f.sw} ${f.sh}`} overflow="hidden"><image href={materialUrl(style)} width={sheet.width} height={sheet.height}/></svg></g></svg>;
}
