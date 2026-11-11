'use client';
import {useCallback, useEffect, useRef, useState, type CSSProperties} from 'react';
import {ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RotateCcw, Volume2, VolumeX} from 'lucide-react';
import {ended,score,type Direction,type Motion} from '../lib/threes';
import {newThreesRun,playThrees,type ThreesRun} from '../lib/threes-session';
import {THREES_SAVE_KEY,THREES_BEST_KEY,decodeThreesSave,encodeThreesSave,readThreesBest} from '../lib/threes-save';
import {apiUrl} from '../lib/api';
import type {PlayerProfile} from '../lib/profile';
import {useAutoLeaderboard} from '../hooks/use-auto-leaderboard';
import {AutoScoreStatus} from './AutoScoreStatus';
import {FinalScoreConfirmation} from './FinalScoreConfirmation';
import {ThreesAudio,THREES_SOUND_KEY} from '../lib/threes-audio';
import {GameDialog} from './GameDialog';
import {ThreesTileFace,threesTone as tone} from './ThreesTileFace';
const arrows = [['L', ArrowLeft, 'left'], ['U', ArrowUp, 'up'], ['D', ArrowDown, 'down'], ['R', ArrowRight, 'right']] as const;
function position(index: number): CSSProperties {return {'--col': index % 4, '--row': Math.floor(index / 4)} as CSSProperties;}
async function createRun():Promise<ThreesRun>{
  try{const response=await fetch(apiUrl('/api/runs'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'threes'}),signal:AbortSignal.timeout(10000)});const data=await response.json() as {id?:unknown;seed?:unknown;game?:unknown};if(!response.ok||typeof data.id!=='string'||typeof data.seed!=='number'||!Number.isInteger(data.seed)||data.seed<0||data.seed>0xffffffff||data.game!=='threes')throw Error();return newThreesRun(data.seed,data.id);}catch{return newThreesRun(crypto.getRandomValues(new Uint32Array(1))[0]);}
}
export default function Threes({onBack,onScores,onEditProfile,profile,paused=false}: {onBack:()=>void;onScores:()=>void;onEditProfile:()=>void;profile:PlayerProfile|null;paused?:boolean}) {
  const [run,setRun]=useState<ThreesRun|null>(null),[best,setBest]=useState(0),[busy,setBusy]=useState(true),[notice,setNotice]=useState(''),[stale,setStale]=useState(false);
  const [feedback,setFeedback]=useState<{ghosts:Motion[];merged:number[];incoming:number;direction:Direction;gain:number}>({ghosts:[],merged:[],incoming:-1,direction:'L',gain:0});
  const [sound,setSound]=useState(true);const audio=useRef<ThreesAudio|null>(null);
  const [invalid,setInvalid]=useState(false),[confirm,setConfirm]=useState(false);
  const current=useRef<ThreesRun|null>(null),locked=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),revision=useRef<string|null>(null);
  const gesture=useRef<{id:number;x:number;y:number}|null>(null),board=useRef<HTMLDivElement>(null),bestRef=useRef(0),mounted=useRef(true);
  const game=run?.game,over=!!game&&ended(game.board),total=game?score(game.board):0;
  const auto=useAutoLeaderboard({game:'threes',id:run?.id||null,score:total,moves:run?.history||'',profile,finished:over,enabled:!!run&&!paused&&!stale});
  useEffect(()=>{const player=new ThreesAudio();audio.current=player;let enabled=true;try{enabled=localStorage.getItem(THREES_SOUND_KEY)!=='false';}catch{}setSound(enabled);player.setEnabled(enabled);const hidden=()=>{if(document.hidden)player.silence();};document.addEventListener('visibilitychange',hidden);return()=>{document.removeEventListener('visibilitychange',hidden);player.dispose();audio.current=null;};},[]);
  useEffect(()=>{if(paused||stale||confirm||auto.confirmationOpen)audio.current?.silence();},[paused,stale,confirm,auto.confirmationOpen]);
  function toggleSound(){const enabled=!sound;setSound(enabled);audio.current?.setEnabled(enabled);try{localStorage.setItem(THREES_SOUND_KEY,String(enabled));}catch{}if(enabled&&!paused&&!stale&&!confirm&&!document.hidden)audio.current?.play('swipe');}
  const persist=useCallback((next:ThreesRun,replace=false)=>{
    try{
      const existing=localStorage.getItem(THREES_SAVE_KEY);
      if(!replace&&((existing===null&&revision.current!==null)||(existing&&decodeThreesSave(existing)?.revision!==revision.current))){setStale(true);return false;}
      const raw=encodeThreesSave(next);if(!raw)throw Error();localStorage.setItem(THREES_SAVE_KEY,raw);revision.current=JSON.parse(raw).revision;
      const high=Math.max(bestRef.current,readThreesBest(localStorage),score(next.game.board));bestRef.current=high;setBest(high);localStorage.setItem(THREES_BEST_KEY,String(high));
      return true;
    }catch{setNotice('This browser could not save progress. Keep this tab open to continue.');return true;}
  },[]);
  useEffect(()=>{
    mounted.current=true;
    const load=async()=>{
      let saved:ReturnType<typeof decodeThreesSave>=null;
      try{bestRef.current=readThreesBest(localStorage);setBest(bestRef.current);const raw=localStorage.getItem(THREES_SAVE_KEY);if(raw){saved=decodeThreesSave(raw);if(!saved)setNotice('The saved game could not be read. A fresh board is ready.');}}catch{setNotice('Saved games are unavailable in this browser. You can still play.');}
      const next=saved?.run||await createRun();if(!mounted.current)return;
      if(saved)revision.current=saved.revision;
      current.current=next;setRun(next);persist(next,!saved);setBusy(false);
    };void load();
    const changed=(event:StorageEvent)=>{if(event.key===null||event.key===THREES_SAVE_KEY){if(event.newValue===null||decodeThreesSave(event.newValue)?.revision!==revision.current)setStale(true);}if(event.key===THREES_BEST_KEY){bestRef.current=Math.max(bestRef.current,readThreesBest(localStorage));setBest(bestRef.current);}};
    window.addEventListener('storage',changed);
    return()=>{mounted.current=false;if(timer.current)clearTimeout(timer.current);window.removeEventListener('storage',changed);};
  },[persist]);
  useEffect(()=>{gesture.current=null;},[paused,stale,confirm]);
  const play=useCallback((direction:Direction)=>{
    const before=current.current;
    if(document.hidden||!before||locked.current||busy||confirm||paused||stale||auto.confirmationOpen||ended(before.game.board))return;
    // Check the saved revision before accepting a move from a possibly stale tab.
    try{const raw=localStorage.getItem(THREES_SAVE_KEY);if((raw===null&&revision.current!==null)||(raw&&decodeThreesSave(raw)?.revision!==revision.current)){setStale(true);return;}}catch{}
    const result=playThrees(before,direction);locked.current=true;
    if(result.run===before){setInvalid(true);audio.current?.play('blocked');}
    else if(persist(result.run)){audio.current?.play(result.merged.length?'merge':'swipe',Math.max(3,...result.run.game.board.filter(t=>t&&result.merged.includes(t.id)).map(t=>t!.value)),result.merged.length);current.current=result.run;setRun(result.run);setFeedback({ghosts:result.motions.filter(m=>m.consumed),merged:result.merged,incoming:before.game.serial,direction,gain:score(result.run.game.board)-score(before.game.board)});}
    timer.current=setTimeout(()=>{locked.current=false;setInvalid(false);setFeedback(f=>({...f,ghosts:[],merged:[],incoming:-1,gain:0}));},190);
  },[busy,confirm,paused,stale,auto.confirmationOpen,persist]);
  useEffect(()=>{
    const keys:Record<string,Direction>={ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D'};
    const handler=(event:KeyboardEvent)=>{if(confirm||paused||stale||auto.confirmationOpen||event.altKey||event.ctrlKey||event.metaKey||(event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable="true"]')))return;if(keys[event.key]){event.preventDefault();play(keys[event.key]);}};
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[play,confirm,paused,stale,auto.confirmationOpen]);
  async function leave(action:()=>void){if(busy)return;if(over&&run?.id&&!stale){setBusy(true);const ok=await auto.flush();setBusy(false);if(!ok){setNotice('Your final score is saved on this phone. Retry syncing before leaving or starting again.');return;}}action();}
  async function reset(){
    if(busy)return;
    if(over&&run?.id&&!stale){setBusy(true);const ok=await auto.flush();setBusy(false);if(!ok){setNotice('Your final score is saved on this phone. Retry syncing before starting again.');return;}}
    setBusy(true);const next=await createRun();if(!mounted.current)return;
    if(timer.current)clearTimeout(timer.current);locked.current=false;gesture.current=null;setInvalid(false);
    setFeedback({ghosts:[],merged:[],incoming:-1,direction:'L',gain:0});current.current=next;setRun(next);setStale(false);setNotice('');persist(next,true);setConfirm(false);setBusy(false);
  }
  function loadLatest(){try{const raw=localStorage.getItem(THREES_SAVE_KEY),saved=raw?decodeThreesSave(raw):null;if(!saved){setNotice('The latest saved board is unavailable. Start a new game to continue.');return;}if(timer.current)clearTimeout(timer.current);locked.current=false;gesture.current=null;setInvalid(false);setFeedback({ghosts:[],merged:[],incoming:-1,direction:'L',gain:0});current.current=saved.run;revision.current=saved.revision;setRun(saved.run);bestRef.current=Math.max(bestRef.current,readThreesBest(localStorage),score(saved.run.game.board));setBest(bestRef.current);setStale(false);setNotice('');}catch{setNotice('The saved board could not be opened.');}}
  if(!game||!run)return <div className="threes-shell">Opening your saved game…</div>;
  const highest=Math.max(...game.board.map(t=>t?.value||0));
  return <section className="threes-shell min-h-screen" aria-label="Threes game">
    <div className="threes-top"><button disabled={busy} onClick={()=>void leave(onBack)}><ArrowLeft size={17}/>Back to games</button><span>HARHARHAR / THREES</span></div>
    <div className="threes-layout">
      <div className="threes-main">
        <header className="threes-heading"><div><p className="threes-kicker">A LITTLE ADDITION. A LOT OF POSSIBILITY.</p><h1><span>T</span><span>H</span>REES<span className="threes-dot">.</span></h1><p>Good things come in threes.</p></div><div className="threes-header-actions"><button className="threes-reset" aria-label={sound?'Mute Threes sounds':'Enable Threes sounds'} aria-pressed={sound} onClick={toggleSound}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button><button className="threes-reset" aria-label="New game" disabled={busy} onClick={()=>game.moves&&!over?setConfirm(true):void reset()}><RotateCcw size={20}/></button></div></header>
        <div className="threes-stats grid grid-cols-3 gap-3"><div><span>SCORE</span><strong aria-live="polite" aria-atomic="true">{total.toLocaleString()}</strong>{feedback.gain > 0 && <small key={game.moves}>+{Math.round(feedback.gain)}</small>}</div><div><span>HIGH SCORE</span><strong>{best.toLocaleString()}</strong></div><div><span>BIGGEST TILE</span><strong>{highest.toLocaleString()}</strong></div></div>
        <div className="threes-preview"><div><span className="threes-kicker">UP NEXT</span><p>A little look ahead.</p></div><div className={'threes-next threes-'+tone(game.next)} aria-label={'Next tile: '+game.next}>{game.next}<i/></div></div>
        <div className="threes-board-wrap"><div className={'threes-board'+(invalid?' threes-invalid':'')} ref={board} tabIndex={0} role="group" aria-label="Threes board. Swipe or use arrow keys. Each swipe moves tiles one square."
          onPointerDown={e => {if (gesture.current || (e.pointerType === 'mouse' && e.button !== 0)) return; gesture.current = {id:e.pointerId,x:e.clientX,y:e.clientY}; e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerUp={e => {const g = gesture.current; if (!g || g.id !== e.pointerId) return; gesture.current = null; const dx=e.clientX-g.x,dy=e.clientY-g.y; if (Math.max(Math.abs(dx),Math.abs(dy)) < 20) return; play(Math.abs(dx)>Math.abs(dy)?dx>0?'R':'L':dy>0?'D':'U');}}
          onPointerCancel={e => {if (gesture.current?.id === e.pointerId) gesture.current=null;}}
          onLostPointerCapture={e => {if (gesture.current?.id === e.pointerId) gesture.current=null;}}>
          <div className="threes-cells" aria-hidden="true">{Array.from({length:16},(_,i)=><div key={i}/>)}</div>
          {game.board.map((tile,index)=>tile && <div key={tile.id} className={'threes-piece'+(feedback.incoming===tile.id?' threes-enter threes-from-'+feedback.direction:'')} style={position(index)} aria-label={`Row ${Math.floor(index/4)+1}, column ${index%4+1}: ${tile.value}`}><ThreesTileFace value={tile.value} className={feedback.merged.includes(tile.id)?'threes-pop':''}/></div>)}
          {feedback.ghosts.map(m=><div key={'ghost'+m.tile.id} aria-hidden="true" className="threes-piece threes-ghost" style={{...position(m.to),'--dx':(m.from%4-m.to%4),'--dy':(Math.floor(m.from/4)-Math.floor(m.to/4))} as CSSProperties}><div className={'threes-face threes-'+tone(m.tile.value)}>{m.tile.value}</div></div>)}
        </div>
        {over&&<div className="threes-results" role="region" aria-label="Game over"><span className="threes-kicker">GAME OVER</span><h2>A lovely little run.</h2><strong>{total.toLocaleString()}</strong><p>Final score · {game.moves} moves</p><p>High score: <b>{best.toLocaleString()}</b></p><button disabled={busy||stale} onClick={()=>void reset()}>{busy?'Starting…':'Play again'} <ArrowRight size={16}/></button><button className="threes-results-secondary" disabled={busy} onClick={()=>void leave(onScores)}>View Top 10</button></div>}
        </div>
        <p className="threes-caption" role="status">{over?'No moves left. A fresh board awaits.':invalid?'That way is blocked. Try another direction.':'Swipe gently. Every move is just one square.'}</p>
        <div className="threes-controls flex justify-center gap-3" aria-label="Move tiles">{arrows.map(([d,Icon,label])=><button key={d} aria-label={'Move '+label} onClick={()=>play(d)} disabled={over||confirm||paused||stale||busy||auto.confirmationOpen}><Icon size={21}/></button>)}</div>
        <div className="threes-session-actions"><button onClick={()=>void leave(onScores)} disabled={busy}>Top 10 leaderboard <ArrowRight size={15}/></button><button onClick={onEditProfile} disabled={busy}>Player: {profile?.name||'Player'}</button></div>
        <AutoScoreStatus finished={over} state={auto.state} rank={auto.rank} needsName={auto.needsName} online={!!run.id} onProfile={onEditProfile} onConfirm={auto.openConfirmation} onRetry={auto.retry}/>
        <p className="threes-save-note">{run.id?'Progress saves on this phone · Final scores publish automatically':'Offline practice · Progress and high score save on this phone'}</p>
        {notice&&<p className="threes-warning" role="alert">{notice}</p>}
        {stale&&<div className="threes-warning" role="alert"><p>This game changed in another tab. Load its latest board to continue, or start fresh.</p><button onClick={loadLatest}>Load latest board</button><button onClick={()=>setConfirm(true)}>New game</button></div>}

      </div>
      <aside className="threes-guide"><span className="threes-kicker">SMALL RULES, BIG IDEAS</span><h2>Meet your<br/>new plus ones.</h2><div className="threes-equation"><b className="threes-one">1</b><span>+</span><b className="threes-two">2</b><span>=</span><b className="threes-cream">3</b></div><p><strong>One needs two.</strong> A 1 and a 2 make a 3. Two 1s or two 2s won’t combine.</p><div className="threes-equation"><b className="threes-cream">3</b><span>+</span><b className="threes-cream">3</b><span>=</span><b className="threes-cream">6</b></div><p><strong>Then find your match.</strong> From 3 onward, equal tiles join together: 6, 12, 24… how far can you go?</p><div className="threes-tip"><span>↳</span><p>Watch what’s next.<br/>The incoming tile enters from the edge opposite your swipe, in a row or column that moved.</p></div><details><summary>A little more about scoring</summary><p>1s and 2s are worth zero. A 3 is worth 3 points; a 6 is worth 9; a 12 is worth 27. Each doubling triples that tile’s points. Your score is the total value of every tile on the board.</p><p>New tiles come from shuffled bags of four 1s, four 2s, and four 3s.</p></details><div className="threes-lab"><span>ONE MORE LITTLE RIVALRY</span><p>Every finished game can earn its own Top 10 entry. Qualifying scores publish automatically. You can correct the player name for that entry once.</p><p>Your board and high score save on this browser. Clearing browser data removes local progress.</p></div></aside>
    </div>
    {confirm&&<GameDialog title="A fresh start?" onClose={()=>setConfirm(false)} busy={busy}><p>Starting again replaces this board and its {total.toLocaleString()} points. Only finished games publish scores.</p><button className="secondary" onClick={()=>setConfirm(false)} disabled={busy}>Keep playing</button><button className="primary" onClick={()=>void reset()} disabled={busy}>{busy?'Starting…':'Start a new game'}</button></GameDialog>}
    <FinalScoreConfirmation offer={auto.confirmation} open={auto.confirmationOpen&&!paused&&!confirm} gameName="Threes" defaultName={profile?.name||'Player'} onPublish={auto.confirm} onClose={auto.closeConfirmation}/>
  </section>;
}
