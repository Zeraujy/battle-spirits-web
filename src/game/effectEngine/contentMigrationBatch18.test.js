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

test('content batch 18: BSC49 Wave 3 resolves ten more cards and leaves 86 pending',()=>{const cov=JSON.parse(fs.readFileSync(new URL('../../../data/effects/history/effect-coverage-v5.1.0-content-batch18.json',import.meta.url),'utf8'));const rows=cov.cards.filter(x=>x.set==='BSC49');assert.equal(rows.length,117);assert.equal(rows.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,86);assert.equal(rows.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,31);});

test('content batch 18: Shurikeraptor LT structures Life Burst and exact-BP target',()=>{const burst=ability('BSC49-004','bsc49-004-burst-auto38');const kill=ability('BSC49-004','bsc49-004-attack-kill-auto38');assert.equal(burst.trigger.scope,'controllerHand');assert.equal(kill.actions[0].selector.minimumBPFromSource,true);assert.equal(kill.actions[0].selector.maximumBPFromSource,true);});

test('content batch 18: Glasyahound LT uses Trash-native Immortality 2/4/6',()=>{const a=ability('BSC49-013','bsc49-013-immortality-trigger-auto38');assert.equal(a.trigger.scope,'controllerTrash');assert.match(JSON.stringify(a.conditions),/2/);assert.match(JSON.stringify(a.conditions),/6/);});

test('content batch 18: Corocorn LT can direct-combine a Brave from hand',()=>{const a=ability('BSC49-023','bsc49-023-brave-combine-auto38');assert.equal(a.actions[0].type,'oncePerTurn');assert.match(JSON.stringify(a),/specialSummonBraveCombinedFromHand/);});

test('content batch 18: Moonshouuo LT blocks generic opposing effect Life damage',()=>{let m=base();const src=physical('BSC49-031','moon',2);m.players.player1.field.spirits=[src];const cont=ability('BSC49-031','bsc49-031-effect-shield-auto38');m=resolveActionList(m,cont.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'moon',sourcePhysical:src,sourceCard:byId.get('BSC49-031')}).match;const before=m.players.player1.life;const enemy=physical('BSC49-004','enemy',2);const r=resolveActionList(m,[{type:'dealLifeDamage',player:'opponent',count:1}],index,{sourcePlayerId:'player2',sourceInstanceId:'enemy',sourcePhysical:enemy,sourceCard:byId.get('BSC49-004')});assert.equal(r.match.players.player1.life,before);});

test('content batch 18: Minstrel Orphe LT locks both Trash zones',()=>{const a=ability('BSC49-045','bsc49-045-trash-immunity-auto38');const j=JSON.stringify(a);assert.match(j,/effectImmunityAll/);assert.match(j,/effectsDisabled/);});

test('content batch 18: Argo-Golem LT structures wipe plus up-to-four Nexus conversion',()=>{const a=ability('BSC49-050','bsc49-050-attack-form-auto38');assert.equal(a.actions[0].type,'selectMultipleTargets');assert.equal(a.actions[0].maxTargets,4);assert.match(JSON.stringify(a),/ancientBattleshipSpiritForm/);});

test('content batch 18: Irritaban LT can host a Brave in Spirit form',()=>{const a=ability('BSC49-051','bsc49-051-host-brave-auto38');assert.equal(a.actions[0].property,'canHostBrave');});

test('content batch 18: Zuganake LT observes Dark Snake leaving while source is in Trash',()=>{const a=ability('BSC49-059','bsc49-059-trash-return-auto38');assert.equal(a.trigger.scope,'controllerTrash');assert.match(JSON.stringify(a.conditions),/Dark Snake/);});

test('content batch 18: Brigade Skyscraper LT offers deploy mill-or-draw and Purple attack drain',()=>{const d=ability('BSC49-076','bsc49-076-deploy-auto38');const a=ability('BSC49-076','bsc49-076-attack-observer-auto38');assert.equal(d.actions[0].type,'chooseOption');assert.equal(a.actions[0].onSelect.type,'removeCore');});

test('content batch 18: Argo Attack LT mills four, deploys Ancient Battleships, and exposes Flash pump',()=>{const main=ability('BSC49-101','bsc49-101-main-auto38');const flash=ability('BSC49-101','bsc49-101-flash-auto38');assert.equal(main.actions[0].count,4);assert.equal(main.actions[1].type,'deployFromTrash');assert.match(JSON.stringify(flash),/5000/);});
