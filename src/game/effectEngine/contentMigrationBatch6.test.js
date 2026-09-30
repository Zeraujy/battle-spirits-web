import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeCard, makeCardIndex } from '../cardAdapter.js';
import { createMatch, makePhysicalCard } from '../state.js';
import { dispatchEffectEvent } from './triggerDispatcher.js';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';
import { resolveActionList } from './actionResolver.js';

const rawCards = JSON.parse(fs.readFileSync(new URL('../../data/cards.json', import.meta.url), 'utf8'));
const normalized = rawCards.map(normalizeCard);
const index = makeCardIndex(normalized);
const byId = new Map(normalized.map((c) => [String(c.id), c]));
const deck = Array.from({ length: 40 }, () => 'SD23-004');

function base() {
  const match = createMatch({ player1: { name: 'A', deck }, player2: { name: 'B', deck }, firstPlayerId: 'player1', cardIndex: index, random: () => 0.25 });
  match.phase = 'attack';
  match.activePlayerId = 'player1';
  match.players.player1.reserve = 20;
  match.players.player2.reserve = 20;
  return match;
}
function physical(cardId, instanceId, regular = 1, exhausted = false) {
  return { ...makePhysicalCard(cardId, index), instanceId, cores: { regular, soul: false }, exhausted };
}
function ability(cardId, id) { return byId.get(cardId)?.abilities?.find((a) => a.id === id); }
function effect(cardId, id) { return byId.get(cardId)?.effects?.find((e) => e.id === id); }

test('content batch 6: SD23 reaches READY_NO_MANUAL at 17/17', () => {
  const coverage = JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage.json', import.meta.url), 'utf8'));
  const rows = coverage.cards.filter((entry) => entry.set === 'SD23');
  assert.equal(rows.length, 17);
  assert.equal(rows.every((entry) => ['AUTOMATED','NO_EFFECT'].includes(entry.status)), true);
});

test('content batch 6: Core Action Library exposes the five reusable migration primitives', () => {
  const types = listSupportedCoreActionTypes();
  for (const type of ['dispatchSourceEvent','revealTopAndRoute','oncePerTurn','returnMagicUsedThisBattle','swapExhaustionState']) assert.equal(types.includes(type), true);
  assert.equal(types.length, 69);
});

test('content batch 6: Haneppo draws two only with an allied Fairy and opponent destruction', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD23-002', 'fairy', 2)];
  const before = match.players.player1.hand.length;
  const result = dispatchEffectEvent(match, {
    event: 'whenDestroyed', sourcePlayerId: 'player1', sourceCardId: 'SD23-001', sourcePhysical: physical('SD23-001','haneppo',1),
    context: { destroyedByPlayerId: 'player2' }
  }, index);
  assert.equal(result.match.players.player1.hand.length, before + 2);
});

test('content batch 6: Hiver uses selected-target BP and once-per-turn draw structure', () => {
  const a = ability('SD23-003','sd23-003-attack-auto26');
  assert.equal(a.actions[0].onSelect[0].type, 'modifyBP');
  assert.equal(a.actions[0].onSelect[1].condition.type, 'selectedTargetBP');
  assert.equal(a.actions[0].onSelect[1].actions[0].type, 'oncePerTurn');
});

test('content batch 6: Actia resolves life prevention and Core gain at battle resolution', () => {
  assert.equal(ability('SD23-006','sd23-006-life-auto26').actions[0].type, 'setBattleRestriction');
  assert.equal(ability('SD23-006','sd23-006-core-auto26').actions[0].type, 'addCoreToReserveFromVoid');
});

test('content batch 6: Ultimate-Kleio and Ultimate-Virchu have executable HIT operations and blocked riders', () => {
  for (const [id, triggerId] of [['SD23-008','sd23-008-trigger'],['SD23-009','sd23-009-trigger']]) {
    const e = effect(id, triggerId);
    assert.equal(Array.isArray(e.onHitOperations), true);
    assert.equal(e.onHitOperations.some((a) => a.type === 'setBattleRestriction'), true);
    assert.equal(byId.get(id).abilities.some((a) => a.trigger?.event === 'whenBlocked'), true);
  }
});

test('content batch 6: Ultimate-Exsia Brilliance returns Magic used in the current battle', () => {
  const a = ability('SD23-010','sd23-010-brilliance-auto26');
  assert.equal(a.trigger.event, 'afterBattleResolution');
  assert.equal(a.conditions[0].type, 'battleSourceRole');
  assert.equal(a.actions[0].type, 'returnMagicUsedThisBattle');
});

test('content batch 6: Fortress observers use canonical cardMoved and bpBecameZero events', () => {
  assert.equal(ability('SD23-011','sd23-011-life-auto26').trigger.event, 'cardMoved');
  assert.equal(ability('SD23-011','sd23-011-draw-auto26').trigger.event, 'bpBecameZero');
});

test('content batch 6: Burst Snap blanking is expressed as generic turn modifiers', () => {
  const a = ability('SD23-014','sd23-014-flash-auto26');
  const props = a.actions[0].onSelect.map((x) => x.property);
  assert.deepEqual(props, ['cannotAttack','cannotBlock','effectsDisabled']);
});

test('content batch 6: Reversal Force swaps exhaustion state generically', () => {
  let match = base();
  match.players.player1.field.spirits = [physical('SD23-004','a',1,false)];
  match.players.player2.field.spirits = [physical('SD23-005','b',1,true)];
  const result = resolveActionList(match, [{ type: 'swapExhaustionState', selector: { owner: 'any', zones: ['field'], cardTypes: ['spirit'] } }], index, { sourcePlayerId: 'player1', sourceCard: byId.get('SD23-016') });
  assert.equal(result.match.players.player1.field.spirits[0].exhausted, true);
  assert.equal(result.match.players.player2.field.spirits[0].exhausted, false);
});
