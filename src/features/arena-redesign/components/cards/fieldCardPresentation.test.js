import test from "node:test";
import assert from "node:assert/strict";
import {
  getFieldCardBp,
  getFieldCardDensity,
  getFieldCardLevel,
  getFieldCardRole
} from "./fieldCardPresentation.js";

test("field density scales without hiding cards", () => {
  assert.equal(getFieldCardDensity(1), "large");
  assert.equal(getFieldCardDensity(4), "medium");
  assert.equal(getFieldCardDensity(7), "compact");
});

test("field level and BP use physical cores plus temporary BP", () => {
  const card = {
    levels: [
      { level: 1, cores: 1, bp: 3000 },
      { level: 2, cores: 3, bp: 5000 },
      { level: 3, cores: 5, bp: 8000 }
    ]
  };
  const physical = { cores: { regular: 2, soul: true }, temporaryBP: 2000 };
  assert.equal(getFieldCardLevel(card, physical)?.level, 2);
  assert.equal(getFieldCardBp(card, physical), 7000);
});

test("battle role is derived without mutating card state", () => {
  const battle = { attackerInstanceId: "a", blockerInstanceId: "b" };
  assert.equal(getFieldCardRole("a", battle), "attacker");
  assert.equal(getFieldCardRole("b", battle), "blocker");
  assert.equal(getFieldCardRole("c", battle), null);
});
