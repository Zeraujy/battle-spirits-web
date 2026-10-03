import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { resolveActionList } from './actionResolver.js';
import { resolveBattle } from '../battle.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { resolveEffectDecision } from './effectEngine.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=(Array.isArray(raw)?raw:raw.cards).map(normalizeCard); const index=makeCardIndex(cards);
const get=(id)=>cards.find(c=>c.id===id); const ability=(id,aid)=>get(id).abilities.find(a=>a.id===aid);
const physical=(cardId,instanceId,cores=1,exhausted=false)=>({cardId,instanceId,cores:{regular:cores,soul:false},exhausted,combinedWith:null});
function base(){return {turnNumber:5,turnPlayerId:'player1',activePlayerId:'player1',phase:'attack',players:{player1:{id:'player1',name:'A',life:5,reserve:20,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}},player2:{id:'player2',name:'B',life:5,reserve:20,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}}},temporary:{}};}


test('batch30 coverage advances BSC49 to 100 resolved and global fallback to 17',()=>{
 const c=JSON.parse(fs.readFileSync(new URL('../../../data/effects/history/effect-coverage-v5.1.0-content-batch30.json',import.meta.url),'utf8'));
 const r=c.cards.filter(x=>x.set==='BSC49'); assert.equal(r.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,100);
 assert.equal(r.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,17);
 assert.equal(c.cards.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,17);
});

test('batch30 keeps Core Action Library stable at 85',()=>assert.ok(listSupportedCoreActionTypes().length>=85));

test('Delta Barrier LT reacts from controller hand to opposing effect Life loss',()=>{
 const a=ability('BSC49-095','bsc49-095-immediate-auto50');
 assert.equal(a.trigger.scope,'controllerHand'); assert.equal(a.trigger.event,'lifeDecreased');
 assert.match(JSON.stringify(a.conditions),/eventSourceIsOpponent/); assert.match(JSON.stringify(a.actions),/dispatchSourceEvent/);
});

test('Delta Barrier LT Flash installs both Life floor protections',()=>{
 let m=base(); const src=physical('BSC49-095','delta',0); const a=ability('BSC49-095','bsc49-095-flash-auto50');
 m=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'delta',sourcePhysical:src,sourceCard:get('BSC49-095')}).match;
 assert.ok(m.temporary.turnProtections.player1.lifeCannotBecomeZeroFromOpponentEffects);
 assert.equal(m.temporary.turnProtections.player1.lifeCannotBecomeZeroFromOpponentHighCostAttacks.minimumCost,4);
});

test('Delta Barrier LT prevents opposing effect damage from reducing Life to zero',()=>{
 let m=base(); m.players.player1.life=1; const src=physical('BSC49-095','delta',0); const a=ability('BSC49-095','bsc49-095-flash-auto50');
 m=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'delta',sourcePhysical:src,sourceCard:get('BSC49-095')}).match;
 const enemy=physical('BSC49-040','enemy',2);
 const r=resolveActionList(m,[{type:'dealLifeDamage',player:'opponent',count:3}],index,{sourcePlayerId:'player2',sourceInstanceId:'enemy',sourcePhysical:enemy,sourceCard:get('BSC49-040')});
 assert.equal(r.match.players.player1.life,1); assert.equal(r.match.winnerId,undefined);
});

test('Delta Barrier LT prevents cost 4+ opposing attack from reducing Life to zero',()=>{
 let m=base(); m.players.player2.life=1; const defenderSource=physical('BSC49-095','delta',0); const a=ability('BSC49-095','bsc49-095-flash-auto50');
 m=resolveActionList(m,a.actions,index,{sourcePlayerId:'player2',sourceInstanceId:'delta',sourcePhysical:defenderSource,sourceCard:get('BSC49-095')}).match;
 const attacker=physical('BSC49-040','attacker',2,true); m.players.player1.field.spirits=[attacker];
 m.battle={id:'b30',attackerPlayerId:'player1',defenderPlayerId:'player2',attackerInstanceId:'attacker',blockerInstanceId:null,stage:'resolve',flash:null,restrictions:{}};
 const r=resolveBattle(m,'player1',index); assert.equal(r.ok,true); assert.equal(r.match.players.player2.life,1); assert.equal(r.match.winnerId,undefined);
});
