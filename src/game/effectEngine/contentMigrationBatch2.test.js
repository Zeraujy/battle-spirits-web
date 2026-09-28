import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { dispatchPhaseEntry } from './phaseTriggerEngine.js';
import { getEffectiveBP } from '../selectors.js';
import { legalBlockers } from '../battle.js';
import { evaluateBraveCondition } from '../brave.js';

const rawCards = JSON.parse(fs.readFileSync(new URL('../../data/cards.json', import.meta.url), 'utf8'));
const byId = new Map(rawCards.map((card) => [String(card.id), normalizeCard(card)]));

const custom = [
  normalizeCard({ id: 'B2-FILL-RED', namePT: 'Red Fill', cardType: 'spirit', colors: ['red'], cost: 0, symbols: ['red'], levels: [{ level: 1, cores: 1, bp: 1000 }] }),
  normalizeCard({ id: 'B2-FILL-WHITE', namePT: 'White Fill', cardType: 'spirit', colors: ['white'], cost: 0, symbols: ['white'], levels: [{ level: 1, cores: 1, bp: 3000 }] }),
  normalizeCard({ id: 'B2-LOW', namePT: 'Low BP', cardType: 'spirit', colors: ['blue'], cost: 0, symbols: ['blue'], levels: [{ level: 1, cores: 1, bp: 5000 }] }),
  normalizeCard({ id: 'B2-HIGH', namePT: 'High BP', cardType: 'spirit', colors: ['blue'], cost: 0, symbols: ['blue'], levels: [{ level: 1, cores: 1, bp: 7000 }] }),
  normalizeCard({ id: 'B2-NEXUS', namePT: 'Enemy Nexus', cardType: 'nexus', colors: ['blue'], cost: 0, symbols: ['blue'], levels: [{ level: 1, cores: 0, bp: 0 }] }),
  normalizeCard({
    id: 'B2-RED-DESTROYER', namePT: 'Red Destroyer', cardType: 'spirit', colors: ['red'], cost: 0, symbols: ['red'], levels: [{ level: 1, cores: 1, bp: 1000 }],
    abilities: [{ id: 'destroy-one', schemaVersion: 2, trigger: { event: 'whenSummoned', scope: 'source', eventPlayer: 'any' }, actions: [{ type: 'selectTarget', selector: { owner: 'opponent', cardTypes: ['spirit'] }, onSelect: { type: 'destroy' } }] }]
  }),
  normalizeCard({
    id: 'B2-ULTIMATE-DAMAGE', namePT: 'Ultimate Damage', cardType: 'ultimate', colors: ['red'], cost: 0, symbols: ['ultimate'], levels: [{ level: 3, cores: 1, bp: 6000 }],
    abilities: [{ id: 'ultimate-damage', schemaVersion: 2, trigger: { event: 'whenSummoned', scope: 'source', eventPlayer: 'any' }, actions: [{ type: 'dealLifeDamage', player: 'opponent', amount: 3 }] }]
  })
];

const relevantIds = ['SD20-004','SD20-011','SD20-012','SD17-007','SD17-009','SD17-011'];
const index = makeCardIndex([...relevantIds.map((id) => byId.get(id)), ...custom]);
const deck = Array.from({ length: 40 }, () => 'B2-FILL-RED');

function base() {
  const match = createMatch({ player1: { name: 'A', deck }, player2: { name: 'B', deck }, firstPlayerId: 'player1', cardIndex: index, random: () => 0.25 });
  match.phase = 'main';
  match.activePlayerId = 'player1';
  return match;
}

function physical(cardId, instanceId, regular = 1, exhausted = false) {
  return { ...makePhysicalCard(cardId, index), instanceId, cores: { regular, soul: false }, exhausted, combinedWith: null };
}

test('content batch 2: SD20 is fully covered by structured automation', () => {
  const coverage = JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage.json', import.meta.url), 'utf8'));
  const cards = coverage.cards.filter((entry) => entry.set === 'SD20');
  assert.equal(cards.length, 17);
  assert.equal(cards.every((entry) => ['AUTOMATED', 'NO_EFFECT'].includes(entry.status)), true);
});

test('content batch 2: Shield Mobile can block while exhausted and Heavy Armor: Red rejects opposing red effect targeting', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD20-004', 'shield', 2, true)];
  match.players.player2.field.spirits = [physical('B2-RED-DESTROYER', 'red', 1, false)];

  match = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player1', sourceInstanceId: 'shield' }, index).match;
  match.phase = 'attack';
  match.activePlayerId = 'player2';
  match = dispatchPhaseEntry(match, 'attack', index, { eventPlayerId: 'player2', previousPhase: 'main' }).match;
  match.battle = { id: 'b', attackerPlayerId: 'player2', defenderPlayerId: 'player1', attackerInstanceId: 'red', blockerInstanceId: null, stage: 'block', flash: null, restrictions: {} };
  assert.equal(legalBlockers(match, index).some((card) => card.instanceId === 'shield'), true);

  match.phase = 'main';
  match.activePlayerId = 'player2';
  const result = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player2', sourceInstanceId: 'red' }, index);
  assert.equal(result.match.players.player1.field.spirits.some((card) => card.instanceId === 'shield'), true);
});

test('content batch 2: Rowgard North Command boosts white units and caps opposing Ultimate effect Life loss to one per turn', () => {
  let match = base();
  match.players.player1.life = 3;
  match.players.player1.field.nexuses = [physical('SD20-011', 'rowgard', 1)];
  match.players.player1.field.spirits = [physical('B2-FILL-WHITE', 'white', 1)];
  match.players.player2.field.other = [physical('B2-ULTIMATE-DAMAGE', 'ult', 1)];
  const baseBP = getEffectiveBP(match, index, match.players.player1.field.spirits[0]);

  match = dispatchEffectEvent(match, { event: 'whenDeployed', sourcePlayerId: 'player1', sourceInstanceId: 'rowgard' }, index).match;
  match.phase = 'attack';
  match.activePlayerId = 'player2';
  match = dispatchPhaseEntry(match, 'attack', index, { eventPlayerId: 'player2', previousPhase: 'main' }).match;
  assert.equal(getEffectiveBP(match, index, match.players.player1.field.spirits[0]), baseBP + 2000);

  const first = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player2', sourceInstanceId: 'ult' }, index);
  assert.equal(first.match.players.player1.life, 2);
  const second = dispatchEffectEvent(first.match, { event: 'whenSummoned', sourcePlayerId: 'player2', sourceInstanceId: 'ult' }, index);
  assert.equal(second.match.players.player1.life, 2);
});

test('content batch 2: The Falling World observes opponent effect destruction and returns an opposing Nexus', () => {
  let match = base();
  match.players.player1.field.nexuses = [physical('SD20-012', 'world', 0)];
  match.players.player1.field.spirits = [physical('B2-FILL-WHITE', 'victim', 1)];
  match.players.player2.field.spirits = [physical('B2-RED-DESTROYER', 'destroyer', 1)];
  match.players.player2.field.nexuses = [physical('B2-NEXUS', 'enemy-nexus', 0)];
  match = dispatchEffectEvent(match, { event: 'whenDeployed', sourcePlayerId: 'player1', sourceInstanceId: 'world' }, index).match;
  const result = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player2', sourceInstanceId: 'destroyer' }, index);
  assert.equal(result.match.players.player1.field.spirits.some((card) => card.instanceId === 'victim'), false);
  assert.equal(result.match.players.player2.field.nexuses.some((card) => card.instanceId === 'enemy-nexus'), false);
  assert.equal(result.match.players.player2.hand.some((card) => card.instanceId === 'enemy-nexus'), true);
});

test('content batch 2: PiercingDragon Styragorn dynamically restricts destruction to BP not exceeding the source', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD17-009', 'styr', 3)];
  match.players.player2.field.spirits = [physical('B2-LOW', 'low', 1), physical('B2-HIGH', 'high', 1)];
  const result = dispatchEffectEvent(match, { event: 'whenAttacks', sourcePlayerId: 'player1', sourceInstanceId: 'styr' }, index);
  assert.equal(result.manualResolutionNeeded, false);
  assert.equal(result.match.players.player2.field.spirits.some((card) => card.instanceId === 'low'), false);
  assert.equal(result.match.players.player2.field.spirits.some((card) => card.instanceId === 'high'), true);
});

test('content batch 2: ArmedMachineDragon Silveed validates Terra Dragon Combine and returns a Rush Spirit from Trash', () => {
  const silveed = byId.get('SD17-011');
  const terra = normalizeCard({ id: 'TERRA-HOST', cardType: 'spirit', cost: 4, colors: ['red'], families: ['Terra Dragon'], levels: [{ level: 1, cores: 1, bp: 1000 }] });
  const other = normalizeCard({ id: 'OTHER-HOST', cardType: 'spirit', cost: 4, colors: ['red'], families: ['Dragon'], levels: [{ level: 1, cores: 1, bp: 1000 }] });
  assert.equal(evaluateBraveCondition(silveed, terra).matches, true);
  assert.equal(evaluateBraveCondition(silveed, other).matches, false);

  let match = base();
  match.players.player1.field.other = [physical('SD17-011', 'silveed', 1)];
  match.players.player1.trash = [physical('SD17-007', 'rush', 1), physical('B2-FILL-WHITE', 'plain', 1)];
  const result = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player1', sourceInstanceId: 'silveed' }, index);
  assert.equal(result.manualResolutionNeeded, false);
  assert.equal(result.match.players.player1.hand.some((card) => card.instanceId === 'rush'), true);
  assert.equal(result.match.players.player1.trash.some((card) => card.instanceId === 'plain'), true);
});
