export type SkylineSound='land'|'perfect'|'reinforce'|'miss';
/** Original, short procedural effects. Audio starts only after a player gesture. */
export class SkylineAudio{
 private context:AudioContext|null=null;
 private voices=new Set<{source:OscillatorNode;gain:GainNode}>();
 private enabled=false;
 setEnabled(enabled:boolean){this.enabled=enabled;if(!enabled)this.silence();}
 unlock(){if(!this.enabled)return;try{const Constructor=globalThis.AudioContext||(globalThis as typeof globalThis&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Constructor)return;const c=this.context??=new Constructor();if(c.state==='suspended')void c.resume().catch(()=>{});}catch{}}
 private tone(hz:number,delay:number,duration:number,volume:number,type:OscillatorType='sine',endHz=hz){
  const c=this.context;if(!c||c.state!=='running'||this.voices.size>=16)return;
  const at=c.currentTime+delay,source=c.createOscillator(),gain=c.createGain();source.type=type;source.frequency.setValueAtTime(hz,at);source.frequency.exponentialRampToValueAtTime(endHz,at+duration);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.006);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  source.connect(gain);gain.connect(c.destination);const voice={source,gain};this.voices.add(voice);source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);};source.start(at);source.stop(at+duration+.01);
 }
 play(kind:SkylineSound){if(!this.enabled)return;try{
  if(kind==='miss'){this.tone(170,0,.25,.045,'triangle',58);this.tone(90,.025,.3,.035);return;}
  this.tone(210,0,.085,.045,'triangle',80);this.tone(95,.006,.1,.04);
  if(kind==='perfect'||kind==='reinforce'){this.tone(659.25,.015,.23,.035);this.tone(987.77,.045,.24,.021);}
  if(kind==='reinforce'){[659.25,830.61,987.77,1318.51].forEach((hz,i)=>this.tone(hz,.07+i*.065,.35,.025));}
 }catch{/* Audio never blocks gameplay. */}}
 silence(){for(const v of this.voices){try{v.source.stop();v.source.disconnect();v.gain.disconnect();}catch{}}this.voices.clear();if(this.context?.state==='running')void this.context.suspend().catch(()=>{});}
 dispose(){this.silence();if(this.context)void this.context.close().catch(()=>{});this.context=null;}
}
