import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { resolveActionList } from './actionResolver.js';
import { resolveBattle } from '../battle.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=(Array.isArray(raw)?raw:raw.cards).map(normalizeCard); const index=makeCardIndex(cards);
const get=(id)=>cards.find(c=>c.id===id); const ability=(id,aid)=>get(id).abilities.find(a=>a.id===aid);
const physical=(cardId,instanceId,cores=1,exhausted=false)=>({cardId,instanceId,cores:{regular:cores,soul:false},exhausted,combinedWith:null});
function base(){return {turnNumber:4,turnPlayerId:'player1',activePlayerId:'player1',phase:'attack',players:{player1:{id:'player1',name:'A',life:5,reserve:12,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}},player2:{id:'player2',name:'B',life:5,reserve:12,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}}},temporary:{}};}

test('batch28 keeps Core Action Library stable while adding reusable battle hook semantics',()=>assert.ok(listSupportedCoreActionTypes().length>=85));

test('Orion Power LT exposes Blue-discard activation with Main/Flash options',()=>{
 const a=ability('BSC49-100','bsc49-100-discard-auto48');
 assert.equal(a.trigger.scope,'controllerTrash');
 assert.deepEqual(a.conditions.map(x=>x.type),['eventSourceIsSource','eventMovedFromZone','eventMoveDestination','eventMovedByColor']);
 assert.deepEqual(a.actions[0].options.map(x=>x.id),['main','flash']);
});

test('Orion Power LT Main installs a family-filtered 10-card deck-discard hook for the turn',()=>{
 let m=base(); const src=physical('BSC49-100','orion',0); m.players.player1.hand=[src];
 const a=ability('BSC49-100','bsc49-100-main-auto48');
 const r=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'orion',sourcePhysical:src,sourceCard:get('BSC49-100')});
 const mod=r.match.modifierRegistry.items.find(x=>x.property==='opponentDeckDiscardOnLifeDamage');
 assert.equal(mod.value,10); assert.deepEqual(mod.selector.families,['Astral Soul','Galaxian','Fighting Spirit']);
});

test('Orion Power LT mills ten after a qualifying Spirit attack reduces Life',()=>{
 let m=base(); const attacker=physical('BSC49-002','attacker',2,true); const src=physical('BSC49-100','orion',0);
 m.players.player1.field.spirits=[attacker]; m.players.player2.deck=Array.from({length:20},(_,i)=>physical('BSC49-003',`d${i}`,0));
 m.players.player2.life=5;
 const a=ability('BSC49-100','bsc49-100-main-auto48');
 m=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'orion',sourcePhysical:src,sourceCard:get('BSC49-100')}).match;
 m.battle={id:'battle-test',attackerPlayerId:'player1',defenderPlayerId:'player2',attackerInstanceId:'attacker',blockerInstanceId:null,stage:'resolve',flash:null,restrictions:{}};
 const r=resolveBattle(m,'player1',index);
 assert.equal(r.ok,true); assert.equal(r.match.players.player2.life,4); assert.equal(r.match.players.player2.deck.length,10); assert.equal(r.match.players.player2.trash.length,10);
});

test('Orion Power LT Flash is the standard +3000 BP selection',()=>{
 const a=ability('BSC49-100','bsc49-100-flash-auto48');
 assert.equal(a.actions[0].onSelect.type,'modifyBP'); assert.equal(a.actions[0].onSelect.amount,3000);
});
