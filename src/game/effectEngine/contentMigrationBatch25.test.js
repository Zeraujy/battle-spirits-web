import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { resolveActionList } from './actionResolver.js';
import { conditionMatchesEffect } from './conditionEngine.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=(Array.isArray(raw)?raw:raw.cards).map(normalizeCard); const index=makeCardIndex(cards); const byId=new Map(cards.map(c=>[c.id,c]));
const get=(id)=>cards.find(c=>c.id===id&&c.set==='BSC49'); const ability=(id,aid)=>get(id).abilities.find(a=>a.id===aid);
const physical=(cardId,instanceId,cores=1)=>({cardId,instanceId,cores:{regular:cores,soul:false},exhausted:false});
function base(){return {turnPlayerId:'player1',activePlayerId:'player1',phase:'attack',players:{player1:{id:'player1',life:5,reserve:12,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null},player2:{id:'player2',life:5,reserve:12,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null}},temporary:{}};}

test('batch25 added one reusable Core Action over its baseline',()=>assert.ok(listSupportedCoreActionTypes().length>=84));
test('batch25 coverage advances BSC49 to 94 resolved and global fallback to 23',()=>{const c=JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage-v5.1.0-content-batch25.json',import.meta.url),'utf8'));const r=c.cards.filter(x=>x.set==='BSC49');assert.equal(r.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,94);assert.equal(r.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,23);assert.equal(c.cards.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,23);});
test('Life Charge LT puts five Void cores into Core Trash after the cost Spirit is destroyed',()=>{let m=base();const target=physical('BS13-048','cost10',1);m.players.player1.field.spirits=[target];const a=ability('BSC49-092','bsc49-092-main-auto45').actions[0].actions;const r=resolveActionList(m,a,index,{sourcePlayerId:'player1',sourceInstanceId:'lifecharge',sourceCard:get('BSC49-092')});assert.equal(r.manualResolutionNeeded,false);assert.equal(r.match.players.player1.field.spirits.length,0);assert.equal(r.match.players.player1.trashCores,5);});
test('Pegasus Flap LT reuses canonical skip-BP battle restriction',()=>{const a=ability('BSC49-097','bsc49-097-flash-auto45');assert.equal(a.actions[0].restriction.skipBPComparison,true);assert.equal(a.actions[1].onSelect.type,'refresh');});
test('Pegasus Flap LT recognizes a Yellow effect as the mover after Trash recovery',()=>{const cond=ability('BSC49-097','bsc49-097-return-bp-auto45').conditions.find(x=>x.type==='eventMovedByColor');const m=base();assert.equal(conditionMatchesEffect(m,cond,{sourcePlayerId:'player1',movedByCardId:'BSC49-041'},index),true);});
test('Hand Typhoon LT validates five Devotee plus Astral Soul/Galaxian cards before offering the symmetric route',()=>{const a=ability('BSC49-098','bsc49-098-main-auto45').actions[0].actions[0];assert.equal(a.type,'conditional');assert.equal(a.condition.type,'zoneCount');assert.equal(a.condition.atLeast,5);assert.deepEqual(a.condition.selector.familiesAll,['Devotee']);assert.deepEqual(a.condition.selector.families,['Astral Soul','Galaxian']);});
test('Hand Typhoon LT flash remains generic +3000 BP targeting',()=>{const a=ability('BSC49-098','bsc49-098-flash-auto45').actions[0];assert.equal(a.onSelect.type,'modifyBP');assert.equal(a.onSelect.amount,3000);});
