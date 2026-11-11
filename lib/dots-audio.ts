/** Original, quiet synth notes; created only from a player interaction. */
export class DotsAudio{
 private context:AudioContext|null=null;
 private voices=new Set<OscillatorNode>();
 enabled=true;
 play(length=1,loop=false){if(!this.enabled)return;try{const c=this.context??=new AudioContext();void c.resume().catch(()=>{});const notes=loop?[523.25,659.25,783.99]:[261.63*2**(Math.min(length,18)/12)];for(const [i,hz] of notes.entries()){if(this.voices.size>=12)break;const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+i*.035;o.frequency.value=hz;o.type='sine';g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.connect(g);g.connect(c.destination);this.voices.add(o);o.onended=()=>{o.disconnect();g.disconnect();this.voices.delete(o);};o.start(t);o.stop(t+.2);}}catch{}}
 silence(){for(const o of this.voices)try{o.stop();}catch{}this.voices.clear();}
 dispose(){this.silence();if(this.context)void this.context.close().catch(()=>{});}
}
