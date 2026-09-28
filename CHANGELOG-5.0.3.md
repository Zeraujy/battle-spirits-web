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
