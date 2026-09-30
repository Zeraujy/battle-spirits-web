import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { resolveActionList } from './actionResolver.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=raw.map(normalizeCard); const index=makeCardIndex(cards); const byId=new Map(cards.map(c=>[String(c.id),c]));
const deck=Array.from({length:40},()=> 'BSC49-003');
function base(){const m=createMatch({player1:{name:'A',deck},player2:{name:'B',deck},firstPlayerId:'player1',cardIndex:index,random:()=>0.2});m.turnNumber=2;m.phase='attack';m.activePlayerId='player1';m.players.player1.reserve=30;m.players.player2.reserve=30;return m;}
function physical(id,instance,cores=2,exhausted=false){return {...makePhysicalCard(id,index),instanceId:instance,cores:{regular:cores,soul:false},exhausted};}
function ability(id,a){return byId.get(id)?.abilities?.find(x=>x.id===a);}

test('content batch 19: BSC49 Wave 4 resolves ten more cards and leaves 76 pending',()=>{const cov=JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage-v5.1.0-content-batch19.json',import.meta.url),'utf8'));const rows=cov.cards.filter(x=>x.set==='BSC49');assert.equal(rows.length,117);assert.equal(rows.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,76);assert.equal(rows.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,41);});

test('content batch 19: Open Area is a real player zone and Accel moves its source there',()=>{let m=base();const src=physical('BSC49-002','aquilam',0);m.players.player1.hand=[src];const a=ability('BSC49-002','bsc49-002-accel-auto39');const actions=a.actions[0].actions;const r=resolveActionList(m,actions,index,{sourcePlayerId:'player1',sourceInstanceId:'aquilam',sourcePhysical:src,sourceCard:byId.get('BSC49-002'),selectedTargets:[]});assert.equal(r.match.players.player1.hand.some(x=>x.instanceId==='aquilam'),false);assert.equal(r.match.players.player1.openArea.some(x=>x.instanceId==='aquilam'),true);});

test('content batch 19: Shamcaesar LT exposes generic Accel cost and Open Area routing',()=>{const a=ability('BSC49-001','bsc49-001-accel-auto39');assert.equal(a.trigger.scope,'controllerHand');assert.equal(a.actions[0].type,'payAccelCost');assert.equal(a.actions[0].cost,3);assert.equal(a.actions[0].actions.at(-1).type,'moveSourceToOpenArea');});

test('content batch 19: Aquilam LT structures Accel pump and attack draw/pump',()=>{const accelA=ability('BSC49-002','bsc49-002-accel-auto39');const atk=ability('BSC49-002','bsc49-002-attack-auto39');assert.match(JSON.stringify(accelA),/3000/);assert.equal(atk.actions[0].type,'draw');});

test('content batch 19: Swordoll LT uses core-count targeting and dual route',()=>{const a=ability('BSC49-009','bsc49-009-accel-auto39');assert.equal(a.actions[0].actions[0].selector.maximumCores,1);assert.match(JSON.stringify(a),/bottom/);});

test('content batch 19: Mahavasuki LT structures opponent-authored exchange and summon draw',()=>{const a=ability('BSC49-015','bsc49-015-accel-auto39');const summon=ability('BSC49-015','bsc49-015-summon-auto39');assert.equal(a.actions[0].actions[0].chooser,'opponent');assert.match(JSON.stringify(summon),/draw/);});

test('content batch 19: Mountain-Seikai LT has generic End Step refresh and battle observer',()=>{const e=ability('BSC49-026','bsc49-026-end-auto39');const b=ability('BSC49-026','bsc49-026-battle-auto39');assert.equal(e.trigger.event,'endStep');assert.equal(b.conditions[0].type,'eventInvolvesControllerSpirit');});

test('content batch 19: Igua-Buggy LT Accel excludes Braved Spirits and draws after bounce',()=>{const a=ability('BSC49-028','bsc49-028-accel-auto39');const j=JSON.stringify(a);assert.match(j,/\"braved\":false/);assert.match(j,/\"draw\"/);});

test('content batch 19: Dolphing LT creates instance-scoped Life protection',()=>{const a=ability('BSC49-032','bsc49-032-accel-auto39');assert.match(JSON.stringify(a),/blockSpiritAttackLifeDamageFromInstanceIds/);});

test('content batch 19: Valkyrie-Mist LT structures bottom-deck Accel and effect immunity',()=>{const a=ability('BSC49-034','bsc49-034-accel-auto39');const i=ability('BSC49-034','bsc49-034-immunity-auto39');assert.match(JSON.stringify(a),/returnToBottomDeck/);assert.equal(i.actions[0].property,'effectImmunityCardTypes');});

test('content batch 19: BattleDragon Elginius LT constrains Accel to Cost 3/4',()=>{const a=ability('BSC49-044','bsc49-044-accel-auto39');const sel=a.actions[0].actions[0].selector;assert.equal(sel.minimumCost,3);assert.equal(sel.maximumCost,4);});

test('content batch 19: Chihyu LT routes LV3 target to bottom deck and retains combined Flash',()=>{const a=ability('BSC49-070','bsc49-070-accel-auto39');const f=ability('BSC49-070','bsc49-070-combined-flash-auto39');assert.equal(a.actions[0].actions[0].selector.minimumLevel,3);assert.equal(f.requiresCombined,true);});
