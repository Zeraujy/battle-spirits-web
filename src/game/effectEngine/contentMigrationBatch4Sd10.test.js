import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { getEffectiveBP } from '../selectors.js';
import { evaluateBraveCondition } from '../brave.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';

const rawCards = JSON.parse(fs.readFileSync(new URL('../../data/cards.json', import.meta.url), 'utf8'));
const byId = new Map(rawCards.map((card) => [String(card.id), normalizeCard(card)]));
const custom = [
  normalizeCard({ id: 'B4S10-FILL', namePT: 'Fill', cardType: 'spirit', colors: ['red'], cost: 0, symbols: ['red'], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: 'B4S10-LOW-A', namePT: 'Low A', cardType: 'spirit', colors: ['blue'], cost: 2, symbols: ['blue'], levels: [{ level: 1, cores: 1, bp: 2000 }] }),
  normalizeCard({ id: 'B4S10-LOW-B', namePT: 'Low B', cardType: 'spirit', colors: ['white'], cost: 3, symbols: ['white'], levels: [{ level: 1, cores: 1, bp: 3000 }] }),
  normalizeCard({ id: 'B4S10-NEXUS', namePT: 'Enemy Nexus', cardType: 'nexus', colors: ['blue'], cost: 2, symbols: ['blue'], levels: [{ level: 1, cores: 0, bp: 0 }] })
];
const ids = ['SD10-008','SD10-010','SD10-011','SD10-012','SD10-013','SD10-X01','SD10-X02'];
const index = makeCardIndex([...ids.map((id) => byId.get(id)), ...custom]);
const deck = Array.from({ length: 40 }, () => 'B4S10-FILL');

function base() {
  const match = createMatch({ player1: { name: 'A', deck }, player2: { name: 'B', deck }, firstPlayerId: 'player1', cardIndex: index, random: () => 0.25 });
  match.phase = 'attack';
  match.activePlayerId = 'player1';
  match.players.player1.reserve = 20;
  match.players.player2.reserve = 20;
  return match;
}
function physical(cardId, instanceId, regular = 1, exhausted = false) {
  return { ...makePhysicalCard(cardId, index), instanceId, cores: { regular, soul: false }, exhausted, combinedWith: null };
}

test('content batch 4 SD10: coverage advances to 16/18 automated or no-effect with only two cards pending', () => {
  const coverage = JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage.json', import.meta.url), 'utf8'));
  const cards = coverage.cards.filter((entry) => entry.set === 'SD10');
  assert.equal(cards.length, 18);
  assert.equal(cards.filter((entry) => ['AUTOMATED', 'NO_EFFECT'].includes(entry.status)).length, 16);
  assert.deepEqual(cards.filter((entry) => !['AUTOMATED', 'NO_EFFECT'].includes(entry.status)).map((entry) => entry.cardId).sort(), ['SD10-015','SD10-X01']);
});

test('content batch 4 SD10: Charge keyword is level-aware and gates the Brave combine condition', () => {
  const host = byId.get('SD10-008');
  const brave = byId.get('SD10-011');
  assert.equal(evaluateBraveCondition(brave, host, { hostPhysical: physical('SD10-008', 'host-lv1', 1) }).matches, false);
  assert.equal(evaluateBraveCondition(brave, host, { hostPhysical: physical('SD10-008', 'host-lv2', 2) }).matches, true);
});

test('content batch 4 SD10: SD10-008 grants +2000 BP only to active Charge Spirits during own Attack Step', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD10-008', 'source', 2), physical('B4S10-FILL', 'plain', 1)];
  const beforeCharge = getEffectiveBP(match, index, match.players.player1.field.spirits[0]);
  const beforePlain = getEffectiveBP(match, index, match.players.player1.field.spirits[1]);
  const result = dispatchEffectEvent(match, { event: 'attackStep', eventPlayerId: 'player1', context: { eventPlayerId: 'player1' } }, index);
  const charge = result.match.players.player1.field.spirits.find((c) => c.instanceId === 'source');
  const plain = result.match.players.player1.field.spirits.find((c) => c.instanceId === 'plain');
  assert.equal(getEffectiveBP(result.match, index, charge), beforeCharge + 2000);
  assert.equal(getEffectiveBP(result.match, index, plain), beforePlain);
});

test('content batch 4 SD10: Supercell-Dragoon gains +2000 BP per active Charge Spirit when it attacks', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD10-010', 'supercell', 3), physical('SD10-008', 'charge-a', 2), physical('SD10-X01', 'charge-b', 4)];
  const source = match.players.player1.field.spirits[0];
  const before = getEffectiveBP(match, index, source);
  const result = dispatchEffectEvent(match, { event: 'whenAttacks', sourcePlayerId: 'player1', sourceInstanceId: 'supercell' }, index);
  const updated = result.match.players.player1.field.spirits.find((c) => c.instanceId === 'supercell');
  assert.equal(getEffectiveBP(result.match, index, updated), before + 4000);
});

test('content batch 4 SD10: Big Bang Energy destroys all qualifying Spirits and draws once per destroyed target', () => {
  let match = base();
  match.players.player1.field.other = [physical('SD10-X02', 'big-bang', 1)];
  match.players.player2.field.spirits = [physical('B4S10-LOW-A', 'low-a', 1), physical('B4S10-LOW-B', 'low-b', 1)];
  const before = match.players.player1.hand.length;
  const result = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player1', sourceInstanceId: 'big-bang' }, index);
  assert.equal(result.match.players.player2.field.spirits.length, 0);
  assert.equal(result.match.players.player1.hand.length, before + 2);
});


test('content batch 4 SD10: Dragon Shuttle destroys a <=5000 BP attacking Spirit after unblocked Life loss', () => {
  let match = base();
  match.players.player1.field.nexuses = [physical('SD10-013', 'shuttle', 1)];
  match.players.player2.field.spirits = [physical('B4S10-LOW-B', 'attacker', 1)];
  match.battle = { id: 'battle-shuttle', stage: 'resolve', attackerPlayerId: 'player2', defenderPlayerId: 'player1', attackerInstanceId: 'attacker', blockerInstanceId: null };
  const result = dispatchEffectEvent(match, {
    event: 'lifeDecreased',
    eventPlayerId: 'player1',
    context: { eventPlayerId: 'player1', cause: 'unblockedAttack', attackerInstanceId: 'attacker', attackerBP: 3000 }
  }, index);
  assert.equal(result.match.players.player2.field.spirits.some((card) => card.instanceId === 'attacker'), false);
});

test('content batch 4 SD10: Dragon Shuttle Lv2 destroys an opposing Nexus when own active-Charge Spirit destroys an opposing Spirit', () => {
  let match = base();
  match.players.player1.field.nexuses = [physical('SD10-013', 'shuttle', 1)];
  match.players.player1.field.spirits = [physical('SD10-X01', 'charge-destroyer', 4)];
  match.players.player2.field.nexuses = [physical('B4S10-NEXUS', 'enemy-nexus', 0)];
  const destroyed = physical('B4S10-LOW-A', 'destroyed-spirit', 1);
  const result = dispatchEffectEvent(match, {
    event: 'whenDestroyed',
    sourcePlayerId: 'player2',
    sourcePhysical: destroyed,
    sourceCardId: 'B4S10-LOW-A',
    eventPlayerId: 'player2',
    context: {
      eventPlayerId: 'player2',
      destroyedByPlayerId: 'player1',
      destroyedByCardType: 'spirit',
      destroyedByInstanceId: 'charge-destroyer'
    }
  }, index);
  assert.equal(result.match.players.player2.field.nexuses.some((card) => card.instanceId === 'enemy-nexus'), false);
});
