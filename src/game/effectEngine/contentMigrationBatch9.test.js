import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { conditionMatchesEffect } from './conditionEngine.js';

const rawCards = JSON.parse(fs.readFileSync(new URL('../../data/cards.json', import.meta.url), 'utf8'));
const normalized = rawCards.map(normalizeCard);
const index = makeCardIndex(normalized);
const byId = new Map(normalized.map((c) => [String(c.id), c]));
const deck = Array.from({ length: 40 }, () => 'BS13-001');
const ability = (cardId, id) => byId.get(cardId)?.abilities?.find((a) => a.id === id);

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

test('content batch 9: BS13 Wave 1 resolves 24 effect cards and leaves 60 pending', () => {
  const coverage = JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage.json', import.meta.url), 'utf8'));
  const rows = coverage.cards.filter((entry) => entry.set === 'BS13');
  assert.equal(rows.length, 90);
  assert.equal(rows.filter((entry) => entry.status === 'UNSTRUCTURED_TEXT').length, 60);
  assert.equal(rows.filter((entry) => ['AUTOMATED','NO_EFFECT'].includes(entry.status)).length, 30);
});

test('content batch 9: Jainagant Immortality is a controllerTrash observer', () => {
  const a = ability('BS13-012', 'bs13-012-immortality-trigger-auto29');
  assert.equal(a.trigger.scope, 'controllerTrash');
  assert.equal(a.trigger.event, 'whenDestroyed');
  assert.equal(a.actions[0].type, 'specialSummonSource');
});

test('content batch 9: controllerTrash observers dispatch from Trash', () => {
  let match = base();
  const jainagant = physical('BS13-012', 'jainagant-trash', 0);
  const victim = physical('BS13-X01', 'victim-8', 1);
  match.players.player1.trash = [jainagant];
  match.players.player1.field.spirits = [victim];
  const result = dispatchEffectEvent(match, {
    event: 'whenDestroyed', sourcePlayerId: 'player1', sourceInstanceId: 'victim-8', eventPlayerId: 'player1'
  }, index);
  assert.equal(result.dispatchedSources > 0, true);
  assert.equal(result.match.players.player1.field.spirits.some((entry) => entry.instanceId === 'jainagant-trash'), true);
});

test('content batch 9: event source core count and level are reusable conditions', () => {
  const match = base();
  const p = physical('BS13-020', 'event-source', 2);
  match.players.player1.field.spirits = [p];
  const context = { sourcePlayerId: 'player1', sourceInstanceId: 'observer', eventSourceInstanceId: 'event-source' };
  assert.equal(conditionMatchesEffect(match, { type:'eventSourceCoreCount', atMost:2 }, context, index), true);
  assert.equal(conditionMatchesEffect(match, { type:'eventSourceLevel', atLeast:1 }, context, index), true);
});

test('content batch 9: Hagen observes Curse/Immortality attackers and targets event source dynamically', () => {
  const a = ability('BS13-015', 'bs13-015-colorless-auto29');
  assert.equal(a.conditions.some((c) => c.any?.some((x) => x.type === 'eventSourceKeyword')), true);
  assert.equal(a.actions[0].selector.instanceIdFromContext, 'eventSourceInstanceId');
  assert.equal(a.actions[0].property, 'colors');
});

test('content batch 9: Bushbabe BP and Yang-Ogre reserve use generic dynamic source metrics', () => {
  assert.equal(ability('BS13-020','bs13-020-attack-auto29').actions[0].amountPerSourceCore, 1000);
  assert.equal(ability('BS13-022','bs13-022-destroyed-auto29').actions[0].countFromSourceLevel, true);
});

test('content batch 9: Deerl-Yukimura counts Imp Spirits and observes cardRefreshed', () => {
  const summon = ability('BS13-024','bs13-024-summon-auto29');
  const refresh = ability('BS13-024','bs13-024-refresh-auto29');
  assert.deepEqual(summon.actions[0].countFromSelector.families, ['Imp']);
  assert.equal(refresh.trigger.event, 'cardRefreshed');
  assert.equal(refresh.conditions[0].type, 'eventSourceIsNotSource');
});

test('content batch 9: Heavy Armor is expressed through reusable effect immunity modifiers', () => {
  const lethal = ability('BS13-030','bs13-030-heavy-armor-auto29');
  const brave = ability('BS13-056','bs13-056-spirit-form-auto29');
  assert.deepEqual(lethal.actions[0].value, ['purple','blue']);
  assert.deepEqual(brave.actions[0].value, ['red']);
});

test('content batch 9: Bloody Artifact models low-core attack destruction structurally', () => {
  const a = ability('BS13-063','bs13-063-attack-auto29');
  assert.equal(a.trigger.event, 'whenAttacks');
  assert.equal(a.trigger.scope, 'controllerField');
  assert.equal(a.conditions.some((c) => c.type === 'eventSourceCoreCount'), true);
  assert.equal(a.actions[0].type, 'destroy');
});

test('content batch 9: Constellation Barrier uses battle restriction and once-per-turn Life restore', () => {
  const lock = ability('BS13-070','bs13-070-attack-lock-auto29');
  const life = ability('BS13-070','bs13-070-life-auto29');
  assert.equal(lock.actions[0].restriction.preventLifeDamage, true);
  assert.equal(life.actions[0].type, 'oncePerTurn');
  assert.equal(life.actions[0].actions.some((x) => x.type === 'healLife'), true);
});
