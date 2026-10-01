/**
 * v5.2.0 Phase 4 — content-domain public facade.
 *
 * Application code should consume structured shop/deck content through this
 * module instead of coupling directly to the current src/data file layout.
 * The implementation may move to a future kaihou-content repository without
 * changing consumer imports.
 */
export * from "../data/shopCatalog.js";
export * from "../data/shopSagas.js";
export * from "../data/prebuiltDecks.js";
