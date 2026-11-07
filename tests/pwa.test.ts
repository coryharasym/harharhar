import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
for(const pathname of ['/','/harharhar/'])test('Home Screen cache stays within '+pathname+' and bypasses every API',async()=>{
 const scope='https://example.test'+pathname,handlers:Record<string,(event:any)=>void>={},entries=new Map<string,Response>();let network=true;
 const cache={match:async(key:Request|string)=>entries.get(typeof key==='string'?key:key.url)?.clone(),put:async(key:Request|string,value:Response)=>{entries.set(typeof key==='string'?key:key.url,value);},addAll:async(requests:Request[])=>{for(const request of requests)entries.set(request.url,new Response(request.url));}};
 const caches={open:async()=>cache,keys:async()=>[],delete:async()=>true};
 vm.runInNewContext(code,{self:{registration:{scope},clients:{claim:async()=>{}},addEventListener:(name:string,handler:any)=>handlers[name]=handler},URL,Request,Error,Promise,caches,fetch:async(request:Request|URL)=>{if(!network)throw Error('offline');const url=String(request instanceof Request?request.url:request);return url.endsWith('precache.json')?Response.json(['./','assets/game.js']):new Response('fresh');}});
 let work:Promise<unknown>=Promise.resolve();handlers.install({waitUntil:(promise:Promise<unknown>)=>work=promise});await work;
 assert.ok(entries.has(scope));assert.ok(entries.has(scope+'assets/game.js'));
 for(const url of [scope+'api/leaderboard',scope+'api/runs','https://other.test/api/profile']){let intercepted=false;handlers.fetch({request:{url,method:'GET',mode:'cors'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);}
 let intercepted=false;handlers.fetch({request:{url:scope+'api/leaderboard',method:'POST'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 network=false;let result:Promise<Response>=Promise.resolve(new Response());handlers.fetch({request:{url:scope,method:'GET',mode:'navigate'},respondWith:(promise:Promise<Response>)=>result=promise});assert.equal(await(await result).text(),scope);
 handlers.fetch({request:new Request(scope+'assets/game.js'),respondWith:(promise:Promise<Response>)=>result=promise});assert.equal(await(await result).text(),scope+'assets/game.js');
});
test('manifest launches at the arcade in a scoped standalone window with install icons',()=>{const m=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));assert.equal(m.display,'standalone');assert.equal(m.scope,'./');assert.equal(m.start_url,'./#games');assert.ok(m.icons.some((i:any)=>i.purpose==='maskable'));for(const icon of m.icons)assert.ok(readFileSync(new URL('../public/'+icon.src,import.meta.url)).length>0);});
