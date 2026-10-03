import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { resolveEffectDecision } from './effectEngine.js';

const rawCards = JSON.parse(fs.readFileSync(new URL('../../data/cards.json', import.meta.url), 'utf8'));
const byId = new Map(rawCards.map((card) => [String(card.id), normalizeCard(card)]));
const custom = [
  normalizeCard({ id: 'B4-FILL', namePT: 'Fill', cardType: 'spirit', colors: ['red'], cost: 0, symbols: ['red'], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: 'B4-PURPLE-LOW', namePT: 'Purple Low', cardType: 'spirit', colors: ['purple'], cost: 3, symbols: ['purple'], levels: [{ level: 1, cores: 1, bp: 2000 }] }),
  normalizeCard({ id: 'B4-YELLOW', namePT: 'Yellow Spirit', cardType: 'spirit', colors: ['yellow'], cost: 2, symbols: ['yellow'], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: 'B4-BIG', namePT: 'Big Spirit', cardType: 'spirit', colors: ['purple'], cost: 5, symbols: ['purple'], levels: [{ level: 1, cores: 1, bp: 9000 }] }),
  normalizeCard({ id: 'B4-ZOMBIE', namePT: 'Zombie Spirit', cardType: 'spirit', colors: ['purple'], cost: 4, symbols: ['purple'], families: ['Zombie'], levels: [{ level: 1, cores: 1, bp: 4000 }] }),
  normalizeCard({ id: 'B4-ENEMY-A', namePT: 'Enemy A', cardType: 'spirit', colors: ['blue'], cost: 4, symbols: ['blue'], levels: [{ level: 1, cores: 3, bp: 3000 }] }),
  normalizeCard({ id: 'B4-ENEMY-B', namePT: 'Enemy B', cardType: 'spirit', colors: ['blue'], cost: 5, symbols: ['blue'], levels: [{ level: 1, cores: 2, bp: 4000 }] }),
  normalizeCard({ id: 'B4-DESTROYER', namePT: 'Destroyer', cardType: 'spirit', colors: ['red'], cost: 4, symbols: ['red'], levels: [{ level: 1, cores: 1, bp: 4000 }], abilities: [{ id: 'kill', schemaVersion: 2, trigger: { event: 'whenSummoned', scope: 'source', eventPlayer: 'any' }, actions: [{ type: 'selectTarget', selector: { owner: 'opponent', cardTypes: ['spirit'], colors: ['purple'], maxCost: 3 }, onSelect: { type: 'destroy' } }] }] })
];
const relevantIds = ['BS01-125','BS06-023','BS09-015','BS11-051','BS11-075','BS12-063','SD13-002','SD13-X01'];
const index = makeCardIndex([...relevantIds.map((id) => byId.get(id)), ...custom]);
const deck = Array.from({ length: 40 }, () => 'B4-FILL');

function base() {
  const match = createMatch({ player1: { name: 'A', deck }, player2: { name: 'B', deck }, firstPlayerId: 'player1', cardIndex: index, random: () => 0.25 });
  match.phase = 'main';
  match.activePlayerId = 'player1';
  match.players.player1.reserve = 20;
  match.players.player2.reserve = 20;
  return match;
}
function physical(cardId, instanceId, regular = 1, exhausted = false, soul = false) {
  return { ...makePhysicalCard(cardId, index), instanceId, cores: { regular, soul }, exhausted, combinedWith: null };
}

test('content batch 4: SD13 is fully covered by structured automation', () => {
  const coverage = JSON.parse(fs.readFileSync(new URL('../../../data/effects/coverage.json', import.meta.url), 'utf8'));
  const cards = coverage.cards.filter((entry) => entry.set === 'SD13');
  assert.equal(cards.length, 18);
  assert.equal(cards.every((entry) => ['AUTOMATED', 'NO_EFFECT'].includes(entry.status)), true);
});

test('content batch 4: Deadly Balance assigns the second destruction decision to the opponent', () => {
  let match = base();
  match.players.player1.hand.unshift(physical('BS01-125', 'deadly', 0));
  match.players.player1.field.spirits = [physical('B4-PURPLE-LOW', 'own', 1)];
  match.players.player2.field.spirits = [physical('B4-ENEMY-A', 'opp-a', 1), physical('B4-ENEMY-B', 'opp-b', 1)];
  let result = dispatchEffectEvent(match, { event: 'magicFlash', sourcePlayerId: 'player1', sourceInstanceId: 'deadly' }, index);
  assert.equal(result.match.players.player1.field.spirits.length, 0);
  assert.equal(result.match.pendingEffectDecision?.playerId, 'player2');
  result = resolveEffectDecision(result.match, 'player2', { selectedInstanceIds: ['opp-a'] }, index);
  assert.equal(result.ok, true);
  assert.equal(result.match.players.player2.field.spirits.some((card) => card.instanceId === 'opp-a'), false);
});

test('content batch 4: Baculus leaves exactly one Core on every Spirit and returns excess regular Cores to each owner Reserve', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('BS06-023', 'baculus', 3), physical('B4-PURPLE-LOW', 'ally', 4)];
  match.players.player2.field.spirits = [physical('B4-ENEMY-A', 'enemy', 3, false, true)];
  const r1 = match.players.player1.reserve;
  const r2 = match.players.player2.reserve;
  const result = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player1', sourceInstanceId: 'baculus' }, index);
  assert.equal(result.match.players.player1.field.spirits.find((c) => c.instanceId === 'baculus').cores.regular, 1);
  assert.equal(result.match.players.player1.field.spirits.find((c) => c.instanceId === 'ally').cores.regular, 1);
  assert.equal(result.match.players.player2.field.spirits.find((c) => c.instanceId === 'enemy').cores.regular, 0);
  assert.equal(result.match.players.player1.reserve, r1 + 5);
  assert.equal(result.match.players.player2.reserve, r2 + 3);
});

test('content batch 4: Gashabers automates additional Draw Step draw and Lv3 Yellow Spirit recovery', () => {
  let match = base();
  match.phase = 'draw';
  match.players.player1.field.spirits = [physical('BS09-015', 'gasha', 3), physical('B4-BIG', 'big', 1)];
  const before = match.players.player1.hand.length;
  let result = dispatchEffectEvent(match, { event: 'drawStep', eventPlayerId: 'player1', context: { eventPlayerId: 'player1' } }, index);
  assert.equal(result.match.players.player1.hand.length, before + 1);
  match = result.match;
  match.players.player1.trash = [physical('B4-YELLOW', 'yellow-trash', 1)];
  result = dispatchEffectEvent(match, { event: 'whenDestroyed', sourcePlayerId: 'player1', sourcePhysical: physical('BS09-015', 'gasha-dead', 3), sourceCardId: 'BS09-015', eventPlayerId: 'player1' }, index);
  assert.equal(result.match.players.player1.hand.some((card) => card.instanceId === 'yellow-trash'), true);
});

test('content batch 4: Bone-Cat retaliation moves all regular Cores from the opposing Spirit effect source to Core Trash', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD13-002', 'bone-cat', 1), physical('B4-PURPLE-LOW', 'victim', 1)];
  match.players.player2.field.spirits = [physical('B4-DESTROYER', 'destroyer', 4)];
  const trashBefore = match.players.player2.trashCores;
  let result = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player2', sourceInstanceId: 'destroyer' }, index);
  assert.equal(result.match.pendingEffectDecision?.playerId, 'player2');
  result = resolveEffectDecision(result.match, 'player2', { selectedInstanceIds: ['victim'] }, index);
  assert.equal(result.ok, true);
  assert.equal(result.match.players.player1.field.spirits.some((card) => card.instanceId === 'victim'), false);
  assert.equal(result.match.players.player2.field.spirits.find((card) => card.instanceId === 'destroyer').cores.regular, 0);
  assert.equal(result.match.players.player2.trashCores, trashBefore + 4);
});

test('content batch 4: Cursedragon destroys two exhausted Spirits, draws per destroyed target, then removes one Core from two attackers targets at Lv2+', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD13-X01', 'curse', 3)];
  match.players.player2.field.spirits = [physical('B4-ENEMY-A', 'a', 3, true), physical('B4-ENEMY-B', 'b', 2, true)];
  const handBefore = match.players.player1.hand.length;
  let result = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player1', sourceInstanceId: 'curse' }, index);
  assert.equal(result.match.players.player2.field.spirits.length, 0);
  assert.equal(result.match.players.player1.hand.length, handBefore + 2);

  match = result.match;
  match.players.player2.field.spirits = [physical('B4-ENEMY-A', 'a2', 3), physical('B4-ENEMY-B', 'b2', 2)];
  const reserveBefore = match.players.player2.reserve;
  result = dispatchEffectEvent(match, { event: 'whenAttacks', sourcePlayerId: 'player1', sourceInstanceId: 'curse' }, index);
  assert.equal(result.match.players.player2.field.spirits.find((c) => c.instanceId === 'a2').cores.regular, 2);
  assert.equal(result.match.players.player2.field.spirits.find((c) => c.instanceId === 'b2').cores.regular, 1);
  assert.equal(result.match.players.player2.reserve, reserveBefore + 2);
});
