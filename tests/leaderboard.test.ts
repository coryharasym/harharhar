import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {LEADERBOARD_SQL} from '../lib/leaderboard.ts';
import {validPlayer,createIdentity} from '../lib/profile.ts';
test('top five is per game and per profile, with fixed published names, current icons and deterministic ties',()=>{const script=`import sqlite3,json,glob,sys
q=json.load(sys.stdin)['query']
c=sqlite3.connect(':memory:')
c.row_factory=sqlite3.Row
for path in sorted(glob.glob('drizzle/*.sql')): c.executescript(open(path).read())
for i in range(7): c.execute('INSERT INTO players VALUES (?,?,?,?,?)',(str(i),'hash','Player '+str(i),'orbit',1))
def score(id,player,points,game='blocks',created=100,moves=10,name='Old name'):
 c.execute('INSERT INTO scores (id,name,score,tile,moves,created,game,player_id,icon,lines) VALUES (?,?,?,?,?,?,?,?,?,?)',(id,name,points,0,moves,created,game,player,'orbit',2))
for i in range(7): score('best'+str(i),str(i),1000-i*100)
score('duplicate','0',999)
score('othergame','6',9000,'2048')
c.execute("UPDATE players SET name='Renamed',icon='moon' WHERE id='0'")
rows=[dict(r) for r in c.execute(q,('blocks',0))]
other=[dict(r) for r in c.execute(q,('2048',0))]
recent=[dict(r) for r in c.execute(q,('blocks',200))]
# Future qualifying runs take the new name, without changing earlier records.
score('newrun','0',1100,name='Renamed')
future=[dict(r) for r in c.execute(q,('blocks',0))]
original=c.execute("SELECT name FROM scores WHERE id='best0'").fetchone()['name']
print(json.dumps({'rows':rows,'other':other,'recent':recent,'future':future,'original':original}))`;
const result=JSON.parse(execFileSync('python3',['-c',script],{input:JSON.stringify({query:LEADERBOARD_SQL}),encoding:'utf8'}));assert.equal(result.rows.length,5);assert.deepEqual(result.rows.map((r:{score:number})=>r.score),[1000,900,800,700,600]);assert.equal(result.rows[0].name,'Old name');assert.equal(result.rows[0].icon,'moon');assert.equal(result.other.length,1);assert.equal(result.other[0].score,9000);assert.equal(result.recent.length,0);assert.equal(result.future[0].name,'Renamed');assert.equal(result.original,'Old name');assert.equal(result.other[0].name,'Old name');});
test('profile tokens are random and invalid profile edits are rejected',()=>{const a=createIdentity(),b=createIdentity();assert.notEqual(a.id,b.id);assert.notEqual(a.key,b.key);const p={...a,name:'Cory',icon:'moon'};assert.ok(validPlayer(p));assert.equal(validPlayer({...p,key:'forged'}),false);assert.equal(validPlayer({...p,name:'<script>'}),false);assert.equal(validPlayer({...p,icon:'unknown'}),false);assert.equal(validPlayer({...p,name:' '}),false);});

test('qualification ignores the player’s own row and respects score, moves and tie order',async()=>{const {candidateRank}=await import('../lib/leaderboard.ts');const rows=Array.from({length:5},(_,i)=>({id:'run'+i,playerId:'player'+i,name:'P'+i,score:1000-i*100,moves:10,created:100}));assert.equal(candidateRank(rows,{id:'new',playerId:'new',name:'New',score:599,moves:1,created:200}),6);assert.equal(candidateRank(rows,{id:'new',playerId:'new',name:'New',score:601,moves:20,created:200}),5);assert.equal(candidateRank(rows,{id:'new',playerId:'new',name:'New',score:600,moves:11,created:200}),6);assert.equal(candidateRank(rows,{id:'new',playerId:'new',name:'New',score:600,moves:9,created:200}),5);assert.equal(candidateRank(rows,{id:'new',playerId:'player4',name:'Renamed',score:1200,moves:30,created:200}),1);});
