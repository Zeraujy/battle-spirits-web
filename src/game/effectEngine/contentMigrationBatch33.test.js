import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { resolveActionList } from './actionResolver.js';
import { collectTargets } from './targetingEngine.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const raw=JSON.parse(fs.readFileSync(new URL('../../data/cards.json',import.meta.url),'utf8'));
const cards=(Array.isArray(raw)?raw:raw.cards).map(normalizeCard); const index=makeCardIndex(cards);
const get=(id)=>cards.find(c=>c.id===id); const ability=(id,aid)=>get(id).abilities.find(a=>a.id===aid);
const physical=(cardId,instanceId,cores=0,exhausted=false)=>({cardId,instanceId,cores:{regular:cores,soul:false},exhausted,combinedWith:null,flags:{}});
function base(){return {turnNumber:9,activePlayerId:'player1',firstPlayerId:'player2',phase:'attack',players:{player1:{id:'player1',life:5,reserve:10,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}},player2:{id:'player2',life:5,reserve:10,trashCores:0,soulCore:{zone:'reserve',instanceId:null},hand:[],deck:[],trash:[],revealed:[],openArea:[],removed:[],field:{spirits:[],nexuses:[],other:[]},burst:null,turnFlags:{}}},temporary:{},persistentEffects:{}};}

test('batch33 Core Action Library adds reusable Manifest support',()=>{assert.ok(listSupportedCoreActionTypes().includes('performManifest'));assert.ok(listSupportedCoreActionTypes().length>=87);});

test('CP01 has structured Manifest and Star World Release abilities',()=>{assert.ok(ability('BSC49-CP01','bsc49-cp01-manifest-auto53'));assert.ok(ability('BSC49-CP01','bsc49-cp01-summon-release-auto53'));assert.ok(ability('BSC49-CP01','bsc49-cp01-attack-release-auto53'));assert.ok(get('BSC49-CP01').families.includes('Devotee'));assert.ok(get('BSC49-CP01').families.includes('Galaxian'));});

test('Manifest spends Soul Core, pays from eligible Contractor Dan, and summons source',()=>{let m=base();const source=physical('BSC49-CP01','cp01');const dan=physical('BSC49-CP02','dan',6);m.players.player1.hand=[source];m.players.player1.field.nexuses=[dan];const r=resolveActionList(m,[{type:'performManifest',selector:{owner:'self',zones:['field'],cardTypes:['nexus'],nameIncludes:'The GalaxianContractor Dan'},minimumTargetCores:6,costFromTarget:1,coresToPlace:1}],index,{sourcePlayerId:'player1',sourceInstanceId:'cp01',sourcePhysical:source,sourceCard:get('BSC49-CP01')});assert.equal(r.manualResolutionNeeded,false);assert.equal(r.match.players.player1.soulCore.zone,'trash');assert.equal(r.match.players.player1.field.nexuses[0].cores.regular,5);assert.ok(r.match.players.player1.field.spirits.some(x=>x.instanceId==='cp01'));});

test('highestBPOnly targets only tied highest-BP opposing cards',()=>{let m=base();m.players.player2.field.spirits=[physical('BSC49-001','a',1),physical('BSC49-008','b',5)];const targets=collectTargets(m,index,{owner:'opponent',zones:['field'],cardTypes:['spirit'],'highestBPOnly':true},{sourcePlayerId:'player1'});assert.equal(targets.length,1);assert.equal(targets[0].physical.instanceId,'b');});

test('Star World Release moves a GranWalker core to source and routes eligible reveal into summon',()=>{let m=base();const source=physical('BSC49-CP01','cp01',1);const dan=physical('BSC49-CP02','dan',2);m.players.player1.field.spirits=[source];m.players.player1.field.nexuses=[dan];m.players.player1.deck=[physical('BSC49-002','top')];const a=ability('BSC49-CP01','bsc49-cp01-summon-release-auto53');const core=a.actions[0].noActions[0];const r=resolveActionList(m,[core],index,{sourcePlayerId:'player1',sourceInstanceId:'cp01',sourcePhysical:source,sourceCard:get('BSC49-CP01')});assert.equal(r.manualResolutionNeeded,false);assert.equal(r.match.players.player1.field.nexuses[0].cores.regular,1);assert.ok(r.match.players.player1.field.spirits.find(x=>x.instanceId==='cp01').cores.regular>=2);assert.ok(r.match.players.player1.field.spirits.some(x=>x.instanceId==='top'));});
