# Economy 4.2.1 — Shop, Guest Migration & Starter Onboarding

Execute `ECONOMY-4.2.0.sql` first (if it has not already been applied), then execute `ECONOMY-4.2.1.sql` once in the Supabase SQL Editor.

## What 4.2.1 adds

- Server-authoritative purchases for signed-in players via `bs_purchase_shop_product`.
- Starter onboarding via `bs_claim_starter_decks` (exactly 3 eligible decks).
- One-time account-creation migration/bonus via `bs_claim_account_creation_bundle`.
- `bs_player_deck_recipes`, `bs_player_progress`, shop product and card-pool tables.
- Global ownership cap of 6 copies per card.
- Duplicate/overflow Craft Coin rewards, processed server-side for authenticated accounts.
- Account creation bonus: 1500 Spirit Coins + 1500 Craft Coins, eligible only for newly-created accounts after this migration is installed.

## Current economy tuning

The following values are initial simulator defaults and are deliberately centralized so they can be balanced later:

| Rarity | Craft Coins on duplicate/overflow |
| --- | ---: |
| C | 5 |
| U | 10 |
| R | 20 |
| M | 40 |
| X | 80 |
| XX | 120 |
| CP | 50 |
| CX | 100 |
| TX | 100 |
| PX | 120 |

Booster pack sizes and rarity weighting are simulator configuration, not a claim of official physical collation. Normal boosters currently open 8 cards; PC01/PC02 open 3 cards.

## Guest mode

Guest economy/decks are held in browser `sessionStorage`. Closing the simulator/browser session wipes Coins, Collection and Decks as intended.

When a Guest starts registration, a bounded migration snapshot is retained long enough to survive an e-mail confirmation flow. After the account session becomes available, the snapshot is imported once and the registration bonus is granted once.

Authenticated economy mutations are not performed by direct frontend table writes; purchase, starter grants and registration migration go through database RPCs.

## Starter deck data status

The Shop displays every product represented by the current project database. Starter onboarding only enables deck products with a validated structured recipe in the current catalog. Products whose recipe source is incomplete remain visible as `catalog-only` until their missing/reprint metadata is imported, rather than inventing a deck list.
