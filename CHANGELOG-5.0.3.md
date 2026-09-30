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

## v5.1.0 Content Migration — Batch 09 (BS13 Wave 1)

- Started the BS13 large-set migration and automated 24 previously unresolved effect cards.
- Reduced BS13 unresolved effects from 84 to 60.
- Reduced global Manual Resolution fallback from 54.79% (200/365) to 48.22% (176/365).
- Added generic Trash observers (`controllerTrash`) for mechanics such as Immortality and End Step recovery.
- Added generic dynamic event-source Core/LV/keyword conditions and reusable dynamic action metrics.
- Added reusable support for alternate-name modifiers, dynamic event-source modifier targeting and battle-opponent symbol BP scaling.
- Expanded generated card regression coverage from 165 to 189 scenarios.
- Passed main, Effect Engine, Batch 09, full regression, Phase 26, project, UI, release and security QA.
- Phase 27 remains blocked only by BS13/BSC49 content completion and the global manual-fallback target.

## v5.1.0 Content Migration Batch 10 — BS13 Wave 2

- BS13 advanced from 30/90 to 40/90 resolved/no-effect cards.
- Manual fallback reduced from 48.22% to 45.48%.
- Added reusable player/card modifiers for deck discard caps, Trash recovery locks and absolute printed-cost overrides.
- Added selector-scaled deck discard and Life-scaled BP semantics.
- Added ten dedicated BS13 regression scenarios; full regression remains green.

## v5.1.0 Content Migration Batch 11 — BS13 Wave 3

- BS13 advanced from 40/90 to 50/90 resolved/no-effect cards, leaving 40 unresolved.
- Manual fallback reduced from 45.48% (166/365) to 42.74% (156/365).
- Added canonical `cardExhausted` observation for attacks, blocks and structured effect exhaustion.
- Added reusable attack declaration Core taxes, effect-driven Nexus deployment from Trash and temporary printed-LV forcing.
- Added Special Summon provenance, optional When Summoned suppression, Core-to-Void removal and richer battle-attacker context.
- Pegasus Flap can now end a battle without BP comparison through a structured battle restriction.
- Generated card regression coverage increased from 199 to 209 scenarios.
- Core Action Library increased from 69 to 71 action types.
- Main suite passes 149/149, Effect Engine 153/153, Batch 11 dedicated 10/10 and full regression 352/352.
- Phase 27 remains blocked only by BS13/BSC49 completion and the global manual-fallback target.
- Internal application version remains 5.0.3 while v5.1.0 content migration continues.

## v5.1.0 Content Migration Batch 12 — BS13 Wave 4

- BS13 advanced from 50/90 to 60/90 resolved cards.
- Added canonical `magicResolved`, generic effect-driven step ending, exhausted-block windows, Core-removal protection, Braved modifier targeting and source-bound forced-level cleanup.
- Manual fallback reduced from 42.74% to 40.00% (146/365).
- Generated per-card regressions increased from 209 to 219.
- Core Action Library increased from 71 to 72 reusable action types.
- All executable QA gates pass; Phase 27 remains blocked only by BS13/BSC49 completion and the global `<10%` fallback target.

## v5.1.0 Content Migration Batch 13 — BS13 Wave 5

- BS13 advanced from 60/90 to 70/90 resolved cards, leaving 20 unresolved.
- Added reusable limited-use-per-turn actions, event-source recovery and direct-combined Brave Special Summons.
- Added dynamic field-family reduction, Trash-symbol reduction, source-symbol Life gain and selected-attacker Life protection semantics.
- Added two-symbol attack caps and Magic-discard blocker costs as reusable battle rules.
- Manual fallback reduced from 40.00% (146/365) to 37.26% (136/365).
- Generated per-card regressions increased from 219 to 229.
- Core Action Library increased from 72 to 75 reusable action types.
- Main suite passes 149/149, Effect Engine 173/173, Batch 13 dedicated 10/10 and full regression 372/372.
- Phase 27 remains blocked only by BS13/BSC49 completion and the global `<10%` fallback target.
- Internal application version remains 5.0.3 while v5.1.0 content migration continues.

## v5.1.0 Content Migration Batch 14 — BS13 Wave 6

- BS13 advanced from 70/90 to 80/90 resolved cards, leaving 10 unresolved.
- Added reusable effect-driven Brave Combine from field and event-source recovery from Trash.
- Added selector-derived BP budgets, shared-Family targeting, combined-host battle context and Brave-attachment conditions.
- Added Brave survival after host destruction, Family-sensitive deck-mill follow-ups and effect-return-to-top-deck replacement rules.
- Added reusable summon-exhaustion, Core-removal lock/Transmigration bypass and Brave-condition bypass modifiers.
- Added reusable Dark Snake Life routing, per-symbol hand discard and refresh-after-BP-destruction battle rules.
- Manual fallback reduced from 37.26% (136/365) to 34.52% (126/365).
- Generated per-card regressions increased from 229 to 239.
- Core Action Library increased from 75 to 77 reusable action types.
- Main suite passes 149/149, Effect Engine 184/184, Batch 14 dedicated 11/11 and full regression 383/383.
- Phase 27 remains blocked only by BS13/BSC49 completion and the global `<10%` fallback target.
- Internal application version remains 5.0.3 while v5.1.0 content migration continues.

## v5.1.0 Content Migration Batch 15
- Completed BS13 Wave 7 and promoted BS13 to 90/90 `READY_NO_MANUAL`.
- Added reusable two-Brave host, timed When Summoned suppression, source-modifier conditions, Ultra Awaken/Ice Wall support descriptors and final BS13 automation primitives.
- Manual fallback reduced to 31.78% (116/365); 10/11 content-set gates now complete.

## v5.1.0 Content Migration Batch 16 — BSC49 Wave 1

- Started the final BSC49 content migration block.
- Automated 10 additional BSC49 cards, moving the set to 11/117 resolved.
- Reduced global manual fallback from 31.78% to 29.04%.
- Increased Phase 24 generated regression coverage from 249 to 259 cards.
- Fixed the generic Action Resolver `countFromSourceLevel` path by importing `getCurrentLevel`.
- Preserved the 78-type Core Action Library with no card-specific action additions.
- Full QA passed; Phase 27 remains gated only by BSC49 completion and the `<10%` manual fallback target.

## v5.1.0 Content Migration Batch 17 — BSC49 Wave 2

- Automated 10 additional BSC49 cards: 003, 005, 006, 007, 010, 011, 014, 016, 017 and 018.
- BSC49 coverage advanced from 11/117 to 21/117 resolved.
- Global manual fallback dropped from 29.04% (106/365) to 26.30% (96/365).
- Phase 24 generated regression scenarios increased from 259 to 269.
- Reused controller-Trash Immortality observers, reveal routing, Trash/hand Special Summon, dynamic BP targeting and continuous symbol modifiers without adding BSC49-specific Core Actions.
- Full QA remains green; Phase 27 is blocked only by the remaining BSC49 set gate and the global <10% fallback target.
