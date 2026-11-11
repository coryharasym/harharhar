export const THREES_SOUND_KEY='harharhar.threes.sound.v1';
export type ThreesSound='swipe'|'merge'|'blocked';
/** Short, original Web Audio effects. No context, downloads or autoplay on mount. */
export class ThreesAudio{
 private context:AudioContext|null=null;
 private voices=new Set<{source:AudioScheduledSourceNode;gain:GainNode}>();
 private enabled=true;private disposed=false;
 private factory:()=>AudioContext;
 constructor(factory:()=>AudioContext=()=>{const Constructor=globalThis.AudioContext||(globalThis as typeof globalThis&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Constructor)throw Error('Audio unavailable');return new Constructor();}){this.factory=factory;}
 setEnabled(value:boolean){this.enabled=value;if(!value)this.silence();}
 private tone(hz:number,at:number,duration:number,volume:number,endHz=hz,type:OscillatorType='sine'){
  const c=this.context!;const source=c.createOscillator(),gain=c.createGain();source.type=type;
  source.frequency.setValueAtTime(hz,at);source.frequency.exponentialRampToValueAtTime(endHz,at+duration);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  source.connect(gain);gain.connect(c.destination);this.track(source,gain,at,duration);
 }
 private track(source:AudioScheduledSourceNode,gain:GainNode,at:number,duration:number){
  while(this.voices.size>=12){const voice=this.voices.values().next().value!;this.stop(voice);}
  const voice={source,gain};this.voices.add(voice);source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);};source.start(at);source.stop(at+duration+.015);
 }
 private stop(voice:{source:AudioScheduledSourceNode;gain:GainNode}){try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();this.voices.delete(voice);}
 play(kind:ThreesSound,highest=3,merges=1){
  if(this.disposed||!this.enabled)return;
  try{
   const c=this.context??=this.factory();if(c.state==='closed')return;
   // Resume directly inside the input handler, including on iPhone Safari.
   if(c.state!=='running'){for(const voice of [...this.voices])this.stop(voice);void c.resume().catch(()=>this.silence());}
   const at=c.currentTime;
   if(kind==='blocked'){this.tone(145,at,.065,.026,105,'triangle');return;}
   // A warm sliding tick, with no harsh high-frequency hiss.
   this.tone(280,at,.065,.035,105,'triangle');this.tone(620,at+.008,.055,.012,280);
   if(kind==='merge'){
    const octave=Math.min(5,Math.max(0,Math.log2(Math.max(3,highest)/3))),pitch=440*2**(octave/12);
    this.tone(pitch,at+.025,.19,.045);this.tone(pitch*1.5,at+.055,.22,.027);
    if(merges>1)this.tone(pitch*2,at+.085,.22,.019);
   }
  }catch{/* Denied/unsupported audio must never interrupt a move. */}
 }
 silence(){for(const voice of [...this.voices])this.stop(voice);if(this.context&&this.context.state!=='closed')void this.context.suspend().catch(()=>{});}
 dispose(){if(this.disposed)return;this.disposed=true;this.silence();if(this.context)void this.context.close().catch(()=>{});this.context=null;}
}
