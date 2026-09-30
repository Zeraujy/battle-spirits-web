import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=(Array.isArray(raw)?raw:raw.cards).map(normalizeCard); const index=makeCardIndex(cards);
const get=(id)=>cards.find(c=>c.id===id&&c.set==='BSC49'); const ability=(id,aid)=>get(id).abilities.find(a=>a.id===aid);

test('batch24 keeps Core Action Library stable',()=>assert.ok(listSupportedCoreActionTypes().length>=83));
test('batch24 coverage advances BSC49 to 91 resolved and global fallback to 26 cards',()=>{const c=JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage-v5.1.0-content-batch24.json',import.meta.url),'utf8'));const r=c.cards.filter(x=>x.set==='BSC49');assert.equal(r.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,91);assert.equal(r.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,26);const unresolved=c.cards.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length;assert.equal(unresolved,26);assert.ok((unresolved/c.cards.length*100)<10);});
test('Dragonaga LT structures Trash recursion and summon draw',()=>{assert.equal(ability('BSC49-012','bsc49-012-trash-summon-auto44').actions[0].type,'oncePerTurn');assert.equal(ability('BSC49-012','bsc49-012-summon-draw-auto44').actions[0].type,'draw');});
test('Helen LT moves up to three hand cards to Open Area and draws per selection',()=>{const a=ability('BSC49-038','bsc49-038-summon-open-area-auto44').actions[0];assert.equal(a.maxTargets,3);assert.equal(a.onSelect.toZone,'openArea');assert.equal(a.afterSelect[0].amountPerSelected,1);});
test('Hipogrifee LT structures Super Sacred Life branches and block tax',()=>{assert.equal(ability('BSC49-039','bsc49-039-blocked-draw-auto44').actions[0].from,'bottom');assert.equal(ability('BSC49-039','bsc49-039-direct-life-auto44').actions[0].target,'life');assert.equal(ability('BSC49-039','bsc49-039-block-tax-auto44').actions[0].property,'blockRequiresReserveCoreToTrash');});
test('Oodsutsunanafushi LT structures full-hand discard, opponent-hand draw count and both refresh observers',()=>{const a=ability('BSC49-062','bsc49-062-summon-auto44').actions[0];assert.equal(a.asManyAsPossible,true);assert.equal(a.afterSelect[0].targetCountFrom.owner,'opponent');assert.equal(ability('BSC49-062','bsc49-062-hand-refresh-auto44').actions[0].actions[0].target,'combinedHost');});
test('Manekicat LT special summons from hand/Open Area with summon trigger suppressed',()=>{const a=ability('BSC49-064','bsc49-064-summon-auto44').actions[0];assert.deepEqual(a.selector.zones,['hand','openArea']);assert.equal(a.onSelect.type,'specialSummonSelected');assert.equal(a.onSelect.suppressWhenSummoned,true);});
test('Perytorn LT reacts to opposing deck discard and locks further mill',()=>{const a=ability('BSC49-071','bsc49-071-deck-discard-auto44');assert.equal(a.actions[0].type,'specialSummonSource');assert.equal(a.actions[1].property,'maxDeckDiscardPerTurn');assert.equal(a.actions[1].value,0);});
test('Compass LT structures Trash lock, Argo cost support and Ancient Battleship level rule',()=>{assert.equal(ability('BSC49-086','bsc49-086-trash-lock-auto44').actions[0].property,'trashToHandBlocked');assert.equal(ability('BSC49-086','bsc49-086-argo-cost-auto44').actions[0].property,'ancientBattleshipExhaustForArgoCostPayment');assert.equal(ability('BSC49-086','bsc49-086-level-auto44').actions[0].level,2);});
