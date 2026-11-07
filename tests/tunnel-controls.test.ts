import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ControlTap} from '../lib/tunnel-controls.ts';
test('HUD buttons accept deliberate taps and keyboard activation',()=>{const tap=new ControlTap();tap.begin(1,20,20);tap.move(1,24,22);assert.equal(tap.accept(1),true);assert.equal(tap.accept(0),true);});
test('a steering swipe across a HUD button never turns into pause, even after returning',()=>{const tap=new ControlTap();tap.begin(1,20,20);tap.move(1,80,20);tap.move(1,20,20);assert.equal(tap.accept(1),false);assert.equal(tap.accept(1),false);tap.begin(2,20,20);tap.cancel();assert.equal(tap.accept(1),false);});
test('an unrelated finger cannot invalidate the active control tap',()=>{const tap=new ControlTap();tap.begin(1,20,20);tap.move(2,100,100);assert.equal(tap.accept(1),true);});

test("touch-generated clicks with zero detail still reject a moved finger",()=>{const tap=new ControlTap();tap.begin(1,20,20);tap.move(1,20,80);assert.equal(tap.accept(0),false);assert.equal(tap.accept(0),true);});
