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

