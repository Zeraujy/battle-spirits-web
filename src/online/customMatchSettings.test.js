import test from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOM_MATCH_DEFAULTS,
  customMatchSettingsSummary,
  deckValidationOptionsForSettings,
  normalizeCustomMatchSettings,
  resolveFirstPlayerId
} from "./customMatchSettings.js";

test("custom match defaults are Eternal casual", () => {
  assert.equal(CUSTOM_MATCH_DEFAULTS.ruleset, "eternal");
  assert.equal(normalizeCustomMatchSettings({}).ruleset, "eternal");
});

test("legacy standard room settings are migrated to Eternal", () => {
  assert.equal(normalizeCustomMatchSettings({ ruleset: "standard" }).ruleset, "eternal");
});

test("official and LAB map to their own validation options", () => {
  assert.deepEqual(deckValidationOptionsForSettings({ ruleset: "official" }), { regulation: "official" });
  assert.deepEqual(deckValidationOptionsForSettings({ ruleset: "eternal" }), { regulation: "eternal" });
  assert.deepEqual(deckValidationOptionsForSettings({ ruleset: "lab" }), { minimumDeckSize: 1, maxSameName: 99, regulation: "lab" });
});

test("host and guest first-player choices remain deterministic", () => {
  assert.equal(resolveFirstPlayerId({ firstPlayerMode: "host" }), "player1");
  assert.equal(resolveFirstPlayerId({ firstPlayerMode: "guest" }), "player2");
});

test("summary identifies official and experimental rooms", () => {
  assert.equal(customMatchSettingsSummary({ ruleset: "official" }).official, true);
  assert.equal(customMatchSettingsSummary({ ruleset: "lab" }).experimental, true);
});
