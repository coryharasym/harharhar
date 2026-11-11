/** Shared tile artwork for the board and its arcade card. */
export function threesTone(value:number){return value===1?'one':value===2?'two':value<12?'cream':value<48?'peach':value<192?'sage':'lavender';}
export function ThreesTileFace({value,className=''}:{value:number;className?:string}){return <div className={'threes-face threes-'+threesTone(value)+(value>=1000?' threes-small':'')+(className?' '+className:'')}>{value.toLocaleString()}<i/></div>;}
