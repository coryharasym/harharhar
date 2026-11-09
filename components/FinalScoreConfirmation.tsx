'use client';
import {useEffect,useState} from 'react';
import {Trophy,Check} from 'lucide-react';
import {GameDialog} from './GameDialog';
import type {ScoreOffer} from '../hooks/use-score-offer';
export function FinalScoreConfirmation({offer,open,gameName,defaultName,onPublish,onClose}:{offer:ScoreOffer|null;open:boolean;gameName:string;defaultName:string;onPublish:(name:string)=>Promise<boolean>;onClose:()=>void}){
 const [name,setName]=useState(defaultName),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setName(defaultName);setError('');setBusy(false);},[offer?.id]);
 if(!offer||!open)return null;
 return <GameDialog title="You made the Top 10!" onClose={onClose} busy={busy}><form className="final-score-confirmation" onSubmit={async e=>{e.preventDefault();const value=name.trim();if(!value||value.length>18||/[<>\x00-\x1f]/.test(value)){setError('Enter a player name with 1–18 characters.');return;}setBusy(true);setError('');const saved=await onPublish(value);if(!saved)setError('Your score has not been published. Try again.');setBusy(false);}}><div className="final-score-summary"><Trophy size={24}/><span>{gameName}<b>{offer.score.toLocaleString()} points</b><small>Qualifies for #{offer.rank} · final place may change</small></span></div><p>Who played this run? Confirm the name before publishing.</p><label>Player name<input data-dialog-autofocus autoFocus autoComplete="off" maxLength={18} required value={name} disabled={busy} onChange={e=>setName(e.target.value)} placeholder="Enter player name"/></label><small>This name is for this score. Your device profile and earlier entries stay the same.</small>{error&&<p className="final-score-error" role="alert">{error}</p>}<button className="primary" type="submit" disabled={busy}><Check size={16}/>{busy?'Publishing…':'Publish score'}</button></form></GameDialog>;
}
