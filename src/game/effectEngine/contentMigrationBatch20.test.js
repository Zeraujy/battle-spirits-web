import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { makePhysicalCard } from '../state.js';
import { resolveActionList } from './actionResolver.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=(Array.isArray(raw)?raw:raw.cards).map(normalizeCard);
const index=makeCardIndex(cards);
const get=(id)=>cards.find(c=>c.id===id&&c.set==='BSC49');
const ability=(id,aid)=>get(id).abilities.find(a=>a.id===aid);
function physical(id,instance,regular=2,exhausted=false){return {...makePhysicalCard(id,index),instanceId:instance,cores:{regular,soul:false},exhausted};}
function base(){return {turnPlayerId:'player1',phase:'attack',players:{player1:{id:'player1',life:5,reserve:5,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null},player2:{id:'player2',life:5,reserve:5,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null}},temporary:{}};}

test('content batch 20 exposes generic Advent actions',()=>{const types=listSupportedCoreActionTypes();for(const t of ['performAdvent','specialSummonSelected','revealUntilAndSummon'])assert.equal(types.includes(t),true);assert.ok(types.length>=83);});
test('content batch 20: Mars-Dragoon LT uses Advent and symbol-count targeting',()=>{assert.equal(ability('BSC49-008','bsc49-008-advent-auto40').actions[0].type,'performAdvent');assert.equal(ability('BSC49-008','bsc49-008-advented-auto40').actions[0].selector.maximumSymbols,1);});
test('content batch 20: Advent preserves host state, pays Soul Core, and dispatches event',()=>{let m=base();const host=physical('BSC49-008','host',4,true);const advent=physical('BSC49-008','advent',0,false);m.players.player1.field.spirits=[host];m.players.player1.hand=[advent];const r=resolveActionList(m,[{type:'performAdvent',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],colors:['red'],minimumCost:4}}],index,{sourcePlayerId:'player1',sourceInstanceId:'advent',sourcePhysical:advent,sourceCard:get('BSC49-008')});assert.equal(r.manualResolutionNeeded,false);const top=r.match.players.player1.field.spirits[0];assert.equal(top.cardId,'BSC49-008');assert.equal(top.exhausted,true);assert.equal(top.cores.regular,4);assert.equal(top.adventSource.cardId,'BSC49-008');assert.equal(r.match.players.player1.soulCore.zone,'trash');assert.equal(r.match.deferredCanonicalEvents.at(-1).event,'whenAdvented');});
test('content batch 20: Nobunagard-Zeuses LT can select Braves from hand/Open Area',()=>{const a=ability('BSC49-027','bsc49-027-summon-auto40');assert.deepEqual(a.actions[0].selector.zones,['hand','openArea']);assert.equal(a.actions[0].onSelect.type,'specialSummonSelected');});
test('content batch 20: Pegaseeda LT uses reveal-until special summon',()=>{assert.equal(ability('BSC49-040','bsc49-040-destroyed-reveal-auto40').actions[0].yesActions[0].type,'revealUntilAndSummon');});
test('content batch 20: Tri-Poseidos LT reuses Accel/Open Area foundation',()=>{const a=ability('BSC49-049','bsc49-049-accel-auto40');assert.equal(a.actions[0].type,'payAccelCost');assert.equal(a.actions[0].actions.at(-1).type,'moveSourceToOpenArea');});
test('content batch 20: Brave wave structures combine conditions',()=>{for(const [id,aid] of [['BSC49-056','bsc49-056-combine-auto40'],['BSC49-058','bsc49-058-combine-auto40'],['BSC49-066','bsc49-066-combine-auto40'],['BSC49-067','bsc49-067-combine-auto40'],['BSC49-068','bsc49-068-combine-auto40'],['BSC49-073','bsc49-073-combine-auto40']])assert.ok(ability(id,aid));});
test('content batch 20: Alfothr LT observes opponent attacks while combined',()=>{const a=ability('BSC49-066','bsc49-066-opp-attack-auto40');assert.equal(a.trigger.scope,'controllerField');assert.equal(a.trigger.eventPlayer,'opponent');assert.equal(a.requiresCombined,true);});
test('content batch 20: Gecko-Glider LT grants combined Heavy Armor colors',()=>{const a=ability('BSC49-067','bsc49-067-heavy-armor-auto40');assert.deepEqual(a.actions[0].value,['purple','yellow']);});
test('content batch 20: Vulcan-Arms LT structures draw-three discard-two',()=>{const a=ability('BSC49-073','bsc49-073-summon-auto40');assert.equal(a.actions[0].yesActions[0].count,3);assert.equal(a.actions[0].yesActions[1].count,2);});
