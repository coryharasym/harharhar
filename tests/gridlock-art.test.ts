import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOYBOX_CARS,TOYBOX_TRUCKS} from '../lib/gridlock-art.ts';

test('all 26 vehicle illustrations have isolated, valid bounds within their atlas cells',()=>{
 for(const [kind,atlas] of [['cars',TOYBOX_CARS],['trucks',TOYBOX_TRUCKS]] as const){
  assert.equal(atlas.frames.length,13);
  for(const [i,frame] of atlas.frames.entries()){
   assert(frame.width>100&&frame.height>50,`${kind} ${i} missing`);
   const col=i%4,row=Math.floor(i/4);
   assert(frame.x>=Math.round(col*atlas.width/4)&&frame.x+frame.width<=Math.round((col+1)*atlas.width/4),`${kind} ${i} crosses a column`);
   assert(frame.y>=Math.round(row*atlas.height/4)&&frame.y+frame.height<=Math.round((row+1)*atlas.height/4),`${kind} ${i} crosses a row`);
   assert(frame.width/frame.height>(kind==='cars'?1.5:2.2),`${kind} ${i} has the wrong silhouette`);
  }
 }
});
test('both transparent fleet atlases ship in the Pages offline cache',()=>{
 const paths=JSON.parse(readFileSync(new URL('../precache.json',import.meta.url),'utf8')) as string[];
 for(const kind of ['cars','trucks']){
  const path=`card-art/gridlock-toybox-${kind}-v1.webp`;
  assert(paths.includes(path));
  const source=readFileSync(new URL('../public/'+path,import.meta.url));
  assert(source.length>10000);assert.deepEqual(readFileSync(new URL('../'+path,import.meta.url)),source);
 }
});
