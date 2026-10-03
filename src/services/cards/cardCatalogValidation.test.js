import test from "node:test";
import assert from "node:assert/strict";
import { inferSetCode, validateCatalogCard, validateCatalogCollection } from "./cardCatalogValidation.js";

test("infere set pelo código da carta quando set não está preenchido", () => {
  assert.equal(inferSetCode({ id: "BS13-001" }), "BS13");
});

test("aceita uma carta básica válida", () => {
  const report = validateCatalogCard({
    id: "BS99-001",
    set: "BS99",
    nameEN: "Test Spirit",
    namePT: "Spirit de Teste",
    cardType: "spirit",
    colors: ["red"],
    cost: 3,
    reduction: ["red"],
    symbols: ["red"],
    levels: [{ level: 1, cores: 1, bp: 3000 }],
    image: "/cards-database/BS99/BS99-001.webp"
  }, { expectedSet: "BS99", requireImage: true });
  assert.equal(report.valid, true);
  assert.deepEqual(report.errors, []);
});

test("rejeita tipo e custo inválidos", () => {
  const report = validateCatalogCard({ id: "BS99-002", nameEN: "Broken", cardType: "monster", cost: -1 });
  assert.equal(report.valid, false);
  assert.ok(report.errors.some((message) => message.includes("Tipo")));
  assert.ok(report.errors.some((message) => message.includes("Custo")));
});

test("detecta IDs duplicados numa importação", () => {
  const result = validateCatalogCollection([
    { id: "BS99-001", nameEN: "A", cardType: "magic", colors: ["red"], cost: 1 },
    { id: "BS99-001", nameEN: "B", cardType: "magic", colors: ["red"], cost: 1 }
  ]);
  assert.equal(result.valid, false);
  assert.deepEqual(result.duplicateIds, ["BS99-001"]);
});
