import {Orbit,Sparkles,Moon,Zap,Diamond,Flame,Leaf,Crown} from 'lucide-react';
import {ICONS} from '../lib/profile';
const symbols={orbit:Orbit,spark:Sparkles,moon:Moon,bolt:Zap,diamond:Diamond,flame:Flame,leaf:Leaf,crown:Crown};
export function PlayerBadge({icon='orbit',size=18}:{icon?:string;size?:number}){const id=ICONS.includes(icon as typeof ICONS[number])?icon as typeof ICONS[number]:'orbit';const Icon=symbols[id];return <span className={'player-symbol symbol-'+id} aria-label={id+' icon'}><Icon size={size}/></span>}
