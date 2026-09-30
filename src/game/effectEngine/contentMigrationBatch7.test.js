import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { summonFromHand } from '../summon.js';
import { getLegalActions } from '../legalActions.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';

const rawCards = JSON.parse(fs.readFileSync(new URL('../../data/cards.json', import.meta.url), 'utf8'));
const normalized = rawCards.map(normalizeCard);
const index = makeCardIndex(normalized);
const byId = new Map(normalized.map((c) => [String(c.id), c]));
const deck = Array.from({ length: 40 }, () => 'SD28-003');
function ability(cardId, id) { return byId.get(cardId)?.abilities?.find((a) => a.id === id); }
function effect(cardId, id) { return byId.get(cardId)?.effects?.find((e) => e.id === id); }

function base() {
  const match = createMatch({ player1: { name: 'A', deck }, player2: { name: 'B', deck }, firstPlayerId: 'player1', cardIndex: index, random: () => 0.25 });
  match.phase = 'attack';
  match.activePlayerId = 'player1';
  match.players.player1.reserve = 20;
  match.players.player2.reserve = 20;
  return match;
}

test('content batch 7: SD28 reaches READY_NO_MANUAL at 17/17', () => {
  const coverage = JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage.json', import.meta.url), 'utf8'));
  const rows = coverage.cards.filter((entry) => entry.set === 'SD28');
  assert.equal(rows.length, 17);
  assert.equal(rows.every((entry) => ['AUTOMATED','NO_EFFECT'].includes(entry.status)), true);
});

test('content batch 7: Core Action Library expands to at least the Batch 07 reusable action set', () => {
  const types = listSupportedCoreActionTypes();
  assert.equal(types.includes('specialSummonSource'), true);
  assert.equal(types.includes('returnUltimateTriggerRevealedMatchingToHand'), true);
  assert.equal(types.length, 69);
});

test('content batch 7: Gigantea-Kamikiri High Speed is summonable during Flash priority', () => {
  const match = base();
  const physical = { ...makePhysicalCard('SD28-001', index), instanceId: 'high-speed-card' };
  match.players.player1.hand = [physical];
  match.battle = { id: 'b1', stage: 'flash1', attackerPlayerId: 'player1', defenderPlayerId: 'player2', flash: { number: 1, priorityPlayerId: 'player1', consecutivePasses: 0 }, restrictions: {} };
  const result = summonFromHand(match, 'player1', physical.instanceId, index, { highSpeed: true, coresToPlace: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.match.players.player1.field.spirits.some((c) => c.instanceId === physical.instanceId), true);

  const nexusMatch = base();
  const detector = { ...makePhysicalCard('SD28-012', index), instanceId: 'detector', cores: { regular: 1, soul: false }, exhausted: false };
  nexusMatch.players.player1.field.nexuses = [detector];
  nexusMatch.battle = { id: 'b2', stage: 'flash1', attackerPlayerId: 'player1', defenderPlayerId: 'player2', flash: { number: 1, priorityPlayerId: 'player1', consecutivePasses: 0 }, restrictions: {} };
  assert.equal(getLegalActions(nexusMatch, 'player1', index).some((a) => a.type === 'ACTIVATE_FIELD_FLASH' && a.action?.instanceId === 'detector'), true);
});

test('content batch 7: Kokuwan Spirit Soul is represented as a reusable summon reduction modifier', () => {
  const a = ability('SD28-002', 'sd28-002-spirit-soul-auto27');
  assert.equal(a.actions[0].property, 'summonReductionSymbols');
  assert.deepEqual(a.actions[0].value, ['green']);
  assert.deepEqual(a.actions[0].selector.cardTypes, ['ultimate']);
});

test('content batch 7: Akagane has destruction immunity and Ultimate Trigger recovery automation', () => {
  assert.equal(ability('SD28-004','sd28-004-protection-auto27').actions[0].property, 'effectDestructionImmune');
  assert.equal(ability('SD28-004','sd28-004-trigger-recovery-auto27').actions[0].type, 'returnUltimateTriggerRevealedMatchingToHand');
});

test('content batch 7: Koganehime makes Green Ultimate summon conditions ignorable and adds Shellman green symbol', () => {
  const actions = ability('SD28-007','sd28-007-continuous-auto27').actions;
  assert.equal(actions.some((a) => a.property === 'ignoreSummoningCondition'), true);
  assert.equal(actions.some((a) => a.property === 'symbols' && a.selector?.families?.includes('Shellman')), true);
  assert.equal(Array.isArray(effect('SD28-007','sd28-007-ultimate-trigger').onHitOperations), true);
});

test('content batch 7: Exhaust End uses opponent-hand-increase Burst and dynamic hand-size target count', () => {
  const burst = ability('SD28-014','sd28-014-burst-auto27');
  const flash = ability('SD28-014','sd28-014-flash-auto27');
  assert.equal(burst.trigger.event, 'burstOpponentHandIncrease');
  assert.equal(burst.actions[0].countFromContext, 'burstOpportunity.amount');
  assert.equal(flash.actions[0].targetCountFrom.divisor, 2);
});

test('content batch 7: Ultimate Gain refreshes Braved Ultimates and disables Ultimate Trigger for the turn', () => {
  const actions = ability('SD28-015','sd28-015-flash-auto27').actions;
  assert.equal(actions[0].type, 'refreshAllMatching');
  assert.equal(actions[0].selector.braved, true);
  assert.equal(actions[1].property, 'ultimateTriggerDisabled');
});

test('content batch 7: Ultimate-Ushiwaka Burst can special summon its own source', () => {
  const a = ability('SD28-X01','sd28-x01-burst-auto27');
  assert.equal(a.trigger.event, 'burstOwnSpiritDestroyed');
  assert.equal(a.actions.at(-1).type, 'specialSummonSource');
  assert.equal(effect('SD28-X01','sd28-x01-battle-trigger-display').onHitOperations[0].type, 'setBattleRestriction');
});

test('content batch 7: Gaianohoko observes Ultimate summons from hand and installs combined riders', () => {
  const free = ability('SD28-X02','sd28-x02-free-summon-auto27');
  assert.equal(free.trigger.scope, 'controllerHand');
  assert.equal(free.trigger.event, 'whenSummoned');
  assert.equal(ability('SD28-X02','sd28-x02-cost-auto27').conditions[0].type, 'combinedHostLacksEffectType');
  assert.equal(ability('SD28-X02','sd28-x02-burst-lock-auto27').conditions[0].type, 'eventSourceIsCombinedHost');
});
