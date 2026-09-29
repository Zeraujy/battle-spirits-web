import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { getEffectiveBP } from '../selectors.js';
import { advancePhase, completeScheduledAttackStepEnd } from '../turn.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';
import { applyContinuousCollectionModifiers } from './modifierResolver.js';

const rawCards = JSON.parse(fs.readFileSync(new URL('../../data/cards.json', import.meta.url), 'utf8'));
const byId = new Map(rawCards.map((card) => [String(card.id), normalizeCard(card)]));
const custom = [
  normalizeCard({ id: 'B5-FILL', namePT: 'Fill', cardType: 'spirit', colors: ['red'], cost: 0, symbols: ['red'], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: 'B5-RED', namePT: 'Red Spirit', cardType: 'spirit', colors: ['red'], cost: 2, symbols: ['red'], levels: [{ level: 1, cores: 1, bp: 2000 }] }),
  normalizeCard({ id: 'B5-WHITE', namePT: 'White Spirit', cardType: 'spirit', colors: ['white'], cost: 5, symbols: ['white'], families: ['Machine Beast'], levels: [{ level: 1, cores: 1, bp: 4000 }] }),
  normalizeCard({ id: 'B5-GREEN', namePT: 'Green Spirit', cardType: 'spirit', colors: ['green'], cost: 1, symbols: ['green'], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: 'B5-ATTACKER', namePT: 'Attacker', cardType: 'spirit', colors: ['green'], cost: 5, symbols: ['green'], levels: [{ level: 1, cores: 1, bp: 5000 }] })
];
const ids = ['SD10-015','SD10-X01','SD10-X02','SD11-003','SD11-004','SD11-006','SD11-007','SD11-008','SD11-009','SD11-011','SD11-012','SD11-013','SD11-X02'];
const index = makeCardIndex([...ids.map((id) => byId.get(id)), ...custom]);
const deck = Array.from({ length: 40 }, () => 'B5-FILL');

function base() {
  const match = createMatch({ player1: { name: 'A', deck }, player2: { name: 'B', deck }, firstPlayerId: 'player1', cardIndex: index, random: () => 0.25 });
  match.phase = 'attack';
  match.activePlayerId = 'player1';
  match.players.player1.reserve = 20;
  match.players.player2.reserve = 20;
  return match;
}
function physical(cardId, instanceId, regular = 1, exhausted = false, combinedWith = null) {
  return { ...makePhysicalCard(cardId, index), instanceId, cores: { regular, soul: false }, exhausted, combinedWith };
}

test('content batch 5: SD10 and SD11 both reach READY_NO_MANUAL at 18/18', () => {
  const coverage = JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage.json', import.meta.url), 'utf8'));
  const sd10 = coverage.cards.filter((entry) => entry.set === 'SD10');
  const sd11 = coverage.cards.filter((entry) => entry.set === 'SD11');
  assert.equal(sd10.length, 18);
  assert.equal(sd10.every((entry) => ['AUTOMATED', 'NO_EFFECT'].includes(entry.status)), true);
  assert.equal(sd11.length, 18);
  assert.equal(sd11.filter((entry) => ['AUTOMATED', 'NO_EFFECT'].includes(entry.status)).length, 18);
});

test('content batch 5: Core Action Library exposes delayed Attack Step ending and free special summon', () => {
  const types = listSupportedCoreActionTypes();
  assert.equal(types.includes('scheduleAttackStepEndAfterBattle'), true);
  assert.equal(types.includes('specialSummonFromHand'), true);
  assert.equal(types.includes('requireAttackIfAble'), true);
  assert.equal(types.includes('emitSourceEvent'), true);
  assert.equal(types.length, 64);
});

test('content batch 5: Fire Wall destroys a Red Spirit and schedules the Attack Step to end after the battle', () => {
  let match = base();
  match.activePlayerId = 'player2';
  match.players.player1.field.spirits = [physical('B5-RED', 'red-cost', 1)];
  match.battle = { id: 'b-firewall', stage: 'flash2', attackerPlayerId: 'player2', defenderPlayerId: 'player1', attackerInstanceId: 'enemy-attacker', blockerInstanceId: null };
  const result = dispatchEffectEvent(match, { event: 'magicFlash', sourcePlayerId: 'player1', sourceCardId: 'SD10-015', sourcePhysical: physical('SD10-015', 'fire-wall', 0) }, index);
  assert.equal(result.match.players.player1.field.spirits.some((card) => card.instanceId === 'red-cost'), false);
  assert.equal(result.match.temporary?.endAttackStepAfterBattle?.battleId, 'b-firewall');
  const afterBattle = completeScheduledAttackStepEnd({ ...result.match, battle: null }, index);
  assert.equal(afterBattle.completed, true);
  assert.equal(afterBattle.match.phase, 'end');
  assert.equal(afterBattle.match.temporary?.endAttackStepAfterBattle, null);
});

test('content batch 5: Shining-Dragon special-summons one Red Brave without paying its printed cost', () => {
  let match = base();
  match.phase = 'main';
  match.players.player1.field.spirits = [physical('SD10-X01', 'shining', 1)];
  match.players.player1.hand = [physical('SD10-X02', 'free-brave', 0)];
  const reserveBefore = match.players.player1.reserve;
  const result = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player1', sourceInstanceId: 'shining' }, index);
  assert.equal(result.match.players.player1.hand.some((card) => card.instanceId === 'free-brave'), false);
  assert.equal(result.match.players.player1.field.other.some((card) => card.instanceId === 'free-brave'), true);
  assert.equal(result.match.players.player1.reserve, reserveBefore - 1);
});

test('content batch 5: Bran-Falcon gives all White Spirits +2000 BP during the opponent Attack Step', () => {
  let match = base();
  match.activePlayerId = 'player2';
  match.players.player1.field.spirits = [physical('SD11-006', 'falcon', 1), physical('B5-WHITE', 'white-ally', 1)];
  const before = getEffectiveBP(match, index, match.players.player1.field.spirits[1]);
  const result = dispatchEffectEvent(match, { event: 'attackStep', eventPlayerId: 'player2', context: { eventPlayerId: 'player2' } }, index);
  const ally = result.match.players.player1.field.spirits.find((card) => card.instanceId === 'white-ally');
  assert.equal(getEffectiveBP(result.match, index, ally), before + 2000);
});

test('content batch 5: Jet-Gannet refreshes its combined host when an opposing 4000+ BP Spirit attacks', () => {
  let match = base();
  match.activePlayerId = 'player2';
  match.players.player1.field.spirits = [physical('B5-WHITE', 'host', 1, true)];
  match.players.player1.field.other = [physical('SD11-011', 'gannet', 1, false, 'host')];
  match.players.player2.field.spirits = [physical('B5-ATTACKER', 'attacker', 1)];
  const result = dispatchEffectEvent(match, { event: 'whenAttacks', sourcePlayerId: 'player2', sourceInstanceId: 'attacker' }, index);
  assert.equal(result.match.players.player1.field.spirits.find((card) => card.instanceId === 'host').exhausted, false);
});

test('content batch 5: Underground Lake gives a blocking Machine Beast one Core from the Void', () => {
  let match = base();
  match.activePlayerId = 'player2';
  match.players.player1.field.nexuses = [physical('SD11-012', 'lake', 2)];
  match.players.player1.field.spirits = [physical('B5-WHITE', 'machine-beast', 2)];
  const result = dispatchEffectEvent(match, { event: 'whenBlocks', sourcePlayerId: 'player1', sourceInstanceId: 'machine-beast', eventPlayerId: 'player1' }, index);
  assert.equal(result.match.players.player1.field.spirits.find((card) => card.instanceId === 'machine-beast').cores.regular, 3);
});

test('content batch 5: HuntingMachineBeast moves one opponent Life to Reserve only after winning a blocked BP comparison', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD11-009', 'jackal', 1)];
  const lifeBefore = match.players.player2.life;
  const reserveBefore = match.players.player2.reserve;
  const result = dispatchEffectEvent(match, {
    event: 'afterBattleResolution',
    sourcePlayerId: 'player1',
    sourceInstanceId: 'jackal',
    context: {
      sourceInstanceId: 'jackal',
      blockerInstanceId: 'jackal',
      attackerInstanceId: 'enemy',
      cause: 'bpComparison',
      destroyed: [{ playerId: 'player2', instanceId: 'enemy', cardId: 'B5-ATTACKER', cardType: 'spirit' }]
    }
  }, index);
  assert.equal(result.match.players.player2.life, lifeBefore - 1);
  assert.equal(result.match.players.player2.reserve, reserveBefore + 1);
});

test('content batch 5: The Lost Crystal special-summons a White Spirit after being destroyed', () => {
  let match = base();
  match.players.player1.hand = [physical('B5-WHITE', 'white-hand', 0)];
  const destroyed = physical('SD11-013', 'lost-crystal', 2);
  const result = dispatchEffectEvent(match, { event: 'whenDestroyed', sourcePlayerId: 'player1', sourcePhysical: destroyed, sourceCardId: 'SD11-013', eventPlayerId: 'player1' }, index);
  assert.equal(result.match.players.player1.hand.some((card) => card.instanceId === 'white-hand'), false);
  assert.equal(result.match.players.player1.field.spirits.some((card) => card.instanceId === 'white-hand'), true);
});


test('content batch 5: Bear Polar requires at least one attack when the opponent can attack', () => {
  let match = base();
  match.activePlayerId = 'player2';
  match.players.player1.field.spirits = [physical('SD11-007', 'bear', 1)];
  match.players.player2.field.spirits = [physical('B5-ATTACKER', 'must-attack', 1)];
  match = dispatchEffectEvent(match, { event: 'attackStep', eventPlayerId: 'player2', context: { eventPlayerId: 'player2' } }, index).match;
  const blocked = advancePhase(match, 'player2', index);
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /deve declarar pelo menos 1 ataque/i);
  match.temporary.attackCounts = { ...(match.temporary.attackCounts || {}), player2: 1 };
  const allowed = advancePhase(match, 'player2', index);
  assert.equal(allowed.ok, true);
  assert.equal(allowed.match.phase, 'end');
});

test('content batch 5: Wise-Monkey relays Machine Beast When Blocks effects into When Attacks', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD11-008', 'wise', 1), physical('SD11-003', 'caribou', 1)];
  const before = getEffectiveBP(match, index, match.players.player1.field.spirits[1]);
  const result = dispatchEffectEvent(match, { event: 'whenAttacks', sourcePlayerId: 'player1', sourceInstanceId: 'caribou' }, index);
  const attacker = result.match.players.player1.field.spirits.find((card) => card.instanceId === 'caribou');
  assert.equal(getEffectiveBP(result.match, index, attacker), before + 3000);
});

test('content batch 5: Silver-Jackal Rush blocks opposing Burst activation for the current battle', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD11-009', 'jackal', 1), physical('B5-GREEN', 'green-symbol', 1)];
  match.battle = { id: 'b-jackal', stage: 'block', attackerPlayerId: 'player2', defenderPlayerId: 'player1', attackerInstanceId: 'enemy', blockerInstanceId: 'jackal', restrictions: {} };
  const result = dispatchEffectEvent(match, { event: 'whenBlocks', sourcePlayerId: 'player1', sourceInstanceId: 'jackal', eventPlayerId: 'player1' }, index);
  assert.equal(result.match.battle.restrictions.burstBlockedPlayerId, 'player2');
});

test('content batch 5: Midnight-Sun grants combined Heavy Armor and ignores Rush symbol conditions', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD11-007', 'host', 3)];
  match.players.player1.field.other = [physical('SD11-X02', 'midnight-sun', 0, false, 'host')];
  match.players.player2.field.spirits = [physical('B5-ATTACKER', 'enemy-target', 1)];
  match = dispatchEffectEvent(match, { event: 'whenBraved', sourcePlayerId: 'player1', sourceInstanceId: 'midnight-sun', context: { isCombined: true, combinedHostInstanceId: 'host' } }, index).match;
  const host = match.players.player1.field.spirits.find((card) => card.instanceId === 'host');
  const armor = applyContinuousCollectionModifiers(match, index, host, 'effectImmunityColors', []).sort();
  assert.deepEqual(armor, ['blue','green','white','yellow']);
  const result = dispatchEffectEvent(match, { event: 'whenBlocks', sourcePlayerId: 'player1', sourceInstanceId: 'host', eventPlayerId: 'player1' }, index);
  assert.equal(result.match.players.player2.field.spirits.find((card) => card.instanceId === 'enemy-target').exhausted, true);
});
