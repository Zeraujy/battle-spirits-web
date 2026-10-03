# Economy 4.2.2 — Shop Reveal & Saga Metadata

Run migrations in this order:

1. `ECONOMY-4.2.0.sql`
2. `ECONOMY-4.2.1.sql`
3. `ECONOMY-4.2.2.sql`

## What 4.2.2 adds

- `product_type` metadata for `booster`, `card-set`, and `deck` behavior.
- `saga_id` metadata for Store grouping.
- BSC49 corrected to 9 cards per pack.
- PC01/PC02 changed to fixed-content card-set purchases.
- Double-sided `_b` World back faces are removed from PC purchase pools.
- Purchase grant results now include `unitIndex` and `slotIndex`, allowing the client reveal sequence to preserve product-unit order.

No Admin/DevMode database privileges are added in this migration.
