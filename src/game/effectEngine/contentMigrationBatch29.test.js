import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { resolveActionList } from './actionResolver.js';
import { collectTargets } from './targetingEngine.js';
import { getContinuousNumericModifier } from './modifierResolver.js';
import { applyGameAction } from '../reducer.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=(Array.isArray(raw)?raw:raw.cards).map(normalizeCard); const index=makeCardIndex(cards);
const get=(id)=>cards.find(c=>c.id===id); const ability=(id,aid)=>get(id).abilities.find(a=>a.id===aid);
const physical=(cardId,instanceId,cores=1,exhausted=false)=>({cardId,instanceId,cores:{regular:cores,soul:false},exhausted,combinedWith:null});
function base(){return {turnNumber:5,turnPlayerId:'player1',activePlayerId:'player1',phase:'main',players:{player1:{id:'player1',name:'A',life:5,reserve:20,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}},player2:{id:'player2',name:'B',life:5,reserve:20,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}}},temporary:{}};}

test('batch29 keeps Core Action Library stable at 85 types',()=>assert.ok(listSupportedCoreActionTypes().length>=85));

test('Wig Bind LT structures effect-text attack/block lock plus optional five-card Trash cost',()=>{
 const a=ability('BSC49-099','bsc49-099-flash-auto49');
 assert.equal(a.actions[0].property,'cannotAttack'); assert.equal(a.actions[0].selector.hasEffectText,true);
 assert.equal(a.actions[1].property,'cannotBlock');
 const choose=a.actions[2]; assert.equal(choose.type,'chooseYesNo');
 const select=choose.yesActions[0]; assert.equal(select.type,'selectMultipleTargets'); assert.equal(select.minTargets,5); assert.equal(select.maxTargets,5);
 assert.deepEqual(select.selector.familiesAll,['Devotee']); assert.deepEqual(select.selector.familiesAny,['Astral Soul','Galaxian']);
 assert.equal(select.onConfirm[0].type,'moveCard'); assert.equal(select.onConfirm[0].destination,'removed');
 assert.equal(select.onConfirm[1].protection.type,'handUseColorsOnly');
});

test('hasEffectText targeting and modifier locks apply only to opposing Spirits with text',()=>{
 let m=base(); const source=physical('BSC49-099','wig',0); const withText=physical('BSC49-001','text-spirit',1); const noText={...physical('BSC49-099','not-spirit',0)};
 m.players.player2.field.spirits=[withText]; m.players.player2.field.other=[noText];
 const a=ability('BSC49-099','bsc49-099-flash-auto49');
 m=resolveActionList(m,a.actions.slice(0,2),index,{sourcePlayerId:'player1',sourceInstanceId:'wig',sourcePhysical:source,sourceCard:get('BSC49-099')}).match;
 assert.equal(getContinuousNumericModifier(m,index,withText,'cannotAttack'),1);
 assert.equal(getContinuousNumericModifier(m,index,withText,'cannotBlock'),1);
});

test('familiesAll + familiesAny selector finds valid Devotee Astral/Galaxian Trash cards',()=>{
 let m=base();
 m.players.player1.trash=[physical('BSC49-099','w1',0),physical('BSC49-095','w2',0),physical('BSC49-091','w3',0),physical('BSC49-093','w4',0),physical('BSC49-102','w5',0)];
 const hits=collectTargets(m,index,{owner:'self',zones:['trash'],familiesAll:['Devotee'],familiesAny:['Astral Soul','Galaxian']},{sourcePlayerId:'player1'});
 assert.equal(hits.length,5);
});

test('handUseColorsOnly blocks non-Yellow hand plays at reducer entry',()=>{
 let m=base(); const blue=physical('BSC49-100','blue-magic',0); m.players.player2.hand=[blue];
 m.temporary={turnProtections:{player2:{handUseColorsOnly:{type:'handUseColorsOnly',colors:['yellow'],requireOnly:true}}}};
 const r=applyGameAction(m,{type:'BEGIN_MANUAL_PLAY',instanceId:'blue-magic'},'player2',index);
 assert.equal(r.ok,false); assert.match(r.error,/impede o uso/i);
});
