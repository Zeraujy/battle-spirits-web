# Battle Spirits Eternal Simulator v4.2.2

## Shop Preview, Reveal & Saga Catalog

- Rebuilt product Card Preview into a visual full-pool gallery with dynamic `x/6` ownership.
- Added a Vanguard Dear Days 2-inspired reveal sequence after purchases.
- New cards display `NEW!` and `GET ×1`; duplicates display the Craft Coins generated; overflow at 6/6 is marked as converted.
- Reveal flow applies to boosters, fixed Premium Card Sets and decks.
- Shop side catalog now groups Boosters and Decks by saga/era metadata.
- Added structured saga catalog data in `src/data/shopSagas.js`.
- BSC49 now uses 9 cards per pack.
- PC01/PC02 are treated as fixed-content Premium Card Sets rather than random 3-card boosters.
- Added `supabase/ECONOMY-4.2.2.sql` for product type, saga metadata and authenticated reveal grant metadata.
- Added the proposed DevMode/Admin architecture as documentation only; implementation remains paused.
