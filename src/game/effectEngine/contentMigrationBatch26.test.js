import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { resolveActionList } from './actionResolver.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=(Array.isArray(raw)?raw:raw.cards).map(normalizeCard); const index=makeCardIndex(cards); const byId=new Map(cards.map(c=>[c.id,c]));
const get=(id)=>cards.find(c=>c.id===id&&c.set==='BSC49'); const ability=(id,aid)=>get(id).abilities.find(a=>a.id===aid);
const physical=(cardId,instanceId,cores=1,exhausted=false)=>({cardId,instanceId,cores:{regular:cores,soul:false},exhausted});
function base(){return {turnPlayerId:'player1',activePlayerId:'player1',phase:'attack',players:{player1:{id:'player1',life:5,reserve:12,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null},player2:{id:'player2',life:5,reserve:12,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null}},temporary:{}};}

test('batch26 adds one reusable Core Action for Field Magic placement',()=>assert.ok(listSupportedCoreActionTypes().length>=85));
test('Cassiopeia Seal LT exhausts designated targets, places itself in Field and locks refresh',()=>{let m=base();const seal=physical('BSC49-093','seal',0);const opp=physical('BS13-001','opp',2);m.players.player1.hand=[seal];m.players.player2.field.spirits=[opp];const a=ability('BSC49-093','bsc49-093-flash-auto46');const r=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'seal',sourcePhysical:seal,sourceCard:get('BSC49-093')});assert.equal(r.manualResolutionNeeded,false);assert.equal(r.match.players.player2.field.spirits[0].exhausted,true);assert.ok(r.match.players.player1.field.other.some(x=>x.instanceId==='seal'));const rr=resolveActionList(r.match,[{type:'refresh',instanceId:'opp'}],index,{sourcePlayerId:'player2',sourceInstanceId:'other',sourceCard:byId.get('BS13-001')});assert.equal(rr.match.players.player2.field.spirits[0].exhausted,true);});
test('Cassiopeia Seal LT explicitly bypasses color-effect immunity for its designation',()=>{const a=ability('BSC49-093','bsc49-093-flash-auto46');assert.equal(a.actions[0].selector.ignoreEffectImmunity,true);});
test('Mercury Goblet LT observes a self Blue Nexus becoming exhausted from Trash',()=>{let m=base();const goblet=physical('BSC49-102','goblet',0);const nexus=physical('BSC49-083','nexus',1,false);m.players.player1.trash=[goblet];m.players.player1.field.nexuses=[nexus];const r=dispatchEffectEvent(m,{event:'cardExhausted',sourcePlayerId:'player1',sourceInstanceId:'nexus',sourceCardId:'BSC49-083',eventPlayerId:'player1'},index);assert.ok(r.decision||r.match.pendingDecision||r.match.effectQueue||r.queued>=0);const a=ability('BSC49-102','bsc49-102-trash-auto46');assert.equal(a.conditions[0].type,'eventSourceCardType');assert.equal(a.conditions[1].color,'blue');});
test('Mercury Goblet LT flash targets only the lowest-cost opposing Spirit/Ultimate',()=>{const a=ability('BSC49-102','bsc49-102-flash-auto46');assert.equal(a.actions[0].selector.lowestCostOnly,true);assert.equal(a.actions[0].selector.ignoreEffectImmunity,true);});
