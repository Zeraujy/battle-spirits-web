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

