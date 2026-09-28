import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { listSupportedCoreActionTypes } from './coreActionLibrary.js';
import { getTriggeredEntries } from './normalizer.js';

test('Phase 21 action vocabulary contains migration primitives', () => {
  const types = new Set(listSupportedCoreActionTypes());
  assert.equal(types.has('moveCoreSelectedToSource'), true);
  assert.equal(types.has('paySourceCost'), true);
});

test('Phase 21 normalizer keeps engine-native Ultimate rules out of generic manual resolution', () => {
  const card = {
    id: 'T-U',
    effects: [
      { id: 'condition', type: 'summonCondition', timing: 'summon', text: { en: 'condition' } },
      { id: 'utrigger', type: 'ultimateTrigger', timing: 'whenAttacks', text: { en: 'trigger' } }
    ],
    abilities: []
  };
  const entries = getTriggeredEntries(card, 'whenAttacks');
  assert.equal(entries.length, 0);
});

test('Phase 22 first Starter Deck batch is fully automated', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../../../data/effect-coverage.json', import.meta.url), 'utf8'));
  const sd19 = data.cards.filter((card) => card.set === 'SD19');
  assert.equal(sd19.length, 17);
  assert.deepEqual(sd19.filter((card) => !['AUTOMATED', 'NO_EFFECT'].includes(card.status)), []);
});

test('Phase 22 priority audit refuses to fake coverage for missing runtime data', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../../../data/effect-migrations/starter-deck-priority.json', import.meta.url), 'utf8'));
  const sd19 = data.decks.find((deck) => deck.setCode === 'SD19');
  assert.equal(sd19?.readyWithoutManual, true);
  assert.equal(data.decks.some((deck) => deck.status === 'BLOCKED_MISSING_RUNTIME_DATA'), true);
});
