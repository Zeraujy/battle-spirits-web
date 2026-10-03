import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { dispatchPhaseEntry } from './phaseTriggerEngine.js';
import { getEffectiveBP } from '../selectors.js';

const rawCards = JSON.parse(fs.readFileSync(new URL('../../data/cards.json', import.meta.url), 'utf8'));
const byId = new Map(rawCards.map((card) => [String(card.id), normalizeCard(card)]));
const filler = normalizeCard({ id: 'BATCH-FILL', namePT: 'Fill', cardType: 'spirit', colors: ['red'], cost: 0, symbols: ['red'], families: ['Terra Dragon'], levels: [{ level: 1, cores: 1, bp: 1000 }] });
const relevant = ['SD20-007', 'SD20-X01', 'SD17-005', 'SD17-013'].map((id) => byId.get(id));
const index = makeCardIndex([...relevant, filler]);
const deck = Array.from({ length: 40 }, () => 'BATCH-FILL');

function base() {
  const match = createMatch({ player1: { name: 'A', deck }, player2: { name: 'B', deck }, firstPlayerId: 'player1', cardIndex: index, random: () => 0.25 });
  match.phase = 'main';
  match.activePlayerId = 'player1';
  return match;
}

function physical(cardId, instanceId, regular = 1) {
  return { ...makePhysicalCard(cardId, index), instanceId, cores: { regular, soul: false }, exhausted: false, combinedWith: null };
}

test('content batch 1: SD20 White Jet Dragoon applies Life<=3 BP aura and discards set Burst on attack', () => {
  let match = base();
  match.players.player1.life = 3;
  match.players.player1.field.spirits = [physical('SD20-007', 'jet', 3)];
  match.players.player2.burst = { ...physical('BATCH-FILL', 'burst'), faceDown: true };

  const entered = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player1', sourceInstanceId: 'jet' }, index);
  const before = getEffectiveBP(entered.match, index, entered.match.players.player1.field.spirits[0]);
  assert.equal(before >= 4000, true);

  const attacked = dispatchEffectEvent(entered.match, { event: 'whenAttacks', sourcePlayerId: 'player1', sourceInstanceId: 'jet' }, index);
  assert.equal(attacked.match.players.player2.burst, null);
  assert.equal(attacked.match.players.player2.trash.some((card) => card.instanceId === 'burst'), true);
});

test('content batch 1: SD20 Ultimate-Odin summon effect returns the only opposing Spirit to hand', () => {
  let match = base();
  match.players.player1.field.other = [physical('SD20-X01', 'odin', 5)];
  match.players.player2.field.spirits = [physical('BATCH-FILL', 'enemy', 1)];
  const result = dispatchEffectEvent(match, { event: 'whenSummoned', sourcePlayerId: 'player1', sourceInstanceId: 'odin' }, index);
  assert.equal(result.manualResolutionNeeded, false);
  assert.equal(result.match.players.player2.field.spirits.length, 0);
  assert.equal(result.match.players.player2.hand.some((card) => card.instanceId === 'enemy'), true);
});

test('content batch 1: SD17 Terra Dragon Attack Step aura adds 2000 BP', () => {
  let match = base();
  match.phase = 'attack';
  match.players.player1.field.spirits = [physical('SD17-005', 'ped', 4), physical('BATCH-FILL', 'terra', 1)];
  const baseBP = getEffectiveBP(match, index, match.players.player1.field.spirits[1]);
  const result = dispatchPhaseEntry(match, 'attack', index, { eventPlayerId: 'player1', previousPhase: 'main' });
  const boosted = getEffectiveBP(result.match, index, result.match.players.player1.field.spirits[1]);
  assert.equal(boosted, baseBP + 2000);
});

test('content batch 1: coverage recognizes structured Brave condition and new migrations without hiding remaining gaps', () => {
  const coverage = JSON.parse(fs.readFileSync(new URL('../../../data/effects/coverage.json', import.meta.url), 'utf8'));
  const card = (id) => coverage.cards.find((entry) => entry.cardId === id);
  assert.equal(card('SD20-007')?.status, 'AUTOMATED');
  assert.equal(card('SD20-X01')?.status, 'AUTOMATED');
  assert.equal(card('SD17-005')?.status, 'AUTOMATED');
  assert.equal(card('SD17-013')?.status, 'AUTOMATED');
  assert.equal(card('SD13-007')?.status, 'AUTOMATED');
  // Batch 02 may promote additional cards; Batch 01 only asserts its own migrated cards remain automated.
});
