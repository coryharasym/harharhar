// One contact owns a swipe. Vertical intent stays a page scroll for its lifetime.
export class DeckSwipe {
 private contact:{id:number;x:number;y:number;axis:'pending'|'horizontal'|'vertical';dx:number}|null=null;
 get active(){return this.contact!==null;}
 begin(id:number,x:number,y:number){if(this.contact)return false;this.contact={id,x,y,axis:'pending',dx:0};return true;}
 move(id:number,x:number,y:number){const p=this.contact;if(!p||p.id!==id)return null;const dx=x-p.x,dy=y-p.y;if(p.axis==='pending'&&Math.max(Math.abs(dx),Math.abs(dy))>=10){if(Math.abs(dx)>Math.abs(dy)*1.25)p.axis='horizontal';else if(Math.abs(dy)>Math.abs(dx)*1.25)p.axis='vertical';}if(p.axis!=='horizontal')return null;p.dx=dx;return dx;}
 end(id:number,x:number,width:number){const p=this.contact;if(!p||p.id!==id)return null;this.contact=null;const swiped=p.axis==='horizontal';const dx=x-p.x,threshold=Math.max(48,Math.min(90,width*.16));return {swiped,direction:swiped&&Math.abs(dx)>=threshold?(dx<0?1:-1):0};}
 cancel(id?:number){if(!this.contact||(id!==undefined&&this.contact.id!==id))return false;this.contact=null;return true;}
}
export function cycleDeck(sequence:string[],direction:number){return sequence.length<2?sequence:direction>0?[...sequence.slice(1),sequence[0]]:[sequence.at(-1)!,...sequence.slice(0,-1)];}
