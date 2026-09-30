import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { getCurrentLevel } from '../selectors.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';
import { declareAttack } from '../battle.js';

const rawCards = JSON.parse(fs.readFileSync(new URL('../../data/cards.json', import.meta.url), 'utf8'));
const normalized = rawCards.map(normalizeCard);
const index = makeCardIndex(normalized);
const byId = new Map(normalized.map((c) => [String(c.id), c]));
const deck = Array.from({ length: 40 }, () => 'BS13-001');
const ability = (cardId, id) => byId.get(cardId)?.abilities?.find((a) => a.id === id);
function base(){ const m=createMatch({player1:{name:'A',deck},player2:{name:'B',deck},firstPlayerId:'player1',cardIndex:index,random:()=>0.25}); m.phase='attack'; m.turnNumber=2; m.activePlayerId='player1'; m.players.player1.reserve=20; m.players.player2.reserve=20; return m; }
function physical(cardId, instanceId, cores=1){ return {...makePhysicalCard(cardId,index),instanceId,cores:{regular:cores,soul:false},exhausted:false}; }

test('content batch 11: BS13 Wave 3 resolves ten more cards and leaves 40 pending',()=>{
  const coverage=JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage-v5.1.0-content-batch11.json',import.meta.url),'utf8'));
  const rows=coverage.cards.filter(x=>x.set==='BS13');
  assert.equal(rows.length,90);
  assert.equal(rows.filter(x=>x.status==='UNSTRUCTURED_TEXT').length,40);
  assert.equal(rows.filter(x=>['AUTOMATED','NO_EFFECT'].includes(x.status)).length,50);
});

test('content batch 11: Core Action Library exposes deploy-from-trash and forced-level semantics',()=>{
  const types=listSupportedCoreActionTypes();
  assert.equal(types.includes('deployFromTrash'),true);
  assert.equal(types.includes('forceLevel'),true);
  assert.ok(types.length >= 71);
});

test('content batch 11: Agravain carries Immortality cause into its follow-up summon',()=>{
  assert.equal(ability('BS13-014','bs13-014-immortality-trigger-auto31').actions[0].cause,'immortality');
  assert.equal(ability('BS13-014','bs13-014-summon-auto31').conditions[0].type,'specialSummonCause');
});

test('content batch 11: Dragonaga observes canonical cardExhausted events',()=>{
  const a=ability('BS13-016','bs13-016-dragonfolk-exhaust-auto31');
  assert.equal(a.trigger.event,'cardExhausted');
  assert.equal(a.actions[0].onSelect.type,'removeCore');
});

test('content batch 11: Minogamen reacts only to itself moving deck to Trash by opponent',()=>{
  const a=ability('BS13-034','bs13-034-deck-discard-auto31');
  assert.deepEqual(a.conditions.map(x=>x.type),['eventSourceIsSource','eventMovedFromZone','eventMoveDestination','eventMovedByOpponent']);
  assert.equal(a.actions[0].type,'specialSummonSource');
});

test('content batch 11: Irritaban attack tax is paid from Reserve into Core Trash',()=>{
  let match=base();
  const nexus=physical('BS13-043','tax',1); const attacker=physical('BS13-001','attacker',1);
  match.players.player1.field.spirits=[attacker]; match.players.player1.field.nexuses=[nexus]; match.players.player1.reserve=5;
  match=dispatchEffectEvent(match,{event:'continuous',sourcePlayerId:'player1',sourceInstanceId:'tax',eventPlayerId:'player1'},index).match;
  const result=declareAttack(match,'player1','attacker',index);
  assert.equal(result.ok,true);
  assert.equal(result.match.players.player1.reserve,4);
  assert.equal(result.match.players.player1.trashCores,1);
});

test('content batch 11: Forbbid-Vulture structures Trash deployment and delayed Attack Step ending',()=>{
  assert.equal(ability('BS13-059','bs13-059-summon-auto31').actions[0].type,'deployFromTrash');
  assert.equal(ability('BS13-059','bs13-059-battle-auto31').actions[0].type,'scheduleAttackStepEndAfterBattle');
});

test('content batch 11: Pegasus Flap marks battle resolution to skip BP comparison',()=>{
  const a=ability('BS13-082','bs13-082-flash-auto31');
  assert.equal(a.actions[0].restriction.skipBPComparison,true);
  assert.equal(a.actions[1].onSelect.type,'refresh');
});

test('content batch 11: Galaxy Eternal Requiem forces highest printed level for the turn',()=>{
  let match=base(); const low=physical('BS13-001','low',1); match.players.player1.field.spirits=[low];
  const before=getCurrentLevel(byId.get('BS13-001'),low)?.level;
  const action=ability('BS13-083','bs13-083-flash-auto31');
  const source={...physical('BS13-083','magic',0),cardType:'magic'}; match.players.player1.hand=[source];
  const r=dispatchEffectEvent(match,{event:'magicFlash',sourcePlayerId:'player1',sourceInstanceId:'magic',sourcePhysical:source,sourceCardId:'BS13-083',eventPlayerId:'player1'},index);
  const current=r.match.players.player1.field.spirits.find(x=>x.instanceId==='low');
  assert.ok(Number(getCurrentLevel(byId.get('BS13-001'),current)?.level||0)>=Number(before||0));
  assert.equal(getCurrentLevel(byId.get('BS13-001'),current)?.level,Math.max(...byId.get('BS13-001').levels.map(x=>x.level)));
});

test('content batch 11: Asklepiooze and Strikewurm-Leo expose reusable replacement/core/armor observers',()=>{
  assert.equal(ability('BS13-X02','bs13-x02-bp-save-auto31').actions[0].type,'preventEvent');
  assert.equal(ability('BS13-X02','bs13-x02-block-auto31').actions[0].onSelect.destination,'void');
  assert.deepEqual(ability('BS13-X04','bs13-x04-heavy-armor-auto31').actions[0].value,['purple','green','white','yellow']);
  assert.equal(ability('BS13-X04','bs13-x04-refresh-auto31').trigger.event,'cardExhausted');
});
