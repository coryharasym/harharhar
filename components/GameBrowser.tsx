'use client';
import {Children,isValidElement,useEffect,useState,type ReactNode,type ReactElement,type HTMLAttributes,type ButtonHTMLAttributes} from 'react';
import {Grid2X2,Layers} from 'lucide-react';
import {GameDeck} from './GameDeck';
import './game-browser.css';

type NodeProps=HTMLAttributes<HTMLElement>&{'data-game'?:string;'data-title'?:string;children?:ReactNode};
const elements=(children:ReactNode)=>Children.toArray(children).filter(isValidElement<NodeProps>);
const hasClass=(node:ReactElement<NodeProps>,name:string)=>node.props.className?.split(' ').includes(name);


function coverTitle(id?:string,title?:string):ReactNode{
 switch(id){
  case '2048':return <>2048<span>.</span></>;
  case 'blocks':return <>Block<span>Flux</span></>;
  case 'tunnel':return <>Neon<span>Dodger</span></>;
  case 'maple':return <>Maple<span>Merge</span></>;
  case 'threes':return <><b>T</b><em>H</em>REES<span>.</span></>;
  case 'skyline':return <><b>Sky</b>line<span>.</span></>;
  case 'dots':return <>D<span>O</span>TS<b>!</b></>;
  case 'gridlock':return <>GRID<span>LOCK</span></>;
  case 'river':return <>River<span>Shift</span></>;
  default:return title;
 }
}

export function GameBrowser({children}:{children:ReactNode}){
 const [view,setView]=useState<'deck'|'grid'>('deck');
 useEffect(()=>{try{if(localStorage.getItem('hhh-game-view-v1')==='grid')setView('grid');}catch{}},[]);
 function changeView(next:'deck'|'grid'){setView(next);try{localStorage.setItem('hhh-game-view-v1',next);}catch{}}
 const cards=elements(children);
 return <div className="game-browser">
  <div className="game-browser-toolbar"><span>{cards.length} {cards.length===1?'game':'games'}</span><div className="game-view-toggle" role="group" aria-label="Game display"><button aria-pressed={view==='deck'} aria-controls="game-browser-content" onClick={()=>changeView('deck')}><Layers size={16}/>Deck</button><button aria-pressed={view==='grid'} aria-controls="game-browser-content" onClick={()=>changeView('grid')}><Grid2X2 size={16}/>Grid</button></div></div>
  <div id="game-browser-content">{view==='deck'?<GameDeck>{children}</GameDeck>:<div className="game-card-grid" role="list" aria-label="Games">{cards.map(card=>{
   const parts=elements(card.props.children),copy=parts.find(part=>hasClass(part,'feature-copy')||hasClass(part,'block-feature-copy'));
   const play=elements(copy?.props.children).find(part=>hasClass(part,'play-button')) as ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>|undefined;
   const favourite=parts.find(part=>hasClass(part,'fav-btn'));
   return <article key={card.props['data-game']} role="listitem" className="compact-game" data-game={card.props['data-game']}>
    <button className="compact-game-launch" onClick={play?.props.onClick} disabled={!play||play.props.disabled} aria-label={'Play '+card.props['data-title']}><div className="cover-art" aria-hidden="true">{card.props['data-game']==='2048'&&<span className="cover-number">2048</span>}{card.props['data-game']==='threes'&&<><span className="cover-number">3</span><span className="cover-number small-one">1</span><span className="cover-number small-two">2</span></>}</div><div className="cover-shade" aria-hidden="true"/><div className="compact-game-caption"><h3 className="cover-title" aria-label={card.props['data-title']}>{coverTitle(card.props['data-game'],card.props['data-title'])}</h3></div></button>
    {favourite}
   </article>;
  })}</div>}</div>
 </div>;
}
