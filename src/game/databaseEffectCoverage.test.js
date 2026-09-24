import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { supportsActionType } from "./effectEngine/actionResolver.js";

function collectActions(value, target = []) {
  if (!value) return target;
  if (Array.isArray(value)) {
    for (const item of value) collectActions(item, target);
    return target;
  }
  if (typeof value !== "object") return target;

  if (value.type) target.push(value.type);
  const nestedKeys = [
    "actions", "operations", "ops", "then", "else", "onTrue", "onFalse",
    "onSelect", "onConfirm", "afterSelect", "afterConfirm", "afterIfAny"
  ];
  for (const key of nestedKeys) collectActions(value[key], target);
  if (Array.isArray(value.options)) {
    for (const option of value.options) collectActions(option, target);
  }
  return target;
}

test("v3.2.0 Effect Engine recognizes every structured operation type in the current database", () => {
  const raw = JSON.parse(fs.readFileSync(new URL("../data/cards.json", import.meta.url), "utf8"));
  const cards = Array.isArray(raw) ? raw : (Array.isArray(raw.cards) ? raw.cards : Object.values(raw));
  const operationTypes = new Set();

  for (const card of cards) {
    for (const entry of [...(card.effects || []), ...(card.abilities || [])]) {
      for (const type of collectActions(entry.actions ?? entry.operations ?? entry.ops ?? [])) operationTypes.add(type);
    }
  }

  const unsupported = [...operationTypes].filter((type) => !supportsActionType(type)).sort();
  assert.deepEqual(unsupported, []);
});
