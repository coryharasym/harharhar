import {memo,useId} from 'react';
import type {Skyline} from '../lib/skyline';
/** Shared, live-rendered architecture for the playfield and arcade card. */
export function SkylineDefs({id}:{id:string}){return <defs>
 <linearGradient id={id+'glass'} x2="1" y2=".3"><stop stopColor="#15344f"/><stop offset=".42" stopColor="#286b96"/><stop offset=".7" stopColor="#123450"/><stop offset="1" stopColor="#3886ab"/></linearGradient>
 <linearGradient id={id+'sill'} x2="0" y2="1"><stop stopColor="#d2dfef"/><stop offset=".25" stopColor="#9caec5"/><stop offset=".6" stopColor="#65738d"/><stop offset="1" stopColor="#26324e"/></linearGradient>
 <linearGradient id={id+'gold'} x2="0" y2="1"><stop stopColor="#ffe8a3"/><stop offset=".4" stopColor="#eabd59"/><stop offset=".6" stopColor="#9d6728"/><stop offset="1" stopColor="#e2b76e"/></linearGradient>
 <radialGradient id={id+'warm'}><stop stopColor="#ffe9af" stopOpacity=".9"/><stop offset=".35" stopColor="#f9bd65" stopOpacity=".65"/><stop offset="1" stopColor="#ecaa4e" stopOpacity="0"/></radialGradient>
 <pattern id={id+'rooms'} width="66" height="22" patternUnits="userSpaceOnUse"><rect width="66" height="22" fill={'url(#'+id+'glass)'}/><path d="M1 19L16 2H22L7 19 M39 19L55 2H58L43 19" fill="#80c7df" opacity=".14"/><rect x="23" y="1" width="18" height="20" fill={'url(#'+id+'warm)'}/><path d="M25 18v-5h4v-2h3v7 M34 18v-7h2v7 M30 16h9v2h-9" fill="#202c3a" opacity=".7"/><path d="M30 10h7l-2-3h-3z" fill="#ffdfa2" opacity=".85"/><path d="M8 18v-4h4v-5h3v9 M49 18v-7h6v7 M58 18v-3h5v3" fill="#10263e" opacity=".65"/><path d="M.5 0V22 M11 0V22 M22 0V22 M33 0V22 M44 0V22 M55 0V22 M65.5 0V22" stroke="#0a2038" strokeWidth="1.1"/><path d="M2 0V22 M24 0V22 M46 0V22" stroke="#8fbbd3" strokeOpacity=".32" strokeWidth=".5"/></pattern>
 </defs>;}
/** Painted from the approved reference; camera motion stays behind the live tower. */
const City=memo(function City({id,camera,height=480}:{id:string;camera:number;height?:number}){
 const offset=Math.min(height*.4,camera*.18);
 return <><rect width="360" height={height} fill="#0e1745"/><defs><linearGradient id={id+'paintFade'} x2="0" y2="1"><stop stopColor="black"/><stop offset=".045" stopColor="white"/></linearGradient><mask id={id+'paintMask'} maskUnits="userSpaceOnUse" x="0" y="0" width="360" height={height}><rect width="360" height={height} fill={'url(#'+id+'paintFade)'}/></mask></defs><g transform={`translate(0 ${offset})`}><image href="card-art/skyline-blue-hour-painted-v1.webp" x="0" y="0" width="360" height={height} preserveAspectRatio="xMidYMin slice" mask={'url(#'+id+'paintMask)'}/></g></>;
});
export const GlassFloor=memo(function GlassFloor({id,x,y,width,level=0,active=false,reinforced=false,perfect=false,gain=0,progress=1}:{id:string;x:number;y:number;width:number;level?:number;active?:boolean;reinforced?:boolean;perfect?:boolean;gain?:number;progress?:number}){
 const clip=useId().replace(/:/g,'');const depth=Math.min(5,width*.15);
 return <g><defs><pattern id={clip+'rooms'} href={'#'+id+'rooms'} patternTransform={`translate(${x-(level*13)%66} ${y})`}/><clipPath id={clip}><rect x={x} y={y+2} width={width} height="20"/></clipPath></defs>
 <path d={`M${x+width} ${y}l${depth} 4v20l-${depth}-3z`} fill="#0a1b33"/><path d={`M${x} ${y+21}h${width}l${depth} 3H${x+depth}z`} fill="#0c172f"/>
 <rect x={x} y={y+2} width={width} height="19" fill={'url(#'+id+'glass)'}/><g clipPath={`url(#${clip})`}><rect x={x-((level*13)%66)} y={y} width={width+66} height="22" fill={'url(#'+clip+'rooms)'}/></g>
 <path d={`M${x} ${y+1}h${width}l${depth} 3H${x+depth}z`} fill={'url(#'+id+'sill)'}/><path d={`M${x} ${y+20.5}h${width}`} stroke="#0b1e36" strokeWidth="1"/>
 <path d={`M${x} ${y}h${width}`} stroke={active?'#74ffff':perfect?'#fbe3a0':'#a7c9dd'} strokeWidth={active?2:1}/>
 {active&&<path d={`M${x} ${y-1}h${width}`} stroke="#31e4ef" strokeOpacity=".25" strokeWidth="5"/>}
 {reinforced&&<g className={progress<1?'skyline-braces deploying':'skyline-braces'}><path d={`M${x+1} ${y+18}l${Math.min(17,width*.23)}-15 M${x+width-1} ${y+18}l-${Math.min(17,width*.23)}-15`} stroke="#7a4f28" strokeWidth="4"/><path d={`M${x+1} ${y+18}l${Math.min(17,width*.23)}-15 M${x+width-1} ${y+18}l-${Math.min(17,width*.23)}-15`} stroke={'url(#'+id+'gold)'} strokeWidth="2.4"/><rect x={x-1} y={y} width={width+2} height="3" rx=".8" fill={'url(#'+id+'gold)'}/>{[x+2,x+width-2].map((cx,i)=><g key={i}><circle cx={cx} cy={y+1.5} r="1.25" fill="#fff1ba"/><circle cx={cx} cy={y+18} r="1.5" fill="#f8ce7d"/></g>)}{gain>0&&<><path d={`M${x} ${y-2}h${gain/2} M${x+width-gain/2} ${y-2}h${gain/2}`} stroke="#ffe6a4" strokeWidth="2"/></>}</g>}
 </g>;
});
const Rooftop=memo(function Rooftop({id}:{id:string}){return <g>
 <path d="M34 417l15-18h268l14 18v80H34z" fill="#1b2b48"/><rect x="39" y="420" width="286" height="66" fill={'url(#'+id+'rooms)'}/><path d="M27 410l15-11h276l15 11v7H27z" fill="#586983"/><path d="M27 410h306v7H27z" fill={'url(#'+id+'sill)'}/><path d="M42 399v-7h275v7" fill="none" stroke="#74889f" strokeWidth="2"/>
 <rect x="55" y="377" width="17" height="20" rx="1" fill="#2d415a"/><path d="M58 381h10 M58 384h10 M58 387h10 M58 390h10" stroke="#7590a6" strokeWidth=".7"/><path d="M290 397v-14h9v14 M292 383v-5h11" fill="none" stroke="#637d94" strokeWidth="2"/>
 <rect x="70" y="391" width="220" height="19" fill="#16293f"/><path d="M66 389h228l5 4H70z" fill={'url(#'+id+'sill)'}/>
 </g>;});
function Impact({id,x,y,width,reinforced,age}:{id:string;x:number;y:number;width:number;reinforced:boolean;age:number}){const duration=reinforced?.55:.32,p=Math.min(1,age/duration);return <g opacity={1-p}>
 <path d={`M${x} ${y}h${width}`} stroke={reinforced?'#ffe09a':'#c8ffff'} strokeWidth={2+3*(1-p)}/>
 {Array.from({length:reinforced?12:6},(_,i)=>{const xx=x+width*((i*.37)%1),dx=(i%2?-1:1)*(5+i*2)*p,dy=(10+i%4*6)*p;return <path key={i} d={`M${xx+dx} ${y-dy}v-${1+(i%3)}`} stroke={reinforced?'#ffe09a':'#bceef3'} strokeWidth={i%3===0?1.4:.8}/>;})}
 </g>;}
export function SkylineScene({game,id,reduced=false,height=480}:{game:Skyline;id:string;reduced?:boolean;height?:number}){
 const top=game.floors.at(-1)!,level=game.floors.length,active=game.phase==='moving'||game.phase==='dropping';
 const prior=game.floors.at(-2),gain=prior?top.width-prior.width:0;
 const p=game.phase==='settling'&&top.reinforced?Math.min(1,game.elapsed/.35):1;
 const shownWidth=top.width-(top.reinforced&&!reduced?gain*(1-p):0),shownX=top.x+(top.width-shownWidth)/2;
 return <><SkylineDefs id={id}/><City id={id} camera={game.camera} height={height}/><g transform={`translate(0 ${game.camera+height-480})`}>
 <Rooftop id={id}/>{game.floors.map((f,i)=>{const y=389-i*22;if(y+game.camera< -28||y+game.camera>500)return null;return <GlassFloor key={i} id={id} x={i===level-1?shownX:f.x} y={y} width={i===level-1?shownWidth:f.width} level={i} perfect={f.perfect} reinforced={f.reinforced} gain={i===level-1?gain:0} progress={i===level-1?p:1}/>;})}
 {game.cuts.map((c,i)=><g key={`${c.level}-${i}`} opacity={Math.max(0,1-c.age/1.4)} transform={`translate(${c.direction*c.age*32} ${c.age*c.age*480}) rotate(${reduced?0:c.direction*c.age*60} ${c.x+c.width/2} ${400-c.level*22})`}><GlassFloor id={id} x={c.x} y={389-c.level*22} width={c.width} level={c.level}/>{!reduced&&[0,1,2].map(n=><path key={n} d={`M${c.x+c.width*.5+n*3} ${383-c.level*22-n*5}l2-8`} stroke="#c0e8f7" strokeWidth=".7" opacity=".7"/>)}</g>)}
 {active&&<GlassFloor id={id} x={game.x} y={389-level*22-42*(game.phase==='dropping'?Math.max(0,1-game.elapsed/.12):1)} width={top.width} level={level} active/>}
 {game.phase==='settling'&&top.perfect&&!reduced&&<Impact id={id} x={shownX} y={389-(level-1)*22} width={shownWidth} reinforced={top.reinforced} age={game.elapsed}/>}
 </g></>;
}
export function SkylineCardArt(){const id=useId().replace(/:/g,'')+'card';return <svg className="skyline-card-art" viewBox="0 0 360 480" aria-hidden="true"><SkylineDefs id={id}/><City id={id} camera={0}/><g transform="translate(-10 75)"><Rooftop id={id}/>{Array.from({length:10},(_,i)=><GlassFloor key={i} id={id} x={73+i*5} y={389-i*22} width={215-i*13} level={i} perfect={i===9} reinforced={i===3}/>)}<g className="skyline-card-hover"><GlassFloor id={id} x={154} y={114} width={98} active/></g><g transform="rotate(27 80 210)"><GlassFloor id={id} x={68} y={205} width={28}/><path d="M76 190v-17 M86 193v-22" stroke="#c1eefa" opacity=".7"/></g></g></svg>;}
