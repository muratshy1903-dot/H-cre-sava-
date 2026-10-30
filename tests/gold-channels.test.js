import test from 'node:test';import assert from 'node:assert/strict';import {World} from '../dist/engine.js';
test('small and big Gold have independent hold channels, switching one off preserves the other',()=>{
 const w=new World(),p=w.addPlayer('p',{gold:5000});w.items=[];
 w.command('p',{type:'hold',kind:'both'});w.step(.05);assert.equal(p.gold,4890);assert.equal(w.prize,50110);
 w.command('p',{type:'hold',kind:'small'});w.step(.05);assert.equal(p.gold,4880);assert.equal(w.prize,50120);
 w.command('p',{type:'hold',kind:'big'});w.step(.05);assert.equal(p.gold,4780);assert.equal(w.prize,50220);
 w.command('p',{type:'hold',kind:''});w.step(.05);assert.equal(p.gold,4780);
});
