import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { makePhysicalCard } from '../state.js';
import { resolveActionList } from './actionResolver.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';
const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=(Array.isArray(raw)?raw:raw.cards).map(normalizeCard); const index=makeCardIndex(cards);
const get=(id)=>cards.find(c=>c.id===id&&c.set==='BSC49'); const ability=(id,aid)=>get(id).abilities.find(a=>a.id===aid);
function physical(id,instance,regular=2,exhausted=false){return {...makePhysicalCard(id,index),instanceId:instance,cores:{regular,soul:false},exhausted};}
function base(){return {turnPlayerId:'player1',activePlayerId:'player1',phase:'attack',players:{player1:{id:'player1',life:5,reserve:12,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null},player2:{id:'player2',life:5,reserve:12,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null}},temporary:{}};}
test('batch22 keeps Core Action Library stable',()=>assert.equal(listSupportedCoreActionTypes().length,83));
test('batch22 coverage advances BSC49 to 72 resolved',()=>{const c=JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage-v5.1.0-content-batch22.json',import.meta.url),'utf8'));const r=c.cards.filter(x=>x.set==='BSC49');assert.equal(r.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,72);assert.equal(r.filter(x=>!['AUTOMATED','NO_EFFECT'].includes(x.status)).length,45);});
test('Sailfish LT structures attack/block Core gain and immunity',()=>{assert.equal(ability('BSC49-030','bsc49-030-attack-core-auto42').trigger.event,'whenAttacks');assert.equal(ability('BSC49-030','bsc49-030-immunity-auto42').actions[0].property,'effectImmunityCardTypes');});
test('Slei-Uranus LT structures cost override, bounce and armor',()=>{assert.equal(ability('BSC49-035','bsc49-035-hand-cost-auto42').actions[0].value,4);assert.deepEqual(ability('BSC49-035','bsc49-035-armor-auto42').actions[0].value,['green','white','yellow']);});
test('Fort-Golem LT structures Assault and attack destruction',()=>{assert.equal(ability('BSC49-048','bsc49-048-assault-auto42').actions[0].type,'oncePerTurn');assert.equal(ability('BSC49-048','bsc49-048-destroy-auto42').actions[0].onSelect.type,'destroy');});
test('Hyo-Katchu LT structures summon exhaustion and combine',()=>{assert.equal(ability('BSC49-063','bsc49-063-summon-auto42').actions[0].maxTargets,2);assert.equal(ability('BSC49-063','bsc49-063-combine-auto42').combineCondition.minimumCost,4);});
test('New Life LT structures Core Step draw and Life response',()=>{assert.equal(ability('BSC49-077','bsc49-077-core-step-auto42').trigger.event,'coreStep');assert.equal(ability('BSC49-077','bsc49-077-life-auto42').actions[0].onSelect.type,'addCoreFromVoid');});
test('Great Wall LT structures attack designation and battle ending',()=>{assert.equal(ability('BSC49-079','bsc49-079-designate-auto42').actions[0].onSelect.type,'requireAttackIfAble');assert.equal(ability('BSC49-079','bsc49-079-end-battle-auto42').actions[0].yesActions[1].type,'endCurrentStep');});
test('Golden Belfry LT structures Nexus protection and Life gain',()=>{assert.equal(ability('BSC49-081','bsc49-081-protect-auto42').actions[0].property,'cannotBeDestroyedByOpponentEffects');assert.equal(ability('BSC49-081','bsc49-081-life-auto42').actions[0].type,'healLife');});
test('Crown LT structures Life reveal summon and refresh punishment',()=>{assert.equal(ability('BSC49-082','bsc49-082-life-auto42').actions[0].type,'revealTopAndSummonOrHand');assert.equal(ability('BSC49-082','bsc49-082-refresh-destroy-auto42').actions[0].type,'destroy');});
test('Ancient Battleship Stern/Keel structure continuous battlefield rules',()=>{assert.equal(ability('BSC49-083','bsc49-083-life-lock-auto42').actions[0].property,'voidToLifeDisabled');assert.equal(ability('BSC49-085','bsc49-085-block-auto42').actions[0].property,'canBlockWhileExhausted');});
test('Revive Draw LT structures Burst and Main choices',()=>{assert.equal(ability('BSC49-087','bsc49-087-burst-auto42').trigger.event,'burstLifeDecrease');assert.equal(ability('BSC49-087','bsc49-087-main-auto42').actions[0].type,'chooseOption');});
