// Maple Merge physics v1: fixed 120 Hz, ordered contacts, no rendering/browser dependencies.
export const BOWL={width:360,height:550,left:22,right:338,floor:522,spawn:76,hz:120,gravity:1000,wallRestitution:.12,friction:.34,iterations:12,dropTicks:54};
export const PIECES=[
 {name:'Maple Seed',radius:13,color:'#dabb78'}, {name:'Acorn',radius:17,color:'#bd8af0'},
 {name:'Pinecone',radius:22,color:'#7ba2ee'}, {name:'Chipmunk',radius:28,color:'#e2a36f'},
 {name:'Squirrel',radius:35,color:'#e184a5'}, {name:'Snowshoe Hare',radius:43,color:'#b1c4ec'},
 {name:'Canada Goose',radius:52,color:'#66c8c5'}, {name:'Beaver',radius:62,color:'#b793ce'},
 {name:'Red Fox',radius:74,color:'#e39a70'}, {name:'Black Bear',radius:87,color:'#8b94cb'},
 {name:'Moose',radius:102,color:'#a9d9b7'},
] as const;
export type Ball={id:number;tier:number;x:number;y:number;vx:number;vy:number;born:number;px:number;py:number};
export type Merge={parents:[number,number];id:number;tier:number;x:number;y:number;tick:number};
export type MapleWorld={tick:number;nextId:number;rng:number;balls:Ball[];merges:number;drops:number;lastDrop:number;effects:Merge[]};
export type DropAction={tick:number;x:number;tier:number};
export const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
export function newWorld(seed=42):MapleWorld{return {tick:0,nextId:1,rng:seed>>>0,balls:[],merges:0,drops:0,lastDrop:-BOWL.dropTicks,effects:[]};}
export function validTier(tier:number){return Number.isInteger(tier)&&tier>=0&&tier<PIECES.length;}
export const spawnY=(tier:number)=>Math.max(BOWL.spawn,PIECES[tier].radius+35);
export function aimX(x:number,tier:number){const r=PIECES[tier].radius;return clamp(x,BOWL.left+r,BOWL.right-r);}
export function canDrop(world:MapleWorld,x:number,tier:number){if(!validTier(tier)||!Number.isFinite(x)||world.tick-world.lastDrop<BOWL.dropTicks)return false;x=aimX(x,tier);const r=PIECES[tier].radius;return world.balls.every(b=>Math.hypot(b.x-x,b.y-spawnY(tier))>=PIECES[b.tier].radius+r+1);}
export function drop(world:MapleWorld,x:number,tier:number){if(!canDrop(world,x,tier))return false;world.balls.push({id:world.nextId++,tier,x:aimX(x,tier),y:spawnY(tier),vx:0,vy:0,born:world.tick,px:aimX(x,tier),py:spawnY(tier)});world.drops++;world.lastDrop=world.tick;return true;}
export function nextTier(world:MapleWorld){world.rng=(Math.imul(world.rng,1664525)+1013904223)>>>0;return Math.floor(world.rng/4294967296*5);}
const mass=(ball:Ball)=>PIECES[ball.tier].radius**2;
function walls(ball:Ball){const r=PIECES[ball.tier].radius;if(ball.x<BOWL.left+r){ball.x=BOWL.left+r;if(ball.vx<0)ball.vx*=-BOWL.wallRestitution;}if(ball.x>BOWL.right-r){ball.x=BOWL.right-r;if(ball.vx>0)ball.vx*=-BOWL.wallRestitution;}if(ball.y>BOWL.floor-r){ball.y=BOWL.floor-r;if(ball.vy>0)ball.vy=ball.vy<26?0:-ball.vy*BOWL.wallRestitution;ball.vx*=.985;if(Math.abs(ball.vx)<.15)ball.vx=0;}}
export function stepWorld(world:MapleWorld){world.tick++;world.effects=world.effects.filter(e=>world.tick-e.tick<65);
 for(const b of world.balls){b.px=b.x;b.py=b.y;b.vy+=BOWL.gravity/BOWL.hz;b.vx*=.999;b.vy*=.999;b.x+=b.vx/BOWL.hz;b.y+=b.vy/BOWL.hz;walls(b);}
 // ID order is stable; replacing balls happens after this tick's contacts, never inside iteration.
 const consumed=new Set<number>(),pending:Ball[]=[];
 for(let iteration=0;iteration<BOWL.iterations;iteration++){
 for(let i=0;i<world.balls.length;i++){const a=world.balls[i];if(consumed.has(a.id))continue;
 for(let j=i+1;j<world.balls.length;j++){const b=world.balls[j];if(consumed.has(b.id))continue;const radius=PIECES[a.tier].radius+PIECES[b.tier].radius,dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy);if(distance>radius+.02)continue;
 if(a.tier===b.tier&&a.tier<10&&a.born<world.tick&&b.born<world.tick){consumed.add(a.id);consumed.add(b.id);const tier=a.tier+1,r=PIECES[tier].radius,ma=mass(a),mb=mass(b),id=world.nextId++;const x=clamp((a.x+b.x)/2,BOWL.left+r,BOWL.right-r),y=Math.min((a.y+b.y)/2,BOWL.floor-r);const merged:Ball={id,tier,x,y,px:x,py:y,vx:clamp((a.vx*ma+b.vx*mb)/(ma+mb)*.5,-100,100),vy:clamp((a.vy*ma+b.vy*mb)/(ma+mb)*.5,-120,120),born:world.tick};pending.push(merged);world.merges++;world.effects.push({parents:[a.id,b.id],id,tier,x,y,tick:world.tick});break;}
 const nx=distance>.00001?dx/distance:1,ny=distance>.00001?dy/distance:0,ia=1/mass(a),ib=1/mass(b),sum=ia+ib,overlap=radius-distance;
 if(overlap>0){const correction=Math.max(0,overlap-.015)*.8/sum;a.x-=nx*correction*ia;a.y-=ny*correction*ia;b.x+=nx*correction*ib;b.y+=ny*correction*ib;}
 const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
 if(relative<0){const impulse=-(1+(relative< -70?.08:0))*relative/sum;a.vx-=impulse*nx*ia;a.vy-=impulse*ny*ia;b.vx+=impulse*nx*ib;b.vy+=impulse*ny*ib;
 const tx=-ny,ty=nx,slide=(b.vx-a.vx)*tx+(b.vy-a.vy)*ty,friction=clamp(-slide/sum,-impulse*BOWL.friction,impulse*BOWL.friction);a.vx-=friction*tx*ia;a.vy-=friction*ty*ia;b.vx+=friction*tx*ib;b.vy+=friction*ty*ib;}
 }}for(const b of world.balls)if(!consumed.has(b.id))walls(b);}
 world.balls=world.balls.filter(b=>!consumed.has(b.id)).concat(pending);return world;
}
export function pairWorld(tier:number){const world=newWorld();const radius=PIECES[tier].radius;for(const side of [-1,1]){const vertical=radius*4>BOWL.right-BOWL.left;const x=vertical?180:180+side*(radius+.2),y=vertical?BOWL.floor-radius-(side+1)*(radius+.2):BOWL.floor-radius;world.balls.push({id:world.nextId++,tier,x,y,px:x,py:y,vx:vertical?0:-side*18,vy:0,born:0});}return world;}
export function replayWorld(seed:number,actions:DropAction[],endTick:number){if(!Number.isSafeInteger(endTick)||endTick<0)throw Error('Invalid replay');const w=newWorld(seed);let index=0;for(const a of actions)if(!Number.isSafeInteger(a.tick)||a.tick<0||a.tick>=endTick||!Number.isFinite(a.x)||!validTier(a.tier))throw Error('Invalid drop');for(let tick=0;tick<endTick;tick++){while(index<actions.length&&actions[index].tick===tick){const a=actions[index++];if(!drop(w,a.x,a.tier))throw Error('Drop rejected');}stepWorld(w);}if(index!==actions.length)throw Error('Unordered drops');return w;}
