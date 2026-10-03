import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { resolveActionList } from './actionResolver.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=raw.map(normalizeCard); const index=makeCardIndex(cards); const byId=new Map(cards.map(c=>[String(c.id),c]));
const deck=Array.from({length:40},()=> 'BSC49-003');
function base(){const m=createMatch({player1:{name:'A',deck},player2:{name:'B',deck},firstPlayerId:'player1',cardIndex:index,random:()=>0.2});m.turnNumber=2;m.phase='attack';m.activePlayerId='player1';m.players.player1.reserve=30;m.players.player2.reserve=30;return m;}
function physical(id,instance,cores=2,exhausted=false){return {...makePhysicalCard(id,index),instanceId:instance,cores:{regular:cores,soul:false},exhausted};}
function ability(id,a){return byId.get(id)?.abilities?.find(x=>x.id===a);}

test('content batch 17: BSC49 Wave 2 resolves ten more cards and leaves 96 pending',()=>{const cov=JSON.parse(fs.readFileSync(new URL('../../../data/effects/history/effect-coverage-v5.1.0-content-batch17.json',import.meta.url),'utf8'));const rows=cov.cards.filter(x=>x.set==='BSC49');assert.equal(rows.length,117);assert.equal(rows.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,96);assert.equal(rows.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,21);});

test('content batch 17: Leogulus LT summon effect destroys <=10000 BP target and draws',()=>{let m=base();m.phase='main';const src=physical('BSC49-007','leo',3);const foe=physical('BSC49-003','foe',1);m.players.player1.field.spirits=[src];m.players.player2.field.spirits=[foe];const before=m.players.player1.hand.length;const a=ability('BSC49-007','bsc49-007-summon-auto37');const r=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'leo',sourcePhysical:src,sourceCard:byId.get('BSC49-007')});assert.equal(r.executed,true);assert.ok(r.match.players.player1.hand.length>=before);});

test('content batch 17: Gaheris LT exposes Trash-native Immortality trigger',()=>{const a=ability('BSC49-010','bsc49-010-immortality-trigger-auto37');assert.equal(a.trigger.scope,'controllerTrash');assert.equal(a.trigger.event,'whenDestroyed');});

test('content batch 17: Gaheris LT Immortality can summon source from Trash',()=>{let m=base();const src=physical('BSC49-010','gaheris',1);m.players.player1.trash=[src];m=dispatchEffectEvent(m,{event:'whenDestroyed',sourcePlayerId:'player1',sourceInstanceId:'ally',eventPlayerId:'player1',sourceCard:{...byId.get('BSC49-003'),cost:3}},index).match;assert.equal(m.players.player1.field.spirits.some(x=>x.instanceId==='gaheris'),true);});

test('content batch 17: Flyskull LT destroyed effect removes cores from up to two opposing cards',()=>{let m=base();const src=physical('BSC49-011','fly',2);const a=physical('BSC49-003','a',2);const b=physical('BSC49-005','b',2);m.players.player1.field.spirits=[src];m.players.player2.field.spirits=[a,b];const ab=ability('BSC49-011','bsc49-011-destroyed-auto37');const r=resolveActionList(m,ab.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'fly',sourcePhysical:src,sourceCard:byId.get('BSC49-011')});assert.equal(r.executed,true);});

test('content batch 17: Jainagant LT uses generic Immortality plus destroyed rider',()=>{const c=byId.get('BSC49-014');assert.ok(c.effects.some(x=>x.type==='immortality'));assert.ok(ability('BSC49-014','bsc49-014-destroyed-auto37'));});

test('content batch 17: Agravain LT chains only after Immortality cause',()=>{const a=ability('BSC49-016','bsc49-016-summon-auto37');const json=JSON.stringify(a);assert.match(json,/specialSummonCause/);assert.match(json,/specialSummonFromTrash/);});

test('content batch 17: Inferd-Hades LT provides Purple symbol aura to Immortality Spirits',()=>{const a=ability('BSC49-017','bsc49-017-symbol-auto37');assert.equal(a.actions[0].type,'addModifier');assert.deepEqual(a.actions[0].value,['purple']);});

test('content batch 17: Zenas LT mills three and exposes a free Immortality summon',()=>{const a=ability('BSC49-018','bsc49-018-attack-auto37');assert.equal(a.actions[0].type,'topDeckToTrash');assert.equal(a.actions[0].count,3);assert.match(JSON.stringify(a),/specialSummonFromTrash/);});
