import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';
import { resolveActionList } from './actionResolver.js';
import { calculateReduction } from '../cost.js';

const rawCards=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const normalized=rawCards.map(normalizeCard); const index=makeCardIndex(normalized); const byId=new Map(normalized.map(c=>[String(c.id),c]));
const deck=Array.from({length:40},()=> 'BS13-001');
function base(){const m=createMatch({player1:{name:'A',deck},player2:{name:'B',deck},firstPlayerId:'player1',cardIndex:index,random:()=>0.25});m.turnNumber=2;m.phase='main';m.activePlayerId='player1';m.players.player1.reserve=20;m.players.player2.reserve=20;return m;}
function physical(id,instance,cores=2,exhausted=false){return {...makePhysicalCard(id,index),instanceId:instance,cores:{regular:cores,soul:false},exhausted,combinedWith:null};}
function ability(id,a){return byId.get(id)?.abilities?.find(x=>x.id===a);}

test('content batch 13: BS13 Wave 5 resolves ten more cards and leaves 20 pending',()=>{const cov=JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage-v5.1.0-content-batch13.json',import.meta.url),'utf8'));const rows=cov.cards.filter(x=>x.set==='BS13');assert.equal(rows.length,90);assert.equal(rows.filter(x=>x.status==='UNSTRUCTURED_TEXT').length,20);assert.equal(rows.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,70);});

test('content batch 13: Core Action Library exposes reusable limited-use and special summon actions',()=>{const types=listSupportedCoreActionTypes();for(const t of ['upToNTimesPerTurn','specialSummonBraveCombinedFromHand','specialSummonEventSourceFromTrash'])assert.equal(types.includes(t),true);assert.ok(types.length>=75);});

test('content batch 13: Chamaeleopus contributes two red reduction symbols to Cost 7+ Spirit summons',()=>{let m=base();const src=physical('BS13-003','cham');m.players.player1.field.spirits=[src];m=dispatchEffectEvent(m,{event:'continuous',sourcePlayerId:'player1',sourceInstanceId:'cham',eventPlayerId:'player1'},index).match;const target={id:'SYN-RED7',cardType:'spirit',cost:7,reduction:['red','red','red'],colors:['red'],symbols:['red'],families:[]};const r=calculateReduction(m,'player1',target,index);assert.equal(r.applied,3);});

test('content batch 13: Barrong dynamic reduction expands from Hunter Beast count',()=>{let m=base();m.players.player1.field.spirits=[physical('BS13-036','h1'),physical('BS13-040','h2')];m.players.player1.field.other=[physical('BS13-058','h3')];m.players.player1.field.nexuses=[physical('BS13-065','y1',1)];const card=byId.get('BS13-039');const r=calculateReduction(m,'player1',card,index);assert.ok(r.applied>=3);});

test('content batch 13: Venu-Feather can use Trash symbols for cost reduction',()=>{let m=base();m.players.player1.field.spirits=[physical('BS13-036','fieldY')];m.players.player1.trash=[physical('BS13-039','trashY1'),physical('BS13-057','trashY2')];const r=calculateReduction(m,'player1',byId.get('BS13-040'),index);assert.ok(r.applied>=3);});

test('content batch 13: event-source recovery can return a destroyed card from Trash exhausted',()=>{let m=base();const fallen=physical('BS13-036','fallen',1);m.players.player1.trash=[fallen];const r=resolveActionList(m,[{type:'specialSummonEventSourceFromTrash',exhausted:true}],index,{sourcePlayerId:'player1',eventSourceInstanceId:'fallen'});assert.equal(r.match.players.player1.field.spirits.some(x=>x.instanceId==='fallen'&&x.exhausted),true);});

test('content batch 13: Burning Sun special summons a Brave directly combined and refreshes Apollo host',()=>{let m=base();const host=physical('BS13-X01','apollo',3,true);const brave=physical('BS13-051','brave',0,false);m.players.player1.field.spirits=[host];m.players.player1.hand=[brave];const a=ability('BS13-073','bs13-073-flash-combine-auto33');const r=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceCard:byId.get('BS13-073'),sourceInstanceId:'magic'});const placed=r.match.players.player1.field.other.find(x=>x.instanceId==='brave');assert.equal(placed?.combinedWith,'apollo');assert.equal(r.match.players.player1.field.spirits[0].exhausted,false);});

test('content batch 13: limited-use wrapper stops after its configured per-turn count',()=>{let m=base();const action={type:'upToNTimesPerTurn',key:'assault-test',limit:3,actions:[{type:'draw',player:'self',count:1}]};const ctx={sourcePlayerId:'player1',sourceInstanceId:'perseus',sourceCard:byId.get('BS13-X06')};const before=m.players.player1.hand.length;for(let i=0;i<4;i++)m=resolveActionList(m,[action],index,ctx).match;assert.equal(m.players.player1.hand.length-before,3);});

test('content batch 13: Evilglider relays a selected Spirit destroyed event without destroying it',()=>{const a=ability('BS13-052','bs13-052-summon-relay-destroyed-auto33');assert.equal(a.actions[0].onSelect.type,'emitSourceEvent');assert.equal(a.actions[0].onSelect.event,'whenDestroyed');});

test('content batch 13: Perseus structures dynamic Brave destruction and Assault 3',()=>{const summon=ability('BS13-X06','bs13-x06-summon-brave-destroy-auto33');const assault=ability('BS13-X06','bs13-x06-assault3-auto33');assert.equal(summon.actions[0].targetCountFrom.selector.cardTypes[0],'nexus');assert.equal(assault.actions[0].limit,3);});
