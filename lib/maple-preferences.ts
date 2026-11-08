import {validMapleStyle,type MapleStyle} from './maple-art.ts';
import {normalizeMapleAudio,type MapleAudioPreferences} from './maple-audio.ts';
export const MAPLE_PREFERENCES_KEY='harharhar.maple.preferences.v1';
export type MaplePreferences=MapleAudioPreferences&{style:MapleStyle};
export function readMaplePreferences(raw:string|null):MaplePreferences{try{const p=raw?JSON.parse(raw):{};return {...normalizeMapleAudio(p&&typeof p==='object'?p:null),style:validMapleStyle(p?.style)?p.style:'woodland'};}catch{return {...normalizeMapleAudio(null),style:'woodland'};}}
