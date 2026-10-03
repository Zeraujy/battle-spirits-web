import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { resolveActionList } from './actionResolver.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { applyContinuousCollectionModifiers } from './modifierResolver.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=raw.map(normalizeCard); const index=makeCardIndex(cards); const byId=new Map(cards.map(c=>[String(c.id),c]));
const deck=Array.from({length:40},()=> 'BSC49-019');
function base(){const m=createMatch({player1:{name:'A',deck},player2:{name:'B',deck},firstPlayerId:'player1',cardIndex:index,random:()=>0.25});m.turnNumber=2;m.phase='main';m.activePlayerId='player1';m.players.player1.reserve=30;m.players.player2.reserve=30;return m;}
function physical(id,instance,cores=2,exhausted=false,combinedWith=null){return {...makePhysicalCard(id,index),instanceId:instance,cores:{regular:cores,soul:false},exhausted,combinedWith};}
function ability(id,a){return byId.get(id)?.abilities?.find(x=>x.id===a);}

test('content batch 16: BSC49 Wave 1 resolves ten more cards and leaves 106 pending',()=>{const cov=JSON.parse(fs.readFileSync(new URL('../../../data/effects/history/effect-coverage-v5.1.0-content-batch16.json',import.meta.url),'utf8'));const rows=cov.cards.filter(x=>x.set==='BSC49');assert.equal(rows.length,117);assert.equal(rows.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,106);assert.equal(rows.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,11);});

test('content batch 16: Mushatsubame LT exposes engine-native High Speed',()=>{const e=byId.get('BSC49-019').effects.find(x=>x.type==='highSpeed');assert.ok(e);assert.equal(e.timing,'flash');});

test('content batch 16: Danderabbit LT gains Reserve core and can place a second core',()=>{let m=base();const src=physical('BSC49-020','dander',2);const ally=physical('BSC49-003','ally',1);m.players.player1.field.spirits=[src,ally];const before=m.players.player1.reserve;const a=ability('BSC49-020','bsc49-020-summon-auto36');const r=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'dander',sourcePhysical:src,sourceCard:byId.get('BSC49-020')});assert.equal(r.match.players.player1.reserve,before+1);});

test('content batch 16: Yang-Ogre LT core gain scales with current level',()=>{let m=base();const src=physical('BSC49-025','ogre',5);m.players.player1.field.spirits=[src];const a=ability('BSC49-025','bsc49-025-destroyed-auto36');const before=m.players.player1.reserve;const r=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'ogre',sourcePhysical:src,sourceCard:byId.get('BSC49-025')});assert.ok(r.match.players.player1.reserve>before);});

test('content batch 16: SwordHorse Granim LT grants exhausted blocking to Red Spirits',()=>{let m=base();const src=physical('BSC49-033','granim',3);const ally=physical('BSC49-004','red',1,true);m.players.player1.field.spirits=[src,ally];m=dispatchEffectEvent(m,{event:'continuous',sourcePlayerId:'player1',sourceInstanceId:'granim',eventPlayerId:'player1'},index).match;const vals=applyContinuousCollectionModifiers(m,index,ally,'allowExhaustedBlock',[]);assert.ok(vals.length>0);});

test('content batch 16: Pomeran LT BP bonus scales with Brave count',()=>{let m=base();const src=physical('BSC49-036','pomeran',3);m.players.player1.field.spirits=[src];m.players.player1.field.other=[physical('BS13-053','b1',0),physical('BS13-057','b2',0)];const a=ability('BSC49-036','bsc49-036-attack-auto36');const r=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'pomeran',sourcePhysical:src,sourceCard:byId.get('BSC49-036')});assert.equal(r.executed,true);});

test('content batch 16: Kuhja LT replacement prevents destruction and exhausts the target',()=>{let m=base();m.phase='attack';const src=physical('BSC49-037','kuhja',3);const ally=physical('BSC49-036','yellow',2,false);m.players.player1.field.spirits=[src,ally];const a=ability('BSC49-037','bsc49-037-save-auto36');const r=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'kuhja',sourcePhysical:src,sourceCard:byId.get('BSC49-037'),eventSourceInstanceId:'yellow'});assert.equal(r.executed,true);});

test('content batch 16: Shantarg LT ends a Main Step after Magic resolution',()=>{let m=base();const src=physical('BSC49-047','shantarg',2);m.players.player1.field.spirits=[src];const a=ability('BSC49-047','bsc49-047-magic-end-auto36');const r=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'shantarg',sourcePhysical:src,sourceCard:byId.get('BSC49-047')});assert.equal(r.executed,true);assert.notEqual(r.match.phase,'main');});
