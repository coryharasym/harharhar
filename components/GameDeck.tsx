'use client';
import {Children,isValidElement,useEffect,useRef,useState,type ReactNode,type PointerEvent,type TransitionEvent} from 'react';
import {ChevronLeft,ChevronRight,Shuffle} from 'lucide-react';
import {DeckSwipe,cycleDeck} from '../lib/deck-swipe';
type CardProps={'data-game'?:string;'data-title'?:string};
export function GameDeck({children}:{children:ReactNode}){
 const cards=Children.toArray(children).filter(isValidElement<CardProps>).map((content,i)=>({id:content.props['data-game']||String(i),title:content.props['data-title']||`Game ${i+1}`,content}));
 const [order,setOrder]=useState<string[]>([]),[ready,setReady]=useState(false),[height,setHeight]=useState(0),[dragging,setDragging]=useState(false),[settling,setSettling]=useState(false),[recycled,setRecycled]=useState<string|null>(null);
 const root=useRef<HTMLDivElement>(null),gesture=useRef(new DeckSwipe()),busy=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),frame=useRef(0),resetFrame=useRef(0),drag=useRef(0),suppressClick=useRef(0),pending=useRef<{next:string[];old:string}|null>(null);
 const ids=cards.map(c=>c.id),signature=ids.join('|'),sequence=[...order.filter(id=>ids.includes(id)),...ids.filter(id=>!order.includes(id))],front=sequence[0];
 const current=useRef({sequence,ids,order});current.current={sequence,ids,order};
 function paint(x:number){root.current?.style.setProperty('--deck-x',`${x}px`);root.current?.style.setProperty('--deck-rotation',`${x/50}deg`);}
 function reset(){gesture.current.cancel();cancelAnimationFrame(frame.current);frame.current=0;drag.current=0;paint(0);setDragging(false);}
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('hhh-game-deck-v1')||'[]');if(Array.isArray(saved)&&saved.every(id=>typeof id==='string'))setOrder([...new Set(saved)]);}catch{}setReady(true);return()=>{if(timer.current)clearTimeout(timer.current);cancelAnimationFrame(frame.current);cancelAnimationFrame(resetFrame.current);};},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem('hhh-game-deck-v1',JSON.stringify(order));}catch{}},[ready,order]);
 useEffect(()=>{cancelAnimationFrame(resetFrame.current);reset();busy.current=false;pending.current=null;setSettling(false);setRecycled(null);if(timer.current)clearTimeout(timer.current);
  // Size to the tallest actual card, so cycling never jumps the page under a finger.
  const panels=Array.from(root.current?.querySelectorAll<HTMLElement>('.deck-pane > article')||[]);const measure=()=>setHeight(Math.max(0,...panels.map(panel=>panel.offsetHeight)));measure();
  if(typeof ResizeObserver==='undefined'){window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure);}const observer=new ResizeObserver(measure);panels.forEach(panel=>observer.observe(panel));return()=>observer.disconnect();
 },[signature]);
 function finish(){const change=pending.current;if(!change)return;pending.current=null;if(timer.current)clearTimeout(timer.current);cancelAnimationFrame(frame.current);frame.current=0;setRecycled(change.old);paint(0);setDragging(false);setSettling(false);const {ids,order}=current.current;setOrder([...change.next.filter(id=>ids.includes(id)),...order.filter(id=>!ids.includes(id))]);
  // Rebase the outgoing card behind the deck without animating it across the new front.
  resetFrame.current=requestAnimationFrame(()=>{resetFrame.current=requestAnimationFrame(()=>{setRecycled(null);busy.current=false;});});
 }
 function arrange(next:string[],direction=1){if(busy.current||next[0]===front)return;busy.current=true;gesture.current.cancel();cancelAnimationFrame(frame.current);frame.current=0;setDragging(false);setSettling(true);pending.current={next,old:front};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced){finish();return;}
  // Commit the exit first; reorder only after that transform has completed.
  paint(drag.current);frame.current=requestAnimationFrame(()=>{frame.current=requestAnimationFrame(()=>{paint((direction>0?-1:1)*((root.current?.clientWidth||400)+70));});});timer.current=setTimeout(finish,300);
 }
 function cycle(direction:number){if(sequence.length>1)arrange(cycleDeck(sequence,direction),direction);}
 function shuffle(){if(sequence.length<2||busy.current)return;const next=[...sequence];for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]];}if(next[0]===front)next.push(next.shift()!);arrange(next);}
 function down(e:PointerEvent<HTMLDivElement>){if(busy.current||sequence.length<2||(e.pointerType==='mouse'&&e.button!==0)||(e.target as HTMLElement).closest('button,a,input,select,textarea'))return;gesture.current.begin(e.pointerId,e.clientX,e.clientY);}
 function move(e:PointerEvent<HTMLDivElement>){const dx=gesture.current.move(e.pointerId,e.clientX,e.clientY);if(dx===null)return;if(!e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.setPointerCapture(e.pointerId);setDragging(true);drag.current=Math.max(-(e.currentTarget.clientWidth*.85),Math.min(e.currentTarget.clientWidth*.85,dx));if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;paint(drag.current);});}
 function up(e:PointerEvent<HTMLDivElement>){const result=gesture.current.end(e.pointerId,e.clientX,e.currentTarget.clientWidth);if(!result)return;if(result.swiped)suppressClick.current=performance.now()+400;if(result.direction)cycle(result.direction);else reset();}
 function cancel(e:PointerEvent<HTMLDivElement>){if(gesture.current.cancel(e.pointerId))reset();}
 function transitioned(e:TransitionEvent<HTMLDivElement>){if(e.target===e.currentTarget&&e.propertyName==='transform'&&pending.current?.old===e.currentTarget.dataset.gameId)finish();}
 if(!cards.length)return null;
 return <section className={'game-deck'+(dragging?' deck-dragging':'')+(settling?' deck-settling':'')} role="region" aria-roledescription="carousel" aria-label="Game card deck" tabIndex={0} onClickCapture={e=>{if(root.current?.contains(e.target as Node)&&performance.now()<suppressClick.current){e.preventDefault();e.stopPropagation();}}} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();cycle(e.key==='ArrowRight'?1:-1);}}}>
 <div className="deck-stack" ref={root} style={height?{height:height+(cards.length>1?17:0)}:undefined} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={cancel}>{cards.map(card=>{const position=sequence.indexOf(card.id),active=position===0;return <div key={card.id} className={'deck-pane '+(active?'deck-front':'deck-back')+(recycled===card.id?' deck-recycled':'')} data-game-id={card.id} data-deck-active={String(active)} onTransitionEnd={transitioned} role="group" aria-roledescription="card" aria-label={card.title} aria-hidden={!active} inert={!active||settling?true:undefined} style={{zIndex:cards.length-position,transform:active?'translate3d(var(--deck-x,0px),0,0) rotate(var(--deck-rotation,0deg))':`translate3d(${Math.min(position,2)*5}px,${Math.min(position,2)*13}px,0) scale(${1-Math.min(position,2)*.035})`}}>{card.content}</div>;})}</div>
 {cards.length>1&&<><div className="deck-controls"><div className="deck-arrows"><button disabled={settling} className="icon-button" aria-label="Previous game card" onClick={()=>cycle(-1)}><ChevronLeft size={20}/></button><button disabled={settling} className="icon-button" aria-label="Next game card" onClick={()=>cycle(1)}><ChevronRight size={20}/></button></div><div className="deck-current"><span aria-live="polite" aria-atomic="true">{cards.find(c=>c.id===front)?.title}</span><div className="deck-dots" aria-label="Choose a game card">{cards.map(card=><button disabled={settling} key={card.id} aria-label={'Show '+card.title+' card'} aria-pressed={card.id===front} onClick={()=>arrange([card.id,...sequence.filter(id=>id!==card.id)])}><i/></button>)}</div></div><button disabled={settling} className="deck-shuffle" onClick={shuffle}><Shuffle size={15}/>Shuffle</button></div><p className="deck-hint">Swipe through the deck, or shuffle your next pick.</p></>}
 </section>;
}
