import test from "node:test";
import assert from "node:assert/strict";
import { getSmartCoreClickTarget } from "../interactions/coreClickPolicy.js";

test("smart Core click pays summon cost before placing Level Cores", () => {
  const pendingPlay = { instanceId: "spirit-1", payableCost: 2, minimumCores: 1 };

  assert.deepEqual(
    getSmartCoreClickTarget({
      source: { zone: "reserve" },
      pendingPlay,
      paidCount: 0,
      pendingCoreCount: 0
    }),
    { zone: "trash", reason: "pay-cost" }
  );

  assert.deepEqual(
    getSmartCoreClickTarget({
      source: { zone: "reserve" },
      pendingPlay,
      paidCount: 2,
      pendingCoreCount: 0
    }),
    { zone: "card", instanceId: "spirit-1", reason: "minimum-core" }
  );
});

test("smart Core click can place extra Level Cores after minimum is met", () => {
  const pendingPlay = { instanceId: "spirit-1", payableCost: 1, minimumCores: 1 };
  assert.deepEqual(
    getSmartCoreClickTarget({
      source: { zone: "reserve" },
      pendingPlay,
      paidCount: 1,
      pendingCoreCount: 2
    }),
    { zone: "card", instanceId: "spirit-1", reason: "extra-level-core" }
  );
});

test("smart Core click sends Magic payment to Core Trash", () => {
  assert.deepEqual(
    getSmartCoreClickTarget({
      source: { zone: "reserve" },
      pendingCost: { payableCost: 3 },
      paidCount: 1
    }),
    { zone: "trash", reason: "pay-cost" }
  );
});

test("smart Core click on Core Trash undoes an active manual payment", () => {
  assert.deepEqual(
    getSmartCoreClickTarget({
      source: { zone: "trash" },
      pendingCost: { payableCost: 2 },
      paidCount: 1
    }),
    { zone: "reserve", reason: "undo-payment" }
  );
});

test("direct-combined Brave does not receive automatic Level Core after payment", () => {
  assert.equal(
    getSmartCoreClickTarget({
      source: { zone: "reserve" },
      pendingPlay: {
        instanceId: "brave-1",
        payableCost: 2,
        minimumCores: 0,
        directCombineHostInstanceId: "host-1"
      },
      paidCount: 2
    }),
    null
  );
});
