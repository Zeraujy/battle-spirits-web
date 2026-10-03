import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { resolveEffectDecision } from './effectEngine.js';
import { getEffectiveBP } from '../selectors.js';

const rawCards = JSON.parse(fs.readFileSync(new URL('../../data/cards.json', import.meta.url), 'utf8'));
const byId = new Map(rawCards.map((card) => [String(card.id), normalizeCard(card)]));
const custom = [
  normalizeCard({ id: 'B3-GREEN', namePT: 'Green Symbol', cardType: 'spirit', colors: ['green'], cost: 0, symbols: ['green'], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: 'B3-RED', namePT: 'Red Unit', cardType: 'spirit', colors: ['red'], cost: 0, symbols: ['red'], families: ['Terra Dragon'], levels: [{ level: 1, cores: 1, bp: 3000 }] }),
  normalizeCard({ id: 'B3-ENEMY-LOW', namePT: 'Enemy Low', cardType: 'spirit', colors: ['blue'], cost: 0, symbols: ['blue'], levels: [{ level: 1, cores: 1, bp: 4000 }] }),
  normalizeCard({ id: 'B3-ENEMY-HIGH', namePT: 'Enemy High', cardType: 'spirit', colors: ['blue'], cost: 0, symbols: ['blue'], levels: [{ level: 1, cores: 1, bp: 15000 }] }),
  normalizeCard({ id: 'B3-DRAW', namePT: 'Draw Filler', cardType: 'spirit', colors: ['red'], cost: 0, symbols: ['red'], levels: [{ level: 1, cores: 1, bp: 1000 }] })
];
const relevantIds = ['SD17-008','SD17-012','SD17-X01','SD17-X02'];
const index = makeCardIndex([...relevantIds.map((id) => byId.get(id)), ...custom]);
const deck = Array.from({ length: 40 }, () => 'B3-DRAW');

function base() {
  const match = createMatch({ player1: { name: 'A', deck }, player2: { name: 'B', deck }, firstPlayerId: 'player1', cardIndex: index, random: () => 0.25 });
  match.phase = 'attack';
  match.activePlayerId = 'player1';
  return match;
}

function physical(cardId, instanceId, regular = 1, exhausted = false, combinedWith = null) {
  return { ...makePhysicalCard(cardId, index), instanceId, cores: { regular, soul: false }, exhausted, combinedWith };
}

test('content batch 3: SD17 is fully covered by structured automation', () => {
  const coverage = JSON.parse(fs.readFileSync(new URL('../../../data/effects/coverage.json', import.meta.url), 'utf8'));
  const cards = coverage.cards.filter((entry) => entry.set === 'SD17');
  assert.equal(cards.length, 18);
  assert.equal(cards.every((entry) => ['AUTOMATED', 'NO_EFFECT'].includes(entry.status)), true);
});

test('content batch 3: Monoforcesaurus Rush Green refreshes only on its first attack when a green symbol is controlled', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD17-008', 'mono', 1, true), physical('B3-GREEN', 'green', 1, false)];
  let result = dispatchEffectEvent(match, { event: 'whenAttacks', sourcePlayerId: 'player1', sourceInstanceId: 'mono', context: { attackNumber: 2, sourceAttackNumber: 1 } }, index);
  assert.equal(result.match.players.player1.field.spirits.find((c) => c.instanceId === 'mono').exhausted, false);
  match = result.match;
  match.players.player1.field.spirits = match.players.player1.field.spirits.map((c) => c.instanceId === 'mono' ? { ...c, exhausted: true } : c);
  result = dispatchEffectEvent(match, { event: 'whenAttacks', sourcePlayerId: 'player1', sourceInstanceId: 'mono', context: { attackNumber: 3, sourceAttackNumber: 2 } }, index);
  assert.equal(result.match.players.player1.field.spirits.find((c) => c.instanceId === 'mono').exhausted, true);
});

test('content batch 3: Primeval Forest reacts to BP-comparison destruction and retrieves Terra Dragon at Lv2', () => {
  let match = base();
  match.players.player1.field.nexuses = [physical('SD17-012', 'forest', 1)];
  match.players.player1.field.spirits = [physical('B3-RED', 'ally', 1)];
  match.players.player2.field.spirits = [physical('B3-ENEMY-LOW', 'enemy', 1)];
  const before = match.players.player1.hand.length;
  let result = dispatchEffectEvent(match, {
    event: 'afterBattleResolution',
    sourcePlayerId: 'player1',
    sourceInstanceId: 'ally',
    eventPlayerId: 'player1',
    context: { cause: 'bpComparison', destroyed: [{ playerId: 'player2', instanceId: 'enemy', cardId: 'B3-ENEMY-LOW', cardType: 'spirit' }] }
  }, index);
  assert.equal(result.match.players.player1.hand.length, before + 1);

  match = result.match;
  match.players.player1.trash = [physical('B3-RED', 'terra-trash', 1)];
  result = dispatchEffectEvent(match, {
    event: 'whenDestroyed',
    sourcePlayerId: 'player1',
    sourcePhysical: physical('B3-RED', 'dead', 1),
    sourceCardId: 'B3-RED',
    eventPlayerId: 'player1',
    context: { cause: 'bpComparison', destroyedByPlayerId: 'player2', destroyedByCardType: 'spirit' }
  }, index);
  assert.equal(result.match.players.player1.hand.some((c) => c.instanceId === 'terra-trash'), true);
});

test('content batch 3: Dark-Tyrannosaura automates source-BP destruction, Rush life movement and Terra Dragon aura', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD17-X01', 'tyranno', 3), physical('B3-GREEN', 'green', 1), physical('B3-RED', 'terra', 1)];
  match.players.player2.field.spirits = [physical('B3-ENEMY-LOW', 'low', 1), physical('B3-ENEMY-HIGH', 'high', 1)];
  const aura = dispatchEffectEvent(match, { event: 'attackStep', eventPlayerId: 'player1', context: {} }, index);
  match = aura.match;
  assert.equal(getEffectiveBP(match, index, match.players.player1.field.spirits.find((c) => c.instanceId === 'terra')), 6000);

  const attack = dispatchEffectEvent(match, { event: 'whenAttacks', sourcePlayerId: 'player1', sourceInstanceId: 'tyranno' }, index);
  assert.equal(attack.match.players.player2.field.spirits.some((c) => c.instanceId === 'low'), false);
  assert.equal(attack.match.players.player2.field.spirits.some((c) => c.instanceId === 'high'), true);

  match = attack.match;
  const lifeBefore = match.players.player2.life;
  const after = dispatchEffectEvent(match, {
    event: 'afterBattleResolution', sourcePlayerId: 'player1', sourceInstanceId: 'tyranno', eventPlayerId: 'player1',
    context: { cause: 'bpComparison', destroyed: [{ playerId: 'player2', instanceId: 'enemy', cardId: 'B3-ENEMY-LOW', cardType: 'spirit' }] }
  }, index);
  assert.equal(after.match.players.player2.life, lifeBefore - 1);
  assert.equal(after.match.players.player2.reserve, match.players.player2.reserve + 1);
});

test('content batch 3: Dark-Blade specified attack immediately establishes the chosen blocker and skips flash1', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('B3-RED', 'host', 1, true)];
  match.players.player1.field.other = [physical('SD17-X02', 'blade', 1, false, 'host')];
  match.players.player2.field.spirits = [physical('B3-ENEMY-LOW', 'target', 1, true), physical('B3-ENEMY-HIGH', 'target2', 1, false)];
  match.battle = { id: 'b3', attackerPlayerId: 'player1', defenderPlayerId: 'player2', attackerInstanceId: 'host', blockerInstanceId: null, stage: 'flash1', flash: { number: 1, priorityPlayerId: 'player2', consecutivePasses: 0 }, restrictions: {} };

  let result = dispatchEffectEvent(match, { event: 'whenAttacks', sourcePlayerId: 'player1', sourceInstanceId: 'blade', context: { isCombined: true, combinedHostInstanceId: 'host', sourceAttackNumber: 1 } }, index);
  assert.equal(result.match.pendingEffectDecision?.kind, 'chooseYesNo');
  result = resolveEffectDecision(result.match, 'player1', { optionId: 'yes' }, index);
  assert.equal(result.match.pendingEffectDecision?.kind, 'selectTarget');
  result = resolveEffectDecision(result.match, 'player1', { selectedInstanceIds: ['target'] }, index);
  assert.equal(result.ok, true);
  assert.equal(result.match.battle.blockerInstanceId, 'target');
  assert.equal(result.match.battle.stage, 'flash2');
  assert.equal(result.match.battle.flash.number, 2);
  assert.equal(result.match.battle.restrictions.specifiedAttack, true);
});
