import test from "node:test";
import assert from "node:assert/strict";
import {
  getArenaPlaymatCatalog,
  getDefaultArenaPlaymat
} from "./playmatRegistry.js";
import { resolveArenaPlaymat } from "./playmatResolver.js";

test("Arena redesign registers exactly one built-in default playmat in the foundation block", () => {
  const catalog = getArenaPlaymatCatalog();
  const defaultPlaymat = getDefaultArenaPlaymat();

  assert.equal(catalog.length, 1);
  assert.equal(defaultPlaymat.id, "default");
  assert.equal(
    defaultPlaymat.assetUrl,
    "/images/arena/wallpaper_arena_default.png"
  );
  assert.equal(defaultPlaymat.ownership, "default");
});

test("Arena redesign falls back to the default playmat for unknown selections", () => {
  assert.equal(resolveArenaPlaymat("not-owned-yet").id, "default");
});
