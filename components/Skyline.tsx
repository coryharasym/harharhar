'use client';
import {useEffect,useRef,useState,useId} from 'react';
import {ArrowLeft,Pause,Play,RotateCcw,Trophy,Volume2,VolumeX,Info} from 'lucide-react';
import {useGameNavigation} from '../hooks/use-game-navigation';
import {useSkylineLeaderboard} from '../hooks/use-skyline-leaderboard';
import {beats,createSkyline,dropSkyline,FOUNDATION,skylinePosition,startSkyline,stepSkyline,type SkylineBest,type Skyline as Game} from '../lib/skyline';
import {decodeSkylineSession,encodeSkylineDrop,SKYLINE_SAVE,type SkylineSession} from '../lib/skyline-sync';
import {apiUrl} from '../lib/api';
import type {PlayerProfile} from '../lib/profile';
import {SkylineScene} from './SkylineArt';
import {SkylineAudio} from '../lib/skyline-audio';
import {FinalScoreConfirmation} from './FinalScoreConfirmation';
import {AutoScoreStatus} from './AutoScoreStatus';
import './skyline.css';
const BEST='hhh-skyline-best-v1';
type Props={profile:PlayerProfile|null;onBack:()=>void;onScores:()=>void;onEditProfile:()=>void;paused:boolean;sound:boolean;onSound:(value:boolean)=>void};
export default function Skyline({profile,onBack,onScores,onEditProfile,paused:externalPause,sound,onSound}:Props){
 const [game,setGame]=useState(createSkyline),[paused,setPaused]=useState(false),[best,setBest]=useState<SkylineBest>({floors:0,perfects:0}),[saveError,setSaveError]=useState(false);
 const [meta,setMeta]=useState<SkylineSession>({id:null,history:'',sweep:0,revision:''}),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[stale,setStale]=useState(false),[notice,setNotice]=useState('');
 const [help,setHelp]=useState(false),[reduced,setReduced]=useState(false),[sceneHeight,setSceneHeight]=useState(480);
 const id=useId().replace(/:/g,'')+'skyline',audio=useRef<SkylineAudio|null>(null),current=useRef(game),session=useRef(meta),blocked=useRef(false),previous=useRef(0),arena=useRef<HTMLDivElement>(null);
 const mounted=useRef(true),generation=useRef(0),reservation=useRef<Promise<string|null>|null>(null);
 const auto=useSkylineLeaderboard({id:meta.id,history:meta.history,finished:game.phase==='over',profile,enabled:ready&&!stale});
 blocked.current=paused||externalPause||help||busy||stale||!ready;
 function persist(next=current.current,replace=false){
  if(next.phase==='ready')return true;
  try{const old=localStorage.getItem(SKYLINE_SAVE);if(!replace&&old&&JSON.parse(old).revision!==session.current.revision){blocked.current=true;setStale(true);setPaused(true);audio.current?.silence();return false;}
   const saved={...session.current,sweep:next.phase==='moving'?next.sweepElapsed:0,revision:crypto.randomUUID()};localStorage.setItem(SKYLINE_SAVE,JSON.stringify({version:1,...saved}));session.current=saved;
  }catch{setSaveError(true);}return true;
 }
 function commit(next:Game){
  const old=current.current;
  if(next.floors.length>old.floors.length){const f=next.floors.at(-1)!;audio.current?.play(f.reinforced?'reinforce':f.perfect?'perfect':'land');}
  else if(next.phase==='over'&&old.phase!=='over')audio.current?.play('miss');
  current.current=next;setGame(next);
  if(next.floors.length!==old.floors.length||next.phase==='over'&&old.phase!=='over')persist(next);
 }
 function pause(){if(current.current.phase!=='ready'&&current.current.phase!=='over'){blocked.current=true;setPaused(true);}audio.current?.silence();previous.current=0;persist();}
 function reserve(){
  if(reservation.current)return reservation.current;
  reservation.current=(async()=>{if(navigator.onLine===false)return null;try{const response=await fetch(apiUrl('/api/runs'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'skyline'}),signal:AbortSignal.timeout(8000)});const value=await response.json() as {game?:string;id?:string};if(!response.ok||value.game!=='skyline'||typeof value.id!=='string'||!/^[a-f0-9-]{36}$/.test(value.id))return null;return value.id as string;}catch{return null;}})();return reservation.current;
 }
 async function start(){
  if(busy||!ready)return;audio.current?.unlock();blocked.current=true;setBusy(true);const attempt=++generation.current;
  const runId=await reserve();if(!mounted.current||attempt!==generation.current)return;reservation.current=null;
  const next=startSkyline(),fresh={id:runId,history:'',sweep:0,revision:''};session.current=fresh;setMeta(fresh);current.current=next;setGame(next);persist(next,true);
  auto.closeConfirmation();setPaused(false);setHelp(false);setStale(false);setBusy(false);previous.current=0;setNotice(runId?'':'Offline practice · Your personal best still saves on this phone.');arena.current?.focus({preventScroll:true});void reserve();
 }
 function drop(){
  if(blocked.current||current.current.phase!=='moving')return;audio.current?.unlock();
  const command=encodeSkylineDrop(current.current.sweepElapsed),seconds=parseInt(command,16)/1e6,position=skylinePosition(current.current.floors.at(-1)!.width,current.current.floors.length,seconds);
  const next=dropSkyline({...current.current,...position,sweepElapsed:seconds});session.current={...session.current,history:session.current.history+command};
  if(!persist(next))return;setMeta({...session.current});commit(next);
 }
 function leave(action:()=>void){if(busy)return;pause();action();}
 useGameNavigation(action=>leave(action));
 useEffect(()=>{
  mounted.current=true;
  try{const value=JSON.parse(localStorage.getItem(BEST)||'null');if(value&&Number.isSafeInteger(value.floors)&&value.floors>=0&&Number.isSafeInteger(value.perfects)&&value.perfects>=0&&value.perfects<=value.floors)setBest(value);
   const raw=localStorage.getItem(SKYLINE_SAVE);if(raw){const saved=decodeSkylineSession(raw);if(saved){session.current=saved.session;setMeta(saved.session);current.current=saved.game;setGame(saved.game);setPaused(saved.game.phase!=='over');}else setNotice('The saved tower could not be restored. Start a new run.');}
  }catch{setSaveError(true);}setReady(true);void reserve();
  const changed=(e:StorageEvent)=>{if((e.key===SKYLINE_SAVE||e.key===null)&&current.current.phase!=='ready'){let revision;try{revision=e.newValue?JSON.parse(e.newValue).revision:undefined;}catch{}if(revision!==session.current.revision){blocked.current=true;setStale(true);setPaused(true);audio.current?.silence();}}};window.addEventListener('storage',changed);
  return()=>{mounted.current=false;generation.current++;persist();window.removeEventListener('storage',changed);};
 },[]);
 useEffect(()=>{const element=arena.current;if(!element)return;const observer=new ResizeObserver(entries=>{const rect=entries[0].contentRect;if(rect.width>0)setSceneHeight(rect.height/rect.width*360);});observer.observe(element);return()=>observer.disconnect();},[]);
 useEffect(()=>{const engine=new SkylineAudio();audio.current=engine;return()=>{engine.dispose();audio.current=null;};},[]);
 useEffect(()=>{audio.current?.setEnabled(sound);},[sound]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{if(externalPause)pause();},[externalPause]);
 useEffect(()=>{if(game.phase!=='over')return;const result={floors:game.floors.length-1,perfects:game.perfects};setBest(old=>{if(!beats(result,old))return old;try{localStorage.setItem(BEST,JSON.stringify(result));}catch{setSaveError(true);}return result;});},[game.phase,game.floors.length,game.perfects]);
 useEffect(()=>{
  let frame=0;const animate=(now:number)=>{if(!blocked.current){if(previous.current){const dt=(now-previous.current)/1000;if(dt<=.5)commit(stepSkyline(current.current,dt));}previous.current=now;}else previous.current=0;frame=requestAnimationFrame(animate);};frame=requestAnimationFrame(animate);
  const hidden=()=>{if(document.hidden)pause();};const blur=()=>pause();const pagehide=()=>pause();
  const key=(e:KeyboardEvent)=>{if(e.repeat)return;const target=e.target as HTMLElement;if(target.closest('button,input,textarea,select,[role="dialog"]'))return;if(e.code==='Space'){e.preventDefault();drop();}if(e.code==='Escape'){e.preventDefault();pause();}};
  document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);window.addEventListener('pagehide',pagehide);window.addEventListener('keydown',key);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',blur);window.removeEventListener('pagehide',pagehide);window.removeEventListener('keydown',key);};
 },[]);
 const floors=game.floors.length-1,top=game.floors.at(-1)!,active=game.phase==='moving'||game.phase==='dropping',over=game.phase==='over',overlay=help||paused||stale||game.phase==='ready'||over;
 return <section className={'skyline-page'+(paused||externalPause?' is-paused':'')}><header className="skyline-header"><button className="text-btn" onClick={()=>leave(onBack)} disabled={busy}><ArrowLeft size={15}/>Games</button><span className="eyebrow">BLUE HOUR EDITION</span><div><button className="icon-button" aria-label={sound?'Mute Skyline sounds':'Enable Skyline sounds'} aria-pressed={sound} onClick={()=>{const enabled=!sound;audio.current?.setEnabled(enabled);if(enabled)audio.current?.unlock();onSound(enabled);}}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}</button><button className="icon-button" aria-label="How to play Skyline" onClick={()=>{pause();setHelp(true);}}><Info size={17}/></button></div></header>
 <div className="skyline-heading"><h1>Sky<span>line.</span></h1><div><button className="secondary skyline-records-button" aria-label="Skyline leaderboard" onClick={()=>leave(onScores)} disabled={busy}><Trophy size={16}/><span>Leaderboard</span></button><button className="secondary" onClick={()=>void start()} disabled={!ready||busy}><RotateCcw size={15}/>{busy?'Preparing…':'New game'}</button><button className="icon-button" aria-label="Pause Skyline" onClick={pause} disabled={busy||!active&&game.phase!=='settling'}><Pause size={19}/></button></div></div>
 <div className="skyline-hud"><div><small>FLOORS</small><strong>{floors}</strong></div><div className="skyline-streak" aria-label={`${game.streak} of 3 perfect landings toward reinforcement`}><div>{[0,1,2].map(i=><i key={i} className={i<game.streak?'lit':''}/>)}</div><small>3 PERFECTS = MORE WIDTH</small></div><div><small>PERFECTS</small><strong>{game.perfects}</strong></div></div>
 <div className="skyline-arena" ref={arena} tabIndex={0} role="group" aria-label="Skyline playfield. Tap or press Space to drop a floor." onPointerDown={e=>{if(e.button!==0||!e.isPrimary||overlay||externalPause)return;e.preventDefault();e.currentTarget.focus({preventScroll:true});drop();}}>
 <svg viewBox={`0 0 360 ${sceneHeight}`} preserveAspectRatio="xMidYMax meet" aria-hidden="true"><SkylineScene game={game} id={id} reduced={reduced} height={sceneHeight}/></svg>
 <div key={floors} className={'skyline-feedback'+(top.perfect?' perfect':'')+(top.reinforced?' gold':'')} role="status" aria-live="polite">{!overlay&&(game.phase==='settling'||game.phase==='moving')&&floors>0?game.message:''}{!overlay&&top.reinforced&&<small>{top.width>(game.floors.at(-2)?.width??top.width)?`+${Math.round((top.width-(game.floors.at(-2)?.width??top.width))/FOUNDATION*100)}% WIDTH · KEEP CLIMBING`:'PERFECT STREAK · FULL WIDTH'}</small>}</div>
 <div className="skyline-width"><i style={{width:`${top.width/FOUNDATION*100}%`}}/><span>{Math.round(top.width/FOUNDATION*100)}% width</span></div>
 {!overlay&&<div className="skyline-tap-hint">{floors===0?'Tap to drop':'Three perfects. A second chance.'}</div>}
 {overlay&&!externalPause&&<div className="skyline-overlay"><div className="skyline-overlay-card"><span className="eyebrow">{help?'ONE TAP. ONE MORE FLOOR.':stale?'ANOTHER TAB IS PLAYING':paused?'TAKE A BREATH':over?'RUN COMPLETE':'THE CITY IS YOURS'}</span><h2>{help?'Build your comeback.':stale?'Your tower moved.':paused?'Tower on hold.':over?`${floors} ${floors===1?'floor':'floors'}.`:'One floor higher.'}</h2><p>{help?'Tap the playfield or press Space to drop. Overhang breaks off, and the next floor inherits the width you keep.':stale?'Reload the saved run to continue from the latest landing.':paused?'Your next landing can wait.':over?`${game.perfects} perfect drops`:'Three perfect landings restore a little width. There’s always room for a comeback.'}</p>
 {over&&!help&&!paused&&!stale&&<><div className="skyline-final-stats"><div><small>PERSONAL BEST</small><b>{best.floors} {best.floors===1?'floor':'floors'}</b><span>{best.perfects} perfects</span></div><div><small>TOP 10</small><b>{auto.rank?`#${auto.rank}`:!meta.id?'Practice':auto.state==='saved'?'—':'Checking…'}</b><span>{auto.rank?'Placement earned':'Floors first · perfects break ties'}</span></div></div></>}
 {help?<><p>Three perfects in a row extend gold braces and restore 12% of the original width. An imperfect landing resets the streak. Less than 8% width ends the run.</p><p>Top 10 ranks floors first, then perfect drops. Finished runs publish automatically, with one name correction for that entry.</p><button className="primary" onClick={()=>setHelp(false)}>Back to tower</button></>:stale?<button className="primary" onClick={()=>window.location.reload()}>Reload saved run</button>:paused?<button className="primary" onClick={()=>{audio.current?.unlock();previous.current=0;setPaused(false);arena.current?.focus({preventScroll:true});}}><Play size={17}/>Resume</button>:<button className="primary" disabled={!ready||busy} onClick={()=>void start()}><Play size={17}/>{busy?'Preparing…':over?'Play again':'Start climbing'}</button>}
 {over&&!help&&!paused&&!stale&&<><button className="text-btn skyline-result-leaderboard" onClick={()=>leave(onScores)}><Trophy size={14}/>View Top 10</button><AutoScoreStatus finished state={auto.state} rank={auto.rank} needsName={auto.needsName} online={!!meta.id} onProfile={onEditProfile} onConfirm={auto.openConfirmation} onRetry={auto.retry}/></>}
 </div></div>}
 </div><p className="skyline-caption">{game.phase==='ready'?'One ranked mode · Floors first, perfects break ties':meta.id?'Ranked run · Progress saves on this phone':'Offline practice · Personal best saves on this phone'}</p>{notice&&<p className="skyline-notice" role="status">{notice}</p>}{(saveError||auto.storageError)&&<p className="skyline-notice" role="status">This browser could not save all progress. Keep this tab open until your score finishes saving.</p>}
 <FinalScoreConfirmation offer={auto.confirmation} open={auto.confirmationOpen&&over&&!externalPause&&!help&&!stale} gameName="Skyline" scoreLabel={floors===1?'floor':'floors'} detail={`${game.perfects} perfect drops`} defaultName={profile?.name||'Player'} onPublish={auto.confirm} onClose={auto.closeConfirmation}/>
 </section>;
}
