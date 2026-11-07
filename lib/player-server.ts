import {eq,and} from 'drizzle-orm';
import {getDb} from '../db';
import {players} from '../db/schema';
import {validPlayer,type PlayerProfile} from './profile';
export class ProfileError extends Error {status:number;constructor(message:string,status=400){super(message);this.status=status;}}
export async function savePlayer(input:unknown,update=true){
 if(!validPlayer(input))throw new ProfileError('Choose a name (1–18 characters) and an icon.');
 const profile:PlayerProfile={...input,name:input.name.trim()};
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(profile.key));const keyHash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 const db=getDb();await db.insert(players).values({id:profile.id,keyHash,name:profile.name,icon:profile.icon,updated:Date.now()}).onConflictDoNothing();
 const [owner]=await db.select({id:players.id,name:players.name,icon:players.icon}).from(players).where(and(eq(players.id,profile.id),eq(players.keyHash,keyHash)));
 if(!owner)throw new ProfileError('This profile cannot be edited from this browser.',403);
 if(!update)return {...profile,name:owner.name,icon:owner.icon as PlayerProfile['icon']};
 await db.update(players).set({name:profile.name,icon:profile.icon,updated:Date.now()}).where(and(eq(players.id,profile.id),eq(players.keyHash,keyHash)));
 return profile;
}
