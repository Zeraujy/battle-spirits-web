import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { resolveActionList } from './actionResolver.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';
import { getContinuousNumericModifier } from './modifierResolver.js';
import { combineBrave, separateBrave } from '../brave.js';
import { advancePhase } from '../turn.js';

const rawCards=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const normalized=rawCards.map(normalizeCard); const index=makeCardIndex(normalized); const byId=new Map(normalized.map(c=>[String(c.id),c]));
const deck=Array.from({length:40},()=> 'BS13-001');
function base(){const m=createMatch({player1:{name:'A',deck},player2:{name:'B',deck},firstPlayerId:'player1',cardIndex:index,random:()=>0.25});m.turnNumber=2;m.phase='main';m.activePlayerId='player1';m.players.player1.reserve=30;m.players.player2.reserve=30;return m;}
function physical(id,instance,cores=2,exhausted=false,combinedWith=null){return {...makePhysicalCard(id,index),instanceId:instance,cores:{regular:cores,soul:false},exhausted,combinedWith};}
function ability(id,a){return byId.get(id)?.abilities?.find(x=>x.id===a);}

test('content batch 15: BS13 is 90/90 resolved and READY_NO_MANUAL candidate',()=>{const cov=JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage.json',import.meta.url),'utf8'));const rows=cov.cards.filter(x=>x.set==='BS13');assert.equal(rows.length,90);assert.equal(rows.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,0);assert.equal(rows.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,90);});

test('content batch 15: Dream Seal timed suppression action is part of the Core Action Library',()=>{const types=listSupportedCoreActionTypes();assert.equal(types.includes('suppressWhenSummonedForEndSteps'),true);assert.ok(types.length>=78);});

test('content batch 15: Sagitto-Apollodragon can host two Braves while its continuous effect is active',()=>{let m=base();const host=physical('BS13-X01','sagitto',5);const b1=physical('BS13-049','b1',1);const b2=physical('BS13-053','b2',1);m.players.player1.field.spirits=[host];m.players.player1.field.other=[b1,b2];m=dispatchEffectEvent(m,{event:'continuous',sourcePlayerId:'player1',sourceInstanceId:'sagitto',eventPlayerId:'player1'},index).match;const r1=combineBrave(m,'player1','b1','sagitto',index);assert.equal(r1.ok,true);const r2=combineBrave(r1.match,'player1','b2','sagitto',index);assert.equal(r2.ok,true);assert.equal(r2.match.players.player1.field.other.filter(x=>x.combinedWith==='sagitto').length,2);});

test('content batch 15: RudeSaurus locks separation of a Braved Ultra Awaken Spirit',()=>{let m=base();const rex=physical('BS13-005','rex',4);const host=physical('BS13-002','host',2);const brave=physical('BS13-049','b',1,false,'host');m.players.player1.field.spirits=[rex,host];m.players.player1.field.other=[brave];m=dispatchEffectEvent(m,{event:'continuous',sourcePlayerId:'player1',sourceInstanceId:'rex',eventPlayerId:'player1'},index).match;const lock=ability('BS13-005','bs13-005-ultra-lock-auto35');assert.ok(lock);assert.equal(getContinuousNumericModifier(m,index,host,'cannotSeparateBrave')>=0,true);});

test('content batch 15: Dream Seal suppresses When Summoned effects for three owner End Steps',()=>{let m=base();const magic=byId.get('BS13-081');const main=ability('BS13-081','bs13-081-main-auto35');m=resolveActionList(m,main.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'dream',sourceCard:magic}).match;assert.equal(m.persistentEffects.suppressWhenSummonedEndSteps.player1,3);m.phase='attack';m.activePlayerId='player1';m=advancePhase(m,'player1',index).match;assert.equal(m.persistentEffects.suppressWhenSummonedEndSteps.player1,2);m.phase='attack';m.activePlayerId='player1';m=advancePhase(m,'player1',index).match;assert.equal(m.persistentEffects.suppressWhenSummonedEndSteps.player1,1);m.phase='attack';m.activePlayerId='player1';m=advancePhase(m,'player1',index).match;assert.equal(m.persistentEffects.suppressWhenSummonedEndSteps.player1,0);});

test('content batch 15: Snake Slave Main marks a this-turn persistent trigger source',()=>{let m=base();const magic=physical('BS13-075','snake',0);const a=ability('BS13-075','bs13-075-main-enable-auto35');m=resolveActionList(m,a.actions,index,{sourcePlayerId:'player1',sourceInstanceId:'snake',sourcePhysical:magic,sourceCard:byId.get('BS13-075')}).match;m.players.player1.trash=[magic];assert.equal(getContinuousNumericModifier(m,index,magic,'snakeSlaveActivated'),1);});

test('content batch 15: OathGoddess Var structures Ice Wall and opponent Attack Step refresh',()=>{assert.ok(ability('BS13-028','bs13-028-icewall-auto35'));assert.ok(ability('BS13-028','bs13-028-refresh-icewall-auto35'));});

test('content batch 15: Witch Tarangda structures Dark Artes survival and Radiance recovery',()=>{assert.ok(ability('BS13-038','bs13-038-darkartes-save-auto35'));assert.ok(ability('BS13-038','bs13-038-radiance-auto35'));});

test('content batch 15: Argo-Golem structures the four-Ancient-Battleship wipe and Nexus battle form',()=>{assert.ok(ability('BS13-048','bs13-048-summon-wipe-auto35'));assert.ok(ability('BS13-048','bs13-048-battleship-form-auto35'));});

test('content batch 15: Irritaban structures Brave-hosting and Brave attack-effect relay',()=>{assert.ok(ability('BS13-049','bs13-049-host-brave-auto35'));assert.ok(ability('BS13-049','bs13-049-copy-brave-attack-auto35'));});

test('content batch 15: Light Guiding Tower structures Heavy Armor revival and Main Step shutdown',()=>{assert.ok(ability('BS13-067','bs13-067-heavyarmor-revive-auto35'));assert.ok(ability('BS13-067','bs13-067-draw-end-main-auto35'));});
