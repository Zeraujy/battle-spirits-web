import test from "node:test";
import assert from "node:assert/strict";
import { SHOP_PRODUCTS } from "../content/index.js";
import { inferShopSagaId, sagaGroupsForProducts } from "../content/index.js";

test("shop saga map keeps early main sets in Wanderer Lolo Saga", () => {
  assert.equal(inferShopSagaId("BS01"), "wanderer-lolo");
  assert.equal(inferShopSagaId("BS09"), "wanderer-lolo");
  assert.equal(inferShopSagaId("BS13"), "constellation");
});

test("shop saga map associates current deck eras", () => {
  assert.equal(inferShopSagaId("SD10"), "sword-blade");
  assert.equal(inferShopSagaId("SD28"), "ultimate-battle");
  assert.equal(inferShopSagaId("SD64"), "contract");
});

test("BSC49 and premium sets carry the intended shop product rules", () => {
  const bsc49 = SHOP_PRODUCTS.find((product) => product.setCode === "BSC49");
  const pc01 = SHOP_PRODUCTS.find((product) => product.setCode === "PC01");
  assert.equal(bsc49.packSize, 9);
  assert.equal(pc01.productType, "card-set");
  assert.equal(pc01.fixedContents, true);
});

test("booster catalog can be grouped without losing products", () => {
  const boosters = SHOP_PRODUCTS.filter((product) => product.category === "boosters");
  const groupedCount = sagaGroupsForProducts(boosters).reduce((sum, group) => sum + group.count, 0);
  assert.equal(groupedCount, boosters.length);
});
