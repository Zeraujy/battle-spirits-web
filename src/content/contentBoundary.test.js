import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PREBUILT_DECKS,
  SHOP_CATEGORIES,
  SHOP_PRODUCTS,
  inferShopSagaId,
  sagaGroupsForProducts,
} from './index.js';

test('content public facade exposes structured shop and deck data', () => {
  assert.ok(Array.isArray(SHOP_CATEGORIES));
  assert.ok(SHOP_CATEGORIES.length > 0);
  assert.ok(Array.isArray(SHOP_PRODUCTS));
  assert.ok(SHOP_PRODUCTS.length > 0);
  assert.ok(Array.isArray(PREBUILT_DECKS));
  assert.ok(PREBUILT_DECKS.length > 0);
  assert.equal(typeof inferShopSagaId, 'function');
  assert.equal(typeof sagaGroupsForProducts, 'function');
});

test('content facade keeps official recipes addressable by stable ids', () => {
  const recipeIds = PREBUILT_DECKS.map((deck) => deck.recipeId).filter(Boolean);
  assert.equal(new Set(recipeIds).size, recipeIds.length);
});
