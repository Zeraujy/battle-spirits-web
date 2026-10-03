import test from "node:test";
import assert from "node:assert/strict";

import {
  PREBUILT_DECKS,
  ownsPrebuiltDeckRecipe
} from "./prebuilt-decks.js";

test("Deck Builder recognizes explicit Starter Deck recipe IDs", () => {
  const template = PREBUILT_DECKS.find((entry) => entry.id === "sd10-shining-charge");
  assert.ok(template);
  assert.equal(ownsPrebuiltDeckRecipe(template, ["recipe-sd10-shining-charge"]), true);
  assert.equal(ownsPrebuiltDeckRecipe(template, ["recipe-sd11-dark-rush"]), false);
});

test("Deck Builder keeps compatibility with legacy set recipe IDs", () => {
  const template = PREBUILT_DECKS.find((entry) => entry.id === "sd10-shining-charge");
  assert.ok(template);
  assert.equal(ownsPrebuiltDeckRecipe(template, ["recipe-sd10"]), true);
});

test("all explicit Starter Deck recipes can be recognized", () => {
  const owned = PREBUILT_DECKS.map((entry) => entry.recipeId);
  for (const template of PREBUILT_DECKS) {
    assert.equal(ownsPrebuiltDeckRecipe(template, owned), true, template.id);
  }
});
