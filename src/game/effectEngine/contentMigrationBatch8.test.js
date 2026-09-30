import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { getEffectiveBP } from '../selectors.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { resolveActionList } from './actionResolver.js';
import { isRuntimeDispatchedEvent } from './canonicalEvents.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const rawCards = JSON.parse(fs.readFileSync(new URL('../../data/cards.json', import.meta.url), 'utf8'));
const normalized = rawCards.map(normalizeCard);
const index = makeCardIndex(normalized);
const byId = new Map(normalized.map((c) => [String(c.id), c]));
const deck = Array.from({ length: 40 }, () => 'SD15-001');
function ability(cardId, id) { return byId.get(cardId)?.abilities?.find((a) => a.id === id); }

function base() {
  const match = createMatch({ player1: { name: 'A', deck }, player2: { name: 'B', deck }, firstPlayerId: 'player1', cardIndex: index, random: () => 0.25 });
  match.phase = 'attack';
  match.activePlayerId = 'player1';
  match.players.player1.reserve = 20;
  match.players.player2.reserve = 20;
  return match;
}

function physical(cardId, instanceId, cores = 1) {
  return { ...makePhysicalCard(cardId, index), instanceId, cores: { regular: cores, soul: false }, exhausted: false };
}

test('content batch 8: SD15 reaches READY_NO_MANUAL at 18/18', () => {
  const coverage = JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage.json', import.meta.url), 'utf8'));
  const rows = coverage.cards.filter((entry) => entry.set === 'SD15');
  assert.equal(rows.length, 18);
  assert.equal(rows.every((entry) => ['AUTOMATED', 'NO_EFFECT'].includes(entry.status)), true);
});

test('content batch 8: Core Action Library expands to 69 reusable action types', () => {
  const types = listSupportedCoreActionTypes();
  for (const type of ['moveCoreToLife', 'specialSummonFromTrash', 'revealTopAndSummonOrHand']) assert.equal(types.includes(type), true);
  assert.equal(types.length, 69);
});

test('content batch 8: Strengthening adds an extra 1000 BP reduction to opposing Spirits', () => {
  let match = base();
  const strength = physical('SD15-001', 'strength', 1);
  const attacker = physical('SD15-003', 'attacker', 1);
  const target = physical('SD28-003', 'target', 1);
  match.players.player1.field.spirits = [strength, attacker];
  match.players.player2.field.spirits = [target];
  match = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player1', sourceInstanceId: 'strength', eventPlayerId: 'player1' }, index).match;
  const before = getEffectiveBP(match, index, target);
  match = dispatchEffectEvent(match, { event: 'whenAttacks', sourcePlayerId: 'player1', sourceInstanceId: 'attacker', eventPlayerId: 'player1' }, index).match;
  const afterTarget = match.players.player2.field.spirits.find((c) => c.instanceId === 'target');
  assert.equal(getEffectiveBP(match, index, afterTarget), Math.max(0, before - 2000));
});

test('content batch 8: Axela uses generic battle BP comparison to treat the block as unblocked', () => {
  const a = ability('SD15-004', 'sd15-004-unblocked-auto28');
  assert.equal(a.trigger.event, 'beforeBattleResolution');
  assert.equal(a.conditions[0].type, 'battleBlockerBPAtMostSourceBP');
  assert.equal(a.actions[0].restriction.treatAsUnblocked, true);
});

test('content batch 8: Plastiel installs reusable Strengthening and low-BP Life protection modifiers', () => {
  assert.equal(ability('SD15-005', 'sd15-005-strengthening-auto28').actions[0].property, 'bpReductionBonus');
  const protection = ability('SD15-005', 'sd15-005-life-protection-auto28').actions[0];
  assert.equal(protection.property, 'lifeProtectionMaxAttackerBP');
  assert.equal(protection.value, 4000);
});

test('content batch 8: BattleAngelia Excel recovers low-cost Spirits and destroys zero-BP Spirits', () => {
  const recovery = ability('SD15-X01', 'sd15-x01-recovery-auto28');
  const zero = ability('SD15-X01', 'sd15-x01-zero-bp-auto28');
  assert.equal(recovery.trigger.event, 'whenDestroyed');
  assert.equal(recovery.conditions.some((c) => c.type === 'eventDestroyedByOpponent'), true);
  assert.equal(recovery.actions[0].type, 'returnToHand');
  assert.equal(zero.trigger.event, 'bpBecameZero');
  assert.equal(zero.actions[0].type, 'destroyAllMatching');
});

test('content batch 8: Holy Life and Brilliance use Life and battle canonical events', () => {
  const holy = ability('BS08-042', 'sd15-bs08-042-holy-life-auto28');
  const brilliance = ability('BS08-042', 'sd15-bs08-042-brilliance-auto28');
  assert.equal(holy.trigger.event, 'lifeDecreased');
  assert.equal(holy.actions[0].type, 'healLife');
  assert.equal(brilliance.trigger.event, 'afterBattleResolution');
  assert.equal(brilliance.actions[0].type, 'returnMagicUsedThisBattle');
});

test('content batch 8: Angeloid uses structured multi-target Special Summon from Trash', () => {
  const summon = ability('SD15-006', 'sd15-006-summon-auto28');
  assert.equal(summon.actions[0].type, 'selectMultipleTargets');
  assert.equal(summon.actions[0].maxTargets, 3);
  assert.equal(summon.actions[0].onConfirm.type, 'specialSummonFromTrash');
  assert.deepEqual(summon.actions[0].selector.families, ['Divine Spirit']);
});

test('content batch 8: cardRefreshed is canonical and BSC05-020 observes Spirit/Magic refreshes', () => {
  assert.equal(isRuntimeDispatchedEvent('cardRefreshed'), true);
  const watcher = ability('BSC05-020', 'sd15-bsc05-020-opponent-turn-auto28');
  assert.equal(watcher.trigger.event, 'cardRefreshed');
  assert.equal(watcher.conditions.some((c) => c.any?.some((x) => x.type === 'eventRefreshedByCardType')), true);
  assert.equal(watcher.actions[0].type, 'destroy');
});

test('content batch 8: moveCoreToLife transfers one field Core into Life', () => {
  let match = base();
  const source = physical('BS12-035', 'source-core', 2);
  match.players.player1.field.spirits = [source];
  const lifeBefore = match.players.player1.life;
  const result = resolveActionList(match, [{ type: 'moveCoreToLife', target: 'source', count: 1 }], index, {
    sourcePlayerId: 'player1', sourceInstanceId: 'source-core', sourcePhysical: source, sourceCard: byId.get('BS12-035')
  });
  assert.equal(result.manualResolutionNeeded, false);
  assert.equal(result.match.players.player1.life, lifeBefore + 1);
  assert.equal(result.match.players.player1.field.spirits[0].cores.regular, 1);
});
