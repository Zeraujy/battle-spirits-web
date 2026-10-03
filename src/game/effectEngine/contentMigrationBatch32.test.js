import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { resolveActionList } from './actionResolver.js';
import { advancePhase } from '../turn.js';
import { collectTargets } from './targetingEngine.js';
import { getContinuousPlayerNumericModifier } from './modifierResolver.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=(Array.isArray(raw)?raw:raw.cards).map(normalizeCard); const index=makeCardIndex(cards);
const get=(id)=>cards.find(c=>c.id===id); const ability=(id,aid)=>get(id).abilities.find(a=>a.id===aid);
const physical=(cardId,instanceId,cores=0,exhausted=false)=>({cardId,instanceId,cores:{regular:cores,soul:false},exhausted,combinedWith:null,flags:{}});
function base(){return {turnNumber:8,turnPlayerId:'player1',activePlayerId:'player1',firstPlayerId:'player2',phase:'main',players:{player1:{id:'player1',name:'A',life:5,reserve:20,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[physical('BSC49-004','d1')],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}},player2:{id:'player2',name:'B',life:5,reserve:20,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[physical('BSC49-004','d2')],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}}},temporary:{},persistentEffects:{}};}

test('batch32 coverage advances BSC49 to 102 resolved and global fallback to 15',()=>{
 const c=JSON.parse(fs.readFileSync(new URL('../../../data/effects/history/effect-coverage-v5.1.0-content-batch32.json',import.meta.url),'utf8'));
 const r=c.cards.filter(x=>x.set==='BSC49'); assert.equal(r.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,102);
 assert.equal(r.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,15);
 assert.equal(c.cards.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,15);
});

test('batch32 keeps Core Action Library at 86 while expanding generic lock semantics',()=>assert.ok(listSupportedCoreActionTypes().length>=86));

test('Lunatic Seal LT has structured protection, Field and Main abilities',()=>{
 assert.ok(ability('BSC49-096','bsc49-096-protection-auto52')); assert.ok(ability('BSC49-096','bsc49-096-field-auto52')); assert.ok(ability('BSC49-096','bsc49-096-main-auto52'));
 const main=ability('BSC49-096','bsc49-096-main-auto52'); assert.match(JSON.stringify(main),/removeAtEndOfNextControllerTurn/); assert.match(JSON.stringify(main),/trashPlacementLocked/);
});

test('Lunatic Seal field locks freeze Life and deck removal for both players',()=>{
 let m=base(); const seal=physical('BSC49-096','seal'); m.players.player1.hand=[seal];
 const lockActions=[{type:'placeSourceInField',removeAtEndOfNextControllerTurn:true},
  {type:'addModifier',property:'lifeChangeLocked',operation:'set',value:1,selector:{owner:'self'},duration:'whileSourceExists'},
  {type:'addModifier',property:'lifeChangeLocked',operation:'set',value:1,selector:{owner:'opponent'},duration:'whileSourceExists'},
  {type:'addModifier',property:'deckRemovalLocked',operation:'set',value:1,selector:{owner:'self'},duration:'whileSourceExists'},
  {type:'addModifier',property:'deckRemovalLocked',operation:'set',value:1,selector:{owner:'opponent'},duration:'whileSourceExists'}];
 m=resolveActionList(m,lockActions,index,{sourcePlayerId:'player1',sourceInstanceId:'seal',sourcePhysical:seal,sourceCard:get('BSC49-096')}).match;
 assert.equal(getContinuousPlayerNumericModifier(m,'player1','lifeChangeLocked'),1); assert.equal(getContinuousPlayerNumericModifier(m,'player2','lifeChangeLocked'),1);
 let r=resolveActionList(m,[{type:'dealLifeDamage',player:'opponent',count:2},{type:'topDeckToTrash',player:'opponent',count:1}],index,{sourcePlayerId:'player1',sourceInstanceId:'seal',sourceCard:get('BSC49-096')});
 assert.equal(r.match.players.player2.life,5); assert.equal(r.match.players.player2.deck.length,1); assert.equal(r.match.players.player2.trash.length,0);
});

test('Lunatic Seal ignores its controller effects while in Trash',()=>{
 const m=base(); const seal=physical('BSC49-096','seal'); m.players.player1.trash=[seal];
 const targets=collectTargets(m,index,{owner:'self',zones:['trash'],cardId:'BSC49-096'},{sourcePlayerId:'player1',sourceInstanceId:'other',sourceCard:get('BSC49-091')});
 assert.equal(targets.length,0);
});

test('Lunatic Seal is removed at the end of its controller next turn',()=>{
 let m=base(); const seal=physical('BSC49-096','seal'); m.players.player1.hand=[seal];
 m=resolveActionList(m,[{type:'placeSourceInField',removeAtEndOfNextControllerTurn:true}],index,{sourcePlayerId:'player1',sourceInstanceId:'seal',sourcePhysical:seal,sourceCard:get('BSC49-096')}).match;
 assert.equal(m.persistentEffects.scheduledSourceRemovals[0].dueTurnNumber,10);
 m={...m,turnNumber:10,activePlayerId:'player1',turnPlayerId:'player1',phase:'attack'};
 const r=advancePhase(m,'player1',index); assert.equal(r.ok,true); assert.equal(r.match.phase,'end');
 assert.equal(r.match.players.player1.field.other.some(x=>x.instanceId==='seal'),false); assert.equal(r.match.players.player1.removed.some(x=>x.instanceId==='seal'),true);
});
