# v5.1.0 Phase 5 — Targeting Engine v2

`src/game/effectEngine/targetingEngine.js` is the canonical selector engine.
`targetResolver.js` remains only as a compatibility facade.

## Selector vocabulary

- owner: `self | opponent | any`
- zones: `field | spirits | nexuses | other | hand | trash | revealed | burst | deck`
- card type / types
- color / colors
- family / families
- symbol / symbols
- minimum / maximum cost
- minimum / maximum BP
- minimum / maximum level
- state: `exhausted | refreshed`
- `braved`
- `combined`
- `hasSoulCore`
- `excludeSource`
- `includeCombined`

For battlefield cards the engine uses effective BP, cost, color and symbols, including Brave-derived values where the existing rule helpers define them.

Selectors are data. No card ID is required by the targeting engine.
