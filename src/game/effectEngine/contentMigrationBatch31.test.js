import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { resolveActionList } from './actionResolver.js';
import { advancePhase } from '../turn.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=(Array.isArray(raw)?raw:raw.cards).map(normalizeCard); const index=makeCardIndex(cards);
const get=(id)=>cards.find(c=>c.id===id); const ability=(id,aid)=>get(id).abilities.find(a=>a.id===aid);
const physical=(cardId,instanceId,cores=1,exhausted=false)=>({cardId,instanceId,cores:{regular:cores,soul:false},exhausted,combinedWith:null,flags:{}});
function base(){return {turnNumber:4,turnPlayerId:'player1',activePlayerId:'player1',firstPlayerId:'player2',phase:'draw',players:{player1:{id:'player1',name:'A',life:5,reserve:20,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[physical('BSC49-004','d1',0)],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}},player2:{id:'player2',name:'B',life:5,reserve:20,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}}},temporary:{}};}

test('batch31 coverage advances BSC49 to 101 resolved and global fallback to 16',()=>{
 const c=JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage-v5.1.0-content-batch31.json',import.meta.url),'utf8'));
 const r=c.cards.filter(x=>x.set==='BSC49'); assert.equal(r.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,101);
 assert.equal(r.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,16);
 assert.equal(c.cards.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,16);
});

test('batch31 adds one generic Heavy Exhaust core action',()=>assert.equal(listSupportedCoreActionTypes().length,86));

test('Triangle Trap LT structures green discard recovery and Flash choice',()=>{
 const h=ability('BSC49-091','bsc49-091-hand-auto51'); const f=ability('BSC49-091','bsc49-091-flash-auto51');
 assert.equal(h.trigger.event,'cardMoved'); assert.match(JSON.stringify(h.conditions),/eventMovedByColor/);
 assert.equal(f.actions[0].type,'chooseOption'); assert.match(JSON.stringify(f.actions),/heavyExhaust/);
});

test('Heavy Exhaust keeps a card exhausted through exactly the next Refresh Step',()=>{
 let m=base(); const target=physical('BSC49-004','target',1,false); m.players.player2.field.spirits=[target];
 m=resolveActionList(m,[{type:'heavyExhaust',selector:{owner:'opponent',zones:['field'],instanceId:'target'}}],index,{sourcePlayerId:'player1',sourceCard:get('BSC49-091')}).match;
 assert.equal(m.players.player2.field.spirits[0].exhausted,true); assert.equal(m.players.player2.field.spirits[0].flags.heavyExhausted,true);
 // Make player2 active and enter refresh.
 m={...m,activePlayerId:'player2',turnPlayerId:'player2',phase:'draw'};
 let r=advancePhase(m,'player2',index); assert.equal(r.ok,true); assert.equal(r.match.phase,'refresh');
 assert.equal(r.match.players.player2.field.spirits[0].exhausted,true); assert.equal(r.match.players.player2.field.spirits[0].flags.heavyExhausted,false);
 // A later refresh works normally.
 m={...r.match,phase:'draw'}; r=advancePhase(m,'player2',index); assert.equal(r.match.players.player2.field.spirits[0].exhausted,false);
});
