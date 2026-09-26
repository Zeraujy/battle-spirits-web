import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCustomMatchSettings,
  resolveFirstPlayerId,
  deckValidationOptionsForSettings
} from "./customMatchSettings.js";
import { validateDeck } from "../game/state.js";

test("custom match settings normalize unsupported values safely", () => {
  assert.deepEqual(normalizeCustomMatchSettings({ firstPlayerMode: "cheat", turnTimerSeconds: 45, ruleset: "broken", mulliganEnabled: false }), {
    firstPlayerMode: "random",
    turnTimerSeconds: 0,
    mulliganEnabled: false,
    ruleset: "standard"
  });
});

test("custom rooms can choose host, guest or random first player", () => {
  assert.equal(resolveFirstPlayerId({ firstPlayerMode: "host" }), "player1");
  assert.equal(resolveFirstPlayerId({ firstPlayerMode: "guest" }), "player2");
  assert.equal(resolveFirstPlayerId({ firstPlayerMode: "random" }, () => 0.2), "player1");
  assert.equal(resolveFirstPlayerId({ firstPlayerMode: "random" }, () => 0.8), "player2");
});

test("lab ruleset relaxes deck size and copy limits without affecting standard", () => {
  assert.deepEqual(deckValidationOptionsForSettings({ ruleset: "standard" }), {});
  assert.deepEqual(deckValidationOptionsForSettings({ ruleset: "lab" }), { minimumDeckSize: 1, maxSameName: 99 });
});


test("LAB validation actually accepts a small repeated-card test deck", () => {
  const index = new Map([["TEST-001", { id: "TEST-001", name: "Test Spirit", nameEn: "Test Spirit" }]]);
  const deck = Array.from({ length: 8 }, () => "TEST-001");
  assert.equal(validateDeck(deck, index).ok, false);
  assert.equal(validateDeck(deck, index, deckValidationOptionsForSettings({ ruleset: "lab" })).ok, true);
});
