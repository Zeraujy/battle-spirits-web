import assert from "node:assert/strict";
import test from "node:test";
import { createArenaVisualLayoutModel } from "./arenaVisualLayoutModel.js";

test("arena visual layout model normalizes both mirrored sides", () => {
  const model = createArenaVisualLayoutModel({
    player: { life: [1, 2, 3, 4, 5], hand: [1, 2, 3] },
    opponent: { deck: { count: 40 }, trash: { count: 2 } }
  });

  assert.equal(model.player.life.count, 5);
  assert.equal(model.player.hand.count, 3);
  assert.equal(model.opponent.deck.count, 40);
  assert.equal(model.opponent.trash.count, 2);
  assert.equal(model.player.burst.count, 0);
  assert.equal(model.playmatId, "default");
});

test("arena visual layout model preserves presentation-only cards and Core counts", () => {
  const model = createArenaVisualLayoutModel({
    player: {
      reserve: { count: 5, coreCount: 4, soulCoreCount: 1 },
      hand: { cards: [{ id: "hand-1", image: "/card.webp" }] },
      battlefield: { cards: [{ id: "field-1", level: 2, bp: 7000, coreCount: 3 }] }
    }
  });

  assert.equal(model.player.reserve.coreCount, 4);
  assert.equal(model.player.reserve.soulCoreCount, 1);
  assert.equal(model.player.hand.cards[0].image, "/card.webp");
  assert.equal(model.player.battlefield.cards[0].bp, 7000);
  assert.equal(model.player.battlefield.cards[0].coreCount, 3);
});


test("arena visual layout model preserves instanceId for interactive cards", () => {
  const model = createArenaVisualLayoutModel({
    player: {
      hand: { cards: [{ id: "hand-1", instanceId: "p1-hand-1", image: "/card.webp" }] },
      battlefield: { cards: [{ id: "field-1", instanceId: "p1-field-1", level: 2, bp: 7000 }] }
    }
  });

  assert.equal(model.player.hand.cards[0].instanceId, "p1-hand-1");
  assert.equal(model.player.battlefield.cards[0].instanceId, "p1-field-1");
});

test("arena visual layout model preserves playability and combat drag flags", () => {
  const model = createArenaVisualLayoutModel({
    player: {
      hand: { cards: [{ id: "hand-1", instanceId: "hand-1", playable: false, playabilityRelevant: true }] },
      battlefield: { cards: [{ id: "field-1", instanceId: "field-1", canAttack: true, canBlock: false }] }
    }
  });

  assert.equal(model.player.hand.cards[0].playable, false);
  assert.equal(model.player.hand.cards[0].playabilityRelevant, true);
  assert.equal(model.player.battlefield.cards[0].canAttack, true);
  assert.equal(model.player.battlefield.cards[0].canBlock, false);
});
