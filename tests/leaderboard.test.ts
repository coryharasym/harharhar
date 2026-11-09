import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {LEADERBOARD_SQL,LEADERBOARD_LIMIT} from '../lib/leaderboard.ts';
import {validPlayer,createIdentity} from '../lib/profile.ts';
test('top ten is per game and per run, with fixed published names, current icons and deterministic ties',()=>{const script=`import sqlite3,json,glob,sys
q=json.load(sys.stdin)['query']
c=sqlite3.connect(':memory:')
c.row_factory=sqlite3.Row
for path in sorted(glob.glob('drizzle/*.sql')): c.executescript(open(path).read())
for i in range(12): c.execute('INSERT INTO players VALUES (?,?,?,?,?)',(str(i),'hash','Player '+str(i),'orbit',1))
def score(id,player,points,game='blocks',created=100,moves=10,name='Old name'):
 c.execute('INSERT INTO scores (id,name,score,tile,moves,created,game,player_id,icon,lines) VALUES (?,?,?,?,?,?,?,?,?,?)',(id,name,points,0,moves,created,game,player,'orbit',2))
for i in range(12): score('best'+str(i),str(i),2000-i*100)
score('duplicate','0',1999)
score('othergame','6',9000,'2048')
score('neon','0',3000,'tunnel')
c.execute("UPDATE players SET name='Renamed',icon='moon' WHERE id='0'")
rows=[dict(r) for r in c.execute(q,('blocks',0))]
other=[dict(r) for r in c.execute(q,('2048',0))]
neon=[dict(r) for r in c.execute(q,('tunnel',0))]
recent=[dict(r) for r in c.execute(q,('blocks',200))]
# Future qualifying runs take the new name, without changing earlier records.
score('newrun','0',2100,name='Renamed')
future=[dict(r) for r in c.execute(q,('blocks',0))]
original=c.execute("SELECT name FROM scores WHERE id='best0'").fetchone()['name']
print(json.dumps({'rows':rows,'neon':neon,'other':other,'recent':recent,'future':future,'original':original}))`;
const result=JSON.parse(execFileSync('python3',['-c',script],{input:JSON.stringify({query:LEADERBOARD_SQL}),encoding:'utf8'}));assert.equal(result.neon.length,1);assert.equal(result.neon[0].score,3000);assert.equal(result.neon[0].name,'Old name');assert.equal(result.neon[0].icon,'moon');assert.equal(result.rows.length,10);assert.deepEqual(result.rows.map((r:{score:number})=>r.score),[2000,1999,1900,1800,1700,1600,1500,1400,1300,1200]);assert.equal(result.rows[0].name,'Old name');assert.equal(result.rows[0].icon,'moon');assert.equal(result.other.length,1);assert.equal(result.other[0].score,9000);assert.equal(result.recent.length,0);assert.equal(result.future[0].name,'Renamed');assert.equal(result.original,'Old name');assert.equal(result.other[0].name,'Old name');});
test('profile tokens are random and invalid profile edits are rejected',()=>{const a=createIdentity(),b=createIdentity();assert.notEqual(a.id,b.id);assert.notEqual(a.key,b.key);const p={...a,name:'Cory',icon:'moon'};assert.ok(validPlayer(p));assert.equal(validPlayer({...p,key:'forged'}),false);assert.equal(validPlayer({...p,name:'<script>'}),false);assert.equal(validPlayer({...p,icon:'unknown'}),false);assert.equal(validPlayer({...p,name:' '}),false);});

test('qualification ignores only the current run’s row and respects score, moves and tie order',async()=>{const {candidateRank}=await import('../lib/leaderboard.ts');const rows=Array.from({length:10},(_,i)=>({id:'run'+i,playerId:'player'+i,name:'P'+i,score:2000-i*100,moves:10,created:100}));assert.equal(candidateRank(rows,{id:'new',playerId:'new',name:'New',score:1099,moves:1,created:200}),11);assert.equal(candidateRank(rows,{id:'new',playerId:'new',name:'New',score:1101,moves:20,created:200}),10);assert.equal(candidateRank(rows,{id:'new',playerId:'new',name:'New',score:1100,moves:11,created:200}),11);assert.equal(candidateRank(rows,{id:'new',playerId:'new',name:'New',score:1100,moves:9,created:200}),10);assert.equal(candidateRank(rows,{id:'new',playerId:'player0',name:'Renamed',score:1950,moves:10,created:200}),2);assert.equal(candidateRank(rows,{id:'run9',playerId:'player9',name:'Renamed',score:2200,moves:30,created:200}),1);assert.equal(candidateRank(rows,{id:'new',playerId:'player9',name:'Renamed',score:1100,moves:10,created:200}),11);});

test('all four games return exactly ten runs, including repeat players, and the eleventh is outside qualification',()=>{assert.equal(LEADERBOARD_LIMIT,10);const script=`import sqlite3,json,glob,sys
q=json.load(sys.stdin)['query']
c=sqlite3.connect(':memory:')
c.row_factory=sqlite3.Row
for path in sorted(glob.glob('drizzle/*.sql')): c.executescript(open(path).read())
for i in range(12): c.execute('INSERT INTO players VALUES (?,?,?,?,?)',(str(i),'hash','Player '+str(i),'orbit',1))
for game in ['2048','blocks','tunnel','maple']:
 for i in range(12):
  c.execute('INSERT INTO scores (id,name,score,tile,moves,created,game,player_id,icon,lines) VALUES (?,?,?,?,?,?,?,?,?,?)',(game+str(i),'P'+str(i),2000-i*100,0,10,100,game,str(i),'orbit',0))
for game in ['2048','blocks','tunnel','maple']:
 c.execute('INSERT INTO scores (id,name,score,tile,moves,created,game,player_id,icon,lines) VALUES (?,?,?,?,?,?,?,?,?,?)',(game+'again','P0',1999,0,10,100,game,'0','orbit',0))
print(json.dumps({game:[dict(r) for r in c.execute(q,(game,0))] for game in ['2048','blocks','tunnel','maple']}))`;
 const results=JSON.parse(execFileSync('python3',['-c',script],{input:JSON.stringify({query:LEADERBOARD_SQL}),encoding:'utf8'}));for(const rows of Object.values(results) as {playerId:string;score:number}[][]){assert.equal(rows.length,10);assert.equal(new Set(rows.map(r=>r.playerId)).size,9);assert.equal(rows[9].score,1200);}
});

test('same-time ties use run ID consistently with SQL and same-name anonymous runs stay separate',async()=>{const {candidateRank}=await import('../lib/leaderboard.ts');const a={id:'a',playerId:null,name:'Same',score:100,moves:10,created:100},z={...a,id:'z'};assert.equal(candidateRank([z],a),1);assert.equal(candidateRank([a],z),2);assert.equal(candidateRank([a,z],{...a,score:110}),1);});


test('one-time name correction migration preserves old names and atomically consumes only new entries',()=>{const script=`import sqlite3,glob,json
c=sqlite3.connect(':memory:')
files=sorted(glob.glob('drizzle/*.sql'))
for f in files[:-1]: c.executescript(open(f).read())
c.execute("INSERT INTO scores (id,name,score,tile,moves,created,game) VALUES ('old','Old',100,0,10,123,'2048')")
c.executescript(open(files[-1]).read())
old=c.execute("SELECT name_edited FROM scores WHERE id='old'").fetchone()[0]
c.execute("INSERT INTO scores (id,name,name_edited,score,tile,moves,created,game) VALUES ('new','Cory',0,200,0,20,456,'2048')")
first=c.execute("UPDATE scores SET name='Alex',name_edited=1 WHERE id='new' AND name_edited=0").rowcount
second=c.execute("UPDATE scores SET name='Sam',name_edited=1 WHERE id='new' AND name_edited=0").rowcount
print(json.dumps({'old':old,'first':first,'second':second,'row':c.execute("SELECT name,score,moves,created FROM scores WHERE id='new'").fetchone()}))`;
 const r=JSON.parse(execFileSync('python3',['-c',script],{encoding:'utf8'}));assert.equal(r.old,1);assert.equal(r.first,1);assert.equal(r.second,0);assert.deepEqual(r.row,['Alex',200,20,456]);});
