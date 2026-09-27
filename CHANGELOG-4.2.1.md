# v4.2.1 — Shop Products, Guest Migration & Starter Economy

## Shop catalog

- Populated the Store from the current database product families:
  - BS01–BS07, BS13, BSC49, PC01 and PC02 in Card Packs.
  - SD01, SD02, SD03, SD10, SD11, SD13, SD14, SD15, SD16, SD17, SD19, SD20, SD22, SD23, SD28 and SD64 in Decks.
- Products whose structured 40-card recipe is not complete in the unified database remain visible as **Data Pending** instead of using invented deck lists.
- Added product modal with card-pool preview, `owned/6`, multi-buy quantity selector, Confirm Purchase and Cancel.

## Guest & account migration

- Guest Coins, Collection and Decks now use session storage and are reset when the simulator session ends.
- Account creation preserves the active Guest snapshot and migrates it to the account.
- Added one-time `AccountCreationBonus`: **1500 Spirit Coins + 1500 Craft Coins**.
- A pending migration is preserved across e-mail confirmation and claimed on the first verified sign-in.

## Player onboarding

- Fresh players must choose exactly **3 Starter Decks** from decks with validated recipes.
- Starter cards are delivered directly to CollectionManager.
- Each selected deck grants one permanent Deck Recipe.
- Non-selected products stay in the Shop.

## Collection, duplicates and Deck Builder

- Global ownership limit: **6 copies per card**.
- Duplicate copies grant Craft Coins based on rarity.
- Copies received while already at 6 are discarded immediately and grant only the duplicate Craft Coins.
- Deck Builder visually locks unowned cards and prevents adding more copies than the player owns.
- Imported decks are trimmed to the player's owned quantities.
- Ready Decks now only lists unlocked recipes, once per recipe.

## Database migration

Run after `supabase/ECONOMY-4.2.0.sql`:

`supabase/ECONOMY-4.2.1.sql`

The migration adds server-side Store products/pools, deck recipes, player onboarding progress, one-time account migration/bonus, purchase validation and the duplicate/overflow grant rules.
