# Battle Spirits: KAIHOU! Simulator v5.0.3

## Starter Deck Purchase Fix

- Fixed authenticated Starter Deck purchases being routed as booster purchases when `product_type` was missing in newly inserted Shop rows.
- Deck category is now authoritative in `bs_purchase_shop_product`.
- All existing active deck products are repaired to `product_type = deck`.
- Product contents are validated before Spirit Coins are debited.
- Fresh v5.0.1 starter-product inserts now explicitly persist `product_type = deck`.
- Added `shop:v503:purchase:audit` to prevent this routing regression.

### Supabase
Run `supabase/ECONOMY-5.0.3-DECK-PURCHASE-FIX.sql` after the v5.0.2 onboarding migration.

## v5.1.0 development — Phase 21/22

- Added the Card Migration Pipeline (`npm run effects:migrate -- --set=SDxx`).
- Added schema validation and migration receipts under `data/effect-migrations/`.
- Added Starter Deck priority audit with `READY_NO_MANUAL`, `NEEDS_MIGRATION` and `BLOCKED_MISSING_RUNTIME_DATA` states.
- First completed content batch: SD19 — Ultimate Deck: Scorching Zero.
- SD19 now passes the no-manual gate across all 17 unique recipe cards.
- Runtime-native Ultimate rules are no longer misclassified as generic manual fallback by the coverage audit.
## v5.1.0 development — Phase 23–27 Release Candidate

- Added conservative set-by-set automation tooling and safe display-effect normalization.
- Added generated per-card regression scenarios for every card currently classified as fully automated/no-effect.
- Added the official Manual Resolution Reduction Audit with a release target below 10%.
- Added Final Mechanics QA and v5.1.0 Release QA orchestrators.
- Technical QA passes, but the content release gate is intentionally blocked: only SD19 currently meets the >=95% per-set automation target and full-catalog manual fallback remains 78.63%.
- The build remains a release candidate; v5.1.0 is not promoted until the content gates pass.



## v5.1.0 Content Migration — Batch 01

- Phase 21 migration registry expanded with safe SD20 and SD17 conversions.
- SD20 White Jet Dragoon: Life <= 3 BP modifier and opposing set-Burst discard structured.
- SD20 Ultimate-Odin: When Summoned return-to-hand effect structured.
- SD17 FeatherDragon Pedpenner: Terra Dragon Attack Step BP aura structured.
- SD17 Dark Galaxy of Dusk: Attack Step BP aura and End Step refresh structured.
- Automation audit now recognizes documented Combine Conditions only when a structured `braveCondition` is present.
- Phase 24 card regression scenarios regenerated from 78 to 83 cards.
- Manual Resolution fallback improved from 78.63% (287/365) to 77.26% (282/365).
- Internal application version remains 5.0.3 while v5.1.0 content migration continues.

## v5.1.0 Content Migration — Batch 02

- SD20 — Ultimate Deck: Silver Zero reaches 17/17 automated/no-effect cards and becomes `READY_NO_MANUAL`.
- Added reusable exhausted-block support for effects that explicitly allow blocking while Exhausted.
- Added color-based effect immunity used by Heavy Armor: Red, including targeted effects and continuous modifiers.
- Added per-turn Ultimate-effect Life-loss protection used by Rowgard North Command.
- Destruction caused during structured effect resolution now emits deferred canonical `whenDestroyed` events for field observers.
- SD20 The Falling World now reacts to opponent-caused destruction with its Nexus/Spirit return effects.
- SD17 PiercingDragon Styragorn now uses source-relative BP targeting.
- SD17 ArmedMachineDragon Silveed now validates its Terra Dragon Combine condition and retrieves Rush Spirits from Trash.
- SD17 automation improves to 77.8%; SD20 improves to 100%.
- Full-catalog Manual Resolution fallback improves from 77.26% (282/365) to 75.89% (277/365).
- Phase 24 generated regression scenarios increase from 83 to 88 cards.
- Internal application version remains 5.0.3 while v5.1.0 content migration continues.
## v5.1.0 Content Migration — Batch 03

- SD17 — New Tsurugi Deck: Darkness Fang reaches 18/18 automated/no-effect cards and becomes `READY_NO_MANUAL`.
- Monoforcesaurus now tracks its own per-instance first attack for Rush: Green refresh automation.
- Primeval Forest now observes BP-comparison outcomes and opposing-Spirit destruction through canonical battle/destruction context.
- DarkDragon Dark-Tyrannosaura now automates source-relative BP destruction, Rush life movement and its Terra Dragon Attack Step aura.
- Added reusable specified-attack resolution: the chosen opposing Spirit/Ultimate is immediately established as blocker and the flow advances to Flash Timing 2.
- DarknessDemonSword Dark-Blade now resolves its combined specified attack through structured Yes/No + target decisions.
- Set automation gate improves from 2/11 to 3/11 complete sets (SD17, SD19, SD20).
- Full-catalog Manual Resolution fallback improves from 75.89% (277/365) to 74.79% (273/365).
- Phase 24 generated regression scenarios increase from 88 to 92 cards.
- Internal application version remains 5.0.3 while v5.1.0 content migration continues.


## v5.1.0 Content Migration — Batch 04

- SD13 — Attribute Eye-Opening Deck: Amethyst reaches 18/18 automated/no-effect cards and becomes `READY_NO_MANUAL`.
- Structured SD13 Deadly Balance, Baculus Core trimming, Gashabers Draw/Trash recovery, Evil-Fisher reveal choice, Totentanz discard-as-cost, Brigade's Skyscraper attack observer, Bone-Cat retaliation and Cursedragon multi-target effects.
- Player decisions can now be authored by the opponent when the card text requires the opponent to choose.
- Added reusable Core trimming, dynamic draw-per-selection, destruction-source targeting and deferred observer fanout after decision-driven effects.
- SD10 — Tsurugi Deck: Shining Charge advances to 16/18 automated/no-effect cards (88.9%).
- Charge keyword checks are now Level-aware in targeting, continuous modifiers and Brave Combine Conditions.
- Added Charge-aware BP auras, dynamic BP-per-matching-card effects, Charge-based Brave conditions, Dragon Shuttle observers and Big Bang Energy draw-per-destruction automation.
- SD10 has only Fire Wall (`SD10-015`) and the free Red Brave summon of `SD10-X01` remaining.
- Set automation gate improves from 3/11 to 4/11 complete sets (SD13, SD17, SD19, SD20).
- Full-catalog Manual Resolution fallback improves from 74.79% (273/365) to 70.96% (259/365).
- Phase 24 generated regression scenarios increase from 92 to 106 cards.
- Core Action Library reports 55 action types.
- Internal application version remains 5.0.3 while v5.1.0 content migration continues.


## v5.1.0 Content Migration — Batch 05

- SD10 and SD11 reach `READY_NO_MANUAL`, raising the audited set gate from 4/11 to 6/11.
- Added delayed Attack Step termination, free effect-driven summons, mandatory attack-if-able, source-event relay, combined-host targeting and Rush condition bypass.
- Manual fallback improves to 67.40% (246/365), generated regressions to 119, and the Core Action Library to 59 action types.
- Internal application version remains 5.0.3 while v5.1.0 content migration continues.


## v5.1.0 Content Migration — Batch 06

- SD23 — Ultimate Deck: Eris the Morning Star reaches 17/17 automated cards and becomes `READY_NO_MANUAL`.
- Added reusable canonical card-move and 0-BP events, battle-resolution selectors, top-deck reveal routing, once-per-turn structured guards, battle Magic recovery, exhaustion-state inversion and battle-scoped hand cost modifiers.
- Symphonic Burst and Burst Snap now support authoritative Burst-to-Flash continuations without card-ID-specific reducer logic.
- Ultimate-Kleio, Ultimate-Virchu and Ultimate-Exsia now execute their structured Ultimate Trigger HIT follow-ups.
- Set automation gate improves from 6/11 to 7/11 complete sets.
- Full-catalog Manual Resolution fallback improves from 67.40% (246/365) to 63.56% (232/365).
- Phase 24 generated regression scenarios increase from 119 to 133 cards.
- Core Action Library increases from 59 to 64 action types.
- Internal application version remains 5.0.3 while v5.1.0 content migration continues.

## v5.1.0 Content Migration — Batch 07

- SD28 — Ultimate Deck: Land of Deep Green reaches 17/17 READY_NO_MANUAL.
- Set gate advances from 7/11 to 8/11 complete sets.
- Added reusable High Speed support during Flash priority and activated field Flash actions.
- Added hand observers, opponent-hand-increase Burst timing, source special summon, dynamic target counts and new continuous modifiers for SD28 mechanics.
- Core Action Library advances from 64 to 66 action types.
- Manual fallback drops from 63.56% (232/365) to 59.45% (217/365).
- Per-card regression coverage advances from 133 to 148 scenarios.
- Internal application version remains 5.0.3 while the v5.1.0 final content gate remains open.


## v5.1.0 Content Migration — Batch 08

- SD15 — Attribute Eye-Opening Deck: Topaz reaches 18/18 automated/no-effect cards and becomes `READY_NO_MANUAL`.
- Set gate advances from 8/11 to 9/11 complete sets; only BS13 and BSC49 remain outside the content gate.
- Added reusable Strengthening aggregation, `cardRefreshed`, Core → Life movement, Trash special summon, reveal-and-summon/hand routing, richer battle conditions and multi-target modifier support.
- Core Action Library advances from 66 to 69 action types.
- Manual fallback drops from 59.45% (217/365) to 54.79% (200/365).
- Per-card regression coverage advances from 148 to 165 scenarios.
- Main suite passes 149/149, Effect Engine 123/123, Batch 08 dedicated 10/10 and full regression 322/322.
- Internal application version remains 5.0.3 while the v5.1.0 global content gate remains open.
