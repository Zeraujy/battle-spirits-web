# Economy 4.2.0 migration

Run `ECONOMY-4.2.0.sql` once in the same Supabase project used by the Social/Ranked features.

The migration creates the dual wallet and card inventory foundation:

- `bs_player_wallets` - Spirit Coins and Craft Coins
- `bs_player_cards` - owned card quantities
- `bs_economy_ledger` - auditable currency history for future rewards/purchases/crafting/trades

Players can read only their own wallet, collection and ledger. The client does not receive permissions to mint coins, add cards or change quantities. Future reward/purchase/trade flows should perform mutations from trusted server-side code.

Existing accounts receive an empty wallet automatically, and new accounts receive one when created.
