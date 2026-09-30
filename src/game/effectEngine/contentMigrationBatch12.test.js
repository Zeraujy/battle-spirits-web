import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';
import { legalBlockers } from '../battle.js';
import { resolveActionList } from './actionResolver.js';

const rawCards=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const normalized=rawCards.map(normalizeCard); const index=makeCardIndex(normalized); const byId=new Map(normalized.map(c=>[String(c.id),c]));
const deck=Array.from({length:40},()=> 'BS13-001');
const ability=(id,a)=>byId.get(id)?.abilities?.find(x=>x.id===a);
function base(){const m=createMatch({player1:{name:'A',deck},player2:{name:'B',deck},firstPlayerId:'player1',cardIndex:index,random:()=>0.25}); m.turnNumber=2;m.phase='main';m.activePlayerId='player2';m.players.player1.reserve=20;m.players.player2.reserve=20;return m;}
function physical(id,instance,cores=10){return {...makePhysicalCard(id,index),instanceId:instance,cores:{regular:cores,soul:false},exhausted:false};}

test('content batch 12: BS13 Wave 4 resolves ten more cards and leaves 30 pending',()=>{const cov=JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage-v5.1.0-content-batch12.json',import.meta.url),'utf8'));const rows=cov.cards.filter(x=>x.set==='BS13');assert.equal(rows.length,90);assert.equal(rows.filter(x=>x.status==='UNSTRUCTURED_TEXT').length,30);assert.equal(rows.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,60);});

test('content batch 12: Core Action Library exposes generic step ending',()=>{const types=listSupportedCoreActionTypes();assert.equal(types.includes('endCurrentStep'),true);assert.ok(types.length >= 72);});

test('content batch 12: Phobos-Dragoon structures Confront and free Astral Deity follow-up',()=>{assert.equal(ability('BS13-004','bs13-004-confront-auto32').actions[0].mustBlockIfAble,true);assert.equal(ability('BS13-004','bs13-004-lv3-auto32').actions[0].afterSelect[1].onSelect.type,'specialSummonFromHand');});

test('content batch 12: Granim enables exhausted Red blockers against low BP and Braved attackers',()=>{assert.equal(ability('BS13-029','bs13-029-low-bp-block-auto32').actions[0].property,'allowExhaustedBlockMaxOpponentBP');assert.equal(ability('BS13-029','bs13-029-braved-block-auto32').actions[0].property,'allowExhaustedBlockAgainstBraved');});

test('content batch 12: Hermod structures Transmigration payment and high-BP blocker restriction',()=>{assert.equal(ability('BS13-032','bs13-032-summon-auto32').actions[0].onSelect.type,'removeCore');assert.equal(ability('BS13-032','bs13-032-braved-attack-auto32').actions[0].restriction.maximumBlockerBP,5999);});

test('content batch 12: magicResolved observers can automatically end opponent Main Step',()=>{let m=base();const port=physical('BS13-071','port');m.players.player1.field.nexuses=[port];m=dispatchEffectEvent(m,{event:'continuous',sourcePlayerId:'player1',sourceInstanceId:'port',eventPlayerId:'player1'},index).match;const magic=physical('BS13-077','magic',0);const r=dispatchEffectEvent(m,{event:'magicResolved',sourcePlayerId:'player2',sourceInstanceId:'magic',sourcePhysical:magic,sourceCardId:'BS13-077',eventPlayerId:'player2',context:{magicResolvedCount:2,eventPlayerId:'player2'}},index);assert.equal(r.match.phase,'attack');});

test('content batch 12: Octant Small Shrine protects opposing Spirit cores from foreign effects',()=>{let m=base();const shrine=physical('BS13-065','shrine');const victim=physical('BS13-001','victim',3);m.players.player1.field.nexuses=[shrine];m.players.player2.field.spirits=[victim];m=dispatchEffectEvent(m,{event:'continuous',sourcePlayerId:'player1',sourceInstanceId:'shrine',eventPlayerId:'player1'},index).match;const sourceCard=byId.get('BS13-065');const rr=resolveActionList(m,[{type:'removeCore',all:true,selector:{owner:'opponent',zones:['field'],cardTypes:['spirit']},amount:1,destination:'reserve'}],index,{sourcePlayerId:'player1',sourceInstanceId:'shrine',sourcePhysical:shrine,sourceCard});assert.equal(rr.match.players.player2.field.spirits[0].cores.regular,3);});

test('content batch 12: Concert Hall disables opponent Nexus reductions and treats Braved Spirits as Cost 2',()=>{assert.equal(ability('BS13-069','bs13-069-nexus-reduction-auto32').actions[0].property,'ignoreReductionSymbols');assert.equal(ability('BS13-069','bs13-069-braved-cost-auto32').actions[0].value,2);});

test('content batch 12: Compass keeps opponent Trash locked and forces Ancient Battleships to LV2',()=>{assert.equal(ability('BS13-072','bs13-072-trash-lock-auto32').actions[0].property,'trashToHandBlocked');assert.equal(ability('BS13-072','bs13-072-ancient-lv2-auto32').actions[0].type,'forceLevel');});

test('content batch 12: Argo Attack deploys Ancient Battleships and relays Argo-Golem summon effect',()=>{const a=ability('BS13-084','bs13-084-main-auto32');assert.equal(a.actions[0].type,'deployFromTrash');assert.equal(a.actions[1].then[0].onSelect.type,'emitSourceEvent');assert.equal(a.actions[1].then[0].onSelect.target,'selected');});
