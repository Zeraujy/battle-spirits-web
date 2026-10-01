import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { resolveActionList } from './actionResolver.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { collectTargets } from './targetingEngine.js';
import { calculateReduction } from '../cost.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=(Array.isArray(raw)?raw:raw.cards).map(normalizeCard); const index=makeCardIndex(cards);
const get=(id)=>cards.find(c=>c.id===id); const ability=(id,aid)=>get(id).abilities.find(a=>a.id===aid);
const physical=(cardId,instanceId,cores=1,exhausted=false,combinedWith=null)=>({cardId,instanceId,cores:{regular:cores,soul:false},exhausted,combinedWith});
function base(){return {turnNumber:4,turnPlayerId:'player2',activePlayerId:'player2',phase:'attack',players:{player1:{id:'player1',life:5,reserve:12,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}},player2:{id:'player2',life:5,reserve:12,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}}},temporary:{}};}

test('batch27 keeps Core Action Library stable while extending reusable targeting semantics',()=>assert.equal(listSupportedCoreActionTypes().length,85));

test('Reboot Code LT registers opponent Attack Step cost override to 2',()=>{
 let m=base(); const reboot=physical('BSC49-094','reboot',0); m.players.player1.hand=[reboot];
 m=dispatchEffectEvent(m,{event:'attackStep',eventPlayerId:'player2',sourcePlayerId:'player2'},index).match;
 const cost=calculateReduction(m,'player1',get('BSC49-094'),index);
 assert.equal(cost.effectivePrinted,2);
});

test('Reboot Code LT hand protection prevents opponent targeting for the turn',()=>{
 let m=base(); const reboot=physical('BSC49-094','reboot',0); m.players.player1.hand=[reboot];
 m=dispatchEffectEvent(m,{event:'startStep',eventPlayerId:'player2',sourcePlayerId:'player2'},index).match;
 const targets=collectTargets(m,index,{owner:'opponent',zones:['hand'],cardId:'BSC49-094'},{sourcePlayerId:'player2',sourceCard:get('BSC49-093')});
 assert.equal(targets.length,0);
});

test('Reboot Code LT refreshes all own Spirits but only refreshed non-Braved Spirits lose attack permission',()=>{
 let m=base(); const reboot=physical('BSC49-094','reboot',0); const braved=physical('BS13-001','braved',2,true); const plain=physical('BS13-002','plain',2,true); const brave={...physical('BSC49-052','brave-card',0,false,'braved'),cardType:'brave'};
 m.players.player1.hand=[reboot]; m.players.player1.field.spirits=[braved,plain]; m.players.player1.field.other=[brave];
 const a=ability('BSC49-094','bsc49-094-flash-auto47'); const r=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'reboot',sourcePhysical:reboot,sourceCard:get('BSC49-094')});
 assert.equal(r.manualResolutionNeeded,false);
 assert.equal(r.match.players.player1.field.spirits.find(x=>x.instanceId==='braved').exhausted,false);
 assert.equal(r.match.players.player1.field.spirits.find(x=>x.instanceId==='plain').exhausted,false);
 const plainBlocked=collectTargets(r.match,index,{owner:'self',zones:['field'],instanceId:'plain'},{sourcePlayerId:'player1'}).length;
 assert.equal(plainBlocked,1);
 assert.equal(ability('BSC49-094','bsc49-094-flash-auto47').actions[1].afterIfAny[1].property,'cannotAttack');
});
